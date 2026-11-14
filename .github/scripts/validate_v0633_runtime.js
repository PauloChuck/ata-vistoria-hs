const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = process.env.V0633_OUT || '/tmp/v0633-validation';
const appUrl = process.env.V0633_URL || 'http://127.0.0.1:8000/fast_track/v062.html?v=0633-ci';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAANklEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZOjNnyNi1dwfgUQCeBeBZAB4F4FkAHgXgWQAeBeBZ4AG9AAHCPQ58UAAAAASUVORK5CYII=', 'base64');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fixture({updated = false} = {}) {
  const elioExtra = updated ? `,
          { cidade:'HERVAL D OESTE', latitude:'-27,190000', longitude:'-51,500000', qtdeLotacao:600, vrBenfeitoria:'R$ 360.000,00', planilha:'RENOVACAO SUINOS 2026 B', situacao:'ATIVO' }` : '';
  return `<!doctype html><html lang="pt-BR"><body>
  <script>window.__IMPORTED_SCRIPT_EXECUTED = true;</script>
  <script>
  const DATA = {
    aurora: {
      grupoA: {
        nome:'JOAO MULTI',
        renovacao:[
          { cidade:'CHAPECO', uf:'SC', localidade:'LINHA A', latitude:'-27,100001', longitude:'-52,600001', aviario:'AV-01', metragem:'1.200 m²', capAloja:18000, vrBenfeitoria:'R$ 1.000.000,00', vrAnimais:'R$ 200.000,00', planilha:'RENOVACAO AVES 2026', situacao:'ATIVO', meta:{auditoria:'não textual'} },
          { cidade:'XAXIM', uf:'SC', localidade:'LINHA B', latitude:'-26,960001', longitude:'-52,530001', aviario:'AV-02', areaM2:1350, capAloja:20000, vrBenfeitoria:'R$ 1.150.000,00', vrAnimais:0, planilha:'RENOVACAO AVES 2026', situacao:'ATIVO' }
        ],
        registrosEndosso:[
          { cidade:'CHAPECO', uf:'SC', localidade:'LINHA A', aviario:'AV-03', areaM2:'900', capAloja:'12.000', vrBenfeitoria:'R$ 100.000,00', planilha:'END 010', resultado:'INCLUSAO' }
        ],
        endossos:['END 010','END 099 - VERIFICAR ENDOSSO']
      }
    },
    lar: {
      cadastros:[{
        nome:'JOAO MULTI',
        inicial:[{ cidade:'CASCAVEL', uf:'PR', localidade:'LINHA LAR', latitude:'-24,955001', longitude:'-53,455001', aviario:'LAR-01', metragem:'1.500 m²', quantidadeAves:24000, valorBenfeitoria:'R$ 1.500.000,00', valorAves:'R$ 300.000,00', planilha:'BASE LAR 2026', situacao:'ATIVO' }],
        endossos:[{ cidade:'TOLEDO', uf:'PR', localidade:'LINHA ENDOSSO', latitude:'-24,720001', longitude:'-53,740001', aviario:'LAR-E1', areaM2:800, maximoAves:10000, valorBenfeitoria:'R$ 700.000,00', valorAves:'R$ 120.000,00', planilha:'END LAR 44', resultado:'EXCLUSAO' }],
        trocas:['Troca de titularidade pendente de conferência']
      }]
    },
    suinos: {
      cooperados: {
        elio: {
          nome:'ELIO ANTONIO DA SILVA',
          renovacao:[
            { cidade:'JABORA', latitude:'-27,097108', longitude:'-51,864781', qtdeLotacao:490, vrBenfeitoria:'R$ 294.000,00', planilha:'RENOVACAO SUINOS 2026', situacao:'ATIVO' }${elioExtra}
          ],
          registrosEndosso:[
            { cidade:'JABORA', planilha:'END SUINOS 01', resultado:'AUMENTO DE VR', vrBenfeitoria:'R$ 10.000,00' }
          ],
          endossos:['END SUINOS 01','VERIFICAR ENDOSSO SUINOS 02']
        },
        associar: {
          nome:'ASSOCIAR VALORES',
          renovacao:[
            { cidade:'SEARA', latitude:'-27,150000', longitude:'-52,300000', pocilga:'SU-VAL', qtdeLotacao:1000, vrBenfeitoria:'R$ 500.000,00', planilha:'RENOVACAO SUINOS VAL', situacao:'ATIVO' },
            { planilha:'REGISTRO ANIMAIS', vrAnimais:'R$ 50.000,00', situacao:'VALOR COMPLEMENTAR' }
          ]
        }
      }
    },
    jagua: {
      NOME: { nome:'NOME', municipio:'MUNICIPIO', latitude:'LATITUDE', longitude:'LONGITUDE', aviario:'AVIARIO', metragem:'METRAGEM', planilha:'PLANILHA', situacao:'SITUACAO' },
      integrado1: {
        nome:'ANA JAGUAFRANGOS',
        inicial:[{ municipio:'JAGUAPITA', uf:'PR', localidade:'SITIO JG', latitude:'-23,110001', longitude:'-51,530001', aviario:'JG-01', metragem:'1.100 m²', quantidadeAves:17500, valorBenfeitoria:'R$ 900.000,00', valorAves:'R$ 210.000,00', planilha:'BASE JAGUA', situacao:'ATIVO' }],
        endossos:[{ municipio:'JAGUAPITA', aviario:'JG-E1', planilha:'END JAGUA 02', resultado:'ALTERACAO', vrBenfeitoria:'R$ 40.000,00' }],
        titularidades:['Troca de titularidade informada na planilha']
      }
    },
    matrizes: {
      produtor1: {
        nome:'PAULO MATRIZES',
        renovacao:[{ cidade:'XAXIM', uf:'SC', propriedade:'NUCLEO M1', latitude:'-26,960002', longitude:'-52,530002', nucleo:'M-01', areaM2:2200, totalAves:32000, vrEstruturas:'R$ 2.000.000,00', vrTotalAves:'R$ 500.000,00', danosAviarios:'R$ 75.000,00', planilha:'RENOVACAO MATRIZES 2026', situacao:'ATIVO' }],
        endossos:['END MATRIZES SEM DETALHE']
      }
    },
    larPostura: {
      produtor1: {
        nome:'JOAO MULTI',
        iniciais:[
          { tipo:'Postura', cidade:'MEDIANEIRA', uf:'PR', linha:'LINHA POSTURA', latitude:'-25,290001', longitude:'-54,090001', galpao:'P-01', metragem:'980 m²', qtAves:15000, vrTotalEstruturas:'R$ 800.000,00', vrTotalAnimais:'R$ 180.000,00', planilha:'BASE POSTURA', situacao:'ATIVO' },
          { tipo:'Recria', cidade:'MEDIANEIRA', uf:'PR', linha:'LINHA RECRIA', latitude:'-25,290002', longitude:'-54,090002', galpao:'R-01', areaM2:750, maximoAves:10000, vrTotalEstruturas:'R$ 650.000,00', vrTotalAnimais:'R$ 90.000,00', planilha:'BASE RECRIA', situacao:'ATIVO' }
        ],
        endossos:['END POSTURA SEM DETALHE']
      }
    }
  };
  </script></body></html>`;
}

