const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.env.V0631_OUT || '/tmp/v0631-validation';
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAANklEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNnyNi1dwfgUQCeBeBZAB4F4FkAHgXgWQAeBeBZAB4F4FnAAb0AAcJDnxQAAAAASUVORK5CYII=';
const pngBuffer = Buffer.from(pngBase64, 'base64');
const pngDataUrl = `data:image/png;base64,${pngBase64}`;
const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<< /Type /Catalog >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n');
const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

const documentaryDefault = 'O temporal que atingiu a região foi amplamente divulgado na imprensa devido aos danos provocados. Anexamos matéria jornalística ao processo para ilustrar os registros existentes.';
const opinionDefault = 'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice vigente';
const documentaryCustom = 'Texto documental ajustado pelo regulador para demonstrar a divulgação regional do temporal e os registros jornalísticos anexados ao processo.';
const opinionLegacy = 'Parecer anteriormente preenchido na antiga seção 4.2 e preservado integralmente no novo tópico 5.';
const opinionCustom = 'Parecer final ajustado pelo regulador: o conjunto probatório confirma o nexo causal e o amparo contratual do evento.';

const baseFields = {
  insurerClaim: '1326310',
  hsClaim: 'S2609631',
  insurer: 'SOMPO SEGUROS S/A',
  insured: 'COOPERATIVA CENTRAL AURORA ALIMENTOS',
  claimantName: 'Cooperado Teste V0631',
  claimantCpf: '012.345.678-90',
  riskAddress: 'Linha Teste, Município/SC',
  policyNumber: '9600131927',
  productName: 'RISCOS NOMEADOS',
  broker: 'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',
  lossDate: '2026-11-04',
  coverageName: 'Vendaval / Granizo',
  inspectionDate: '2026-11-10',
  occurrenceNarrative: 'No dia 04 de novembro de 2026, uma tempestade severa atingiu a região e causou danos às instalações.',
  occurrenceNarrativeMode: 'custom',
  occurrenceNarrativeDate: '2026-11-04',
  inspectionNarrative: 'Em vistoria presencial realizada no dia 10 de novembro de 2026, foram constatados os danos relacionados.',
  inspectionNarrativeMode: 'custom',
  inspectionNarrativeDate: '2026-11-10',
  mapFit: 'contain',
  mapPosX: '50',
  mapPosY: '50',
  otherInsurance: 'nao',
  otherInsuranceDetails: '',
  bankName: 'CRESOL',
  bankAgency: '2508',
  bankAccount: '1.801-5',
  noticeDate: '2026-11-05',
  scheduleDate: '2026-11-06',
  reportCity: 'Blumenau (SC)',
  reportDate: '2026-11-10',
  regulatorName: 'Paulo R. Schlosser',
  regulatorCpf: '068.613.739-66'
};

const damages = [
  { id: 'damage_1', description: 'Telhas e componentes de cobertura', quantity: '120', unit: 'un.', age: '4', ageUnit: 'anos', claimedTotal: '10000', assessedTotal: '9500' },
  { id: 'damage_2', description: 'Cortinado lateral', quantity: '220', unit: 'm²', age: '2', ageUnit: 'anos', claimedTotal: '6480', assessedTotal: '6480' }
];
const photos = [{ id: 'photo_1', name: 'vistoria.png', caption: 'Danos observados em vistoria', dataUrl: pngDataUrl }];
const causeEvidence = [
  { id: 'evidence_1', name: 'materia-jornalistica.png', mime: 'image/png', dataUrl: pngDataUrl, caption: 'Registro jornalístico do temporal' },
  { id: 'evidence_2', name: 'laudo-causa.pdf', mime: 'application/pdf', dataUrl: pdfDataUrl, caption: 'Laudo técnico de apoio' }
];

