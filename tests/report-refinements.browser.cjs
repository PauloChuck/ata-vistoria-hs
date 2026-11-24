// Synthetic cases only. Exports must remain outside the public repository.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),fixture=require('./aurora-report-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT;
if(!out||path.resolve(out)===root||path.resolve(out).startsWith(root+path.sep))throw Error('Set private FT_OUT outside repository');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const result={checks:[],exports:[],errors:[],success:false};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Sao_Paulo',acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));
 const step=async n=>page.locator(`[data-go="${n}"]`).first().evaluate(e=>e.click());
 const action=async a=>page.locator(`[data-action="${a}"]`).first().evaluate(e=>e.click());
 const backup=async()=>{const previous=await page.locator('.screen.active').getAttribute('data-step');await step(7);const w=page.waitForEvent('download');await page.locator('[data-action="export-backup"]').click();const s=JSON.parse(fs.readFileSync(await(await w).path(),'utf8'));await step(previous);return s;};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>document.querySelector('#backupInput').value==='');};
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);
  const opinion=await page.evaluate(()=>FastTrackReportRefinements.opinion);
  let s=await backup();assert.equal(s.fields.inspectionDate,'');assert.equal(s.fields.regulatorOpinion,opinion);assert(s.fields.inspectionNarrative.includes('[data da vistoria]'));
  await action('load-example');s=await backup();
  s=await page.evaluate(({s,data})=>{
   FastTrackPolicies.apply(s,FastTrackPolicies.saveVersion(FastTrackPolicies.emptyRegistry(),data).version);
   const make=(w,h,label)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#f1f5f8';x.fillRect(0,0,w,h);x.fillStyle='#2784ac';x.fillRect(20,20,w-40,h-40);x.fillStyle='#fff';x.font='28px Arial';x.fillText(label,40,70);x.fillText('Imagem sintética',40,115);return c.toDataURL();};
   s.map={dataUrl:make(900,500,'MAPA'),fit:'contain',posX:50,posY:50};
   s.photos=Array.from({length:13},(_,i)=>({id:'photo-'+i,dataUrl:make(i%2?400:800,i%2?800:500,'FOTO '+(i+1)),caption:`Registro ${i+1}: `+(i%3===0?'Legenda extensa de validação: detalhes da instalação, pontos observados durante a vistoria e identificação dos danos, com descrição completa preservada junto da fotografia. '.repeat(2):'Vista geral da instalação sintética.')}));
   s.causeEvidence=[{id:'e1',name:'evidencia.png',mime:'image/png',dataUrl:make(900,500,'EVIDÊNCIA 4.2'),caption:'Evidência separada do registro fotográfico.'}];
   s.documents=[{id:'doc1',name:'Documento sintético'}];
   Object.assign(s.fields,{claimantName:'Cooperado de Teste',regulatorName:'Regulador de Teste',regulatorCpf:'529.982.247-25',claimantCpf:'529.982.247-25',regulatorOpinion:'Parecer personalizado preservado.',lossDate:'2026-11-03',noticeDate:'2026-11-04',scheduleDate:'2026-11-05',inspectionDate:'2026-11-10',reportDate:'2026-11-20',inspectionNarrativeMode:'custom',inspectionNarrativeDate:'2026-11-10',inspectionNarrative:'Sinistro em 10/11/2026. Em vistoria presencial realizada no dia 10 de novembro de 2026, constatamos danos específicos. Aviso em 10/11/2026.'});
   for(const role of ['regulator','claimant'])FastTrackSignatures.set(s,role,{dataUrl:make(700,220,'ASSINATURA DE TESTE'),width:700,height:220},{type:role==='regulator'?'uploaded':'drawn'});
   return s;
  },{s,data:fixture.contract()});
  s.damages=[fixture.damage(12430)];await restore(s);
  // The six-base importer and property snapshot survive a query reset.
  const data={lar:{synthetic:{nome:'Cooperado de Teste',inicial:[{aviario:'LOCAL-A',municipio:'Cidade Teste',latitude:-20,longitude:-50,areaM2:100,quantidadeAves:20,vrTotalEstruturas:1000,vrTotalAves:2000}],endossos:[],trocas:[]}}};
  await page.locator('#cooperatorBaseInput').setInputFiles({name:'synthetic.html',mimeType:'text/html',buffer:Buffer.from(`<script>const DATA=${JSON.stringify(data)};</script>`)});await page.waitForFunction(()=>!document.querySelector('#cooperatorBaseInput').value);
  await step(1);await page.locator('#cooperatorSearch').fill('Cooperado de Teste');await page.locator('#cooperatorResults [data-action="use-cooperator-record"]').click();
  await page.locator('#cooperatorCooperativeFilter').selectOption({index:1});await page.locator('#cooperatorActivityFilter').selectOption({index:1});
  const filters=await page.locator('#cooperatorCooperativeFilter,#cooperatorActivityFilter').evaluateAll(es=>es.map(e=>e.value));
  await step(3);await page.locator('#inspectionDate').fill('2026-12-01');await page.locator('#inspectionDate').press('Tab');
  const expected='Sinistro em 10/11/2026. Em vistoria presencial realizada no dia 01 de dezembro de 2026, constatamos danos específicos. Aviso em 10/11/2026.';
  assert.equal(await page.locator('#inspectionNarrative').inputValue(),expected);
  const saved=await backup();assert.equal(saved.fields.regulatorOpinion,'Parecer personalizado preservado.');assert.equal(saved.fields.lossDate,'2026-11-03');assert.equal(saved.fields.reportDate,'2026-11-20');
  await action('save-draft');await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);
  assert.equal(await page.locator('#cooperatorSearch').inputValue(),'');assert.equal(await page.locator('#cooperatorResults').innerText(),'');assert.equal(await page.locator('#cooperatorSearchNotice').innerText(),'Digite parte do nome do cooperado ou integrado.');
  assert.deepEqual(await page.locator('#cooperatorCooperativeFilter,#cooperatorActivityFilter').evaluateAll(es=>es.map(e=>e.value)),filters);assert.equal(await page.evaluate(()=>FastTrackCooperators.getBase().totalDetailedRecords),1);
  const reopened=await backup();for(const key of ['fields','cooperatorSelection','damages','photos','documents','causeEvidence','map','contract','signatures','signatureDetails'])assert.deepEqual(reopened[key],saved[key],key);
  await restore(reopened);assert.deepEqual((await backup()).fields,reopened.fields);
  result.checks.push('Reload clears query/results only; imported base, filters and entire saved case/backup preserved','Inspection date synchronizes custom narrative and chronology without altering loss/notice/schedule/report dates');
  // Reapply synthetic signatures after legitimate edits (existing invalidation rules).
  s=await page.evaluate(s=>{for(const role of ['regulator','claimant']){const image=s.signatureDetails[role]?.dataUrl||s.signatures[role];if(image)FastTrackSignatures.set(s,role,{dataUrl:image,width:700,height:220},{type:role==='regulator'?'uploaded':'drawn'});}return s;},saved);
  // Explicit migration must not alter completion or contractual/financial state.
  for(const old of ['', 'Análise de cobertura pendente de conclusão pelo regulador.','Parecer personalizado preservado.']){
   const variant=structuredClone(s);variant.fields.regulatorOpinion=old;variant.finalizedAt='2026-11-20T12:00:00Z';await restore(variant);const migrated=await backup();assert.equal(migrated.fields.regulatorOpinion,old==='Parecer personalizado preservado.'?old:opinion);assert.equal(migrated.finalizedAt,variant.finalizedAt);assert.deepEqual(migrated.contract,variant.contract);assert.deepEqual(migrated.damages,variant.damages);
  }
  result.checks.push('Exact opinion default on new/empty/old-default cases; custom opinion and completion state preserved');
  for(const count of [1,4,6,7,12,13]){
   const sample=structuredClone(s);sample.photos=s.photos.slice(0,count);await restore(sample);await step(7);
   await page.waitForFunction(()=>[...document.querySelectorAll('#reportPreview img')].every(i=>i.complete&&i.naturalWidth));
   const report=await page.locator('#reportPreview').innerText();assert(!report.includes('REGISTRO FOTOGRÁFICO — CONTINUAÇÃO'));assert.equal(report.split('REGISTRO FOTOGRÁFICO').length-1,1);assert(report.includes(expected));assert(report.includes('Data da realização da vistoria\n01/12/2026'));assert(report.includes('Parecer personalizado preservado.'));
   const groups=await page.locator('#reportPreview .survey-photo-page').evaluateAll(ps=>ps.map(p=>p.querySelectorAll('img').length));assert.equal(groups.reduce((a,b)=>a+b,0),count);assert(groups.every(n=>n>=1&&n<=6));
   assert(report.includes('4.2 LEVANTAMENTOS DOCUMENTAIS'));assert(!report.includes('LAVANTAMENTOS'));assert(!report.includes('IMAGENS E ARQUIVOS'));
   assert(await page.locator('#reportPreview .report-content').evaluateAll(cs=>cs.every(c=>c.scrollHeight<=c.clientHeight+1&&c.scrollWidth<=c.clientWidth+1)),'page overflow');
   const images=await page.locator('#reportPreview .report-content img').evaluateAll(is=>is.map(i=>({signature:!!i.closest('.signature-image-frame'),outline:getComputedStyle(i).outlineStyle,ratio:i.getBoundingClientRect().width/i.getBoundingClientRect().height,natural:i.naturalWidth/i.naturalHeight})));
   assert(images.every(i=>i.outline===(i.signature?'none':'solid')&&Math.abs(i.ratio-i.natural)<0.02));
   assert.equal(await page.locator('#reportPreview .photo-cell-report').count(),count);assert.equal(await page.locator('#reportPreview .cause-evidence-cell-report img').count(),1);
   const tag='photos-'+count;let w=page.waitForEvent('download');await page.locator('[data-action="export-word"]').click();await(await w).saveAs(path.join(out,tag+'.docx'));
   await page.evaluate(()=>window.print=()=>{});await page.locator('[data-action="export-pdf"]').click();await page.pdf({path:path.join(out,tag+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
   if(count===13){for(const [i,p] of (await page.locator('#reportPreview .report-page').all()).entries())await p.screenshot({path:path.join(out,`preview-page-${i+1}.png`)});fs.writeFileSync(path.join(out,'synthetic.json'),JSON.stringify(await backup(),null,2));}
   result.exports.push({count,groups,tag});
  }
  result.checks.push('1/4/6/7/12/13 photos, portrait images, long captions, at most two columns/three rows, no continuation title or empty frames; Word/PDF generated','Only signatures are unframed; all other images remain outlined; evidence/map stay outside the photo grid');assert.deepEqual(result.errors,[]);result.success=true;
 }catch(e){result.failure=String(e);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close();server.close();console.log(JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