async function go(page, step) {
  await page.evaluate((target) => {
    const current = document.querySelector('.screen.active');
    const button = current?.querySelector(`[data-go="${target}"]`);
    if (!button) throw new Error(`Navegação para a etapa ${target} não encontrada`);
    button.click();
  }, step);
  await page.waitForSelector(`.screen[data-step="${step}"].active`);
}

async function downloadByAction(page, action, target) {
  const pending = page.waitForEvent('download', {timeout: 120000});
  await page.evaluate((name) => document.querySelector(`[data-action="${name}"]`).click(), action);
  const download = await pending;
  await download.saveAs(target);
  return target;
}

async function importFixture(page, html, name = 'CONSULTA DE COOPERADOS.html') {
  await page.setInputFiles('#cooperatorBaseInput', {name, mimeType:'text/html', buffer:Buffer.from(html)});
  await page.waitForFunction(() => window.FastTrackCooperators?.getBase()?.schemaVersion === 2, null, {timeout:30000});
}

(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH, args:['--no-sandbox','--disable-dev-shm-usage']});
  const context = await browser.newContext({acceptDownloads:true, viewport:{width:1500,height:1100}});
  const page = await context.newPage();
  const pageErrors=[]; const consoleErrors=[]; const httpErrors=[];
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('console', message => { if (message.type()==='error' && !/favicon/i.test(message.text())) consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status()>=400 && !/favicon/i.test(response.url())) httpErrors.push({status:response.status(),url:response.url()}); });
  page.on('dialog', dialog => dialog.accept());

  await page.goto(appUrl, {waitUntil:'networkidle', timeout:120000});
  await page.waitForSelector('.app-shell');
  await page.waitForFunction(() => window.FastTrackCooperators?.importerVersion === '0.6.3');
  await page.locator('[data-action="load-example"]').click();
  await page.waitForTimeout(600);
  await importFixture(page, fixture());

  const baseCheck = await page.evaluate(() => {
    const base=window.FastTrackCooperators.getBase();
    const records=base.records;
    const find=(name,baseKey,category)=>records.find(r=>r.name===name && r.baseKey===baseKey && (!category || r.category===category));
    const elio=find('ELIO ANTONIO DA SILVA','suinos','Renovação');
    const matrices=find('PAULO MATRIZES','matrizes','Renovação');
    return {
      executed:window.__IMPORTED_SCRIPT_EXECUTED,
      importer:window.FastTrackCooperators.importerVersion,
      schema:base.schemaVersion,
      counts:base.counts,
      countDetails:base.countDetails,
      totalDetailed:base.totalDetailedRecords,
      totalReferences:base.totalReferences,
      warnings:base.warnings,
      allIds:records.map(r=>r.id),
      names:records.map(r=>r.name),
      recordsText:JSON.stringify(records),
      elio,
      matrices,
      joao:records.filter(r=>r.name==='JOAO MULTI').map(r=>({baseKey:r.baseKey,activity:r.activity,municipality:r.municipality,installationCode:r.installationCode,category:r.category,recordType:r.recordType})),
      references:records.filter(r=>r.recordType==='reference').map(r=>({baseKey:r.baseKey,name:r.name,reference:r.reference,category:r.category})),
      elioMovement:records.find(r=>r.name==='ELIO ANTONIO DA SILVA' && r.category==='Endosso' && r.reference==='END SUINOS 01')
    };
  });

  assert(baseCheck.executed === undefined, 'Os scripts do HTML importado foram executados.');
  assert(baseCheck.importer === '0.6.3' && baseCheck.schema === 2, 'Versão do importador/esquema divergente.');
  for (const key of ['aurora','lar','suinos','jagua','matrizes','larPostura']) assert(baseCheck.counts[key] > 0, `Base sem registros detalhados: ${key}`);
  assert(new Set(baseCheck.allIds).size === baseCheck.allIds.length, 'Identificadores internos duplicados.');
  assert(!baseCheck.recordsText.includes('[object Object]'), 'Objeto foi convertido em texto [object Object].');
  assert(!baseCheck.names.includes('NOME'), 'Cabeçalho Jaguafrangos foi importado como cadastro.');
  assert(baseCheck.countDetails.jagua.cabecalhosIgnorados >= 1, 'Cabeçalho Jaguafrangos não foi contabilizado como ignorado.');
  assert(baseCheck.warnings.some(value=>/cabeçalho/i.test(value)), 'Aviso de cabeçalho ignorado não foi registrado.');
  assert(baseCheck.joao.length >= 6, 'Registros homônimos/locais distintos foram unidos ou perdidos.');
  assert(new Set(baseCheck.joao.map(item=>`${item.baseKey}:${item.activity}:${item.municipality}:${item.installationCode}`)).size === baseCheck.joao.length, 'Registros homônimos foram agrupados indevidamente.');
  assert(baseCheck.joao.some(item=>item.activity==='Postura') && baseCheck.joao.some(item=>item.activity==='Recria'), 'Tipo Postura/Recria não foi preservado.');
  assert(baseCheck.references.some(item=>item.baseKey==='aurora' && /END 099/.test(item.reference)), 'Referência textual de endosso Aurora ausente.');
  assert(baseCheck.references.some(item=>item.baseKey==='matrizes' && /END MATRIZES/.test(item.reference)), 'Referência textual de endosso Matrizes ausente.');
  assert(baseCheck.elio, 'Registro de renovação de ELIO ANTONIO DA SILVA não encontrado.');
  assert(baseCheck.elio.municipality==='JABORA', `Município de Elio divergente: ${baseCheck.elio.municipality}`);
  assert(baseCheck.elio.latitude==='-27,097108' && baseCheck.elio.longitude==='-51,864781', 'Coordenadas de Elio divergentes.');
  assert(String(baseCheck.elio.capacity)==='490', `Lotação de Elio divergente: ${baseCheck.elio.capacity}`);
  assert(baseCheck.elio.capacityConcept==='Lotação máxima da pocilga' && baseCheck.elio.capacityUnit==='suínos', 'Conceito/unidade da lotação de Elio divergente.');
  assert(baseCheck.elio.vrBuildings==='R$ 294.000,00', `VR de benfeitorias de Elio divergente: ${baseCheck.elio.vrBuildings}`);
  assert(baseCheck.elio.vrAnimals==='' && baseCheck.elio.state==='' && baseCheck.elio.localIdentification==='' && baseCheck.elio.area==='', 'Dados ausentes de Elio foram presumidos.');
  assert(baseCheck.elio.category==='Renovação' && baseCheck.elio.listName==='renovacao', 'Origem/lista de Elio divergente.');
  assert(baseCheck.elioMovement && baseCheck.elioMovement.vrBuildings==='' && baseCheck.elioMovement.extraFields.some(item=>item.key==='vrBuildingsMovement'), 'Movimentação de VR foi tratada como valor total atual.');
  assert(baseCheck.matrices.extraFields.some(item=>item.label==='Total Danos Materiais Aviários' && item.requiresEquivalenceConfirmation), 'danosAviarios não foi preservado com validação de equivalência.');

  await page.fill('#cooperatorSearch','  joão   multi  ');
  await page.locator('[data-action="search-cooperators"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length >= 6);
  assert(!(await page.locator('#cooperatorResults').innerText()).includes('[object Object]'), 'Card exibiu [object Object].');
  await page.selectOption('#cooperatorActivityFilter','Postura');
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length === 1);
  assert((await page.locator('.cooperator-result-card').innerText()).includes('Lar — Postura e Recria'), 'Filtro/atividade Postura não correspondeu à base correta.');
  await page.selectOption('#cooperatorActivityFilter','');

  await page.fill('#cooperatorSearch','ASSOCIAR VALORES');
  await page.locator('[data-action="search-cooperators"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length === 2);
  const assocLocation = page.locator('.cooperator-result-card').filter({hasText:'SEARA'}).filter({hasText:'SU-VAL'});
  assert(await assocLocation.count()===1, 'Registro principal para associação explícita não encontrado.');
  await assocLocation.locator('[data-action="use-cooperator-record"]').click();
  await page.waitForSelector('.cooperator-selected');
  assert(await page.inputValue('[data-coop-field="vrAnimals"]')==='', 'VR de animais foi associado automaticamente.');
  const associationButton=page.locator('[data-action="apply-related-value"][data-related-field="vrAnimals"]');
  assert(await associationButton.count()===1, 'Ação explícita para associar VR de animais não foi exibida.');
  await associationButton.click();
  assert(await page.inputValue('[data-coop-field="vrAnimals"]')==='R$ 50.000,00', 'Associação explícita do VR de animais falhou.');

  await page.fill('#cooperatorSearch','ELIO ANTONIO DA SILVA');
  await page.locator('[data-action="search-cooperators"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.cooperator-result-card').length >= 2);
  const elioCard=page.locator('.cooperator-result-card').filter({hasText:'JABORA'}).filter({hasText:'Renovação'}).filter({hasText:'R$ 294.000,00'});
  assert(await elioCard.count()===1, `Card de renovação de Elio ambíguo: ${await elioCard.count()}`);
  const elioCardText=await elioCard.innerText();
  for (const expected of ['JABORA','-27,097108','-51,864781','Lotação máxima da pocilga','490 suínos','R$ 294.000,00','Renovação']) assert(elioCardText.includes(expected), `Card de Elio sem: ${expected}`);
  assert(elioCardText.includes('Não informado'), 'Campos ausentes de Elio não foram apresentados como Não informado.');
  await elioCard.locator('[data-action="use-cooperator-record"]').click();
  await page.waitForSelector('.cooperator-selected');
  assert(await page.inputValue('#claimantName')==='ELIO ANTONIO DA SILVA', 'Nome de Elio não foi transcrito ao cadastro.');
  assert(await page.inputValue('[data-coop-field="municipality"]')==='JABORA', 'Município não foi transcrito ao painel confirmado.');
  assert(await page.inputValue('[data-coop-field="state"]')==='', 'UF ausente foi presumida.');
  assert(await page.inputValue('[data-coop-field="latitude"]')==='-27,097108', 'Latitude não foi preservada.');
  assert(await page.inputValue('[data-coop-field="longitude"]')==='-51,864781', 'Longitude não foi preservada.');
  assert(await page.inputValue('[data-coop-field="capacity"]')==='490', 'Lotação não foi preservada.');
  assert(await page.inputValue('[data-coop-field="vrBuildings"]')==='R$ 294.000,00', 'VR de benfeitorias não foi preservado.');
  assert(await page.inputValue('[data-coop-field="vrAnimals"]')==='', 'VR de animais ausente foi inventado.');

  await page.evaluate(() => document.querySelector('[data-action="save-draft"]').click());
  await page.waitForTimeout(900);
  await page.reload({waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('.app-shell');
  await page.waitForFunction(() => window.FastTrackCooperators?.getBase()?.schemaVersion === 2);
  assert((await page.locator('#cooperatorBaseStatus').innerText()).includes('importador 0.6.3'), 'Base corrigida não persistiu após recarga.');
  assert(await page.inputValue('#claimantName')==='ELIO ANTONIO DA SILVA', 'Seleção confirmada não persistiu após recarga.');
  assert(await page.inputValue('[data-coop-field="vrBuildings"]')==='R$ 294.000,00', 'VR confirmado não persistiu após recarga.');

  const backupPath=path.join(out,'Backup_Fast_Track_V0633.json');
  await downloadByAction(page,'export-backup',backupPath);
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  const selection=backup.cooperatorSelection;
  assert(selection.schemaVersion===2, 'Seleção não foi versionada no esquema 2.');
  assert(selection.source.listName==='renovacao' && selection.confirmed.sourceCategory==='Renovação', 'Origem do registro selecionado não foi preservada.');
  assert(selection.confirmed.vrBuildings==='R$ 294.000,00' && selection.confirmed.vrAnimals==='', 'VRs do backup divergentes.');
  assert(selection.source.rawRecord.qtdeLotacao===490, 'Registro bruto real não foi preservado.');
  assert(selection.baseVersion.importerVersion==='0.6.3', 'Versão do importador não foi registrada no relatório.');

  await go(page,2);
  await page.setInputFiles('#mapInput',{name:'mapa.png',mimeType:'image/png',buffer:png});
  await page.waitForSelector('#mapEditor:not(.hidden)');
  await go(page,3);
  if (await page.locator('#damageList .damage-card').count()===0) await page.locator('[data-action="add-damage"]').click();
  const damage=page.locator('#damageList .damage-card').first();
  if (await damage.count()) {
    await damage.locator('[data-damage="description"]').fill('Item de teste da validação do importador');
    await damage.locator('[data-damage="quantity"]').fill('1');
    await damage.locator('[data-damage="unit"]').fill('un.');
    await damage.locator('[data-damage="age"]').fill('1');
    await damage.locator('[data-damage="claimedTotal"]').fill('1000');
    await damage.locator('[data-damage="assessedTotal"]').fill('1000');
  }
  await go(page,4);
  await page.setInputFiles('#photoInput',{name:'vistoria.png',mimeType:'image/png',buffer:png});
  await page.waitForSelector('#photoGallery .photo-card');
  await page.locator('#photoGallery [data-photo-caption]').first().fill('Fotografia de validação do local selecionado');
  await go(page,5); await go(page,6); await go(page,7);
  await page.waitForSelector('#reportPreview .report-page');

  const preview=await page.evaluate(() => {
    const host=document.querySelector('#reportPreview');
    const pages=[...host.querySelectorAll('.report-page')];
    return {text:host.innerText,pages:pages.length,overflow:pages.map((p,index)=>({page:index+1,delta:p.querySelector('.report-content').scrollHeight-p.querySelector('.report-content').clientHeight}))};
  });
  const previewText=preview.text.replace(/\s+/g,' ');
  for (const expected of ['DADOS CONFIRMADOS DO LOCAL','ELIO ANTONIO DA SILVA','JABORA','-27,097108 / -51,864781','Lotação máxima da pocilga','490 suínos','VR de benfeitorias','R$ 294.000,00','VR de animais','Não informado','Origem do registro','Renovação']) assert(previewText.includes(expected), `Prévia sem conteúdo de Elio: ${expected}`);
  assert(!previewText.includes('[object Object]'), 'Prévia contém [object Object].');
  assert(preview.overflow.every(item=>item.delta<=2), `Overflow na prévia: ${JSON.stringify(preview.overflow)}`);
  await page.locator('#reportPreview').screenshot({path:path.join(out,'preview-v0633.png')});
  await page.screenshot({path:path.join(out,'interface-v0633.png'),fullPage:true});

  const docxPath=path.join(out,'Relatorio_Fast_Track_V0633.docx');
  await downloadByAction(page,'export-word',docxPath);
  assert(fs.existsSync(docxPath) && fs.statSync(docxPath).size>15000, 'DOCX não foi gerado.');
  await page.evaluate(() => {
    const nativePrint = window.print;
    window.print = () => {};
    document.querySelector('[data-action="export-pdf"]').click();
    window.print = nativePrint;
  });
  await page.waitForSelector('#printHost .report-page',{state:'attached'});
  await page.emulateMedia({media:'print'});
  const pdfPath=path.join(out,'Relatorio_Fast_Track_V0633.pdf');
  await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
  await page.emulateMedia({media:'screen'});
  assert(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size>10000, 'PDF não foi gerado.');

  await page.setInputFiles('#cooperatorBaseInput',{name:'CONSULTA DE COOPERADOS ATUALIZADA.html',mimeType:'text/html',buffer:Buffer.from(fixture({updated:true}))});
  await page.waitForFunction(() => document.querySelector('#cooperatorBaseStatus')?.innerText.includes('CONSULTA DE COOPERADOS ATUALIZADA'));
  assert(await page.inputValue('[data-coop-field="municipality"]')==='JABORA', 'Atualização da base alterou silenciosamente o município confirmado.');
  assert(await page.inputValue('[data-coop-field="vrBuildings"]')==='R$ 294.000,00', 'Atualização da base alterou silenciosamente o VR confirmado.');
  assert((await page.locator('#cooperatorSelectedPanel').innerText()).includes('Nova seleção obrigatória'), 'Múltiplos locais após reimportação não exigiram nova seleção.');

  if (pageErrors.length || consoleErrors.length || httpErrors.length) throw new Error(JSON.stringify({pageErrors,consoleErrors,httpErrors}));
  const result={baseCheck,preview,selectionAfterUpdate:await page.locator('#cooperatorSelectedPanel').innerText(),pageErrors,consoleErrors,httpErrors,docxPath,pdfPath};
  fs.writeFileSync(path.join(out,'browser-result.json'),JSON.stringify(result,null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
