const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async()=>{
  const out=process.env.OUT;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1500,height:1100}});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error)));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:8000/fast_track/v062.html?v=0626-cover-ci',{waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('.app-shell',{state:'visible'});
  await page.click('[data-action="load-example"]');
  for(const step of [2,3,4,5,6,7]){
    await page.click(`[data-go="${step}"]`);
    await page.waitForSelector(`.screen[data-step="${step}"].active`);
  }
  await page.waitForSelector('#reportPreview .report-page.first');

  const cover=await page.evaluate(()=>{
    const mm=px=>px*25.4/96;
    const report=document.querySelector('#reportPreview .report-page.first');
    const pr=report.getBoundingClientRect();
    const rect=selector=>{
      const el=report.querySelector(selector);
      const r=el.getBoundingClientRect();
      return {top:mm(r.top-pr.top),left:mm(r.left-pr.left),width:mm(r.width),height:mm(r.height),text:el.textContent.trim(),bg:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize};
    };
    const lines=selector=>{
      const el=report.querySelector(selector);
      const range=document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].filter(r=>r.width>.5&&r.height>.5).length;
    };
    const claimRows=[...report.querySelectorAll('.claim-table tr')].map(row=>{
      const r=row.getBoundingClientRect();
      return {top:mm(r.top-pr.top),height:mm(r.height),texts:[...row.cells].map(c=>c.textContent.trim())};
    });
    const metaRows=[...report.querySelectorAll('.meta-table tr')].map(row=>{
      const r=row.getBoundingClientRect();
      return {top:mm(r.top-pr.top),height:mm(r.height),cells:[...row.cells].map(c=>{
        const cr=c.getBoundingClientRect();
        const range=document.createRange();
        range.selectNodeContents(c);
        return {text:c.textContent.trim(),left:mm(cr.left-pr.left),width:mm(cr.width),colSpan:c.colSpan,lines:[...range.getClientRects()].filter(x=>x.width>.5&&x.height>.5).length};
      })};
    });
    const pages=[...document.querySelectorAll('#reportPreview .report-page')];
    return {
      title:rect('.doc-title'),subtitle:rect('.doc-subtitle'),claim:rect('.claim-table'),meta:rect('.meta-table'),
      titleLines:lines('.doc-title'),subtitleLines:lines('.doc-subtitle'),claimRows,metaRows,
      contentOverflow:report.querySelector('.report-content').scrollHeight-report.querySelector('.report-content').clientHeight,
      secondPage:{bodyFont:getComputedStyle(pages[1].querySelector('.doc-text')).fontSize,headingFont:getComputedStyle(pages[1].querySelector('.doc-section')).fontSize}
    };
  });
  const near=(a,b,t)=>Math.abs(a-b)<=t;
  if(cover.title.text!=='RELATÓRIO DE CONTINGÊNCIA'||cover.titleLines!==1) throw new Error(`Título inválido: ${JSON.stringify(cover.title)} linhas=${cover.titleLines}`);
  if(cover.subtitle.text!=='RISCOS NOMEADOS EMPRESARIAL'||cover.subtitleLines!==1) throw new Error(`Subtítulo inválido: ${JSON.stringify(cover.subtitle)} linhas=${cover.subtitleLines}`);
  if(!near(cover.title.top,49.2,4)||!near(cover.subtitle.top,62.6,4)) throw new Error(`Posição dos títulos: ${JSON.stringify({title:cover.title.top,subtitle:cover.subtitle.top})}`);
  if(!near(cover.claimRows[0].top,82.7,5)||!near(cover.claimRows[1].top,88.7,5)) throw new Error(`Posição dos sinistros: ${JSON.stringify(cover.claimRows)}`);
  if(!near(cover.meta.width,172.6,.6)) throw new Error(`Largura cadastral: ${cover.meta.width}`);
  if(!near(cover.metaRows[0].cells[0].width,65.1,.7)||!near(cover.metaRows[0].cells[1].width,107.5,.8)) throw new Error(`Colunas usuais: ${JSON.stringify(cover.metaRows[0])}`);
  if(cover.metaRows[7].cells[0].colSpan!==2||!near(cover.metaRows[7].cells[0].width,77.5,.8)||!near(cover.metaRows[7].cells[1].width,95.1,.8)) throw new Error(`Colunas deslocadas: ${JSON.stringify(cover.metaRows[7])}`);
  if(!near(cover.metaRows[0].top,107.8,5)||cover.metaRows.at(-1).top<195||cover.metaRows.at(-1).top>212) throw new Error(`Distribuição vertical: ${JSON.stringify({first:cover.metaRows[0],last:cover.metaRows.at(-1)})}`);
  if(cover.metaRows[1].cells[1].lines!==1) throw new Error(`Segurado quebrou linha: ${JSON.stringify(cover.metaRows[1])}`);
  if(cover.title.bg!=='rgba(0, 0, 0, 0)'||cover.meta.bg!=='rgba(0, 0, 0, 0)') throw new Error(`Preenchimento indevido: ${cover.title.bg} / ${cover.meta.bg}`);
  if(cover.contentOverflow>2) throw new Error(`Overflow na capa: ${cover.contentOverflow}px`);
  if(cover.secondPage.bodyFont!=='14.6667px'||cover.secondPage.headingFont!=='18.6667px') throw new Error(`Página interna alterada: ${JSON.stringify(cover.secondPage)}`);
  if(pageErrors.length) throw new Error(pageErrors.join('\n'));

  await page.locator('#reportPreview .report-page.first').screenshot({path:path.join(out,'preview-capa.png')});
  await page.locator('#reportPreview .report-page').nth(1).screenshot({path:path.join(out,'preview-pagina-2.png')});

  await page.click('[data-action="export-pdf"]');
  await page.waitForSelector('#printHost .report-page',{state:'attached'});
  await page.emulateMedia({media:'print'});
  await page.pdf({path:path.join(out,'preview.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
  await page.emulateMedia({media:'screen'});

  const pending=page.waitForEvent('download',{timeout:120000});
  await page.click('[data-action="export-word"]');
  const download=await pending;
  const target=path.join(out,download.suggestedFilename());
  await download.saveAs(target);
  if(!fs.existsSync(target)||fs.statSync(target).size<15000) throw new Error('DOCX inválido');
  fs.writeFileSync(path.join(out,'preview.json'),JSON.stringify(cover,null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
