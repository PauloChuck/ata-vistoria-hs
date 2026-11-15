// Synthetic sources only; reports and backups must stay outside the checkout.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT,norm=s=>s.replace(/\s+/g,' ').trim();
if(!out||path.resolve(out)===root||path.resolve(out).startsWith(root+path.sep))throw Error('Set private FT_OUT outside repository');
fs.mkdirSync(out,{recursive:true});
const renewal={municipio:'Cidade Sintética',latitude:'-27.123456789',longitude:'-52.987654321',qtdeLotacao:5195,valorBenfeitoria:1090950,propriedade:'Propriedade escolhida'};
const source={suinos:{A:{nome:'Cooperado de Teste',renovacao:[renewal,{...renewal,municipio:'Outra cidade',propriedade:'Outra propriedade',valorBenfeitoria:9999999}],registrosEndosso:[...Array.from({length:6},()=>({...renewal,qtdeLotacao:'N/I',valorBenfeitoria:1060500,planilha:'01.2025',resultado:'ALT QTDE'})),{...renewal,qtdeLotacao:'N/I',valorBenfeitoria:1113000,planilha:'08.2025',resultado:'ALT QTDE'}]}},aurora:{A:{nome:'Cooperado de Teste',renovacao:[{municipio:'Cidade das Aves',quantidadeAves:12000,vrBenfeitoria:'N/I'}]}}};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const result={checks:[],exports:[],errors:[],success:false};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true}),context=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));
 const step=async n=>page.locator('[data-go="'+n+'"]').first().evaluate(e=>e.click());
 const action=async a=>page.locator('[data-action="'+a+'"]').first().evaluate(e=>e.click());
 const backup=async()=>{const prev=await page.locator('.screen.active').getAttribute('data-step');await step(7);const w=page.waitForEvent('download');await action('export-backup');const s=JSON.parse(fs.readFileSync(await(await w).path(),'utf8'));await step(prev);return s;};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>document.querySelector('#backupInput').value==='');await step(1);};
 async function verify(tag,{exportFiles=true}={}) {
   const s=await backup(),model=await page.evaluate(s=>FastTrackRiskCard.data(s),s);
   const expected=model.cards.flatMap(c=>c.blocks.flatMap(b=>b.rows.map(r=>r.values.map(norm))));
   const appRows=await page.locator('[data-selected-risk-card] tbody tr').evaluateAll(rs=>rs.map(r=>[...r.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim())));
   assert.deepEqual(appRows,expected);
   await page.locator('[data-selected-risk-card]').screenshot({path:path.join(out,tag+'-app.png')});
   await step(7);await page.waitForFunction(()=>[...document.querySelectorAll('#reportPreview img')].every(i=>i.complete&&i.naturalWidth));
   const previewRows=await page.locator('#reportPreview .risk-register tbody tr').evaluateAll(rs=>rs.map(r=>[...r.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim())));
   assert.deepEqual(previewRows,expected);
   const layout=await page.locator('#reportPreview .report-page').evaluateAll(ps=>ps.map(p=>{
     const c=p.querySelector('.report-content');
     const bad=[...c.querySelectorAll('.risk-register th,.risk-register td')].filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent);
     const cards=[...c.querySelectorAll('.risk-card')].map(x=>({headers:x.querySelectorAll('thead').length,blocks:x.querySelectorAll('tbody').length,rows:x.querySelectorAll('tbody tr').length}));
     return {height:c.clientHeight,scroll:c.scrollHeight,width:c.clientWidth,scrollWidth:c.scrollWidth,bad,cards};
   }));
   assert(layout.every(p=>p.scroll<=p.height+1&&p.scrollWidth<=p.width+1&&!p.bad.length),JSON.stringify(layout));
   assert(layout.every(p=>p.cards.every(c=>c.headers===c.blocks&&c.rows>0)));
   const local=await page.locator('#reportPreview .report-page').filter({hasText:'1. LOCAL DO SINISTRO'}).innerText();assert(local.includes('CONSULTA DE COOPERADOS'));
   const cards=page.locator('#reportPreview .risk-card');for(let i=0;i<await cards.count();i++)await cards.nth(i).screenshot({path:path.join(out,tag+'-preview-'+i+'.png')});
   if(exportFiles){
     const w=page.waitForEvent('download');await action('export-word');await(await w).saveAs(path.join(out,tag+'.docx'));
     await page.evaluate(()=>window.print=()=>{});await action('export-pdf');await page.pdf({path:path.join(out,tag+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
   }
   fs.writeFileSync(path.join(out,tag+'.json'),JSON.stringify({state:s,model,expected,layout},null,2));result.exports.push({tag,pages:layout.length,rows:expected.length,model});await step(1);
 }
 try {
   await page.goto('http://127.0.0.1:'+server.address().port+'/fast_track/v062.html');await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);
   await action('load-example');
   await page.locator('#cooperatorBaseInput').setInputFiles({name:'synthetic.html',mimeType:'text/html',buffer:Buffer.from('<script>const DATA='+JSON.stringify(source)+';</script>')});await page.waitForFunction(()=>FastTrackCooperators.getBase());
   const records=await page.evaluate(()=>FastTrackCooperators.getBase().records.filter(r=>r.recordType==='detail'));
   await page.locator('#cooperatorSearch').fill('Cooperado de Teste');
   const initial=records.find(r=>r.baseKey==='suinos'&&r.category==='Renovação'&&r.municipality==='Cidade Sintética');
   await page.locator('button[data-record-id="'+initial.id+'"]').click();
   assert.equal(await page.locator('.cooperator-tools').evaluate(e=>e.open),false);assert.equal(await page.locator('[data-selected-risk-card] tbody tr').count(),1);
   await verify('somente-renovacao');result.checks.push('Renewal-only immediate display, no extra fields or confirmations; other property excluded');
   const wanted=records.filter(r=>r.baseKey==='suinos'&&r.category==='Endosso');
   for(const r of wanted){const button=page.locator('[data-add-record-id="'+r.id+'"]');await button.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await button.click();}
   assert.equal(await page.locator('[data-selected-risk-card] tbody tr').count(),8);assert(!(await page.locator('[data-selected-risk-card]').innerText()).includes('Outra cidade'));
   const snapshot=await backup(),before=await page.locator('[data-selected-risk-card]').innerHTML();
   assert.equal(snapshot.cooperatorSelection.composition.units.length,0);assert.equal(snapshot.cooperatorSelection.composition.records.length,8);
   await action('save-draft');await page.reload();await page.waitForFunction(()=>FastTrackCooperators.getBase());await step(1);
   assert.equal(await page.locator('[data-selected-risk-card]').innerHTML(),before);await restore(snapshot);assert.equal(await page.locator('[data-selected-risk-card]').innerHTML(),before);
   await verify('renovacao-endossos');result.checks.push('Seven explicitly added endossos, six repeats preserved as rows, never physical installations; reopen/backup identical');
   const long=structuredClone(snapshot),c=long.cooperatorSelection.composition;
   for(let i=0;i<40;i++){const r={...c.records[1],id:'synthetic-long-'+i,situation:'REGISTRO '+String(i+1).padStart(2,'0'),reference:'09.2025'};c.records.push(r);c.assignments[r.id]={kind:'unresolved'};}
   await restore(long);await verify('historico-longo');
   result.checks.push('48-row history paginated between records with repeated headings; no orphan titles, clipped cells or overflow');
   await restore(snapshot);await page.locator('#cooperatorSearch').fill('Cooperado de Teste');
   const bird=records.find(r=>r.baseKey==='aurora');await page.locator('[data-add-record-id="'+bird.id+'"]').click();await verify('atividades-ausencias');
   assert.equal(await page.locator('[data-selected-risk-card] .risk-card').count(),2);
   const birds=await page.locator('[data-selected-risk-card] .risk-card').last().innerText();assert(birds.includes('AVES DE CORTE'));assert(!birds.includes('POCILGA'));assert(birds.includes('N/I'));assert(birds.includes('Não informado'));
   result.checks.push('Expressly selected different activity has its own capacity heading; N/I, missing values and coordinates preserved');
   for(const width of [390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1));assert(await page.locator('[data-selected-risk-card]').evaluate(e=>e.scrollWidth>e.clientWidth));}
   assert.deepEqual(result.errors,[]);result.success=true;
 }catch(e){result.failure=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'local-register-results.json'),JSON.stringify(result,null,2));await browser.close();server.close();console.log(JSON.stringify({...result,exports:result.exports.map(({model,...x})=>x)},null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
