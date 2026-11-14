// Synthetic images and identities only. Optional artifacts must be written outside the repository.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=process.env.FAST_TRACK_OUTPUT_DIR;
if(output){assert(!path.resolve(output).startsWith(root+path.sep),'Artifacts must stay outside the public repository');fs.mkdirSync(output,{recursive:true});}
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
const norm=s=>s.replace(/\s+/g,' ').trim();
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.FAST_TRACK_BROWSER?{executablePath:process.env.FAST_TRACK_BROWSER}:{})});
 const results={checks:[],exports:[],errors:[],success:false};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),alerts=[];
  page.on('pageerror',e=>results.errors.push(String(e)));page.on('dialog',async d=>{if(d.type()==='alert')alerts.push(d.message());await d.accept();});
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill(process.env.FAST_TRACK_DOCX_PATH?{path:process.env.FAST_TRACK_DOCX_PATH,contentType:'text/javascript'}:{body:'',contentType:'text/javascript'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/fast_track/v062.html`);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);
  const action=async name=>page.locator(`[data-action="${name}"]`).first().evaluate(e=>e.click());
  const sig=async(name,target)=>page.locator(`[data-signature-action="${name}"]${target?`[data-target="${target}"]`:''}`).evaluate(e=>e.click());
  const step=async n=>page.locator(`[data-go="${n}"]`).first().evaluate(e=>e.click());
  const backup=async()=>{const waiting=page.waitForEvent('download');await action('export-backup');const d=await waiting;return JSON.parse(fs.readFileSync(await d.path(),'utf8'));};
  const restore=async s=>{await page.locator('#backupInput').setInputFiles({name:'synthetic-case.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.waitForFunction(()=>!document.querySelector('#backupInput').value);};
  const fixture=await page.evaluate(()=>{
   const make=(w,h,type,transparent=false)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(!transparent){x.fillStyle='#fff';x.fillRect(0,0,w,h);}x.strokeStyle='#173e58';x.lineWidth=6;x.beginPath();x.moveTo(w*.12,h*.55);x.bezierCurveTo(w*.25,h*.1,w*.7,h*.85,w*.87,h*.3);x.stroke();x.fillStyle='#173e58';x.font='16px Arial';x.fillText('TESTE',w*.2,h*.7);return c.toDataURL(type);};
   return {jpeg:make(640,220,'image/jpeg'),png:make(240,640,'image/png',true),replacement:make(800,240,'image/png',true)};
  });
  const upload=async(target,type)=>{await page.locator(`[data-signature-file="${target}"]`).setInputFiles({name:`synthetic.${type==='jpeg'?'jpg':'png'}`,mimeType:type==='jpeg'?'image/jpeg':'image/png',buffer:Buffer.from(fixture[type].split(',')[1],'base64')});await page.waitForFunction(t=>document.querySelector(t==='profile'?'#profileSignaturePreview img':`#${t}SignaturePreview img`),target);};
  async function exportCase(tag){
   await step(7);const state=await backup();
   const preview=await page.locator('#reportPreview').innerText();assert(!preview.includes('RASCUNHO'));assert(!preview.includes('DADOS CADASTRAIS'));
   const claim=await page.evaluate(s=>FastTrackPresentation.claimData(s),state);assert(claim.fits);
   const cover=page.locator('#reportPreview .claim-identifiers');assert.equal(await cover.locator('tr').count(),2);
   const sizes=await cover.locator('td').evaluateAll(c=>c.map(e=>({x:e.getBoundingClientRect().x,width:e.clientWidth,scroll:e.scrollWidth,font:getComputedStyle(e).fontSize,transform:getComputedStyle(e).textTransform,text:e.textContent})));
   assert(Math.abs(sizes[1].x-sizes[3].x)<1);assert(sizes.every(e=>e.scroll<=e.width+1&&e.transform==='none'));assert.equal(sizes[1].text,state.fields.insurerClaim||'A INFORMAR');assert.equal(sizes[3].text,state.fields.hsClaim||'A INFORMAR');
   const layout=await page.locator('#reportPreview .report-page').evaluateAll(pages=>pages.map(p=>{const c=p.querySelector('.report-content');return {height:c.clientHeight,scroll:c.scrollHeight,width:c.clientWidth,scrollWidth:c.scrollWidth};}));assert(layout.every(p=>p.scroll<=p.height+1&&p.scrollWidth<=p.width+1),`${tag}: overflow ${JSON.stringify(layout)}`);
   const images=await page.locator('#reportPreview .signature-report img').evaluateAll(imgs=>imgs.map(i=>({width:i.width,height:i.height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,src:i.src})));
   for(const i of images)assert(Math.abs(i.width/i.height-i.naturalWidth/i.naturalHeight)<.03,'signature proportion');
   assert.equal(images.length,['regulator','claimant'].filter(r=>!!state.signatures[r]).length);
   if(output){
    fs.writeFileSync(path.join(output,`${tag}.json`),JSON.stringify(state));
    await page.locator('#reportPreview .report-page').first().screenshot({path:path.join(output,`${tag}-cover.png`),style:'.app-header,.app-footer{visibility:hidden}'});
    await page.locator('#reportPreview .closing-signature-block').screenshot({path:path.join(output,`${tag}-closing.png`),style:'.app-header,.app-footer{visibility:hidden}'});
    if(process.env.FAST_TRACK_DOCX_PATH){const d=page.waitForEvent('download');await action('export-word');await (await d).saveAs(path.join(output,`${tag}.docx`));}
    await page.evaluate(()=>window.print=()=>{});await action('export-pdf');assert(!(await page.locator('#printHost').innerText()).includes('RASCUNHO'));await page.pdf({path:path.join(output,`${tag}.pdf`),format:'A4',printBackground:true,preferCSSPageSize:true});
   }
   results.exports.push({tag,claim,pages:layout.length,signatureCount:images.length,ratios:images.map(i=>({original:i.naturalWidth/i.naturalHeight,display:i.width/i.height}))});await step(6);
  }
  await action('load-example');const template=await backup();await step(6);await page.locator('#regulatorProfilePanel').evaluate(e=>e.open=true);
  await page.locator('#profileRegulatorName').fill('Regulador de Teste');await page.locator('#profileRegulatorCpf').fill('529.982.247-25');await upload('profile','jpeg');await page.locator('#profileRegulatorAuto').check();await sig('profile-save');await page.waitForFunction(()=>FastTrackSignatures.getProfile()?.autoUse===true);
  assert.equal((await backup()).signatures.regulator,null,'saving a profile does not modify an existing report');
  await action('new-process');let current=await backup();assert.equal(current.fields.regulatorName,'Regulador de Teste');assert.equal(current.signatures.regulator,fixture.jpeg);assert.equal(current.signatures.claimant,null);assert.equal(current.finalizedAt,null);
  results.checks.push('Perfil local, cadastro, uso automático em novo atendimento e ausência de assinatura do cooperado');
  const regulatorFields={regulatorName:current.fields.regulatorName,regulatorCpf:current.fields.regulatorCpf};
  current.fields={...template.fields,...regulatorFields,claimantName:'Pessoa Sintética A',claimantCpf:'000.000.000-00',insurer:'SOMPO_SEGUROS S/A',insurerClaim:'AbC_0000123',hsClaim:'S2610000456'};
  current.damages=template.damages;current.map={dataUrl:fixture.jpeg,fit:'contain',posX:50,posY:50};current.photos=[{id:'test-photo',dataUrl:fixture.jpeg,caption:'Imagem sintética de validação'}];await restore(current);await step(6);await upload('claimant','jpeg');
  let wide=await backup();assert.equal(wide.signatures.claimant,fixture.jpeg);assert.equal(wide.finalizedAt,null);
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1));if(output)await page.locator('[data-step="6"]>.card').screenshot({path:path.join(output,`signatures-step-${width}.png`),style:'.app-header,.app-footer{visibility:hidden}'});}
  await page.setViewportSize({width:1440,height:1000});await exportCase('wide');
  await upload('claimant','png');await page.waitForFunction(u=>document.querySelector('#claimantSignaturePreview img').src===u,fixture.png);let tall=await backup();assert.equal(tall.signatureDetails.claimant.width,240);assert.equal(tall.signatureDetails.claimant.height,640);assert.equal(tall.signatures.regulator,fixture.jpeg);
  await exportCase('portrait');
  await sig('crop','claimant');for(const [key,value]of[['left',10],['right',10],['top',5],['bottom',5]])await page.locator('#signatureCrop'+key).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);await sig('crop-apply');await page.waitForFunction(()=>document.querySelector('#signatureCropModal').classList.contains('hidden'));
  let cropped=await backup();assert.equal(cropped.signatureDetails.claimant.width,192);assert.equal(cropped.signatureDetails.claimant.height,576);assert.equal(cropped.signatureDetails.claimant.originalDataUrl,fixture.png);
  await sig('crop','claimant');await sig('crop-reset');await sig('crop-apply');await page.waitForFunction(()=>document.querySelector('#signatureCropModal').classList.contains('hidden'));assert.equal((await backup()).signatures.claimant,fixture.png);
  await sig('crop','claimant');await sig('crop-cancel');assert.equal((await backup()).signatures.claimant,fixture.png);
  await page.locator('[data-signature-file="claimant"]').setInputFiles({name:'invalid.jpg',mimeType:'image/jpeg',buffer:Buffer.from('<svg>not an image</svg>')});await page.waitForFunction(()=>document.querySelector('#signatureMessage').textContent.includes('não é uma imagem'));assert.equal((await backup()).signatures.claimant,fixture.png);
  await page.locator('[data-signature-file="claimant"]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});await page.waitForFunction(()=>document.querySelector('#signatureMessage').textContent.includes('Não foi possível abrir'));assert.equal((await backup()).signatures.claimant,fixture.png);
  results.checks.push('JPEG, PNG transparente vertical, substituição, enquadramento reversível e rejeição de arquivos incompatíveis/corrompidos');
  await sig('remove','claimant');assert.equal((await backup()).signatures.claimant,null);assert.equal((await backup()).signatures.regulator,fixture.jpeg);await action('finalize-signed');assert(alerts.at(-1).includes('assinatura do cooperado'));assert.equal((await backup()).finalizedAt,null);await exportCase('regulator-only');
  await action('sign-claimant');const box=await page.locator('#signatureCanvas').boundingBox();await page.mouse.move(box.x+20,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.3,{steps:10});await page.mouse.up();await action('confirm-signature');let drawn=await backup();assert.equal(drawn.signatureDetails.claimant.type,'drawn');assert.notEqual(drawn.signatures.claimant,fixture.png);assert.equal(drawn.signatures.regulator,fixture.jpeg);
  await exportCase('drawn');await step(1);await page.locator('#riskAddress').fill('Local atualizado para teste');await step(6);assert.equal((await backup()).signatureDetails.claimant.needsReview,true);await action('finalize-signed');assert(alerts.at(-1).includes('Confira e confirme'));await sig('confirm','claimant');await action('finalize-signed');assert((await backup()).finalizedAt);
  results.checks.push('Desenho substitui a imagem, remoção independente e validações de conclusão/conferência preservadas');
  await restore(wide);await step(6);await page.locator('#regulatorProfilePanel').evaluate(e=>e.open=true);await page.locator('#profileRegulatorName').fill('Regulador de Teste B');await page.locator('#profileRegulatorCpf').fill('111.444.777-35');await upload('profile','replacement');await page.locator('#profileRegulatorAuto').uncheck();await sig('profile-save');await page.waitForFunction(()=>FastTrackSignatures.getProfile()?.name==='Regulador de Teste B');let untouched=await backup();assert.equal(untouched.signatures.regulator,fixture.jpeg);assert.equal(untouched.fields.regulatorName,'Regulador de Teste');
  await action('save-draft');await page.reload();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent);const reloaded=await backup();assert.equal(reloaded.signatures.claimant,wide.signatures.claimant);assert.equal(reloaded.signatures.regulator,wide.signatures.regulator);assert.equal(reloaded.photos.length,0);assert.equal(reloaded.damages.length,0);assert.equal(reloaded.signatureDetails.claimant.needsReview,true);assert.equal(reloaded.finalizedAt,null);
  await action('new-process');const disabled=await backup();assert.equal(disabled.signatures.regulator,null);assert.equal(disabled.signatures.claimant,null);assert.equal(disabled.fields.regulatorName,'');
  await step(6);await page.locator('#regulatorProfilePanel').evaluate(e=>e.open=true);await page.locator('#profileRegulatorAuto').check();await sig('profile-save');await page.waitForFunction(()=>FastTrackSignatures.getProfile().autoUse);await action('new-process');const fresh=await backup();assert.equal(fresh.fields.regulatorName,'Regulador de Teste B');assert.equal(fresh.signatures.regulator,fixture.replacement);assert.equal(fresh.signatures.claimant,null);assert.notEqual(fresh.caseUid,wide.caseUid);
  await restore(wide);const restored=await backup();assert.deepEqual(restored.signatureDetails,wide.signatureDetails);assert.deepEqual(restored.signatures,wide.signatures);assert.equal(await page.evaluate(()=>FastTrackSignatures.getProfile().name),'Regulador de Teste B');
  await step(1);await page.locator('#claimantName').fill('Outra Pessoa');assert.equal((await backup()).signatures.claimant,null);assert.equal((await backup()).signatures.regulator,fixture.jpeg);
  results.checks.push('Recarga preserva imagens, perfil alterado não muda relatórios, desativação, novo atendimento e backup sem reutilizar assinatura do cooperado');
  await restore(wide);await step(6);await sig('remove','regulator');assert.equal((await backup()).signatures.regulator,null);assert.equal(await page.evaluate(()=>FastTrackSignatures.getProfile().autoUse),true);
  await sig('profile-apply');assert.equal((await backup()).fields.regulatorName,'Regulador de Teste B');assert.equal((await backup()).signatures.claimant,fixture.jpeg);
  const long=await backup();long.fields.insurer='COMPANHIA SEGURADORA ESPECIALIZADA EM RISCOS RURAIS';long.fields.insurerClaim='ABC0000000000000000000123456789012345';long.fields.hsClaim='S2610000000000000000000000123456789';await restore(long);await exportCase('long-cover');
  const fallback=await backup();fallback.fields.insurer='';await restore(fallback);assert.equal(await page.evaluate(s=>FastTrackPresentation.claimData(s).rows[0][0],fallback),'Sinistro Seguradora:');
  const enormous=structuredClone(fallback);enormous.fields.insurerClaim='A'.repeat(400);await restore(enormous);await action('export-word');assert(alerts.at(-1).includes('excedem a largura'));assert.equal((await backup()).fields.insurerClaim,enormous.fields.insurerClaim);
  results.checks.push('Capa em duas linhas, Arial 10–9 pt, alinhamento, nome dinâmico, fallback e preservação literal de identificadores');
  assert.deepEqual(results.errors,[]);results.success=true;console.log(JSON.stringify(results,null,2));
 }finally{if(output)fs.writeFileSync(path.join(output,'signature-test-results.json'),JSON.stringify(results,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
