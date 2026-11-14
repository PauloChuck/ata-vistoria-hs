// Synthetic acceptance cases only. Evidence and exports stay outside the repository.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),fixture=require('./policies-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT;
if(!out||path.resolve(out)===root||path.resolve(out).startsWith(root+path.sep))throw Error('Set private FT_OUT outside repository');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const result={checks:[],exports:[],errors:[],success:false};
const normalize=s=>s.replace(/\s+/g,' ').trim();
const labels=['Total de Prejuízos Reclamados','Total de Prejuízos Apurados','Franquia contratual','Prejuízo Indenizável'];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('dialog',d=>d.accept());
 if(process.env.FT_DOCX_LIB)await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));
 const action=async a=>page.locator(`[data-action="${a}"]`).first().evaluate(e=>e.click());
 const step=async n=>page.locator(`[data-go="${n}"]`).first().evaluate(e=>e.click());
 // Use the visible control and a real click: browsers can throttle repeated synthetic downloads.
 const backup=async()=>{const previous=await page.locator('.screen.active').getAttribute('data-step');await step(7);const w=page.waitForEvent('download');await page.locator('[data-action="export-backup"]').click();const saved=JSON.parse(fs.readFileSync(await(await w).path(),'utf8'));await step(previous);return saved;};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'sintetico.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>document.querySelector('#backupInput').value==='');await step(3);};
 const calc=async()=>page.evaluate(s=>FastTrackV06Report.calculate(s),await backup());
 async function assertSummary(expected){const c=await calc();for(const [key,value] of Object.entries(expected))assert.equal(c[key],value,key);const values=await page.locator('#financialSummary .financial-card').evaluateAll(es=>es.map(e=>({label:e.querySelector('span').textContent,value:e.querySelector('strong').textContent})));assert.deepEqual(values.map(v=>v.label),labels);for(let i=0;i<4;i++)assert.equal(normalize(values[i].value),normalize(await page.evaluate(n=>FastTrackSettlement.money(n),c[['totalClaimed','totalAssessed','deductible','net'][i]])));return c;}
 async function exportCase(tag){
  await step(7);const state=await backup(),c=await calc(),card=await page.evaluate(s=>FastTrackRiskCard.data(s),state);
  const summary=await page.locator('#reportPreview .financial-summary-clean').innerText();
  for(const label of labels)assert(summary.includes(label));
  for(const key of ['totalClaimed','totalAssessed','deductible','net'])assert(normalize(summary).includes(normalize(await page.evaluate(n=>FastTrackSettlement.money(n),c[key]))));
  const preview=await page.locator('#reportPreview').innerText();assert(!/Líquido após conferência|Conferência da apuração|Item\/local:|Grupo do bem a confirmar/.test(preview));
  for(const g of card.groups)for(const field of g.fields||[])assert(normalize(preview).includes(normalize(field.value)));
  assert(!/R\$/.test(await page.locator('#reportPreview .survey-damage-list').innerText()));
  const layout=await page.locator('#reportPreview .report-page').evaluateAll(ps=>ps.map(p=>{const c=p.querySelector('.report-content');return {height:c.clientHeight,scroll:c.scrollHeight,width:c.clientWidth,scrollWidth:c.scrollWidth};}));
  assert(layout.every(x=>x.scroll<=x.height+1&&x.scrollWidth<=x.width+1),'report overflow');
  const w=page.waitForEvent('download');await action('export-word');await(await w).saveAs(path.join(out,tag+'.docx'));
  await page.evaluate(()=>window.print=()=>{});await action('export-pdf');await page.pdf({path:path.join(out,tag+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  fs.writeFileSync(path.join(out,tag+'.json'),JSON.stringify(state,null,2));result.exports.push({tag,calculation:c,card,pages:layout.length});await step(3);
 }
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);await action('load-example');
  let base=await backup();
  base=await page.evaluate(({s,contract,selection})=>{
   const p=FastTrackPolicies;p.apply(s,p.saveVersion(p.emptyRegistry(),contract).version);p.chooseCoverages(s,['wind','electric']);s.contract.review={confirmed:false,evidence:'EVIDÊNCIA ANTIGA PRESERVADA',balanceConfirmed:false,vrBuildings:'1',vrAnimals:'0',basis:'obsoleta'};
   const record=(id,extra={})=>({id,name:'Pessoa de teste',activity:'Aves',municipality:'Cidade sintética',category:'Cadastro',vrBuildings:'100000',vrAnimals:'50000',raw:{origem:id},...extra});
   const rs=[record('A'),record('B',{activity:'Suínos',vrBuildings:'200000',vrAnimals:'80000'}),...Array.from({length:6},(_,i)=>record('history'+i,{category:'Endosso',reference:'01.2025'}))];
   const c=FastTrackProperty.create(rs,'Propriedade de Teste');FastTrackProperty.assign(c,['A'],{kind:'new',label:'Aviário A',applicable:true});FastTrackProperty.assign(c,['B'],{kind:'new',label:'Pocilga B',applicable:true});FastTrackProperty.assign(c,rs.slice(2).map(x=>x.id),{kind:'unit',unitId:c.units[0].id});c.complete=true;c.units[0].affected=true;selection.composition=c;s.cooperatorSelection=FastTrackProperty.sync(selection);
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=300;const x=canvas.getContext('2d');x.fillStyle='#edf4f7';x.fillRect(0,0,640,300);x.fillStyle='#123456';x.font='22px Arial';x.fillText('IMAGEM DE TESTE',80,150);const image=canvas.toDataURL('image/png');
   s.map={dataUrl:image,fit:'contain',posX:50,posY:50};s.photos=[{id:'photo',dataUrl:image,caption:'Fotografia de teste',fit:'contain',posX:50,posY:50}];s.fields.regulatorName='Regulador de Teste';s.fields.regulatorCpf='529.982.247-25';s.fields.insurerClaim='TESTE-0639';s.fields.regulatorOpinion='PARECER PRESERVADO';FastTrackSignatures.set(s,'regulator',{dataUrl:image,width:640,height:300},{type:'uploaded'});return s;
  },{s:base,contract:fixture.contract(),selection:fixture.selection()});
  base.damages=[fixture.damage('12430',{claimedTotal:'15000',quantity:'100',coverageId:'wind',insuredUnit:'Local antigo',assetClass:'buildings',sublimitId:'asset'})];
  await restore(base);const original=await backup();
  assert.equal(await page.locator('#policyCalculationReview,[data-damage="coverageId"],[data-damage="insuredUnit"],[data-damage="assetClass"],[data-damage="sublimitId"],[id^="policyReview"],#policyVrBuildings,#policyVrAnimals').count(),0);
  assert.equal(await page.locator('#policyChoice').count(),1);assert.equal(await page.locator('[data-policy-coverage]:checked').count(),2);
  assert.deepEqual((await backup()).contract.review,base.contract.review);assert.deepEqual((await backup()).signatures,base.signatures);
  result.checks.push('Legacy review controls absent; general policy/coverages and old values, photographs, text, signatures and history preserved');
  for(const [tag,assessed,deductible,net] of [['apurado-12430',12430,3000,9430],['apurado-40000',40000,6000,34000],['apurado-2500',2500,3000,0]]){
   await page.locator('[data-damage="assessedTotal"]').fill(String(assessed));await assertSummary({totalClaimed:15000,totalAssessed:assessed,deductible,net});
   const saved=await backup();await action('save-draft');await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);await step(3);await assertSummary({totalAssessed:assessed,deductible,net});const reloaded=await backup();
   for(const key of ['damages','photos','map','contract','cooperatorSelection','signatures','signatureDetails'])assert.deepEqual(reloaded[key],saved[key],key);
   assert.deepEqual(reloaded.cooperatorSelection.composition,original.cooperatorSelection.composition);assert.equal(reloaded.fields.regulatorOpinion,'PARECER PRESERVADO');
   await restore(reloaded);await assertSummary({totalAssessed:assessed,deductible,net});if(process.env.FT_EXPORTS)await exportCase(tag);
  }
  result.checks.push('Three requested calculations update immediately and match after save/reopen and backup restore');
  await page.locator('[data-damage="assessedTotal"]').fill('0');await page.locator('[data-damage="claimedTotal"]').fill('999');await assertSummary({totalClaimed:999,totalAssessed:0,deductible:3000,net:0});assert.equal((await backup()).damages[0].assessedTotal,'0');
  await page.locator('[data-damage="assessedTotal"]').fill('');await assertSummary({totalAssessed:null,deductible:null,net:null});assert.match(await page.locator('#damageCalculationPending').innerText(),/Item 1.*informe o valor apurado/);if(process.env.FT_EXPORTS)await exportCase('apurado-pendente');
  await action('accept-claimed');await assertSummary({totalAssessed:999,deductible:3000,net:0});
  await action('add-damage');assert.equal((await calc()).net,null);let cards=page.locator('.damage-card');await cards.nth(1).locator('[data-damage="description"]').fill('Serviço novo');await cards.nth(1).locator('[data-damage="quantity"]').fill('200');await cards.nth(1).locator('[data-damage="unit"]').fill('un.');await cards.nth(1).locator('[data-damage="age"]').fill('0');await cards.nth(1).locator('[data-damage="claimedTotal"]').fill('39001');await cards.nth(1).locator('[data-damage="assessedTotal"]').fill('39001');await assertSummary({totalAssessed:40000,deductible:6000,net:34000});
  await cards.nth(1).locator('[data-action="move-damage-up"]').click();assert.equal((await backup()).damages[0].description,'Serviço novo');await assertSummary({net:34000});await cards.nth(0).locator('[data-action="move-damage-down"]').click();await assertSummary({net:34000});
  await cards.nth(1).locator('[data-action="remove-damage"]').click();await assertSummary({totalAssessed:999,net:0});await cards.nth(0).locator('[data-action="remove-damage"]').click();await assertSummary({totalClaimed:0,totalAssessed:0,deductible:0,net:0});
  result.checks.push('Zero never replaced by claimed; blank identifies item; accept/add/edit/reorder/remove recalculate; no items zero all totals');
  await restore(original);for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1),`overflow ${width}`);await page.locator('[data-step="3"]').screenshot({path:path.join(out,`danos-${width}.png`)});}
  assert.deepEqual(result.errors,[]);result.success=true;
 }catch(e){result.failure=String(e);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,'settlement-browser-results.json'),JSON.stringify(result,null,2));await browser.close();server.close();console.log(JSON.stringify({...result,exports:result.exports.map(x=>({tag:x.tag,calculation:x.calculation,pages:x.pages}))},null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
