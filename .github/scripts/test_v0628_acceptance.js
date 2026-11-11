const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.env.OUT || '/tmp/v0628-acceptance';
const URL = process.env.TEST_URL || 'http://127.0.0.1:8000/fast_track/v062.html?v=0628-acceptance';
fs.mkdirSync(OUT,{recursive:true});

async function newPage(browser) {
  const context = await browser.newContext({acceptDownloads:true,viewport:{width:1500,height:1100}});
  const page = await context.newPage();
  const errors=[]; const httpErrors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400&&!/favicon\.ico/i.test(r.url()))httpErrors.push({status:r.status(),url:r.url()});});
  page.on('dialog',d=>d.accept());
  await page.goto(URL,{waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('.app-shell',{state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#inspectionNarrative')?.value.length>0,{timeout:30000});
  return {context,page,errors,httpErrors};
}

async function go(page,step) {
  await page.evaluate(s=>{
    const button=document.querySelector(`[data-go="${s}"]`);
    if(!button) throw new Error(`Botão da etapa ${s} não encontrado`);
    button.click();
  },step);
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

async function dbState(page) {
  return await page.evaluate(async()=>await new Promise((resolve,reject)=>{
    const request=indexedDB.open('HSFastTrackV06Direct',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction('state','readonly');
      const get=tx.objectStore('state').get('current');
      get.onsuccess=()=>resolve(get.result || null);
      get.onerror=()=>reject(get.error);
    };
  }));
}

async function importBackup(page,data,name) {
  await page.setInputFiles('#backupInput',{name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.waitForTimeout(1000);
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  const results={};

  // Cenário A — padrão, sincronização, personalização, data livre e restauração.
  {
    const {context,page,errors,httpErrors}=await newPage(browser);
    const initial={occurrence:await page.inputValue('#occurrenceNarrative'),inspection:await page.inputValue('#inspectionNarrative')};
    if(!initial.occurrence.includes('[data do sinistro]')) throw new Error(`Ocorrência padrão inesperada: ${initial.occurrence}`);
    if(!initial.inspection.includes('10 de novembro de 2026')) throw new Error(`Vistoria padrão inesperada: ${initial.inspection}`);
    await page.fill('#lossDate','2026-11-04');
    await go(page,2);
    if(await page.inputValue('#occurrenceLossDate')!=='2026-11-04') throw new Error('Data da etapa 2 não sincronizou com a etapa 1.');
    if(!(await page.inputValue('#occurrenceNarrative')).startsWith('No dia 04 de novembro de 2026,')) throw new Error('Texto padrão não acompanhou a data do sinistro.');

    const custom='No dia 04 de novembro de 2026, narrativa personalizada pelo regulador.\nSegundo parágrafo mantido.';
    await page.fill('#occurrenceNarrative',custom);
    await page.fill('#occurrenceLossDate','2027-02-03');
    if(await page.inputValue('#occurrenceNarrative')!==custom) throw new Error('Mudança da data apagou a ocorrência personalizada.');
    if(await page.inputValue('#lossDate')!=='2027-02-03') throw new Error('Data oficial não permaneceu compartilhada.');
    if(await page.locator('#occurrenceNarrativeWarning').evaluate(el=>el.classList.contains('hidden'))) throw new Error('Aviso de conferência da ocorrência não apareceu.');
    if(!(await page.locator('#lossDateWarning').evaluate(el=>el.classList.contains('hidden')))) throw new Error('Data válida fora de novembro de 2026 foi bloqueada.');
    await page.click('[data-action="update-occurrence-date"]');
    const updated=await page.inputValue('#occurrenceNarrative');
    if(!updated.startsWith('No dia 03 de fevereiro de 2027,')) throw new Error(`Atualização pontual da data falhou: ${updated}`);
    if(!updated.includes('Segundo parágrafo mantido.')) throw new Error('Atualização da data substituiu o restante da redação.');
    await page.click('[data-action="restore-occurrence-default"]');
    if(!(await page.inputValue('#occurrenceNarrative')).startsWith('No dia 03 de fevereiro de 2027,')) throw new Error('Restauração não usou a data oficial atual.');

    await go(page,3);
    const inspection='Em vistoria remota realizada no dia 10 de novembro de 2026, participaram o cooperado e o técnico.\nConstatações complementares.';
    await page.fill('#inspectionNarrative',inspection);
    await page.fill('#inspectionDate','2026-12-15');
    if(await page.inputValue('#inspectionNarrative')!==inspection) throw new Error('Mudança da data apagou a vistoria personalizada.');
    if(await page.locator('#inspectionNarrativeWarning').evaluate(el=>el.classList.contains('hidden'))) throw new Error('Aviso da vistoria não apareceu.');
    await page.click('[data-action="update-inspection-date"]');
    if(!(await page.inputValue('#inspectionNarrative')).includes('15 de dezembro de 2026')) throw new Error('Atualização pontual da data da vistoria falhou.');
    await page.click('[data-action="restore-inspection-default"]');
    if(!(await page.inputValue('#inspectionNarrative')).startsWith('Em vistoria presencial realizada no dia 15 de dezembro de 2026,')) throw new Error('Restauração da vistoria não usou a data atual.');
    if(errors.length||httpErrors.length) throw new Error(JSON.stringify({errors,httpErrors}));
    results.scenarioA={initial,updated};
    await context.close();
  }

  // Cenário B — autosave, recarga e campo vazio intencional.
  {
    const {context,page,errors,httpErrors}=await newPage(browser);
    await page.fill('#lossDate','2027-02-03');
    await go(page,2);
    const occurrence='No dia 03 de fevereiro de 2027, texto final da ocorrência.\nSegundo parágrafo da ocorrência.';
    await page.fill('#occurrenceNarrative',occurrence);
    await go(page,3);
    const inspection='Em vistoria presencial realizada no dia 15 de dezembro de 2026, texto final da vistoria.\nSegundo parágrafo da vistoria.';
    await page.fill('#inspectionDate','2026-12-15');
    await page.fill('#inspectionNarrative',inspection);
    await page.waitForTimeout(2500);
    const before=await dbState(page);
    if(before?.fields?.occurrenceNarrative!==occurrence||before?.fields?.inspectionNarrative!==inspection) throw new Error('O autosave não persistiu as narrativas no armazenamento.');
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction((expected)=>document.querySelector('#occurrenceNarrative')?.value===expected,{timeout:30000},occurrence);
    if(await page.inputValue('#inspectionNarrative')!==inspection) throw new Error('Vistoria não persistiu após recarregar.');

    await go(page,2);
    await page.fill('#occurrenceNarrative','');
    await page.waitForTimeout(2500);
    const emptyState=await dbState(page);
    if(emptyState?.fields?.occurrenceNarrative!==''||emptyState?.fields?.occurrenceNarrativeMode!=='custom') throw new Error('Campo vazio intencional não foi persistido como personalizado.');
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#inspectionNarrative')?.value.length>0,{timeout:30000});
    if(await page.inputValue('#occurrenceNarrative')!=='') throw new Error('Campo vazio foi restaurado automaticamente.');
    if(errors.length||httpErrors.length) throw new Error(JSON.stringify({errors,httpErrors}));
    results.scenarioB={saved:true,emptyPreserved:true};
    await context.close();
  }

  // Cenário C — backup antigo/atual, documentos, prévia, PDF e Word.
  {
    const {context,page,errors,httpErrors}=await newPage(browser);
    await page.click('[data-action="load-example"]');
    await page.waitForTimeout(500);
    await go(page,2);
    const finalOccurrence='No dia 04 de novembro de 2026, uma tempestade severa atingiu a propriedade, conforme texto personalizado.\nParágrafo adicional com acentuação: ocorrência, vistoria e constatação.';
    await page.fill('#occurrenceNarrative',finalOccurrence);
    await go(page,3);
    const finalInspection='Em vistoria presencial realizada no dia 10 de novembro de 2026, foram conferidos os danos e remanescentes.\nParágrafo adicional da vistoria.';
    await page.fill('#inspectionNarrative',finalInspection);
    await go(page,4);
    await page.setInputFiles('#documentInput',{name:'orcamento-detalhado.txt',mimeType:'text/plain',buffer:Buffer.from('documento de teste')});
    await page.waitForSelector('#documentList .document-card');
    await page.fill('#documentList [data-document="type"]','Orçamento detalhado');
    await page.fill('#documentList [data-document="description"]','Composição dos reparos');
    if(await page.locator('#documentCollectionIntro').evaluate(el=>el.classList.contains('hidden'))) throw new Error('Introdução documental ausente na tela.');
    await page.waitForTimeout(2500);

    const backupPromise=page.waitForEvent('download',{timeout:120000});
    await page.evaluate(()=>document.querySelector('[data-action="export-backup"]').click());
    const backupDownload=await backupPromise;
    const backupPath=path.join(OUT,'backup-v0628.json');
    await backupDownload.saveAs(backupPath);
    const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));
    if(backup.fields.occurrenceNarrative!==finalOccurrence||backup.fields.inspectionNarrative!==finalInspection) throw new Error('Backup atual não preservou as narrativas.');
    if(backup.fields.occurrenceNarrativeMode!=='custom'||backup.fields.inspectionNarrativeMode!=='custom') throw new Error('Backup não preservou os modos personalizados.');
    if(backup.documents.length!==1) throw new Error('Backup não preservou o documento.');

    const oldBackup={...backup,version:'0.6.6',fields:{...backup.fields,lossDate:'2027-03-09',inspectionDate:'2027-03-10'},documents:[],photos:[],signatures:{regulator:null,claimant:null}};
    for(const key of ['occurrenceNarrative','occurrenceNarrativeMode','occurrenceNarrativeDate','inspectionNarrative','inspectionNarrativeMode','inspectionNarrativeDate']) delete oldBackup.fields[key];
    await importBackup(page,oldBackup,'backup-antigo.json');
    await page.waitForFunction(()=>document.querySelector('#occurrenceNarrative')?.value.startsWith('No dia 09 de março de 2027,'),{timeout:30000});
    if(!(await page.inputValue('#inspectionNarrative')).includes('10 de março de 2027')) throw new Error('Backup antigo não recebeu textos padrão calculados.');

    await importBackup(page,backup,'backup-atual.json');
    await page.waitForFunction((expected)=>document.querySelector('#occurrenceNarrative')?.value===expected,{timeout:30000},finalOccurrence);
    if(await page.inputValue('#inspectionNarrative')!==finalInspection) throw new Error('Restauração perdeu o texto da vistoria.');
    if(await page.locator('#documentList .document-card').count()!==1) throw new Error('Restauração perdeu o documento.');

    await go(page,7);
    await page.waitForSelector('#reportPreview .report-page');
    const previewText=await page.locator('#reportPreview').innerText();
    const introCount=(previewText.match(/Em vistoria foram coletados os documentos abaixo relacionados/g)||[]).length;
    if(introCount!==1) throw new Error(`Introdução documental repetida/ausente na prévia: ${introCount}`);
    if(!previewText.includes('Parágrafo adicional com acentuação')||!previewText.includes('Parágrafo adicional da vistoria.')) throw new Error('Prévia não utilizou as narrativas persistidas.');
    if(previewText.includes('Documentos não apresentados até o momento.')) throw new Error('Prévia contradisse a existência de documentos.');

    await go(page,4);
    await page.check('#noDocuments');
    if(!(await page.locator('#documentCollectionIntro').evaluate(el=>el.classList.contains('hidden')))) throw new Error('Introdução permaneceu visível com ausência declarada.');
    await go(page,7);
    const absent=await page.locator('#reportPreview').innerText();
    if(!absent.includes('Documentos não apresentados até o momento.')||absent.includes('Em vistoria foram coletados os documentos abaixo relacionados')) throw new Error('Lógica de ausência documental contraditória.');
    await go(page,4);
    await page.uncheck('#noDocuments');
    await go(page,7);

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
    if(errors.length||httpErrors.length) throw new Error(JSON.stringify({errors,httpErrors}));
    results.scenarioC={backupPath,pdfPath,wordPath,introCount};
    await context.close();
  }

  fs.writeFileSync(path.join(OUT,'acceptance-result.json'),JSON.stringify(results,null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
