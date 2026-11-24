// Synthetic report layout cases. Exports belong outside the public checkout.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),fixture=require('./policies-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FT_OUT;
if(!out||path.resolve(out)===root||path.resolve(out).startsWith(root+path.sep))throw Error('Set private FT_OUT outside repository');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
const result={checks:[],exports:[],errors:[],success:false};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.FT_BROWSER,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({path:process.env.FT_DOCX_LIB,contentType:'text/javascript'}));
 const step=async n=>page.locator(`[data-go="${n}"]`).first().evaluate(e=>e.click());
 const action=async a=>page.locator(`[data-action="${a}"]`).first().evaluate(e=>e.click());
 const backup=async()=>{await step(7);const w=page.waitForEvent('download');await action('export-backup');return JSON.parse(fs.readFileSync(await(await w).path(),'utf8'));};
 const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>!document.querySelector('#backupInput').value);await step(7);await page.waitForFunction(()=>[...document.querySelectorAll('#reportPreview img')].every(i=>i.complete&&i.naturalWidth));};
 async function verify(tag,s){
  await restore(s);
  const text=await page.locator('#reportPreview').innerText();
  assert(!text.includes('LAVANTAMENTOS')&&!text.includes('IMAGENS E ARQUIVOS')&&!text.includes('REGISTRO FOTOGRÁFICO — CONTINUAÇÃO'));
  assert(text.includes('4.2 LEVANTAMENTOS DOCUMENTAIS'));
  const pages=await page.locator('#reportPreview .report-page').evaluateAll(ps=>ps.map(p=>{
   const content=p.querySelector('.report-content'),photos=[...content.querySelectorAll('.photo-cell-report')],r=content.getBoundingClientRect();
   return {text:content.innerText,photos:photos.map(x=>x.innerText),overflow:content.scrollHeight>content.clientHeight+1||content.scrollWidth>content.clientWidth+1,
    outside:photos.some(x=>x.getBoundingClientRect().bottom>r.bottom+1),rows:content.querySelectorAll('.photo-row-report').length};
  }));
  assert(pages.every(p=>!p.overflow&&!p.outside&&p.rows<=3&&p.text.trim()),JSON.stringify(pages));
  const captions=pages.flatMap(p=>p.photos);assert.equal(captions.length,s.photos.length);
  captions.forEach((v,i)=>assert(v.startsWith(`Figura ${i+1} — `)));
  const model=await page.evaluate(s=>FastTrackRiskCard.data(s),s),expectedRows=model?.cards.flatMap(c=>c.blocks.flatMap(b=>b.rows)).length||0;
  assert.equal(await page.locator('#reportPreview .risk-register tbody tr').count(),expectedRows);
  const structure=await page.locator('#reportPreview .report-content').evaluateAll(cs=>cs.flatMap(c=>[...c.querySelectorAll('.doc-section,.map-report,.doc-caption,.risk-card')].map(e=>e.matches('.map-report')?'MAP':e.matches('.risk-card')?'CARD':e.textContent)));
  const title=structure.indexOf('1. LOCAL DO SINISTRO'),next=structure.indexOf('2. DESCRIÇÃO DA OCORRÊNCIA');
  assert(title>=0&&next>title);
  assert.equal(structure.filter(x=>x==='MAP').length,s.map?.dataUrl?1:0);
  assert.equal(structure.filter(x=>x==='Localização da propriedade sinistrada.').length,s.map?.dataUrl?1:0);
  if(s.map?.dataUrl){assert(structure.indexOf('MAP')>title&&structure.indexOf('MAP')<next);if(expectedRows)assert(structure.indexOf('Localização da propriedade sinistrada.')<structure.indexOf('CARD'));}
  if(expectedRows)assert(structure.indexOf('CARD')>title&&structure.lastIndexOf('CARD')<next);
  const w=page.waitForEvent('download');await action('export-word');await(await w).saveAs(path.join(out,tag+'.docx'));
  await page.evaluate(()=>window.print=()=>{});await action('export-pdf');await page.pdf({path:path.join(out,tag+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  for(const [i,p]of(await page.locator('#reportPreview .report-page').all()).entries())await p.screenshot({path:path.join(out,`${tag}-page-${i+1}.png`)});
  const reopened=await backup();await action('save-draft');await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);
  const saved=await backup();for(const key of ['fields','cooperatorSelection','photos','map','damages','causeEvidence','contract','signatures','signatureDetails'])assert.deepEqual(saved[key],reopened[key],key);
  result.exports.push({tag,photoGroups:pages.filter(p=>p.photos.length).map(p=>p.photos.length),pages:pages.length,rows:expectedRows});
  return pages;
 }
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);await action('load-example');
  let s=await backup();
  s=await page.evaluate(({s,data})=>{
   FastTrackPolicies.apply(s,FastTrackPolicies.saveVersion(FastTrackPolicies.emptyRegistry(),data).version);
   const image=(w,h,label)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#dcecf4';x.fillRect(0,0,w,h);x.strokeStyle='#397185';x.lineWidth=12;x.strokeRect(15,15,w-30,h-30);x.fillStyle='#1f497d';x.font='28px Arial';x.fillText(label,40,70);return c.toDataURL();};
   s.map={dataUrl:image(900,500,'MAPA SINTÉTICO'),fit:'contain',posX:35,posY:65};
   s.photos=Array.from({length:13},(_,i)=>({id:'flow-'+i,dataUrl:image(i%2?400:800,i%2?800:500,'FOTO '+(i+1)),caption:'Vista geral sintética '+(i+1)+'.'}));
   s.causeEvidence=[{id:'file',name:'arquivo-sintetico.pdf',mime:'application/pdf',caption:'Evidência preservada, fora da galeria.'}];
   Object.assign(s.fields,{claimantName:'Pessoa Sintética',regulatorName:'Regulador Sintético',inspectionDate:'2026-11-23',inspectionNarrativeMode:'custom',inspectionNarrative:'Vistoria realizada em 23/11/2026. Danos constatados.',occurrenceNarrativeMode:'custom',occurrenceNarrative:'Ocorrência sintética para conferir a apresentação.',documentaryNarrative:'Texto documental preservado.',regulatorOpinion:'Parecer personalizado preservado.'});
   const records=Array.from({length:48},(_,i)=>({id:'record-'+i,name:'Pessoa Sintética',companyGroup:'Aurora',activity:'Suínos',category:i?'Endosso':'Renovação',reference:i<8?'01.2025':'08.2025',situation:'REGISTRO '+(i+1),municipality:'Cidade Teste',latitude:'-20.12345',longitude:'-50.12345',capacity:'N/I',vrBuildings:'100000',vrAnimals:'20000'}));
   s.cooperatorSelection={schemaVersion:4,sourceRecordId:'record-0',original:{},confirmed:{...records[0],installations:[]},composition:FastTrackProperty.create(records,'Propriedade Sintética')};
   return s;
  },{s,data:fixture.contract()});s.damages=[fixture.damage(12430)];
  for(const [tag,map,card] of [['local-completo',true,true],['local-sem-mapa',false,true],['local-sem-quadro',true,false],['local-sem-ambos',false,false]]){
   const sample=structuredClone(s);sample.photos=[];if(!map)sample.map={};if(!card)sample.cooperatorSelection=null;
   else{sample.cooperatorSelection.composition.records=sample.cooperatorSelection.composition.records.slice(0,8);}
   await verify(tag,sample);
  }
  const history=structuredClone(s);history.photos=[];await verify('historico-48',history);
  result.checks.push('Map/caption precede the complete risk card; all four presence/absence combinations and 48 selected records preserve order and data');
  for(const count of [1,4,6,7,12,13]){
   const sample=structuredClone(s);sample.cooperatorSelection.composition.records=sample.cooperatorSelection.composition.records.slice(0,8);sample.photos=sample.photos.slice(0,count);
   const pages=await verify('curtas-'+count,sample),first=pages.find(p=>p.photos.length);
   assert(first.text.includes('RELAÇÃO DE DANOS:'),'photo section must use available space after damage list');
   const photoPages=pages.filter(p=>p.photos.length);if(count>=12)assert.equal(photoPages[1].photos.length,6,'full middle page should hold six short-caption photos');
   if(count===1)assert(pages.some(p=>p.photos.length&&p.text.includes('4.2 LEVANTAMENTOS DOCUMENTAIS')),'documentary section should follow final photo where space permits');
  }
  result.checks.push('1/4/6/7/12/13 alternating portrait/landscape photos; partial-page start, full middle pages with six and documentary content immediately after last row when it fits');
  const empty=structuredClone(s);empty.map={};empty.cooperatorSelection=null;empty.fields.documentaryNarrative='';empty.photos=empty.photos.slice(0,1);
  const ep=await verify('documental-sem-texto',empty);assert(ep.find(p=>p.text.includes('4.2 LEVANTAMENTOS DOCUMENTAIS')).text.includes('arquivo-sintetico.pdf'));
  const long=structuredClone(empty);long.photos=s.photos.map((p,i)=>({...p,caption:('Descrição detalhada preservada com acentos e números '+(i+1)+'. ').repeat(i%2?9:2)}));
  await verify('legendas-extensas',long);
  result.checks.push('Long captions remain complete; empty documentary narrative keeps heading with its evidence; reopen and backup preserve every case');
  assert.deepEqual(result.errors,[]);result.success=true;
 }catch(e){result.failure=String(e);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close();server.close();console.log(JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
