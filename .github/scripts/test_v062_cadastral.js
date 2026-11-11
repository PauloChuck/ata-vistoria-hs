const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/tmp/v062-cadastral-paragraphs';
const EXPECTED = [
  'Nome completo: AMARILDO CESAR LOPES',
  'CPF: 092.004.030-07',
  'Dados Bancários: CRESOL – 133 — AG: 002508 / CC: 001.801-5'
];

function validate(result) {
  if (result.count !== 3) throw new Error(`Quantidade inválida: ${JSON.stringify(result)}`);
  if (JSON.stringify(result.details.map(item => item.text)) !== JSON.stringify(EXPECTED)) {
    throw new Error(`Conteúdo inválido: ${JSON.stringify(result.details)}`);
  }
  if (JSON.stringify(result.details.map(item => item.label)) !== JSON.stringify(['Nome completo:', 'CPF:', 'Dados Bancários:'])) {
    throw new Error(`Rótulos inválidos: ${JSON.stringify(result.details)}`);
  }
  if (result.blockBrCount || result.details.some(item => item.brCount)) throw new Error('Foram encontrados elementos BR.');
  if (result.nextHeading !== '9. CRONOLOGIA') throw new Error(`Seção seguinte alterada: ${result.nextHeading}`);

  for (const item of result.details) {
    if (!item.fontFamily.toLowerCase().includes('arial')) throw new Error(`Fonte inválida: ${JSON.stringify(item)}`);
    if (Math.abs(item.fontSize - (11 * 96 / 72)) > 0.2) throw new Error(`Tamanho inválido: ${JSON.stringify(item)}`);
    if (Math.abs(item.lineHeight - item.fontSize) > 0.3) throw new Error(`Entrelinha inválida: ${JSON.stringify(item)}`);
    if (Math.abs(item.marginBottom - (8 * 96 / 72)) > 0.3) throw new Error(`Espaço posterior inválido: ${JSON.stringify(item)}`);
    if (item.textAlign !== 'left') throw new Error(`Alinhamento inválido: ${JSON.stringify(item)}`);
    if (Number(item.fontWeight) >= 600 || Number(item.labelWeight) < 600) throw new Error(`Negrito/regular inválido: ${JSON.stringify(item)}`);
  }

  const left = result.details[0].left;
  if (result.details.some(item => Math.abs(item.left - left) > 0.5)) throw new Error(`Inícios desalinhados: ${JSON.stringify(result.details)}`);
  if (!(result.details[0].top < result.details[1].top && result.details[1].top < result.details[2].top)) {
    throw new Error(`Ordem vertical inválida: ${JSON.stringify(result.details)}`);
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1500, height: 1100 } });
  const pageErrors = [];
  const httpErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('response', response => {
    if (response.status() >= 400 && !/favicon\.ico/i.test(response.url())) httpErrors.push({ status: response.status(), url: response.url() });
  });
  page.on('dialog', dialog => dialog.accept());

  await page.goto('http://127.0.0.1:8000/fast_track/v062.html?v=0627-cadastral-test', { waitUntil: 'networkidle', timeout: 120000 });
  await page.click('[data-action="load-example"]');
  await page.fill('#claimantName', 'AMARILDO CESAR LOPES');
  await page.fill('#claimantCpf', '092.004.030-07');

  for (const step of [2, 3, 4, 5]) {
    await page.click(`[data-go="${step}"]`);
    await page.waitForSelector(`.screen[data-step="${step}"].active`);
  }
  await page.fill('#bankName', 'CRESOL – 133');
  await page.fill('#bankAgency', '002508');
  await page.fill('#bankAccount', '001.801-5');
  for (const step of [6, 7]) {
    await page.click(`[data-go="${step}"]`);
    await page.waitForSelector(`.screen[data-step="${step}"].active`);
  }
  await page.waitForSelector('#reportPreview .cadastral-data');

  async function inspect(rootSelector) {
    return await page.evaluate(rootSelector => {
      const root = document.querySelector(rootSelector);
      const heading = [...root.querySelectorAll('.doc-section')].find(element => element.textContent.trim() === '8. DADOS CADASTRAIS');
      if (!heading) throw new Error(`Título cadastral ausente em ${rootSelector}`);
      const block = heading.nextElementSibling;
      if (!block?.classList.contains('cadastral-data')) throw new Error(`Bloco cadastral inválido em ${rootSelector}`);
      const lines = [...block.querySelectorAll(':scope > .cadastral-line')];
      return {
        count: lines.length,
        details: lines.map(line => {
          const style = getComputedStyle(line);
          const strong = line.querySelector('strong');
          const rect = line.getBoundingClientRect();
          return {
            text: line.textContent.trim(),
            label: strong?.textContent || '',
            fontFamily: style.fontFamily,
            fontSize: parseFloat(style.fontSize),
            lineHeight: parseFloat(style.lineHeight),
            marginBottom: parseFloat(style.marginBottom),
            textAlign: style.textAlign,
            fontWeight: style.fontWeight,
            labelWeight: strong ? getComputedStyle(strong).fontWeight : '',
            left: rect.left,
            top: rect.top,
            bottom: rect.bottom,
            brCount: line.querySelectorAll('br').length
          };
        }),
        blockBrCount: block.querySelectorAll('br').length,
        nextHeading: block.nextElementSibling?.textContent.trim() || ''
      };
    }, rootSelector);
  }

  const preview = await inspect('#reportPreview');
  validate(preview);
  await page.locator('#reportPreview .cadastral-data').screenshot({ path: path.join(OUT, 'preview-cadastral.png') });
  await page.locator('#reportPreview .report-page').filter({ hasText: '8. DADOS CADASTRAIS' }).screenshot({ path: path.join(OUT, 'preview-page-cadastral.png') });

  await page.click('[data-action="export-pdf"]');
  await page.waitForSelector('#printHost .cadastral-data', { state: 'attached' });
  const print = await inspect('#printHost');
  validate(print);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: path.join(OUT, 'Relatorio_Fast_Track_Cadastral_v0627.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await page.emulateMedia({ media: 'screen' });

  const pending = page.waitForEvent('download', { timeout: 120000 });
  await page.click('[data-action="export-word"]');
  const download = await pending;
  const wordPath = path.join(OUT, 'Relatorio_Fast_Track_Cadastral_v0627.docx');
  await download.saveAs(wordPath);
  if (!fs.existsSync(wordPath) || fs.statSync(wordPath).size < 15000) throw new Error('DOCX inválido');

  await page.evaluate(() => {
    const input = document.getElementById('claimantName');
    input.value = 'NOME COMPLETO EXTENSO DO COOPERADO PARA VALIDAR A CONTINUAÇÃO AUTOMÁTICA NA LINHA SEGUINTE SEM MESCLAR O CONTEÚDO COM O CAMPO DE CPF';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  const longValue = await inspect('#reportPreview');
  if (longValue.count !== 3 || longValue.details[0].bottom - longValue.details[0].top <= longValue.details[0].lineHeight * 1.5) {
    throw new Error(`Valor longo não quebrou dentro do próprio parágrafo: ${JSON.stringify(longValue)}`);
  }
  if (longValue.details[0].bottom > longValue.details[1].top) throw new Error(`Valor longo sobrepôs o CPF: ${JSON.stringify(longValue)}`);

  if (pageErrors.length || httpErrors.length) throw new Error(JSON.stringify({ pageErrors, httpErrors }));
  fs.writeFileSync(path.join(OUT, 'validation.json'), JSON.stringify({ preview, print, longValue, wordBytes: fs.statSync(wordPath).size }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
