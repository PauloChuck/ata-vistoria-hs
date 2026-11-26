// Synthetic by default. Optional private references and all exports stay outside the checkout.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),fixture=require('./policy-broker-fixture.cjs'),base=require('./policies-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT;
if(!out||path.resolve(out).toLowerCase().startsWith(root.toLowerCase()+path.sep)||path.resolve(out).toLowerCase()===root.toLowerCase())throw Error('Set private FT_OUT outside checkout');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const results={checks:[],cases:[],errors:[],success:false},norm=s=>s.replace(/\s+/g,' ').trim();
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>results.errors.push(String(e)));page.on('dialog',d=>d.accept());
 async function open(p){if(process.env.FT_DOCX_LIB)await p.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));await p.goto('http://127.0.0.1:'+server.address().port+'/fast_track/v062.html');await p.waitForFunction(()=>document.querySelector('#saveStatus').textContent);}
 const step=async n=>page.locator('[data-go="'+n+'"]').first().evaluate(e=>e.click());
 const action=async a=>page.locator('[data-action="'+a+'"]').first().evaluate(e=>e.click());
 const policy=async a=>page.locator('[data-policy="'+a+'"]').first().click();
 const registry=()=>page.evaluate(()=>FastTrackPolicyUI.getRegistry());
 const backup=async()=>{await step(7);const w=page.waitForEvent('download');await action('export-backup');return JSON.parse(fs.readFileSync(await(await w).path(),'utf8'));};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>!document.querySelector('#backupInput').value);};
 async function save(){const count=(await registry()).versions.length;await policy('save');await page.waitForFunction(n=>FastTrackPolicyUI.getRegistry().versions.length===n+1,count);}
 async function importPolicy(data,pdfDir=''){
  await step(1);await page.locator('#policyManager').evaluate(e=>e.open=true);await page.locator('#policyImport').setInputFiles({name:'private-reference.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>!document.querySelector('#policyEditor').hidden);assert.equal(await page.locator('#po_corretora_relatorio').inputValue(),data.operacao.corretora_relatorio||'');
  if(pdfDir)for(const d of data.documentos){await page.locator('#policyDocumentId').selectOption(d.id);await page.locator('#policyPdfInput').setInputFiles(path.join(pdfDir,d.arquivo));await page.waitForFunction(hash=>document.querySelector('#policyEditor').textContent.includes(hash),d.sha256);}
  await save();const saved=(await registry()).versions.at(-1);
  for(const key of ['corretagem','clausulas_administrativas','criterios_apuracao','regra_operacional_fast_track'])if(data[key])assert.deepEqual(saved.data[key],data[key],key);
  if(pdfDir){assert.equal(saved.pdfs.length,data.documentos.length);for(const d of data.documentos)assert.equal(saved.pdfs.find(p=>p.documentId===d.id).sha256,d.sha256);}
 }
 async function exportCase(tag){
  await step(7);await page.waitForFunction(()=>[...document.querySelectorAll('#reportPreview img')].every(i=>i.complete&&i.naturalWidth));
  const s=await backup(),rows=await page.evaluate(s=>FastTrackPolicies.reportRows(s),s),body=norm(await page.locator('#reportPreview').innerText());
  for(const row of rows)for(const cell of row)assert(body.includes(norm(cell)),tag+': '+cell);
  for(const key of ['insured','policyNumber','productName','broker'])assert(body.includes(norm(s.fields[key].toLocaleUpperCase('pt-BR'))),key);
  assert(body.includes('9.430,00')&&body.includes('3.000,00'));assert(body.includes('4.2 LEVANTAMENTOS DOCUMENTAIS'));assert(!body.includes('REGISTRO FOTOGRÁFICO — CONTINUAÇÃO'));
  assert(await page.locator('#reportPreview .report-content').evaluateAll(es=>es.every(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1)));
  assert(body.indexOf('Localização da propriedade sinistrada.')<body.indexOf('CONSULTA DE COOPERADOS'));
  const w=page.waitForEvent('download');await action('export-word');await(await w).saveAs(path.join(out,tag+'.docx'));
  await page.evaluate(()=>window.print=()=>{});await action('export-pdf');await page.pdf({path:path.join(out,tag+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  for(const [i,p] of(await page.locator('#reportPreview .report-page').all()).entries())await p.screenshot({path:path.join(out,tag+'-page-'+(i+1)+'.png')});
  fs.writeFileSync(path.join(out,tag+'.json'),JSON.stringify(s,null,2));results.cases.push({tag,rows,fields:{insured:s.fields.insured,policyNumber:s.fields.policyNumber,productName:s.fields.productName,broker:s.fields.broker}});
 }
 try{
  await open(page);await action('load-example');
  let s=await backup();Object.assign(s.fields,{claimantName:'Pessoa de Teste',claimantCpf:'529.982.247-25',regulatorName:'Regulador de Teste',regulatorCpf:'529.982.247-25',regulatorOpinion:'Parecer personalizado preservado.',broker:'Valor anterior',inspectionDate:'2026-11-25'});s.damages=[fixture.damage(12430)];s.cooperatorSelection=fixture.selection();s.documents=[{name:'Documento sintético preservado'}];
  s=await page.evaluate(s=>{const c=document.createElement('canvas');c.width=800;c.height=400;const x=c.getContext('2d');x.fillStyle='#dcecf4';x.fillRect(0,0,800,400);x.fillStyle='#123456';x.font='28px Arial';x.fillText('VALIDAÇÃO SINTÉTICA',40,100);const dataUrl=c.toDataURL();s.map={dataUrl,fit:'contain',posX:50,posY:50};s.photos=[{id:'photo-test',dataUrl,caption:'Foto de teste preservada.'}];for(const role of ['regulator','claimant'])FastTrackSignatures.set(s,role,{dataUrl,width:800,height:400},{type:'uploaded'});return s;},s);await restore(s);const untouched=await backup();
  const a=process.env.FT_REFERENCE_A?JSON.parse(fs.readFileSync(process.env.FT_REFERENCE_A,'utf8')):base.contract(),b=process.env.FT_REFERENCE?JSON.parse(fs.readFileSync(process.env.FT_REFERENCE,'utf8')):fixture.contract();if(!process.env.FT_REFERENCE_A)a.operacao.corretora_relatorio='Corretora do contrato A';
  assert.equal(b.coberturas.length,9);assert.equal(b.sublimites.length,4);await importPolicy(a);await importPolicy(b,process.env.FT_PDF_DIR||'');assert.equal((await registry()).versions.length,2);
  if(process.env.FT_REFERENCE){const all=await registry(),v=all.versions.find(v=>v.id===b.operacao.id);fs.writeFileSync(path.join(out,'cadastro-privado-validado.json'),JSON.stringify({...all,versions:[v],active:{[v.id]:v.versionId}},null,2));}
  const ids=(await registry()).active,wind=b.coberturas.find(c=>/vendaval/i.test(c.nome_contratual)),electric=b.coberturas.find(c=>/el.tric/i.test(c.nome_contratual));assert(wind&&electric);
  for(const data of [b,a,b]){
   await step(1);const oldBroker=await page.locator('#broker').inputValue();await page.locator('#policyInsuredChoice').selectOption('');await page.locator('#policyChoice').selectOption(ids[data.operacao.id]);
   for(const [key,value] of Object.entries({companyGroup:data.operacao.empresa_grupo_exibicao,affiliatedCooperative:data.operacao.cooperativa_afiliada||'',insured:data.operacao.segurado_razao_social,insuredCnpj:data.operacao.segurado_cnpj,insurer:data.operacao.seguradora_lider,policyNumber:data.operacao.numero_apolice,productName:data.operacao.produto||'',broker:data.operacao.corretora_relatorio||oldBroker}))assert.equal(await page.locator('#'+key).inputValue(),value,key);
   const current=await backup();assert.deepEqual(current.contract.coverageIds,[]);assert.deepEqual(current.contract.sublimitIds,[]);for(const key of ['cooperatorSelection','photos','map','documents','signatures'])assert.deepEqual(current[key],untouched[key],key);
   assert.equal(current.fields.claimantName,untouched.fields.claimantName);assert.equal(current.fields.regulatorOpinion,untouched.fields.regulatorOpinion);assert.equal(current.damages[0].assessedTotal,12430);
   await step(1);await page.locator('[data-policy-coverage="'+data.coberturas[0].id+'"]').check();
  }
  results.checks.push('Two policies coexist; B/A/B refreshes identity and broker, clears incompatible selections, preserves property, separate VR, items, photos, text and signature images');
  await step(1);await page.locator('#broker').fill('Outro valor manual');await page.locator('#broker').press('Tab');await page.locator('#policyInsuredChoice').selectOption('');await page.locator('#policyInsuredChoice').selectOption(await page.evaluate(d=>FastTrackPolicies.insuredKey(d),b));assert.equal(await page.locator('#broker').inputValue(),b.operacao.corretora_relatorio);
  assert.equal(await page.locator('[data-policy-coverage]').count(),9);assert.equal(await page.locator('[data-policy-sublimit]').count(),4);await page.locator('[data-policy-coverage="'+wind.id+'"]').check();await exportCase('single-coverage');
  await step(1);await page.locator('[data-policy-coverage="'+wind.id+'"]').uncheck();await page.locator('[data-policy-coverage="'+electric.id+'"]').check();await page.locator('[data-policy-sublimit="'+b.sublimites[0].id+'"]').check();await exportCase('coverage-and-sublimit');
  const chosen=await backup();assert.deepEqual(chosen.contract.coverageIds,[electric.id]);assert.deepEqual(chosen.contract.sublimitIds,[b.sublimites[0].id]);
  await step(1);await page.locator('[data-policy-coverage="'+electric.id+'"]').uncheck();await page.locator('[data-policy-sublimit="'+b.sublimites[0].id+'"]').uncheck();const basic=b.coberturas.find(c=>c.franquia?.aplicacao_condicionada),rescue=b.coberturas.find(c=>c.franquia?.tipo==='sem_franquia');assert(basic&&rescue);await page.locator('[data-policy-coverage="'+basic.id+'"]').check();await page.locator('[data-policy-coverage="'+rescue.id+'"]').check();await exportCase('deductible-exceptions');
  await step(1);await page.locator('[data-policy-coverage="'+basic.id+'"]').uncheck();await page.locator('[data-policy-coverage="'+rescue.id+'"]').uncheck();for(const sub of b.sublimites)await page.locator('[data-policy-sublimit="'+sub.id+'"]').check();await exportCase('four-sublimits');const subs=await backup();assert.deepEqual(subs.contract.coverageIds,[]);assert.deepEqual(subs.contract.sublimitIds,b.sublimites.map(s=>s.id));
  results.checks.push('Only explicit selections appear; nine coverages and four sublimits remain distinct; administrative clause is not selectable; no fish-farming sublimit is selected automatically; contractual exceptions do not change the automatic settlement');
  await restore(chosen);await step(1);await page.locator('#policyManager').evaluate(e=>e.open=true);await page.locator('[data-policy="edit"][data-version="'+ids[b.operacao.id]+'"]').click();await page.locator('#po_corretora_relatorio').fill('Alteração só do catálogo');await save();const after=await backup();assert.deepEqual(after.contract,chosen.contract);assert.equal(after.fields.broker,chosen.fields.broker);
  await action('save-draft');await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);const reopened=await backup();for(const key of ['fields','contract','cooperatorSelection','photos','map','documents','damages','signatures','signatureDetails'])assert.deepEqual(reopened[key],after[key],key);
  await restore(reopened);assert.deepEqual((await backup()).fields,reopened.fields);
  await step(1);await page.locator('#policyManager').evaluate(e=>e.open=true);const w=page.waitForEvent('download');await policy('backup');const savedRegistry=path.join(out,'private-registry.json');await(await w).saveAs(savedRegistry);const second=await browser.newContext(),p=await second.newPage();await open(p);await p.locator('#policyRestore').setInputFiles(savedRegistry);await p.waitForFunction(()=>FastTrackPolicyUI.getRegistry().versions.length===3);assert.deepEqual(await p.evaluate(()=>FastTrackPolicyUI.getRegistry()),await registry());await second.close();
  results.checks.push('Catalog update never replaces saved case version or broker; save/reopen/restore and separate registry backup preserve data and documented brokers');
  assert.equal(await page.locator('#policyBinding,[id^="policyBind"],[data-damage-field="coverageId"]').count(),0);assert.deepEqual(results.errors,[]);results.success=true;
 }catch(e){results.failure=String(e);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();server.close();console.log(JSON.stringify({success:results.success,checks:results.checks,cases:results.cases.length,failure:results.failure}));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
