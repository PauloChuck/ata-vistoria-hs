// All contracts, names, images and amounts below are synthetic.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),fixture=require('./policies-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT;
if(!out||path.resolve(out)===root||path.resolve(out).startsWith(root+path.sep))throw Error('Set private FT_OUT outside repository');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const result={checks:[],exports:[],errors:[],success:false},norm=s=>s.replace(/\s+/g,' ').trim();
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('dialog',d=>d.accept());
 if(process.env.FT_DOCX_LIB)await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));
 const action=async a=>page.locator(`[data-action="${a}"]`).first().evaluate(e=>e.click());
 const step=async n=>page.locator(`[data-go="${n}"]`).first().evaluate(e=>e.click());
 const backup=async()=>{const previous=await page.locator('.screen.active').getAttribute('data-step');await step(7);const w=page.waitForEvent('download');await page.locator('[data-action="export-backup"]').click();const s=JSON.parse(fs.readFileSync(await(await w).path(),'utf8'));await step(previous);return s;};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>document.querySelector('#backupInput').value==='');await step(1);};
 async function verify(tag,names,{exportFiles=true}={}){
  const s=await backup(),expected=await page.evaluate(s=>FastTrackPolicies.reportRows(s),s);
  assert.deepEqual(expected.map(r=>r[0]),names);await step(7);
  const rows=page.locator('#reportPreview .coverage-report-table .coverage-report-row');
  const actual=await rows.evaluateAll(rs=>rs.map(r=>Array.from(r.children,c=>c.textContent)));
  assert.deepEqual(actual,expected);assert.equal(await page.locator('#reportPreview .policy-report-title').count(),0);
  const checks=await page.locator('#reportPreview .report-content').evaluateAll(contents=>contents.map(c=>({overflow:c.scrollHeight>c.clientHeight+1||c.scrollWidth>c.clientWidth+1,headings:[...c.querySelectorAll('.doc-section')].filter(h=>h.textContent==='3. COBERTURA RECLAMADA').map(h=>({header:h.nextElementSibling?.classList.contains('coverage-report-header'),rows:h.nextElementSibling?.nextElementSibling?.querySelectorAll('.coverage-report-row').length||0})),cells:[...c.querySelectorAll('.coverage-report-row>div')].map(x=>({overflow:x.scrollWidth>x.clientWidth+1,left:getComputedStyle(x).borderLeftWidth,right:getComputedStyle(x).borderRightWidth,align:getComputedStyle(x).textAlign,index:[...x.parentElement.children].indexOf(x)}))})));
  fs.writeFileSync(path.join(out,tag+'-layout.json'),JSON.stringify(checks,null,2));
  assert(checks.every(c=>!c.overflow),'page overflow');assert(checks.flatMap(c=>c.headings).every(h=>h.header&&h.rows>0),'heading/header detached from first row');
  assert(checks.flatMap(c=>c.cells).every(c=>!c.overflow&&c.left==='0px'&&c.right==='0px'&&c.align===(c.index===0?'left':'center')),'cell wrapping, borders or alignment');
  const report=await page.locator('#reportPreview').innerText();assert(!/Identificação contratual|Versão utilizada|Eventos da mesma cobertura|Condição \/ observação|Limites e amparo|Sublimite a conferir/.test(report));
  const calc=await page.evaluate(s=>FastTrackSettlement.calculate(s),s);assert.equal(calc.deductible,3000);assert.equal(calc.net,9430);
  if(exportFiles){
   const w=page.waitForEvent('download');await page.locator('[data-action="export-word"]').click();await(await w).saveAs(path.join(out,tag+'.docx'));
   await page.evaluate(()=>window.print=()=>{});await page.locator('[data-action="export-pdf"]').click();await page.pdf({path:path.join(out,tag+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
   const section=page.locator('#reportPreview .coverage-report-table').first();await section.locator('..').screenshot({path:path.join(out,tag+'.png')});
   result.exports.push({tag,rows:expected,pages:checks.length,calculation:calc});
  }
  await step(1);return s;
 }
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);await action('load-example');
  let s=await backup();
  s=await page.evaluate(({s,data,selection})=>{
   data.coberturas[0].nome_sugerido_seletor='Vendaval / Granizo';FastTrackPolicies.apply(s,FastTrackPolicies.saveVersion(FastTrackPolicies.emptyRegistry(),data).version);
   const rs=['A','B'].map((id,i)=>({id,name:'Pessoa sintética',activity:i?'Suínos':'Aves',municipality:'Cidade de teste',vrBuildings:String(100000+i*100000),vrAnimals:String(50000+i*30000),raw:{id}}));
   const c=FastTrackProperty.create(rs,'Propriedade sintética');rs.forEach(r=>FastTrackProperty.assign(c,[r.id],{kind:'new',label:'Instalação '+r.id,applicable:true}));c.complete=true;selection.composition=c;s.cooperatorSelection=FastTrackProperty.sync(selection);
   const canvas=document.createElement('canvas');canvas.width=300;canvas.height=100;const x=canvas.getContext('2d');x.fillStyle='#edf4f7';x.fillRect(0,0,300,100);x.fillStyle='#123456';x.font='20px Arial';x.fillText('IMAGEM SINTÉTICA',35,55);const dataUrl=canvas.toDataURL();s.photos=[{id:'test-photo',dataUrl,caption:'Foto sintética'}];s.map={dataUrl};s.fields.regulatorName='Regulador de Teste';s.fields.regulatorCpf='529.982.247-25';FastTrackSignatures.set(s,'regulator',{dataUrl,width:300,height:100},{type:'uploaded'});
   return s;
  },{s,data:fixture.contract(),selection:fixture.selection()});
  s.damages=[fixture.damage(12430,{coverageId:'electric',sublimitId:'asset'})];await restore(s);
  await page.locator('[data-policy-coverage="wind"]').check();let base=await verify('vendaval',['Vendaval / Granizo']);
  await page.locator('[data-policy-coverage="wind"]').uncheck();await page.locator('[data-policy-coverage="electric"]').check();await verify('troca-eletricos',['Danos elétricos de teste']);
  await page.locator('[data-policy-coverage="wind"]').check();await page.locator('[data-policy-sublimit="asset"]').check();const selected=await verify('multiplas',['Vendaval / Granizo','Danos elétricos de teste','Bem especial de teste']);
  await action('save-draft');await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);const reopened=await backup();
  for(const key of ['contract','cooperatorSelection','damages','photos','map','signatures','signatureDetails'])assert.deepEqual(reopened[key],selected[key],key);
  await restore(reopened);await verify('restaurado',['Vendaval / Granizo','Danos elétricos de teste','Bem especial de teste'],{exportFiles:false});
  assert.deepEqual(reopened.cooperatorSelection,base.cooperatorSelection);assert.deepEqual(reopened.contract.data,base.contract.data);
  await page.locator('[data-policy-coverage="wind"]').uncheck();await page.locator('[data-policy-coverage="electric"]').uncheck();await verify('sublimite',['Bem especial de teste']);
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1),`application overflow ${width}`);}
  await page.setViewportSize({width:1440,height:1000});
  const stress=structuredClone(base);stress.contract.data.coberturas=Array.from({length:24},(_,i)=>({...fixture.contract().coberturas[0],id:'long-'+i,nome_contratual:`Cobertura sintética ${i+1} para instalações e equipamentos em propriedades rurais com identificação extensa`,nome_sugerido_seletor:undefined}));stress.contract.coverageIds=stress.contract.data.coberturas.map(c=>c.id);stress.contract.sublimitIds=[];await restore(stress);await verify('paginacao',stress.contract.data.coberturas.map(c=>c.nome_contratual));
  assert.deepEqual(result.errors,[]);result.checks.push('Only explicit general choices; switching removes previous coverage; sublimit uses own values; no damage-level dependency','Same three columns in summary and preview, thin horizontal borders, intact rows and repeated headers across pages','Save/reopen and backup preserve selections, complete policy, property VRs, items, photographs and signatures; fixed settlement unchanged');result.success=true;
 }catch(e){result.failure=String(e);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,'coverage-browser-results.json'),JSON.stringify(result,null,2));await browser.close();server.close();console.log(JSON.stringify({...result,exports:result.exports.map(x=>({tag:x.tag,pages:x.pages,rows:x.rows.length}))},null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
