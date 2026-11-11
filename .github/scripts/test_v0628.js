const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.env.OUT || '/tmp/v0628-validation';
const URL = process.env.TEST_URL || 'http://127.0.0.1:8000/fast_track/v062.html?v=0628-ci';
const waitSave = (page) => page.waitForTimeout(900);

async function go(page, step) {
  await page.locator(`[data-go="${step}"]`).first().click();
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

async function importBackup(page, data, name) {
  await page.setInputFiles('#backupInput', {
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data))
  });
  await page.waitForTimeout(500);
}

(async () => {
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({
    headless:true,
    executablePath:process.env.CHROME_PATH,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  const context = await browser.newContext({acceptDownloads:true,viewport:{width:1500,height:1100}});
  const page = await context.newPage();
  const pageErrors=[]; const httpErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error)));
  page.on('response',response=>{if(response.status()>=400&&!/favicon\.ico/i.test(response.url()))httpErrors.push({status:response.status(),url:response.url()});});
  page.on('dialog',dialog=>dialog.accept());

  await page.goto(URL,{waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('.app-shell',{state:'visible'});
  const init = await page.evaluate(() => ({
    report:Boolean(window.FastTrackV06Report),
    word:Boolean(window.FastTrackV06Word),
    validDate:typeof window.FastTrackV06Report?.isValidIsoDate === 'function',
    effectiveOccurrence:typeof window.FastTrackV06Report?.effectiveOccurrenceText === 'function',
    effectiveInspection:typeof window.FastTrackV06Report?.effectiveInspectionText === 'function'
  }));
  if (!Object.values(init).every(Boolean)) throw new Error(`Inicialização incompleta: ${JSON.stringify(init)}`);

  // Processo novo: textos padrão e data compartilhada.
  const initial = await page.evaluate(() => ({
    occurrence:document.querySelector('#occurrenceNarrative').value,
    inspection:document.querySelector('#inspectionNarrative').value
  }));
  if (!initial.occurrence.includes('[data do sinistro]')) throw new Error(`Texto inicial da ocorrência inesperado: ${initial.occurrence}`);
  if (!initial.inspection.includes('10 de novembro de 2026')) throw new Error(`Texto inicial da vistoria inesperado: ${initial.inspection}`);

  await page.fill('#lossDate','2026-11-04');
  await page.waitForTimeout(100);
  await go(page,2);
  if (await page.inputValue('#occurrenceLossDate') !== '2026-11-04') throw new Error('A data compartilhada não foi sincronizada na etapa 2.');
  const standardOccurrence = await page.inputValue('#occurrenceNarrative');
  if (!standardOccurrence.startsWith('No dia 04 de novembro de 2026,')) throw new Error(`Data padrão da ocorrência não atualizada: ${standardOccurrence}`);

  // Cursor não deve ser perdido durante o salvamento automático.
  await page.focus('#occurrenceNarrative');
  await page.evaluate(() => {
    const el=document.querySelector('#occurrenceNarrative');
    el.setSelectionRange(12,12);
  });
  await page.keyboard.type('X');
  const cursorBefore = await page.evaluate(() => document.querySelector('#occurrenceNarrative').selectionStart);
  await waitSave(page);
  const cursorAfter = await page.evaluate(() => document.querySelector('#occurrenceNarrative').selectionStart);
  if (cursorAfter !== cursorBefore) throw new Error(`Cursor deslocado pelo salvamento automático: ${cursorBefore} -> ${cursorAfter}`);

  const customOccurrence = 'No dia 04 de novembro de 2026, a ocorrência foi descrita pelo regulador com conteúdo personalizado.\nSegundo parágrafo da ocorrência preservado.';
  await page.fill('#occurrenceNarrative',customOccurrence);
  await page.fill('#occurrenceLossDate','2027-02-03');
  if (await page.inputValue('#lossDate') !== '2027-02-03') throw new Error('A alteração da data na etapa 2 não retornou à etapa 1.');
  if (await page.inputValue('#occurrenceNarrative') !== customOccurrence) throw new Error('A mudança da data substituiu a ocorrência personalizada.');
  if (await page.locator('#occurrenceNarrativeWarning').evaluate(el=>el.classList.contains('hidden'))) throw new Error('O aviso de conferência da data da ocorrência não foi exibido.');
  if (!(await page.locator('#lossDateWarning').evaluate(el=>el.classList.contains('hidden')))) throw new Error('A versão ainda restringe datas fora de novembro de 2026.');
  await page.click('[data-action="update-occurrence-date"]');
  const updatedOccurrence = await page.inputValue('#occurrenceNarrative');
  if (!updatedOccurrence.startsWith('No dia 03 de fevereiro de 2027,')) throw new Error(`A data não foi atualizada dentro da narrativa: ${updatedOccurrence}`);
  if (!updatedOccurrence.includes('Segundo parágrafo da ocorrência preservado.')) throw new Error('A atualização da data substituiu o restante da ocorrência.');

  // Campo vazio intencional deve persistir e não ser restaurado automaticamente.
  await page.fill('#occurrenceNarrative','');
  await waitSave(page);
  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('.app-shell',{state:'visible'});
  if (await page.inputValue('#occurrenceNarrative') !== '') throw new Error('A ocorrência apagada intencionalmente foi restaurada automaticamente.');
  await page.click('[data-action="restore-occurrence-default"]');
  if (!(await page.inputValue('#occurrenceNarrative')).startsWith('No dia 03 de fevereiro de 2027,')) throw new Error('Restaurar ocorrência não utilizou a data oficial atual.');

  // Texto da vistoria: personalização, sincronização controlada e restauração explícita.
  await go(page,3);
  const customInspection = 'Em vistoria remota realizada no dia 10 de novembro de 2026, acompanhados do cooperado e do técnico, foram conferidos os danos.\nSegundo parágrafo da vistoria preservado.';
  await page.fill('#inspectionNarrative',customInspection);
  await page.fill('#inspectionDate','2026-12-15');
  if (await page.inputValue('#inspectionNarrative') !== customInspection) throw new Error('A mudança da data substituiu o texto personalizado da vistoria.');
  if (await page.locator('#inspectionNarrativeWarning').evaluate(el=>el.classList.contains('hidden'))) throw new Error('O aviso de conferência da data da vistoria não foi exibido.');
  await page.click('[data-action="update-inspection-date"]');
  const updatedInspection = await page.inputValue('#inspectionNarrative');
  if (!updatedInspection.includes('15 de dezembro de 2026')) throw new Error(`Data da vistoria não atualizada na narrativa: ${updatedInspection}`);
  if (!updatedInspection.includes('Segundo parágrafo da vistoria preservado.')) throw new Error('A atualização da data eliminou o segundo parágrafo da vistoria.');
  await page.click('[data-action="restore-inspection-default"]');
  if (!(await page.inputValue('#inspectionNarrative')).startsWith('Em vistoria presencial realizada no dia 15 de dezembro de 2026,')) throw new Error('Restaurar vistoria não utilizou a data oficial atual.');

  // Redações finais personalizadas que devem chegar a todas as saídas.
  const finalOccurrence = 'No dia 03 de fevereiro de 2027, uma tempestade severa atingiu a propriedade, conforme relato conferido pelo regulador.\nA narrativa personalizada permaneceu íntegra após a alteração da data oficial.';
  const finalInspection = 'Em vistoria presencial realizada no dia 15 de dezembro de 2026, acompanhados do cooperado, foram conferidos os vestígios e os remanescentes.\nAs constatações adicionais foram registradas neste segundo parágrafo.';
  await page.fill('#occurrenceNarrative',finalOccurrence);
  await page.fill('#inspectionNarrative',finalInspection);
  await waitSave(page);

  // Persistência após recarga.
  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('.app-shell',{state:'visible'});
  if (await page.inputValue('#occurrenceNarrative') !== finalOccurrence) throw new Error('Ocorrência personalizada não persistiu após recarregar.');
  if (await page.inputValue('#inspectionNarrative') !== finalInspection) throw new Error('Vistoria personalizada não persistiu após recarregar.');

  // Documento coletado e frase introdutória única.
  await page.setInputFiles('#documentInput',{
    name:'orcamento-detalhado.txt',mimeType:'text/plain',buffer:Buffer.from('documento de teste')
  });
  await page.waitForSelector('#documentList .document-card');
  await page.fill('#documentList [data-document="type"]','Orçamento detalhado');
  await page.fill('#documentList [data-document="description"]','Composição dos reparos');
  if (await page.locator('#documentCollectionIntro').evaluate(el=>el.classList.contains('hidden'))) throw new Error('A frase introdutória não apareceu na tela com documento relacionado.');

  // Backup completo deve preservar textos e metadados de personalização.
  const backupDownload = page.waitForEvent('download',{timeout:120000});
  await page.locator('[data-action="export-backup"]').click();
  const backup = await backupDownload;
  const backupPath = path.join(OUT,'backup-v0628.json');
  await backup.saveAs(backupPath);
  const backupData = JSON.parse(fs.readFileSync(backupPath,'utf8'));
  if (backupData.fields.occurrenceNarrative !== finalOccurrence || backupData.fields.inspectionNarrative !== finalInspection) throw new Error('Backup não preservou as narrativas.');
  if (backupData.fields.occurrenceNarrativeMode !== 'custom' || backupData.fields.inspectionNarrativeMode !== 'custom') throw new Error('Backup não preservou o modo personalizado.');

  // Backup antigo, sem os novos campos, deve receber o padrão calculado.
  const oldBackup = {
    version:'0.6.6',
    fields:{...backupData.fields,lossDate:'2027-03-09',inspectionDate:'2027-03-10'},
    damages:backupData.damages,photos:[],documents:[],signatures:{regulator:null,claimant:null}
  };
  delete oldBackup.fields.occurrenceNarrative;
  delete oldBackup.fields.occurrenceNarrativeMode;
  delete oldBackup.fields.occurrenceNarrativeDate;
  delete oldBackup.fields.inspectionNarrative;
  delete oldBackup.fields.inspectionNarrativeMode;
  delete oldBackup.fields.inspectionNarrativeDate;
  await importBackup(page,oldBackup,'backup-antigo.json');
  if (!(await page.inputValue('#occurrenceNarrative')).startsWith('No dia 09 de março de 2027,')) throw new Error('Backup antigo não recebeu o texto padrão da ocorrência.');
  if (!(await page.inputValue('#inspectionNarrative')).includes('10 de março de 2027')) throw new Error('Backup antigo não recebeu o texto padrão da vistoria.');

  // Restaura o backup atual e confirma integridade dos dados.
  await importBackup(page,backupData,'backup-atual.json');
  if (await page.inputValue('#occurrenceNarrative') !== finalOccurrence) throw new Error('Restauração do backup atual perdeu a ocorrência personalizada.');
  if (await page.inputValue('#inspectionNarrative') !== finalInspection) throw new Error('Restauração do backup atual perdeu o texto da vistoria.');

  // Pré-visualização: mesma redação e uma única introdução documental.
  await page.evaluate(() => document.querySelector('[data-go="7"]').click());
  await page.waitForSelector('.screen[data-step="7"].active');
  await page.waitForSelector('#reportPreview .report-page');
  const preview = await page.evaluate(() => {
    const text=document.querySelector('#reportPreview').innerText;
    return {
      text,
      introCount:(text.match(/Em vistoria foram coletados os documentos abaixo relacionados/g)||[]).length,
      occurrenceCount:(text.match(/A narrativa personalizada permaneceu íntegra/g)||[]).length,
      inspectionCount:(text.match(/As constatações adicionais foram registradas/g)||[]).length,
      absence:text.includes('Documentos não apresentados até o momento')
    };
  });
  if (preview.introCount !== 1) throw new Error(`Frase documental repetida ou ausente na prévia: ${preview.introCount}`);
  if (preview.occurrenceCount !== 1 || preview.inspectionCount !== 1) throw new Error('A prévia não consumiu as narrativas persistidas.');
  if (preview.absence) throw new Error('A prévia afirmou ausência de documentos apesar da lista existente.');

  // Declaração de ausência não pode coexistir com a frase de coleta.
  await page.evaluate(() => document.querySelector('[data-go="4"]').click());
  await page.waitForSelector('.screen[data-step="4"].active');
  await page.check('#noDocuments');
  if (!(await page.locator('#documentCollectionIntro').evaluate(el=>el.classList.contains('hidden')))) throw new Error('A frase de coleta permaneceu visível com a declaração de ausência.');
  await page.evaluate(() => document.querySelector('[data-go="7"]').click());
  await page.waitForSelector('.screen[data-step="7"].active');
  const absenceReport = await page.locator('#reportPreview').innerText();
  if (!absenceReport.includes('Documentos não apresentados até o momento.')) throw new Error('Declaração de ausência não apareceu no relatório.');
  if (absenceReport.includes('Em vistoria foram coletados os documentos abaixo relacionados')) throw new Error('Frase de coleta contradiz a declaração de ausência.');

  // Volta ao cenário com documentos para exportação.
  await page.evaluate(() => document.querySelector('[data-go="4"]').click());
  await page.waitForSelector('.screen[data-step="4"].active');
  await page.uncheck('#noDocuments');
  await page.evaluate(() => document.querySelector('[data-go="7"]').click());
  await page.waitForSelector('.screen[data-step="7"].active');

  // PDF do navegador.
  await page.evaluate(() => { window.print=()=>{}; });
  await page.click('[data-action="export-pdf"]');
  await page.waitForSelector('#printHost .report-page');
  await page.emulateMedia({media:'print'});
  const pdfPath=path.join(OUT,'Relatorio_Fast_Track_v0628.pdf');
  await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
  await page.emulateMedia({media:'screen'});

  // Word nativo.
  const wordDownload = page.waitForEvent('download',{timeout:120000});
  await page.click('[data-action="export-word"]');
  const word = await wordDownload;
  const wordPath=path.join(OUT,'Relatorio_Fast_Track_v0628.docx');
  await word.saveAs(wordPath);
  if (!fs.existsSync(wordPath) || fs.statSync(wordPath).size < 15000) throw new Error('DOCX inválido.');

  await page.locator('#reportPreview .report-page').nth(1).screenshot({path:path.join(OUT,'preview-narrativas.png')});
  await page.locator('#reportPreview .report-page').filter({hasText:'LEVANTAMENTOS DOCUMENTAIS'}).first().screenshot({path:path.join(OUT,'preview-documentos.png')});

  if (pageErrors.length || httpErrors.length) throw new Error(JSON.stringify({pageErrors,httpErrors}));
  fs.writeFileSync(path.join(OUT,'browser-result.json'),JSON.stringify({init,initial,standardOccurrence,updatedOccurrence,updatedInspection,preview,backupPath,wordPath,pdfPath},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
