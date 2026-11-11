const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = '/tmp/v0630-public';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#dcecf3"/><text x="40" y="180" font-family="Arial" font-size="42">Evidência V0630</text></svg>`;
const imageData = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
const textData = `data:text/plain;charset=UTF-8,${encodeURIComponent('Laudo técnico principal')}`;

const state = {
  version: '0.6.10', updatedAt: new Date().toISOString(), finalizedAt: null,
  fields: {
    insurerClaim: '1326301', hsClaim: 'S2609631', insurer: 'SOMPO SEGUROS S/A', insured: 'COOPERATIVA CENTRAL AURORA ALIMENTOS',
    claimantName: 'Cooperado Teste Público', claimantCpf: '123.456.789-00', riskAddress: 'Linha Teste Público, Município/SC', policyNumber: '9600131927',
    productName: 'RISCOS NOMEADOS', broker: 'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A', lossDate: '2026-11-04', coverageName: 'Vendaval / Granizo',
    inspectionDate: '2026-11-10', occurrenceNarrative: 'No dia 04 de novembro de 2026, ocorreu tempestade severa na região.', occurrenceNarrativeMode: 'custom', occurrenceNarrativeDate: '2026-11-04',
    inspectionNarrative: 'Em vistoria presencial realizada no dia 10 de novembro de 2026, foram constatados os danos descritos.', inspectionNarrativeMode: 'custom', inspectionNarrativeDate: '2026-11-10',
    mapFit: 'contain', mapPosX: '50', mapPosY: '50', regulatorOpinion: 'Diante do exposto, o conjunto probatório confirma o nexo causal e o sinistro está amparado pela cobertura contratada.',
    otherInsurance: 'nao', otherInsuranceDetails: '', bankName: 'BANCO NÃO EXIBIR', bankAgency: '0001', bankAccount: '000123-4', noticeDate: '2026-11-05', scheduleDate: '2026-11-06',
    reportCity: 'Blumenau (SC)', reportDate: '2026-11-10', regulatorName: 'Paulo R. Schlosser', regulatorCpf: '068.613.739-66', noDocuments: true
  },
  map: { dataUrl: imageData, name: 'mapa.svg', fit: 'contain', posX: '50', posY: '50' },
  damages: [
    { id: 'd1', description: 'Telhas e componentes de cobertura', quantity: '120', unit: 'un.', age: '4', ageUnit: 'anos', claimedTotal: '10000', assessedTotal: '9500' },
    { id: 'd2', description: 'Cortinado lateral', quantity: '220', unit: 'm²', age: '2', ageUnit: 'anos', claimedTotal: '6480', assessedTotal: '6480' }
  ],
  photos: [{ id: 'p1', name: 'vistoria.svg', caption: 'Danos observados em vistoria', dataUrl: imageData }],
  documents: [{ id: 'legacy', name: 'documento-antigo.txt', type: 'Documento antigo', description: 'Não migrar', mime: 'text/plain', dataUrl: textData }],
  causeEvidence: [
    { id: 'e1', name: 'foto-causa.svg', mime: 'image/svg+xml', dataUrl: imageData, caption: 'Fotografia da causa' },
    { id: 'e2', name: 'laudo-causa.txt', mime: 'text/plain', dataUrl: textData, caption: 'Laudo técnico principal' }
  ],
  signatures: { regulator: null, claimant: null }
};

