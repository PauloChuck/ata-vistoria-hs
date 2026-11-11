const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.env.OUT || '/tmp/v0628-validation';
const URL = process.env.TEST_URL || 'http://127.0.0.1:8000/fast_track/v062.html?v=0628-ci';
const pauseForSave = (page) => page.waitForTimeout(1300);

async function go(page, step) {
  await page.evaluate((targetStep) => {
    const button = document.querySelector(`[data-go="${targetStep}"]`);
    if (!button) throw new Error(`Botão para etapa ${targetStep} não localizado`);
    button.click();
  }, step);
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

async function waitInitialized(page) {
  await page.waitForSelector('.app-shell',{state:'visible'});
  await page.waitForFunction(() => {
    const occurrence=document.querySelector('#occurrenceNarrative');
    const inspection=document.querySelector('#inspectionNarrative');
    return occurrence && inspection && inspection.value.length > 0;
  },{timeout:30000});
}

async function importBackup(page, data, name) {
  await page.setInputFiles('#backupInput', {
    name,
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(data))
  });
  await page.waitForTimeout(700);
}

(async () => {
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({
    headless:true,
    executablePath:process.env.CHROME_PATH,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage({acceptDownloads:true,viewport:{width:1500,height:1100}});
  const pageErrors=[]; const httpErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error)));
  page.on('response',response=>{if(response.status()>=400&&!/favicon\.ico/i.test(response.url()))httpErrors.push({status:response.status(),url:response.url()});});
  page.on('dialog',dialog=>dialog.accept());

  await page.goto(URL,{waitUntil:'networkidle',timeout:120000});
  await waitInitialized(page);
  const init=await page.evaluate(()=>({
    report:Boolean(window.FastTrackV06Report),
    word:Boolean(window.FastTrackV06Word),
    validDate:typeof window.FastTrackV06Report?.isValidIsoDate==='function',
    effectiveOccurrence:typeof window.FastTrackV06Report?.effectiveOccurrenceText==='function',
    effectiveInspection:typeof window.FastTrackV06Report?.effectiveInspectionText==='function'
  }));
  if(!Object.values(init).every(Boolean)) throw new Error(`Inicialização incompleta: ${JSON.stringify(init)}`);

  // 1. Processo novo recebe os dois textos padrão.
  const initialOccurrence=await page.inputValue('#occurrenceNarrative');
  const initialInspection=await page.inputValue('#inspectionNarrative');
  if(!initialOccurrence.includes('[data do sinistro]')) throw new Error(`Ocorrência padrão inesperada: ${initialOccurrence}`);
  if(!initialInspection.includes('10 de novembro de 2026')) throw new Error(`Vistoria padrão inesperada: ${initialInspection}`);

  // 2. Data compartilhada e atualização automática enquanto o texto é padrão.
  await page.fill('#lossDate','2026-11-04');
  await go(page,2);
  if(await page.inputValue('#occurrenceLossDate')!=='2026-11-04') throw new Error('Data do sinistro não foi compartilhada com a etapa 2.');
  if(!(await page.inputValue('#occurrenceNarrative')).startsWith('No dia 04 de novembro de 2026,')) throw new Error('Texto padrão da ocorrência não acompanhou a data.');

  // 3. Edição livre, cursor preservado e data fora de novembro aceita.
  await page.focus('#occurrenceNarrative');
  await page.evaluate(()=>{const el=document.querySelector('#occurrenceNarrative');el.setSelectionRange(12,12);});
  await page.keyboard.type('X');
  const cursorBefore=await page.evaluate(()=>document.querySelector('#occurrenceNarrative').selectionStart);
  await pauseForSave(page);
  const cursorAfter=await page.evaluate(()=>document.querySelector('#occurrenceNarrative').selectionStart);
  if(cursorAfter!==cursorBefore) throw new Error(`Cursor deslocado durante o salvamento: ${cursorBefore} -> ${cursorAfter}`);

  const customOccurrence='No dia 04 de novembro de 2026, a ocorrência foi descrita pelo regulador com conteúdo personalizado.\nSegundo parágrafo da ocorrência preservado.';
  await page.fill('#occurrenceNarrative',customOccurrence);
  await page.fill('#occurrenceLossDate','2027-02-03');
  if(await page.inputValue('#lossDate')!=='2027-02-03') throw new Error('Data editada na etapa 2 não sincronizou com a etapa 1.');
  if(await page.inputValue('#occurrenceNarrative')!==customOccurrence) throw new Error('Mudança da data substituiu a ocorrência personalizada.');
  if(await page.locator('#occurrenceNarrativeWarning').evaluate(el=>el.classList.contains('hidden'))) throw new Error('Aviso de conferência da data da ocorrência ausente.');
  if(!(await page.locator('#lossDateWarning').evaluate(el=>el.classList.contains('hidden')))) throw new Error('Data válida fora de novembro de 2026 continua bloqueada.');
  await page.click('[data-action="update-occurrence-date"]');
  const occurrenceWithUpdatedDate=await page.inputValue('#occurrenceNarrative');
  if(!occurrenceWithUpdatedDate.startsWith('No dia 03 de fevereiro de 2027,')) throw new Error(`Data não atualizada no texto: ${occurrenceWithUpdatedDate}`);
  if(!occurrenceWithUpdatedDate.includes('Segundo parágrafo da ocorrência preservado.')) throw new Error('Atualizar data apagou o restante da ocorrência.');

  // 4. Campo apagado intencionalmente não volta ao padrão na recarga.
  await page.fill('#occurrenceNarrative','');
  await pauseForSave(page);
  await page.reload({waitUntil:'networkidle'});
  await waitInitialized(page);
  if(await page.inputValue('#occurrenceNarrative')!=='') throw new Error('Ocorrência vazia foi restaurada automaticamente.');
  await page.evaluate(()=>document.querySelector('[data-action="restore-occurrence-default"]').click());
  if(!(await page.inputValue('#occurrenceNarrative')).startsWith('No dia 03 de fevereiro de 2027,')) throw new Error('Restaurar ocorrência não usou a data oficial atual.');

  // 5. Texto de vistoria com as mesmas regras.
  await go(page,3);
  const customInspection='Em vistoria remota realizada no dia 10 de novembro de 2026, acompanhados do cooperado e do técnico, foram conferidos os danos.\nSegundo parágrafo da vistoria preservado.';
  await page.fill('#inspectionNarrative',customInspection);
  await page.fill('#inspectionDate','2026-12-15');
  if(await page.inputValue('#inspectionNarrative')!==customInspection) throw new Error('Mudança da data substituiu a vistoria personalizada.');
  if(await page.locator('#inspectionNarrativeWarning').evaluate(el=>el.classList.contains('hidden'))) throw new Error('Aviso de conferência da data da vistoria ausente.');
  await page.click('[data-action="update-inspection-date"]');
  const inspectionWithUpdatedDate=await page.inputValue('#inspectionNarrative');
  if(!inspectionWithUpdatedDate.includes('15 de dezembro de 2026')) throw new Error(`Data da vistoria não atualizada no texto: ${inspectionWithUpdatedDate}`);
  if(!inspectionWithUpdatedDate.includes('Segundo parágrafo da vistoria preservado.')) throw new Error('Atualizar data apagou o restante da vistoria.');
  await page.click('[data-action="restore-inspection-default"]');
  if(!(await page.inputValue('#inspectionNarrative')).startsWith('Em vistoria presencial realizada no dia 15 de dezembro de 2026,')) throw new Error('Restaurar vistoria não usou a data oficial atual.');

  const finalOccurrence='No dia 03 de fevereiro de 2027, uma tempestade severa atingiu a propriedade, conforme relato conferido pelo regulador.\nA narrativa personalizada permaneceu íntegra após a alteração da data oficial.';
  const finalInspection='Em vistoria presencial realizada no dia 15 de dezembro de 2026, acompanhados do cooperado, foram conferidos os vestígios e os remanescentes.\nAs constatações adicionais foram registradas neste segundo parágrafo.';
  await go(page,2);
  await page.fill('#occurrenceNarrative',finalOccurrence);
  await go(page,3);
  await page.fill('#inspectionNarrative',finalInspection);
  await pauseForSave(page);

  // 6. Persistência após fechar/reabrir a página.
  await page.reload({waitUntil:'networkidle'});
  await waitInitialized(page);
  await page.waitForFunction((expected)=>document.querySelector('#occurrenceNarrative').value===expected,{timeout:30000},finalOccurrence);
  if(await page.inputValue('#inspectionNarrative')!==finalInspection) throw new Error('Vistoria personalizada não persistiu após recarregar.');

  // 7. Documentos e frase introdutória na tela.
  await go(page,4);
  await page.setInputFiles('#documentInput',{name:'orcamento-detalhado.txt',mimeType:'text/plain',buffer:Buffer.from('documento de teste')});
  await page.waitForSelector('#documentList .document-card');
  await page.fill('#documentList [data-document="type"]','Orçamento detalhado');
  await page.fill('#documentList [data-document="description"]','Composição dos reparos');
  if(await page.locator('#documentCollectionIntro').evaluate(el=>el.classList.contains('hidden'))) throw new Error('Frase introdutória documental ausente na tela.');
  await pauseForSave(page);

  // 8. Backup completo preserva textos, modos e anexos.
  const backupPromise=page.waitForEvent('download',{timeout:120000});
  await page.evaluate(()=>document.querySelector('[data-action="export-backup"]').click());
  const backupDownload=await backupPromise;
  const backupPath=path.join(OUT,'backup-v0628.json');
  await backupDownload.saveAs(backupPath);
  const backupData=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  if(backupData.fields.occurrenceNarrative!==finalOccurrence||backupData.fields.inspectionNarrative!==finalInspection) throw new Error('Backup não preservou narrativas personalizadas.');
  if(backupData.fields.occurrenceNarrativeMode!=='custom'||backupData.fields.inspectionNarrativeMode!=='custom') throw new Error('Backup não preservou os modos personalizados.');
  if(!backupData.documents?.length) throw new Error('Backup não preservou o documento anexado.');

  // 9. Backup antigo sem os novos campos recebe textos padrão; vazio intencional já foi testado separadamente.
  const oldBackup={...backupData,version:'0.6.6',fields:{...backupData.fields,lossDate:'2027-03-09',inspectionDate:'2027-03-10'},photos:[],documents:[],signatures:{regulator:null,claimant:null}};
  for(const key of ['occurrenceNarrative','occurrenceNarrativeMode','occurrenceNarrativeDate','inspectionNarrative','inspectionNarrativeMode','inspectionNarrativeDate']) delete oldBackup.fields[key];
  await importBackup(page,oldBackup,'backup-antigo.json');
  await page.waitForFunction(()=>document.querySelector('#occurrenceNarrative').value.startsWith('No dia 09 de março de 2027,'),{timeout:30000});
  if(!(await page.inputValue('#inspectionNarrative')).includes('10 de março de 2027')) throw new Error('Backup antigo não recebeu o texto padrão da vistoria.');

  // 10. Restaura backup atual e confere os textos e documentos.
  await importBackup(page,backupData,'backup-atual.json');
  await page.waitForFunction((expected)=>document.querySelector('#occurrenceNarrative').value===expected,{timeout:30000},finalOccurrence);
  if(await page.inputValue('#inspectionNarrative')!==finalInspection) throw new Error('Restauração perdeu a vistoria personalizada.');
  if(await page.locator('#documentList .document-card').count()!==1) throw new Error('Restauração perdeu o documento anexado.');

  // 11. Prévia usa o conteúdo persistido e a introdução uma única vez.
  await go(page,7);
  await page.waitForSelector('#reportPreview .report-page');
  const preview=await page.evaluate(()=>{
    const text=document.querySelector('#reportPreview').innerText;
    return {
      introCount:(text.match(/Em vistoria foram coletados os documentos abaixo relacionados/g)||[]).length,
      occurrenceCount:(text.match(/A narrativa personalizada permaneceu íntegra/g)||[]).length,
      inspectionCount:(text.match(/As constatações adicionais foram registradas/g)||[]).length,
      absence:text.includes('Documentos não apresentados até o momento.')
    };
  });
  if(preview.introCount!==1||preview.occurrenceCount!==1||preview.inspectionCount!==1||preview.absence) throw new Error(`Prévia inconsistente: ${JSON.stringify(preview)}`);

  // 12. Declaração de ausência não pode contradizer a seção documental.
  await go(page,4);
  await page.check('#noDocuments');
  if(!(await page.locator('#documentCollectionIntro').evaluate(el=>el.classList.contains('hidden')))) throw new Error('Frase de coleta permaneceu visível com ausência declarada.');
  await go(page,7);
  const absenceText=await page.locator('#reportPreview').innerText();
  if(!absenceText.includes('Documentos não apresentados até o momento.')) throw new Error('Declaração de ausência não apareceu na prévia.');
  if(absenceText.includes('Em vistoria foram coletados os documentos abaixo relacionados')) throw new Error('Prévia apresentou coleta e ausência simultaneamente.');
  await go(page,4);
  await page.uncheck('#noDocuments');
  await go(page,7);

  // 13. PDF e Word com o mesmo conteúdo.
  await page.evaluate(()=>{window.print=()=>{};});
  await page.click('[data-action="export-pdf"]');
  await page.waitForSelector('#printHost .report-page');
  await page.emulateMedia({media:'print'});
  const pdfPath=path.join(OUT,'Relatorio_Fast_Track_v0628.pdf');
  await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
  await page.emulateMedia({media:'screen'});

  const wordPromise=page.waitForEvent('download',{timeout:120000});
  await page.click('[data-action="export-word"]');
  const wordDownload=await wordPromise;
  const wordPath=path.join(OUT,'Relatorio_Fast_Track_v0628.docx');
  await wordDownload.saveAs(wordPath);
  if(!fs.existsSync(wordPath)||fs.statSync(wordPath).size<15000) throw new Error('DOCX inválido.');

  await page.locator('#reportPreview .report-page').filter({hasText:'DESCRIÇÃO DA OCORRÊNCIA'}).first().screenshot({path:path.join(OUT,'preview-narrativas.png')});
  await page.locator('#reportPreview .report-page').filter({hasText:'LEVANTAMENTOS DOCUMENTAIS'}).first().screenshot({path:path.join(OUT,'preview-documentos.png')});

  if(pageErrors.length||httpErrors.length) throw new Error(JSON.stringify({pageErrors,httpErrors}));
  fs.writeFileSync(path.join(OUT,'browser-result.json'),JSON.stringify({init,initialOccurrence,initialInspection,occurrenceWithUpdatedDate,inspectionWithUpdatedDate,preview,backupPath,wordPath,pdfPath},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
