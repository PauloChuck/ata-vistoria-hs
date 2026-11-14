const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict');
function setup(confirmed={},extra={}) {
  const context=vm.createContext({window:{},document:{getElementById:()=>null}});
  for(const name of ['cooperators-0635.js','risk-card-0635.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',name),'utf8'),context);
  const state={cooperatorSelection:{schemaVersion:3,sourceRecordId:'selected',original:{},confirmed:{name:'Pessoa sintética',activity:'Suínos',installations:[],...confirmed},...extra}};
  const card=context.window.FastTrackRiskCard;
  return {state,card,data:card.data(state),html:card.html(state)};
}
const values=result=>result.data.groups.find(group=>group.kind==='values').fields;
const normalize=s=>s.replace(/\s/g,' ');
test('VR separados, BRL com duas casas, zero explícito e nenhuma soma',()=>{
  const r=setup({vrBuildings:'1200000.75',vrAnimals:0});
  assert.deepEqual(Array.from(values(r),v=>normalize(v.value)),['R$ 1.200.000,75','R$ 0,00']);
  assert.equal(values(r)[0].label,'Valor em risco de benfeitorias');
  assert.equal(values(r)[1].label,'Valor em risco de animais');
  assert(!r.html.includes('VR total'));
});
test('ausência não usa o outro VR e não equivale a zero nem a não se aplica',()=>{
  for(const [vrBuildings,vrAnimals] of [['',90],[90,''],[null,undefined]]) {
    const r=setup({vrBuildings,vrAnimals});
    for(const [i,raw] of [vrBuildings,vrAnimals].entries())assert.equal(values(r)[i].value,raw ? 'R$\u00a090,00' : 'Não informado na base');
    assert(!r.html.includes('Não se aplica'));
  }
  assert.equal(values(setup({vrAnimals:'Não se aplica'}))[1].value,'Não se aplica');
});
test('somente a seleção confirmada, sem agrupamento por nome ou alteração de origem',()=>{
  const r=setup({municipality:'Cidade A',vrBuildings:'150',localIdentification:'Local alterado'},{original:{municipality:'Cidade B',vrBuildings:'200',localIdentification:'Local original'},relatedCandidates:[{name:'Pessoa sintética',municipality:'Cidade C',vrAnimals:500}]});
  const before=JSON.stringify(r.state);r.card.data(r.state);r.card.html(r.state);
  assert.equal(JSON.stringify(r.state),before);assert(r.html.includes('Cidade A'));
  assert(!r.html.includes('Cidade B'));assert(!r.html.includes('Cidade C'));assert(!r.html.includes('500'));
  assert(r.html.includes('Local alterado'));assert(!r.html.includes('Local original'));
});
test('rótulos preservam quantidade real versus capacidade e unidades',()=>{
  const r=setup({capacity:'1980',capacityUnit:'suínos',capacityConcept:'Lotação máxima da pocilga',area:'1200',areaUnit:'m²',latitude:'-27.123456',longitude:'-52.654321'});
  assert(r.html.includes('1.980 suínos'));assert(r.html.includes('Lotação máxima da pocilga'));assert(r.html.includes('1.200 m²'));
  assert(r.html.includes('Latitude'));assert(r.html.includes('-27,123456'));assert(r.html.includes('Longitude'));
  const actual=setup({capacity:90,capacityUnit:'aves',capacityConcept:'Quantidade de aves'});
  assert(actual.html.includes('Quantidade de aves'));assert(!actual.html.includes('máxima'));
});
test('somente instalações envolvidas, cada uma individual e sem somar',()=>{
  const r=setup({installations:[{id:'a',involved:true,code:'Galpão A',capacity:15,capacityUnit:'aves'},{id:'b',involved:false,code:'Galpão B'},{id:'c',involved:true,code:'Galpão C',capacity:20,capacityUnit:'aves'}]});
  assert.equal(r.data.groups.filter(g=>g.kind==='installation').length,2);
  assert(r.html.includes('Galpão A'));assert(r.html.includes('Galpão C'));assert(!r.html.includes('Galpão B'));assert(!r.html.includes('35 aves'));
});
test('ficha omite metadados internos e nome não substitui origem documental',()=>{
  const r=setup({sourceCategory:'Pessoa sintética',sourceReference:'Pessoa sintética',extraFields:[{label:'Histórico interno',value:'123'}]},{baseVersion:{sha256:'hash-privado',versionLabel:'importador-privado'},source:{path:['caminho-privado'],rawRecord:{secret:'interno'}}});
  assert.equal((r.html.match(/PESSOA SINTÉTICA/g)||[]).length,1);
  assert(r.html.includes('Origem do registro: Não informada'));
  for(const s of ['hash-privado','importador-privado','caminho-privado','Histórico interno'])assert(!r.html.includes(s));
});
test('associação expressa e ajustes manuais mantêm origem ao lado do valor',()=>{
  const r=setup({vrBuildings:10,vrAnimals:20,sourceCategory:'Renovação',sourceReference:'Documento X'},{fieldSources:{vrBuildings:{type:'associated',recordId:'other',baseLabel:'Base A',activity:'Atividade A',origin:'Endosso',reference:'Documento Y'},vrAnimals:{type:'manual',recordId:null}}});
  assert(values(r)[0].origin.includes('Documento Y'));assert.equal(values(r)[1].origin,'Ajuste manual do regulador');
  assert(r.html.includes('Origem do registro: Renovação'));assert(r.html.includes('Referência: Documento X'));
});
test('campos incompletos não inventam UF/área e texto longo continua escapado',()=>{
  const r=setup({name:'<script>Exemplo</script>'.repeat(30),localIdentification:'<img src=x onerror=alert(1)>'});
  assert(!r.html.includes('<script>'));assert(!r.html.includes('<img '));assert(r.html.includes('&lt;img'));
  assert(!r.data.groups.flatMap(g=>g.fields||[]).some(f=>f.label==='UF'||f.label==='Área'));
  assert.equal(setup().card.data({cooperatorSelection:null}),null);
});