async function go(page, step) {
  await page.evaluate((target) => {
    const button = document.querySelector('.screen.active')?.querySelector(`[data-go="${target}"]`);
    if (!button) throw new Error(`Botão para etapa ${target} não encontrado`);
    button.click();
  }, step);
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1500, height: 1100 } });
  const pageErrors = [];
  const httpErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400 && !/favicon\.ico/i.test(response.url())) httpErrors.push({ status: response.status(), url: response.url() }); });
  page.on('dialog', dialog => dialog.accept());

  const url = 'https://paulochuck.github.io/ata-vistoria-hs/fast_track/v062.html?v=0630-public-ci';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.app-shell', { state: 'visible', timeout: 30000 });

  const init = await page.evaluate(() => ({
    report: Boolean(window.FastTrackV06Report), word: Boolean(window.FastTrackV06Word), docx: Boolean(window.docx),
    evidenceInput: Boolean(document.getElementById('causeEvidenceInput')), evidenceList: Boolean(document.getElementById('causeEvidenceList')),
    oldDocuments: Boolean(document.getElementById('documentInput') || document.getElementById('documentList') || document.getElementById('noDocuments')),
    opinionCount: document.querySelectorAll('#regulatorOpinion').length,
    photoButton: document.getElementById('addPhotoButton')?.textContent.trim(),
    photoButtonAfter: Boolean(document.getElementById('photoGallery').compareDocumentPosition(document.getElementById('addPhotoButton')) & Node.DOCUMENT_POSITION_FOLLOWING)
  }));
  if (!init.report || !init.word || !init.docx || !init.evidenceInput || !init.evidenceList || init.oldDocuments || init.opinionCount !== 1 || init.photoButton !== 'Adicionar + fotos' || !init.photoButtonAfter) throw new Error(`Inicialização pública inválida: ${JSON.stringify(init)}`);
  if (/Levantamentos documentais/i.test(await page.locator('body').innerText())) throw new Error('Seção documental removida ainda aparece no formulário público.');

  await page.setInputFiles('#backupInput', { name: 'backup-publico.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)) });
  await page.waitForTimeout(800);
  for (const step of [2, 3, 4, 5, 6, 7]) await go(page, step);
  await page.waitForSelector('#reportPreview .report-page');

  const report = await page.evaluate(() => {
    const text = document.getElementById('reportPreview').innerText;
    const upper = text.toUpperCase();
    const pages = [...document.querySelectorAll('#reportPreview .report-page')];
    return {
      pages: pages.length, text,
      opinionCount: (upper.match(/4\.2\. PARECER DO REGULADOR/g) || []).length,
      evidenceImages: document.querySelectorAll('#reportPreview .cause-evidence-cell-report img').length,
      overflow: pages.map((p, index) => ({ page: index + 1, overflow: p.querySelector('.report-content').scrollHeight - p.querySelector('.report-content').clientHeight }))
    };
  });
  const upper = report.text.toUpperCase();
  for (const value of ['LEVANTAMENTOS DOCUMENTAIS', 'DADOS CADASTRAIS', 'DOCUMENTO-ANTIGO.TXT', 'BANCO NÃO EXIBIR']) if (upper.includes(value)) throw new Error(`Conteúdo removido na versão pública: ${value}`);
  for (const value of ['4.2. PARECER DO REGULADOR', 'EVIDÊNCIAS DA CAUSA', 'FOTOGRAFIA DA CAUSA', 'LAUDO-CAUSA.TXT', 'LAUDO TÉCNICO PRINCIPAL', '5. DEMONSTRATIVO DE INDENIZAÇÃO', '6. DECLARAÇÃO DE OUTROS SEGUROS', '7. CRONOLOGIA', '8. INFORMAÇÕES COMPLEMENTARES']) if (!upper.includes(value)) throw new Error(`Conteúdo público ausente: ${value}`);
  if (report.opinionCount !== 1 || report.evidenceImages !== 1 || report.overflow.some(item => item.overflow > 2)) throw new Error(`Relatório público inválido: ${JSON.stringify(report)}`);
  await page.locator('#reportPreview').screenshot({ path: path.join(out, 'public-preview.png') });

  await page.click('[data-action="export-pdf"]');
  await page.waitForSelector('#printHost .report-page', { state: 'attached' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(out, 'public-report.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await page.emulateMedia({ media: 'screen' });

  const pending = page.waitForEvent('download', { timeout: 120000 });
  await page.click('[data-action="export-word"]');
  const download = await pending;
  const wordPath = path.join(out, download.suggestedFilename());
  await download.saveAs(wordPath);
  if (!fs.existsSync(wordPath) || fs.statSync(wordPath).size < 15000) throw new Error('DOCX público inválido');

  await page.reload({ waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.app-shell', { state: 'visible' });
  const reset = await page.evaluate(() => ({
    photos: document.querySelectorAll('#photoGallery .photo-card').length,
    damages: document.querySelectorAll('#damageList .damage-card').length,
    evidence: document.querySelectorAll('#causeEvidenceList .cause-evidence-card').length,
    claimant: document.getElementById('claimantName').value,
    financial: document.getElementById('financialSummary').innerText.replace(/\s+/g, ' ')
  }));
  if (reset.photos !== 0 || reset.damages !== 0 || reset.evidence !== 2 || reset.claimant !== 'Cooperado Teste Público' || !/R\$\s*0,00/.test(reset.financial)) throw new Error(`Reinício público inválido: ${JSON.stringify(reset)}`);
  if (pageErrors.length || httpErrors.length) throw new Error(JSON.stringify({ pageErrors, httpErrors }));

  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ url, init, report, reset, wordPath, wordBytes: fs.statSync(wordPath).size }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
