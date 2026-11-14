// All records below are synthetic. Never copy production HTML into this repository.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const html=data=>Buffer.from(`<script>const DATA=${JSON.stringify(data)};window.__importExecuted=true;</script>`);
const data={lar:{synthetic:{nome:'Pessoa Sintética',inicial:Array.from({length:181},(_,i)=>({aviario:`TEST-${i}`,municipio:`Cidade ${i}`,latitude:-20,longitude:-50,areaM2:100,quantidadeAves:20,vrTotalEstruturas:1000,vrTotalAves:null})),endossos:[],trocas:[]}}};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.FAST_TRACK_BROWSER?{executablePath:process.env.FAST_TRACK_BROWSER}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
  // This test does not generate Word files and needs no external network.
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({body:'',contentType:'text/javascript'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);
  await page.waitForFunction(()=>window.FastTrackCooperators&&document.querySelector('#saveStatus').textContent);
  async function importBase(source){await page.locator('#cooperatorBaseInput').setInputFiles({name:'synthetic.html',mimeType:'text/html',buffer:html(source)});await page.waitForFunction(()=>document.querySelector('#cooperatorBaseInput').value===''&&window.FastTrackCooperators.getBase());}
  async function action(name){await page.locator(`[data-action="${name}"]`).first().evaluate(e=>e.click());}
  async function backup(){const waiting=page.waitForEvent('download');await action('export-backup');const download=await waiting;return JSON.parse(fs.readFileSync(await download.path(),'utf8'));}
  await importBase(data);assert.equal(await page.evaluate(()=>window.__importExecuted),undefined);
  await page.locator('#cooperatorSearch').fill('pessoa sintetica');
  assert.equal(await page.locator('#cooperatorResults button[data-record-id]').count(),150);
  await action('show-more-cooperators');assert.equal(await page.locator('#cooperatorResults button[data-record-id]').count(),181);
  assert.equal((await backup()).cooperatorSelection,null);
  const id=await page.evaluate(()=>window.FastTrackCooperators.getBase().records.find(r=>r.installationCode==='TEST-180').id);
  await page.locator(`button[data-record-id="${id}"]`).click();
  const involved=page.locator('[data-installation-field="involved"]');assert.equal(await involved.isChecked(),false);await involved.check();
  await page.locator('[data-coop-field="localIdentification"]').fill('Local ajustado');await page.locator('[data-coop-field="vrAnimals"]').fill('0');
  const selected=await backup();await importBase(data);const repeated=await backup();
  assert.deepEqual(repeated.cooperatorSelection.confirmed,selected.cooperatorSelection.confirmed);assert.equal(repeated.cooperatorSelection.requiresReselection,false);
  await action('save-draft');await page.reload();await page.waitForFunction(()=>window.FastTrackCooperators?.getBase());
  assert.deepEqual((await backup()).cooperatorSelection.confirmed,selected.cooperatorSelection.confirmed);
  await page.locator('#backupInput').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(selected))});await page.waitForFunction(()=>document.querySelector('#backupInput').value==='');
  assert.deepEqual((await backup()).cooperatorSelection,selected.cooperatorSelection);
  const changed=structuredClone(data);changed.lar.synthetic.inicial.push({municipio:'Novo local'});await importBase(changed);
  const reviewed=await backup();assert.equal(reviewed.cooperatorSelection.requiresReselection,true);assert.deepEqual(reviewed.cooperatorSelection.confirmed,selected.cooperatorSelection.confirmed);
  await action('new-process');assert.equal((await backup()).cooperatorSelection,null);assert.equal(await page.evaluate(()=>window.FastTrackCooperators.getBase().totalDetailedRecords),182);
  assert.deepEqual(errors,[]);
  console.log('PASS: 181 registros acessíveis, seleção explícita, ajustes, reimportação, recarga, backup e novo atendimento.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
