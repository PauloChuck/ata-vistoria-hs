/* Browser acceptance test. Optional private reference/PDF paths come from the environment only. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),fixture=require('./policies-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT;
if(!out)throw Error('Set FT_OUT to a private artifact directory outside the repository.');
assert(path.resolve(out).toLowerCase()!==root.toLowerCase() && !path.resolve(out).toLowerCase().startsWith((root+path.sep).toLowerCase()),'Private artifacts must stay outside the public repository.');
fs.mkdirSync(out,{recursive:true});
const source=process.env.FT_REFERENCE?JSON.parse(fs.readFileSync(process.env.FT_REFERENCE,'utf8')):fixture.contract();
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const result={version:'0.6.3.7',checks:[],cases:[],errors:[],success:false};
const normalize=s=>s.replace(/\s+/g,' ').trim();
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('dialog',d=>d.accept());
 if(process.env.FT_DOCX_LIB)await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));
 const step=async n=>page.locator(`[data-go="${n}"]`).first().evaluate(e=>e.click());
 const action=async a=>page.locator(`[data-action="${a}"]`).first().evaluate(e=>e.click());
 const click=async a=>page.locator(`[data-policy="${a}"]`).first().click();
 const backup=async()=>{const old=Number(await page.locator('.screen.active').getAttribute('data-step'));await step(7);const wait=page.waitForEvent('download');await page.locator('[data-action="export-backup"]').click();const data=JSON.parse(fs.readFileSync(await(await wait).path(),'utf8'));await step(old);return data;};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'atendimento-teste.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>document.querySelector('#backupInput').value==='');};
 const current=async()=>{const s=await backup();return s;};
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);
  assert.equal(await page.title(),'Fast Track de Contingência V0.6.3.7 | HS');
  await page.locator('#policyManager').evaluate(e=>e.open=true);
  await page.locator('#policyImport').setInputFiles({name:'cadastro-referencia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await page.waitForFunction(()=>!document.querySelector('#policyEditor').hidden);
  assert.equal(await page.evaluate(()=>FastTrackPolicyUI.getRegistry().versions.length),0,'preview must not save');
  assert.equal(await page.locator('#po_segurado_razao_social').inputValue(),source.operacao.segurado_razao_social);
  if(process.env.FT_REFERENCE){
   for(const doc of source.documentos){await page.locator('#policyDocumentId').selectOption(doc.id);await page.locator('#policyPdfInput').setInputFiles(doc.caminho_local);await page.waitForFunction(hash=>document.querySelector('#policyEditor').textContent.includes(hash),doc.sha256);}
  }
  await click('save');await page.waitForFunction(()=>FastTrackPolicyUI.getRegistry().versions.length===1);
  result.checks.push('Reference import has explicit preview/save; structured facts, pendencies and PDF hashes preserved locally');
  const sourceData={aurora:{A:{nome:'Pessoa Sintética Aurora',renovacao:[{cidade:'Cidade A',estado:'SC',capAloja:10000,vrBenfeitoria:200000,vrAnimais:80000}]}},lar:{B:{nome:'Pessoa Sintética Lar',inicial:[{municipio:'Cidade B',quantidadeAves:5000,vrTotalEstruturas:50000,vrTotalAves:20000}]}}};
  await page.locator('#cooperatorBaseInput').setInputFiles({name:'consulta-sintetica.html',mimeType:'text/html',buffer:Buffer.from(`<script>const DATA=${JSON.stringify(sourceData)};</script>`)});
  await page.waitForFunction(()=>FastTrackCooperators.getBase());
  const records=await page.evaluate(()=>FastTrackCooperators.getBase().records.filter(r=>r.recordType==='detail'));
  async function selectRecord(base){const rec=records.find(r=>r.baseKey===base);await step(1);await page.locator('#cooperatorCooperativeFilter').selectOption('');await page.locator('#cooperatorActivityFilter').selectOption('');await page.locator('#cooperatorSearch').fill(rec.name);await page.locator(`button[data-record-id="${rec.id}"]`).click();const boxes=page.locator('[data-installation-field="involved"]');for(let i=0;i<await boxes.count();i++)await boxes.nth(i).check();}
  await selectRecord('aurora');await page.locator('#lossDate').fill('2026-05-10');assert.equal((await current()).contract,null);
  await page.locator('#policyChoice').selectOption(await page.evaluate(()=>FastTrackPolicyUI.getRegistry().versions[0].versionId));
  await page.locator('#policyBinding').evaluate(e=>e.open=true);await page.locator('#policyBindFrom').fill('2025-01-01');await page.locator('#policyBindTo').fill('2026-12-31');await page.locator('#policyBindEvidence').fill('RELAÇÃO INDIVIDUAL SINTÉTICA — validação sem efeitos em contrato real');await page.locator('#policyBindConfirmed').check();await click('bind');
  await page.waitForFunction(()=>document.querySelector('#policyNumber').value.length>0);
  let s=await current();assert.equal(s.fields.policyNumber,source.operacao.numero_apolice);assert.equal(s.fields.insured,source.operacao.segurado_razao_social);assert.equal(s.fields.claimantName,'Pessoa Sintética Aurora');assert.equal(s.cooperatorSelection.confirmed.vrBuildings,'200000');assert.equal(s.cooperatorSelection.confirmed.vrAnimals,'80000');
  result.checks.push('Selected property plus date requires explicit documented inclusion; confirmed unique policy fills separate contractor/group/affiliated fields');
  const covId=source.coberturas.find(c=>c.id==='vendaval_b')?.id || 'wind';
  await page.locator(`[data-policy-coverage="${covId}"]`).check();
  s=await current();assert.equal(s.contract.coverageIds.length,1);assert.equal(s.fields.coverageName,source.coberturas.find(c=>c.id===covId).nome_contratual);
  // Use a synthetic report shell while retaining the contract snapshot from the actual UI flow.
  const bound=structuredClone(s);await action('load-example');let shell=await current();
  Object.assign(shell,{cooperatorSelection:bound.cooperatorSelection,contract:bound.contract,contractHistory:bound.contractHistory});
  Object.assign(shell.fields,bound.fields,{claimantName:'Pessoa Sintética Aurora',claimantCpf:'000.000.000-00',insurerClaim:'TESTE-0637',hsClaim:'TESTE-LOCAL',regulatorName:'Regulador de Teste',regulatorCpf:'529.982.247-25',regulatorOpinion:'PARECER MANUAL DE TESTE — análise independente da seleção contratual.',documentaryNarrative:'Documentos locais conferidos para validação funcional.',occurrenceNarrative:'Ocorrência sintética para validação de exportação.',occurrenceNarrativeMode:'custom',inspectionNarrative:'Vistoria sintética para validação.',inspectionNarrativeMode:'custom'});
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=300;const x=c.getContext('2d');x.fillStyle='#eef4f7';x.fillRect(0,0,640,300);x.fillStyle='#123456';x.font='24px Arial';x.fillText('IMAGEM SINTÉTICA DE VALIDAÇÃO',60,150);return c.toDataURL('image/png');});
  shell.map={dataUrl:image,fit:'contain',posX:50,posY:50};shell.photos=[{id:'photo',dataUrl:image,caption:'IMAGEM DE TESTE',fit:'contain',posX:50,posY:50}];shell.causeEvidence=[];shell.damages=[fixture.damage(10000),fixture.damage(20000,{id:'d2'})];shell.contract.review={...fixture.review(),vrBuildings:'200000',vrAnimals:'80000'};shell.signatures={regulator:null,claimant:null};shell.signatureDetails={regulator:null,claimant:null};
  await restore(shell);await step(3);await page.locator('#policyCalculationReview details').evaluate(e=>e.open=true);await page.locator('#policyReviewConfirmed').uncheck();await page.locator('#policyCalculationReview details').evaluate(e=>e.open=true);await page.locator('#policyReviewConfirmed').check();s=await current();const originalVersion=s.contract.versionId;
  const computed=await page.evaluate(s=>FastTrackPolicies.calculate(s),s);assert.equal(computed.deductible,process.env.FT_REFERENCE?4500:3000);assert.equal(computed.net,process.env.FT_REFERENCE?null:27000);assert.equal(computed.estimatedNet,process.env.FT_REFERENCE?25500:27000);
  // Registry update cannot alter the current report.
  await step(1);await page.locator('#policyManager').evaluate(e=>e.open=true);await click('edit');await page.locator('#po_produto').fill('Produto alterado apenas no cadastro de teste');await click('save');
  s=await current();assert.equal(s.contract.versionId,originalVersion);assert.equal(s.contract.data.operacao.produto,source.operacao.produto);
  assert.match(await page.locator('#policyCase').innerText(),/conserva a versão anterior/);
  await action('save-draft');await page.waitForTimeout(700);await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);s=await current();assert.equal(s.contract.versionId,originalVersion);assert.equal(s.damages.length,2);assert.equal(s.photos.length,1);
  result.checks.push('Snapshot and manual opinion/VR survive registry updates, reload and case backup; damages/photos persist');
  // Independent registry backup + fresh-context restoration.
  await step(1);await page.locator('#policyManager').evaluate(e=>e.open=true);let wait=page.waitForEvent('download');await click('backup');const registryFile=path.join(out,'backup-privado-apolices.json');await(await wait).saveAs(registryFile);
  const fresh=await browser.newContext(),page2=await fresh.newPage();if(process.env.FT_DOCX_LIB)await page2.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));await page2.goto(page.url());await page2.waitForFunction(()=>document.querySelector('#saveStatus').textContent);await page2.locator('#policyRestore').setInputFiles(registryFile);await page2.waitForFunction(()=>FastTrackPolicyUI.getRegistry().versions.length>0);const restored=await page2.evaluate(()=>FastTrackPolicyUI.getRegistry());assert.deepEqual(restored,JSON.parse(fs.readFileSync(registryFile,'utf8')));await fresh.close();
  result.checks.push('Separate registry backup restores all immutable versions, confirmed bindings and verified PDF bytes in a fresh browser context');
  if(process.env.FT_EXPORTS){
   const ids=process.env.FT_REFERENCE?['vendaval_b','danos_eletricos','desmoronamento','lucros_cessantes']:['wind','electric','collapse','lc'];
   const cases=ids.map(id=>({tag:id,id}));cases.push({tag:'sublimite',id:covId,sub:source.sublimites[0]?.id});cases.push({tag:'multiplas-coberturas',ids:[ids[0],ids[1]]});
   for(const item of cases){
    const report=structuredClone(s);report.fields.regulatorOpinion='PARECER MANUAL DE TESTE — análise independente da seleção contratual.';
    await page.evaluate(({report,item})=>{FastTrackPolicies.chooseCoverages(report,item.ids || [item.id]);}, {report,item});
    const ready=await page.evaluate(({report,item,review})=>{FastTrackPolicies.chooseCoverages(report,item.ids || [item.id]);report.contract.review=review;report.damages.forEach((d,i)=>{d.coverageId=item.ids?item.ids[i%item.ids.length]:item.id;d.sublimitId=item.sub || '';});report.contract.review.basis=FastTrackPolicies.reviewBasis(report);return report;},{report,item,review:{...fixture.review(),vrBuildings:'200000',vrAnimals:'80000'}});
    await restore(ready);await step(7);const actual=await current();const rows=await page.evaluate(s=>FastTrackPolicies.reportRows(s),actual);const preview=normalize(await page.locator('#reportPreview').innerText());for(const [a,b] of rows){assert(preview.includes(normalize(a)),`${item.tag}: missing heading`);assert(preview.includes(normalize(b)),`${item.tag}: missing fact ${a}`);}assert(preview.includes('PARECER MANUAL DE TESTE'));
    const layout=await page.locator('#reportPreview .report-page').evaluateAll(ps=>ps.map(p=>{const c=p.querySelector('.report-content');return {height:c.clientHeight,scroll:c.scrollHeight,width:c.clientWidth,scrollWidth:c.scrollWidth};}));
    assert(layout.every(p=>p.scroll<=p.height+1&&p.scrollWidth<=p.width+1),`${item.tag}: report overflow ${JSON.stringify(layout)}`);
    for(let i=0;i<layout.length;i++)await page.locator('#reportPreview .report-page').nth(i).screenshot({path:path.join(out,`${item.tag}-preview-${i+1}.png`),style:'.app-footer{visibility:hidden}'});
    wait=page.waitForEvent('download');await page.locator('[data-action="export-word"]').click();await(await wait).saveAs(path.join(out,`${item.tag}.docx`));
    await page.evaluate(()=>{window.print=()=>{};});await page.locator('[data-action="export-pdf"]').click();await page.pdf({path:path.join(out,`${item.tag}.pdf`),format:'A4',printBackground:true,preferCSSPageSize:true});
    fs.writeFileSync(path.join(out,`${item.tag}.json`),JSON.stringify(actual,null,2));result.cases.push({tag:item.tag,pages:layout.length,rows,calculation:await page.evaluate(s=>FastTrackPolicies.calculate(s),actual)});console.log(`PASS export ${item.tag}: ${layout.length} pages`);
   }
  }
  await restore(s);await step(1);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});await page.locator('#policyManager').evaluate(e=>e.open=false);await page.locator('#policyCase').screenshot({path:path.join(out,`policy-${width}.png`)});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1),`UI overflow ${width}`);}
  await page.setViewportSize({width:1440,height:1000});await selectRecord('lar');assert.equal((await current()).contract,null);assert.equal(await page.locator('#policyNumber').inputValue(),'');
  await restore(s);await step(1);await page.locator('#lossDate').fill('2027-01-01');assert.equal((await current()).contract,null);
  await restore(s);await step(1);await page.locator('#cooperatorSelectedPanel .cooperator-adjustments').evaluate(e=>e.open=true);await page.locator('[data-coop-field="vrBuildings"]').fill('123456');const manual=await current();assert.equal(manual.cooperatorSelection.confirmed.vrBuildings,'123456');assert.equal(manual.cooperatorSelection.fieldSources.vrBuildings.type,'manual');assert.equal(manual.contract.versionId,s.contract.versionId);
  result.checks.push('Other-company property and out-of-period dates never inherit contract; manual VR remains separate with its origin; desktop/mobile have no horizontal overflow');
  // Two confirmed contracts must leave the choice to the regulator.
  await restore(s);await step(1);await page.locator('#policyManager').evaluate(e=>e.open=true);
  const second=structuredClone(source);second.operacao.id='contract-ambiguity-test';second.operacao.numero_apolice='TEST-MULTI';
  await page.locator('#policyImport').setInputFiles({name:'segunda-apolice-teste.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(second))});await page.waitForFunction(()=>!document.querySelector('#policyEditor').hidden);await click('save');
  await page.waitForFunction(()=>FastTrackPolicyUI.getRegistry().active['contract-ambiguity-test']);
  const secondVersion=await page.evaluate(()=>FastTrackPolicyUI.getRegistry().active['contract-ambiguity-test']);await page.locator('#policyChoice').selectOption(secondVersion);await page.locator('#policyBinding').evaluate(e=>e.open=true);await page.locator('#policyBindFrom').fill('2025-01-01');await page.locator('#policyBindTo').fill('2026-12-31');await page.locator('#policyBindEvidence').fill('Segundo vínculo individual sintético para testar ambiguidade');await page.locator('#policyBindConfirmed').check();await click('bind');
  await page.waitForFunction(old=>FastTrackPolicyUI.getRegistry().active['contract-ambiguity-test']!==old,secondVersion);
  const ambiguous=structuredClone(s);for(const k of Object.keys(ambiguous.contract.autoFields))ambiguous.fields[k]='';ambiguous.contract=null;await restore(ambiguous);assert.equal((await current()).contract,null);assert.match(await page.locator('#policyCase').innerText(),/Mais de uma apólice/);
  await page.locator('#policyChoice').selectOption(await page.evaluate(()=>FastTrackPolicyUI.getRegistry().active['contract-ambiguity-test']));await click('apply');assert.equal(await page.locator('#policyNumber').inputValue(),'TEST-MULTI');
  result.checks.push('Two compatible documented contracts require explicit choice in the UI; selecting one applies exactly that contract');
  assert.deepEqual(result.errors,[]);result.success=true;
 }catch(e){result.failure=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));await browser.close();server.close();console.log(JSON.stringify({success:result.success,checks:result.checks,cases:result.cases.length,errors:result.errors,failure:result.failure}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