const makeBackup = ({ legacy = false, custom = false } = {}) => ({
  version: legacy ? '0.6.10' : '0.6.11',
  updatedAt: new Date().toISOString(),
  finalizedAt: null,
  fields: {
    ...baseFields,
    ...(legacy ? {} : { documentaryNarrative: custom ? documentaryCustom : documentaryDefault }),
    regulatorOpinion: custom ? opinionCustom : opinionLegacy
  },
  map: { dataUrl: pngDataUrl, name: 'mapa.png', fit: 'contain', posX: '50', posY: '50' },
  damages,
  photos,
  documents: [{ id: 'legacy_doc', name: 'documento-antigo.pdf', type: 'Documento antigo', description: 'Não deve reaparecer', mime: 'application/pdf', dataUrl: pdfDataUrl }],
  causeEvidence,
  signatures: { regulator: null, claimant: null }
});

async function go(page, step) {
  await page.evaluate((target) => {
    const active = document.querySelector('.screen.active');
    const button = active?.querySelector(`[data-go="${target}"]`);
    if (!button) throw new Error(`Botão para etapa ${target} não encontrado`);
    button.click();
  }, step);
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

async function importBackup(page, data, name) {
  await page.setInputFiles('#backupInput', {
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
  await page.waitForTimeout(900);
}

function assertOrder(text, values, label) {
  const upper = text.toUpperCase();
  const indexes = values.map((value) => upper.indexOf(value.toUpperCase()));
  if (indexes.some((value) => value < 0) || indexes.some((value, index) => index && value <= indexes[index - 1])) {
    throw new Error(`${label}: ordem inválida ${JSON.stringify(indexes)}`);
  }
  return indexes;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1500, height: 1100 } });
  const pageErrors = [];
  const consoleErrors = [];
  const httpErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon\.ico/i.test(message.text())) consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !/favicon\.ico/i.test(response.url())) httpErrors.push({ status: response.status(), url: response.url() });
  });
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('http://127.0.0.1:8000/fast_track/v062.html?v=0631-ci', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.app-shell', { state: 'visible' });

  const structure = await page.evaluate(() => ({
    report: Boolean(window.FastTrackV06Report),
    word: Boolean(window.FastTrackV06Word),
    docx: Boolean(window.docx),
    documentaryCount: document.querySelectorAll('#documentaryNarrative').length,
    opinionCount: document.querySelectorAll('#regulatorOpinion').length,
    evidenceInput: Boolean(document.getElementById('causeEvidenceInput')),
    evidenceList: Boolean(document.getElementById('causeEvidenceList')),
    headings: [...document.querySelectorAll('.screen[data-step="4"] h3')].map((node) => node.textContent.trim()),
    documentaryValue: document.getElementById('documentaryNarrative')?.value,
    opinionValue: document.getElementById('regulatorOpinion')?.value,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean)
  }));
  if (!structure.report || !structure.word || !structure.docx || structure.documentaryCount !== 1 || structure.opinionCount !== 1 || !structure.evidenceInput || !structure.evidenceList) {
    throw new Error(`Estrutura inválida: ${JSON.stringify(structure)}`);
  }
  if (!structure.headings.includes('4.2. Lavantamentos documentais') || !structure.headings.includes('5. Parecer do regulador')) {
    throw new Error(`Títulos do formulário ausentes: ${JSON.stringify(structure.headings)}`);
  }
  if (structure.documentaryValue !== documentaryDefault || structure.opinionValue !== opinionDefault) {
    throw new Error(`Textos padrão divergentes: ${JSON.stringify({ documentary: structure.documentaryValue, opinion: structure.opinionValue })}`);
  }
  if (!structure.scripts.some((src) => /direct-app-0631\.js\?v=0631/.test(src)) || !structure.scripts.some((src) => /direct-layout-0631\.js\?v=0631/.test(src)) || !structure.scripts.some((src) => /direct-word-0631\.js\?v=0631/.test(src))) {
    throw new Error(`Ativos 0631 não carregados: ${JSON.stringify(structure.scripts)}`);
  }

  // Migração: parecer antigo vai para o tópico 5; anexos ficam na seção 4.2; texto documental recebe padrão.
  await importBackup(page, makeBackup({ legacy: true }), 'backup-legado-v0630.json');
  await go(page, 2);
  await go(page, 3);
  await go(page, 4);
  let migrated = await page.evaluate(() => ({
    documentary: document.getElementById('documentaryNarrative').value,
    opinion: document.getElementById('regulatorOpinion').value,
    evidence: document.querySelectorAll('#causeEvidenceList .cause-evidence-card').length,
    names: document.getElementById('causeEvidenceList').innerText,
    legacyDocumentVisible: document.body.innerText.includes('documento-antigo.pdf')
  }));
  if (migrated.documentary !== documentaryDefault || migrated.opinion !== opinionLegacy || migrated.evidence !== 2 || !migrated.names.includes('materia-jornalistica.png') || !migrated.names.includes('laudo-causa.pdf') || migrated.legacyDocumentVisible) {
    throw new Error(`Migração inválida: ${JSON.stringify(migrated)}`);
  }

  await page.evaluate(() => { window.__evidenceOpened = ''; window.open = (url) => { window.__evidenceOpened = url; return null; }; });
  await page.locator('#causeEvidenceList [data-action="view-evidence"]').first().click();
  if (!(await page.evaluate(() => String(window.__evidenceOpened || '').startsWith('data:')))) throw new Error('Visualização do anexo não foi preservada.');

  // Editabilidade, navegação e persistência.
  await page.fill('#documentaryNarrative', documentaryCustom);
  await page.fill('#regulatorOpinion', opinionCustom);
  await go(page, 5);
  await go(page, 4);
  const afterNavigation = await page.evaluate(() => ({
    documentary: document.getElementById('documentaryNarrative').value,
    opinion: document.getElementById('regulatorOpinion').value,
    evidence: document.querySelectorAll('#causeEvidenceList .cause-evidence-card').length
  }));
  if (afterNavigation.documentary !== documentaryCustom || afterNavigation.opinion !== opinionCustom || afterNavigation.evidence !== 2) {
    throw new Error(`Navegação alterou conteúdo: ${JSON.stringify(afterNavigation)}`);
  }
  await page.evaluate(() => document.querySelector('[data-action="save-draft"]').click());
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.app-shell', { state: 'visible' });
  await go(page, 2);
  await go(page, 3);
  await go(page, 4);
  const afterReload = await page.evaluate(() => ({
    documentary: document.getElementById('documentaryNarrative').value,
    opinion: document.getElementById('regulatorOpinion').value,
    evidence: document.querySelectorAll('#causeEvidenceList .cause-evidence-card').length,
    damages: document.querySelectorAll('#damageList .damage-card').length,
    photos: document.querySelectorAll('#photoGallery .photo-card').length
  }));
  if (afterReload.documentary !== documentaryCustom || afterReload.opinion !== opinionCustom || afterReload.evidence !== 2 || afterReload.damages !== 0 || afterReload.photos !== 0) {
    throw new Error(`Persistência/reinício divergente: ${JSON.stringify(afterReload)}`);
  }

  // Restauração explícita da sessão completa para geração e conferência.
  await importBackup(page, makeBackup({ custom: true }), 'backup-atual-v0631.json');
  await go(page, 2);
  await go(page, 3);
  await go(page, 4);
  await page.locator('#causeEvidenceList [data-evidence-caption]').first().fill('Registro jornalístico regional validado');
  await go(page, 5);
  await go(page, 6);
  await go(page, 7);
  await page.waitForSelector('#reportPreview .report-page');

  const preview = await page.evaluate(() => {
    const host = document.getElementById('reportPreview');
    const text = host.innerText;
    const upper = text.toUpperCase();
    const pages = [...host.querySelectorAll('.report-page')];
    return {
      text,
      pages: pages.length,
      documentaryCount: (upper.match(/4\.2\. LAVANTAMENTOS DOCUMENTAIS/g) || []).length,
      opinionCount: (upper.match(/5\. PARECER DO REGULADOR/g) || []).length,
      imageEvidence: host.querySelectorAll('.cause-evidence-cell-report img').length,
      overflow: pages.map((page, index) => ({ page: index + 1, overflow: page.querySelector('.report-content').scrollHeight - page.querySelector('.report-content').clientHeight }))
    };
  });
  const previewUpper = preview.text.toUpperCase();
  for (const forbidden of ['4.2. PARECER DO REGULADOR', '5. DEMONSTRATIVO DE INDENIZAÇÃO', 'DOCUMENTO-ANTIGO.PDF']) {
    if (previewUpper.includes(forbidden)) throw new Error(`Conteúdo antigo na prévia: ${forbidden}`);
  }
  for (const required of ['4.2. LAVANTAMENTOS DOCUMENTAIS', 'IMAGENS E ARQUIVOS', 'REGISTRO JORNALÍSTICO REGIONAL VALIDADO', 'LAUDO-CAUSA.PDF', '5. PARECER DO REGULADOR', '6. DEMONSTRATIVO DE INDENIZAÇÃO', '7. DECLARAÇÃO DE OUTROS SEGUROS', '8. CRONOLOGIA', '9. INFORMAÇÕES COMPLEMENTARES']) {
    if (!previewUpper.includes(required)) throw new Error(`Conteúdo ausente na prévia: ${required}`);
  }
  if (preview.documentaryCount !== 1 || preview.opinionCount !== 1 || preview.imageEvidence !== 1 || preview.overflow.some((item) => item.overflow > 2)) {
    throw new Error(`Prévia inválida: ${JSON.stringify(preview)}`);
  }
  const previewOrder = assertOrder(preview.text, [
    '4.2. LAVANTAMENTOS DOCUMENTAIS',
    documentaryCustom,
    'IMAGENS E ARQUIVOS',
    'Registro jornalístico regional validado',
    'laudo-causa.pdf',
    '5. PARECER DO REGULADOR',
    opinionCustom,
    '6. DEMONSTRATIVO DE INDENIZAÇÃO'
  ], 'Prévia');
  await page.locator('#reportPreview').screenshot({ path: path.join(out, 'preview-v0631.png') });

  const backupDownload = page.waitForEvent('download', { timeout: 120000 });
  await page.evaluate(() => document.querySelector('[data-action="export-backup"]').click());
  const backupFile = await backupDownload;
  const backupPath = path.join(out, 'backup-exportado-v0631.json');
  await backupFile.saveAs(backupPath);
  const exportedBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (exportedBackup.fields.documentaryNarrative !== documentaryCustom || exportedBackup.fields.regulatorOpinion !== opinionCustom || exportedBackup.causeEvidence?.length !== 2) {
    throw new Error('Backup não preservou a reorganização e os anexos.');
  }

  await page.evaluate(() => document.querySelector('[data-action="export-pdf"]').click());
  await page.waitForSelector('#printHost .report-page', { state: 'attached' });
  const printText = await page.locator('#printHost').innerText();
  assertOrder(printText, ['4.2. LAVANTAMENTOS DOCUMENTAIS', documentaryCustom, '5. PARECER DO REGULADOR', opinionCustom, '6. DEMONSTRATIVO DE INDENIZAÇÃO'], 'Impressão');
  if (/4\.2\. PARECER DO REGULADOR|5\. DEMONSTRATIVO DE INDENIZAÇÃO/i.test(printText)) throw new Error('Numeração antiga apareceu na impressão.');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(out, 'relatorio-browser-v0631.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await page.emulateMedia({ media: 'screen' });

  const wordDownload = page.waitForEvent('download', { timeout: 120000 });
  await page.evaluate(() => document.querySelector('[data-action="export-word"]').click());
  const wordFile = await wordDownload;
  const wordPath = path.join(out, wordFile.suggestedFilename());
  await wordFile.saveAs(wordPath);
  if (!fs.existsSync(wordPath) || fs.statSync(wordPath).size < 15000) throw new Error(`DOCX inválido: ${wordPath}`);

  if (pageErrors.length || consoleErrors.length || httpErrors.length) {
    throw new Error(JSON.stringify({ pageErrors, consoleErrors, httpErrors }));
  }
  fs.writeFileSync(path.join(out, 'browser-result.json'), JSON.stringify({ structure, migrated, afterNavigation, afterReload, preview: { pages: preview.pages, documentaryCount: preview.documentaryCount, opinionCount: preview.opinionCount, imageEvidence: preview.imageEvidence, overflow: preview.overflow, order: previewOrder }, wordPath, wordBytes: fs.statSync(wordPath).size }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
