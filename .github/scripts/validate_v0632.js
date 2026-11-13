const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.env.V0632_OUT || '/tmp/v0632-validation';
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAANklEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNnyNi1dwfgUQCeBeBZAB4F4FkAHgXgWQAeBeBZAB4F4FnAAb0AAcJDnxQAAAAASUVORK5CYII=';
const pngBuffer = Buffer.from(pngBase64, 'base64');

function fixture(updated = false) {
  const selectedVr = updated ? 'R$ 9.999.999,00' : 'R$ 1.200.000,00';
  return `<!doctype html><html><body><script>
  window.__IMPORTED_SCRIPT_EXECUTED = true;
  const DATA = {
    aurora: [
      {
        'Nome do Cooperado': 'José da Silva',
        'Município': 'Chapecó', 'UF': 'SC', 'Localidade': 'Linha Alfa',
        'Latitude': '-27.101', 'Longitude': '-52.601',
        'Categoria': 'Base inicial', 'Referência da planilha': 'BASE 2026-10', 'Situação': 'ATIVO',
        'VR Benfeitorias': '${selectedVr}', 'VR Animais': 'R$ 250.000,00',
        instalacoes: [
          {'Código Aviário':'AV-01','Tipo Instalação':'Aviário','Área':'1.200','Capacidade de alojamento':'18.000 aves'},
          {'Código Aviário':'AV-02','Tipo Instalação':'Aviário','Área':'1.350','Capacidade de alojamento':'20.000 aves'}
        ]
      },
      {
        'Nome do Cooperado': 'José da Silva', 'Município': 'Xanxerê', 'UF': 'SC', 'Localidade': 'Linha Beta',
        'Coordenadas': '-26.875, -52.404', 'Código Aviário': 'AV-EX', 'Área m²':'900', 'Capacidade Aves':'12.000',
        'Categoria':'Exclusão', 'Referência':'ENDOSSO 018/2026', 'Situação':'EXCLUÍDO',
        'VR Benfeitorias':'R$ 800.000,00', 'VR Animais':'R$ 150.000,00'
      },
      {
        'Nome do Cooperado':'Maria Endosso','Município':'Concórdia','UF':'SC','Latitude':'95,0','Longitude':'-52,0',
        'Categoria':'Alteração','Referência':'NOV/2026','Situação':'VERIFICAR ENDOSSO'
      }
    ],
    lar: [{
      nome:'JOSE DA SILVA', cidade:'Cascavel', uf:'PR', linha:'Linha Lar', lat:'-24.955', lng:'-53.455',
      aviario:'LAR-11', metragem:'1.500 m²', alojamento:'24.000 aves', origem:'Renovação', planilha:'RENOVAÇÃO OUT/2026', status:'ATIVO',
      'Valor Benfeitorias':'R$ 1.500.000,00','Valor Aves':'R$ 300.000,00'
    }],
    suinos: [{nome:'Carlos Suínos',municipio:'Seara',uf:'SC',localidade:'Linha Suína',coordenadas:'-27.15 / -52.30',pocilga:'SU-1',capacidade:'1.200 suínos',movimento:'Inclusão',endosso:'END 77',situacao:'ATIVO','VR Benfeitorias':'R$ 2.000.000,00','VR Suínos':'R$ 450.000,00'}],
    jagua: [{integrado:'Ana Jaguafrangos',municipio:'Jaguapitã',uf:'PR',local:'Sítio JG',latitude:'-23.11',longitude:'-51.53',galpao:'JG-4',area:'1.100 m²',quantidade_aves:'17.500 aves',tipo_registro:'Base inicial',referencia:'BASE JG',status:'ATIVO'}],
    matrizes: [{produtor:'Paulo Matrizes',municipio:'Xaxim',uf:'SC',propriedade:'Núcleo M1',latitude:'-26.96',longitude:'-52.53',nucleo:'M-1',area:'2.200 m²',plantel:'32.000 matrizes',categoria:'Troca de titularidade',referencia:'END 99',situacao:'ATIVO'}],
    larPostura: [{cooperado:'Lúcia Postura',municipio:'Medianeira',uf:'PR',linha:'Linha Postura',latitude:'-25.29',longitude:'-54.09',galpao:'P-2',area:'980 m²',plantel:'15.000 aves',categoria:'Alteração',referencia:'PLANILHA 2026-09',situacao:'ATIVO'}]
  };
  </script></body></html>`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function go(page, step) {
  await page.evaluate((target) => {
    const current = document.querySelector('.screen.active');
    const button = current?.querySelector(`[data-go="${target}"]`);
    if (!button) throw new Error(`Botão para etapa ${target} não encontrado`);
    button.click();
  }, step);
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

async function downloadByAction(page, action, target) {
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate((name) => document.querySelector(`[data-action="${name}"]`).click(), action);
  const download = await downloadPromise;
  await download.saveAs(target);
  return target;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page = await browser.newPage({acceptDownloads:true,viewport:{width:1500,height:1100}});
  const pageErrors=[]; const consoleErrors=[]; const httpErrors=[];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', msg => { const text=msg.text(); if (msg.type()==='error' && !/favicon/i.test(text) && !/Failed to load resource:.*404.*File not found/i.test(text)) consoleErrors.push(text); });
  page.on('response', response => { if (response.status()>=400 && !/favicon/i.test(response.url())) httpErrors.push({status:response.status(),url:response.url()}); });
  page.on('dialog', dialog => dialog.accept());

  await page.goto('http://127.0.0.1:8000/fast_track/v062.html?v=0632-ci',{waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('.app-shell');
  await page.waitForFunction(() => window.FastTrackCooperators && window.FastTrackV06Word && window.docx);
  await page.locator('[data-action="load-example"]').click();
  await page.waitForTimeout(500);

  await page.setInputFiles('#cooperatorBaseInput',{name:'CONSULTA DE COOPERADOS.html',mimeType:'text/html',buffer:Buffer.from(fixture(false))});
  await page.waitForFunction(() => document.querySelector('#cooperatorBaseStatus')?.innerText.includes('registros reconhecidos'));

  const base = await page.evaluate(() => ({executed:window.__IMPORTED_SCRIPT_EXECUTED,base:window.FastTrackCooperators.getBase(),scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));
  assert(!base.executed,'O script do HTML importado foi executado.');
  assert(base.base.totalRecords===8,`Quantidade de registros divergente: ${base.base.totalRecords}`);
  for (const key of ['aurora','lar','suinos','jagua','matrizes','larPostura']) assert(base.base.counts[key]>=1,`Base ausente: ${key}`);
  assert(base.scripts.some(src=>/cooperators-0632\.js\?v=0632/.test(src)),'Módulo 0632 não carregado.');
  const pending = base.base.records.find(r=>r.name==='Maria Endosso');
  assert(pending.warnings.some(w=>/VERIFICAR ENDOSSO/.test(w)),'Pendência de endosso não sinalizada.');
  assert(pending.warnings.some(w=>/Coordenadas/.test(w)),'Coordenada incompatível não sinalizada.');

  await page.fill('#cooperatorSearch','  jose   da silva  ');
  await page.locator('[data-action="search-cooperators"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length===3);
  assert(await page.locator('.cooperator-result-card').count()===3,'Registros homônimos foram agrupados indevidamente.');
  await page.selectOption('#cooperatorCooperativeFilter','Lar');
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length===1);
  assert((await page.locator('.cooperator-result-card').innerText()).includes('Lar — Aves de Corte'),'Filtro de cooperativa incorreto.');
  await page.selectOption('#cooperatorCooperativeFilter','');
  await page.locator('[data-action="search-cooperators"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length===3);

  const selectedCard = page.locator('.cooperator-result-card').filter({hasText:'Linha Alfa'}).filter({hasText:'Base inicial'});
  assert(await selectedCard.count()===1,'Local inicial da Aurora não foi diferenciado.');
  await selectedCard.locator('[data-action="use-cooperator-record"]').click();
  await page.waitForSelector('.cooperator-selected');
  assert(await page.inputValue('#claimantName')==='José da Silva','Nome não foi preenchido após confirmação.');
  assert(await page.inputValue('#riskAddress')==='Linha Alfa, Chapecó - SC','Local não foi preenchido corretamente.');
  const installationChecks=page.locator('[data-installation-field="involved"]');
  assert(await installationChecks.count()===2,'Instalações múltiplas não foram preservadas.');
  assert(!(await installationChecks.nth(0).isChecked()) && !(await installationChecks.nth(1).isChecked()),'Instalações múltiplas foram presumidas como envolvidas.');
  assert((await page.locator('#cooperatorSelectedPanel').innerText()).includes('Selecione ao menos uma instalação'),'Pendência de instalação não exibida.');
  await installationChecks.nth(0).check();
  await page.fill('[data-coop-field="vrBuildings"]','R$ 1.250.000,00');
  await page.fill('[data-coop-field="localIdentification"]','Linha Alfa — propriedade confirmada');
  assert((await page.inputValue('#riskAddress')).includes('propriedade confirmada'),'Ajuste do local não foi transcrito ao cadastro.');

  const selectedBeforeUpdate = await page.inputValue('[data-coop-field="vrBuildings"]');
  await page.setInputFiles('#cooperatorBaseInput',{name:'CONSULTA DE COOPERADOS ATUALIZADA.html',mimeType:'text/html',buffer:Buffer.from(fixture(true))});
  await page.waitForFunction(() => document.querySelector('#cooperatorBaseStatus')?.innerText.includes('ATUALIZADA'));
  assert(await page.inputValue('[data-coop-field="vrBuildings"]')===selectedBeforeUpdate,'Atualização da base alterou silenciosamente o relatório confirmado.');

  const backupPath=path.join(out,'backup-v0632.json');
  await downloadByAction(page,'export-backup',backupPath);
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  assert(backup.cooperatorSelection.confirmed.vrBuildings==='R$ 1.250.000,00','VR confirmado não foi salvo.');
  assert(backup.cooperatorSelection.original.vrBuildings==='R$ 1.200.000,00','Dado original importado não foi preservado.');
  assert(backup.cooperatorSelection.confirmed.vrAnimals==='R$ 250.000,00','VR de animais não foi preservado separadamente.');
  assert(backup.cooperatorSelection.confirmed.installations.filter(i=>i.involved).length===1,'Seleção das instalações não foi salva.');
  assert(backup.cooperatorSelection.source.rawRecord['VR Benfeitorias']==='R$ 1.200.000,00','Registro original bruto ausente.');
  assert(backup.cooperatorSelection.baseVersion.sha256,'Versão/hash da base ausente no relatório.');

  await page.evaluate(() => document.querySelector('[data-action="save-draft"]').click());
  await page.waitForTimeout(700);
  await page.reload({waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('.app-shell');
  await page.waitForFunction(() => window.FastTrackCooperators && document.querySelector('#cooperatorBaseStatus')?.innerText.includes('ATUALIZADA'));
  assert(await page.inputValue('#claimantName')==='José da Silva','Seleção não persistiu após recarga.');
  assert(await page.inputValue('[data-coop-field="vrBuildings"]')==='R$ 1.250.000,00','Ajuste do regulador não persistiu após recarga.');
  assert(await page.locator('#damageList .damage-card').count()===0,'Danos não foram reiniciados na recarga.');
  assert(await page.locator('#photoGallery .photo-card').count()===0,'Fotos não foram reiniciadas na recarga.');

  await page.setInputFiles('#backupInput',backupPath);
  await page.waitForTimeout(800);
  await go(page,2);
  await page.setInputFiles('#mapInput',{name:'mapa.png',mimeType:'image/png',buffer:pngBuffer});
  await page.waitForSelector('#mapEditor:not(.hidden)');
  await go(page,3); await go(page,4);
  await page.setInputFiles('#photoInput',{name:'vistoria.png',mimeType:'image/png',buffer:pngBuffer});
  await page.waitForSelector('#photoGallery .photo-card');
  await page.fill('#photoGallery [data-photo-caption]','Instalação selecionada em vistoria');
  await go(page,5); await go(page,6); await go(page,7);
  await page.waitForSelector('#reportPreview .report-page');

  const preview=await page.evaluate(() => { const host=document.querySelector('#reportPreview'); const text=host.innerText; const pages=[...host.querySelectorAll('.report-page')]; return {text,pages:pages.length,overflow:pages.map((p,i)=>({page:i+1,delta:p.querySelector('.report-content').scrollHeight-p.querySelector('.report-content').clientHeight}))}; });
  const normalized=preview.text.replace(/\s+/g,' ').toUpperCase();
  for (const required of ['DADOS CONFIRMADOS DO LOCAL','JOSÉ DA SILVA','LINHA ALFA — PROPRIEDADE CONFIRMADA','VR DE BENFEITORIAS','R$ 1.250.000,00','VR DE ANIMAIS','R$ 250.000,00','AURORA — AVES DE CORTE','BASE 2026-10','AV-01']) assert(normalized.includes(required),`Prévia sem conteúdo: ${required}`);
  for (const forbidden of ['AV-02','LINHA LAR','ENDOSSO 018/2026','R$ 9.999.999,00']) assert(!normalized.includes(forbidden),`Prévia contém registro não selecionado/atualizado: ${forbidden}`);
  assert(preview.overflow.every(item=>item.delta<=2),`Overflow na prévia: ${JSON.stringify(preview.overflow)}`);

  await page.screenshot({path:path.join(out,'interface-v0632.png'),fullPage:true});
  await page.locator('#reportPreview').screenshot({path:path.join(out,'preview-v0632.png')});
  const docxPath=path.join(out,'Relatorio_Fast_Track_V0632.docx');
  await downloadByAction(page,'export-word',docxPath);
  await page.emulateMedia({media:'print'});
  await page.pdf({path:path.join(out,'Relatorio_Fast_Track_V0632.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});

  fs.writeFileSync(path.join(out,'browser-result.json'),JSON.stringify({baseCounts:base.base.counts,pendingWarnings:pending.warnings,backupSelection:backup.cooperatorSelection,preview,pageErrors,consoleErrors,httpErrors},null,2));
  if (pageErrors.length || consoleErrors.length || httpErrors.length) throw new Error(JSON.stringify({pageErrors,consoleErrors,httpErrors}));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
