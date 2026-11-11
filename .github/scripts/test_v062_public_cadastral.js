const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/tmp/v062-cadastral-public';
const EXPECTED = [
  'Nome completo: AMARILDO CESAR LOPES',
  'CPF: 092.004.030-07',
  'Dados Bancários: CRESOL – 133 — AG: 002508 / CC: 001.801-5'
];

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
    if (response.status() >= 400 && !/favicon\.ico/i.test(response.url())) {
      httpErrors.push({ status: response.status(), url: response.url() });
    }
  });
  page.on('dialog', dialog => dialog.accept());

  const url = 'https://paulochuck.github.io/ata-vistoria-hs/fast_track/v062.html?v=0627-public-cadastral';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.app-shell', { state: 'visible', timeout: 30000 });

  const init = await page.evaluate(() => ({
    report: Boolean(window.FastTrackV06Report),
    word: Boolean(window.FastTrackV06Word),
    docx: Boolean(window.docx),
    sources: [...document.scripts].map(script => script.src).filter(Boolean)
  }));
  if (!init.report || !init.word || !init.docx) throw new Error(`Inicialização incompleta: ${JSON.stringify(init)}`);
  if (!init.sources.some(src => /direct-report\.js\?v=0627/.test(src)) || !init.sources.some(src => /direct-word\.js\?v=0627/.test(src))) {
    throw new Error(`Revisão 0627 não carregada: ${JSON.stringify(init.sources)}`);
  }

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

  const result = await page.evaluate(() => {
    const root = document.querySelector('#reportPreview');
    const heading = [...root.querySelectorAll('.doc-section')].find(element => element.textContent.trim() === '8. DADOS CADASTRAIS');
    const block = heading?.nextElementSibling;
    const lines = [...(block?.querySelectorAll(':scope > .cadastral-line') || [])];
    return {
      heading: heading?.textContent.trim() || '',
      blockClass: block?.className || '',
      blockBrCount: block?.querySelectorAll('br').length || 0,
      nextHeading: block?.nextElementSibling?.textContent.trim() || '',
      lines: lines.map(line => {
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
          brCount: line.querySelectorAll('br').length
        };
      })
    };
  });

  if (result.heading !== '8. DADOS CADASTRAIS' || result.blockClass !== 'cadastral-data' || result.lines.length !== 3) {
    throw new Error(`Estrutura inválida: ${JSON.stringify(result)}`);
  }
  if (JSON.stringify(result.lines.map(item => item.text)) !== JSON.stringify(EXPECTED)) {
    throw new Error(`Conteúdo inválido: ${JSON.stringify(result.lines)}`);
  }
  if (JSON.stringify(result.lines.map(item => item.label)) !== JSON.stringify(['Nome completo:', 'CPF:', 'Dados Bancários:'])) {
    throw new Error(`Rótulos inválidos: ${JSON.stringify(result.lines)}`);
  }
  if (result.blockBrCount || result.lines.some(item => item.brCount) || result.nextHeading !== '9. CRONOLOGIA') {
    throw new Error(`Separação inválida: ${JSON.stringify(result)}`);
  }
  for (const item of result.lines) {
    const invalid = !item.fontFamily.toLowerCase().includes('arial')
      || Math.abs(item.fontSize - (11 * 96 / 72)) > 0.2
      || Math.abs(item.lineHeight - item.fontSize) > 0.3
      || Math.abs(item.marginBottom - (8 * 96 / 72)) > 0.3
      || item.textAlign !== 'left'
      || Number(item.fontWeight) >= 600
      || Number(item.labelWeight) < 600;
    if (invalid) throw new Error(`Formatação inválida: ${JSON.stringify(item)}`);
  }
  const left = result.lines[0].left;
  if (result.lines.some(item => Math.abs(item.left - left) > 0.5) || !(result.lines[0].top < result.lines[1].top && result.lines[1].top < result.lines[2].top)) {
    throw new Error(`Geometria inválida: ${JSON.stringify(result.lines)}`);
  }

  await page.locator('#reportPreview .cadastral-data').screenshot({ path: path.join(OUT, 'public-cadastral.png') });
  await page.locator('#reportPreview .report-page').filter({ hasText: '8. DADOS CADASTRAIS' }).screenshot({ path: path.join(OUT, 'public-cadastral-page.png') });

  await page.click('[data-action="export-pdf"]');
  await page.waitForSelector('#printHost .cadastral-data', { state: 'attached' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: path.join(OUT, 'Relatorio_Fast_Track_Cadastral_v0627_public.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await page.emulateMedia({ media: 'screen' });

  const pending = page.waitForEvent('download', { timeout: 120000 });
  await page.click('[data-action="export-word"]');
  const download = await pending;
  const wordPath = path.join(OUT, 'Relatorio_Fast_Track_Cadastral_v0627_public.docx');
  await download.saveAs(wordPath);
  if (!fs.existsSync(wordPath) || fs.statSync(wordPath).size < 15000) throw new Error('DOCX público inválido');

  if (pageErrors.length || httpErrors.length) throw new Error(JSON.stringify({ pageErrors, httpErrors }));
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ url, init, result, wordBytes: fs.statSync(wordPath).size }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
