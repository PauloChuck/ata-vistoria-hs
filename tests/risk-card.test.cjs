const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict');
function setup(confirmed={},extra={}) {
 const context=vm.createContext({window:{},document:{getElementById:()=>null}});
 for(const name of ['property-0639.js','cooperators-0639.js','risk-card-0639.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',name),'utf8'),context);
 const state={cooperatorSelection:{schemaVersion:3,sourceRecordId:'selected',original:{},confirmed:{name:'Pessoa sintética',companyGroup:'Aurora',activity:'Suínos',installations:[],...confirmed},...extra}};
 const card=context.window.FastTrackRiskCard,p=context.window.FastTrackProperty;
 return {state,card,p,data:card.data(state),html:card.html(state)};
}
const rows=r=>r.data.cards.flatMap(c=>c.blocks.flatMap(b=>b.rows.map(x=>Array.from(x.values))));
const record=(id,extra={})=>({id,name:'Pessoa sintética',companyGroup:'Aurora',activity:'Suínos',category:'Renovação',municipality:'Cidade de Teste',latitude:'-27.1234567890120',longitude:'-52.654321',capacity:'300',vrBuildings:'100.01',vrAnimals:'70',...extra});
test('renovação: somente colunas aprovadas, origem e contador dinâmicos; zero distinto de ausência',()=>{
 const r=setup({sourceCategory:'Renovação',capacity:'1980',vrBuildings:'1200000.75',vrAnimals:'7654321',cpf:'cpf-privado'});
 assert.equal(r.data.cards[0].counts,'1 registro na Renovação');assert.equal(r.data.cards[0].origin,'RENOVAÇÃO');
 assert.equal(rows(r)[0].at(-1).replace(/\s/g,' '),'R$ 1.200.000,75');assert.equal(rows(r)[0].length,6);
 assert(r.html.includes('QTDE LOTAÇÃO MAX POCILGA'));assert(!r.html.includes('7654321'));assert(!r.html.includes('cpf-privado'));assert(!r.html.includes('Endosso'));
 assert.equal(rows(setup({vrBuildings:0}))[0].at(-1),'R$\u00a00,00');
 for(const missing of ['',null,undefined])assert.equal(rows(setup({vrBuildings:missing,vrAnimals:999}))[0].at(-1),'Não informado');
 assert.equal(rows(setup({capacity:'N/I',vrBuildings:'N/I'}))[0].at(-2),'N/I');
 assert.equal(rows(setup({vrBuildings:'N/I'}))[0].at(-1),'N/I');
});
test('renovação e seis repetições mais endosso: oito registros, sem soma nem escolha da versão mais recente',()=>{
 const base=setup(),rs=[record('renewal'),...Array.from({length:6},(_,i)=>record('e'+i,{category:'Endosso',reference:'01.2025',situation:'ALT QTDE',capacity:'N/I',vrBuildings:'80'})),record('aug',{category:'Endosso',reference:'08.2025',vrBuildings:'110'})];
 const c=base.p.create(rs,'Propriedade A'),r=setup({}, {composition:c});
 assert.equal(rows(r).length,8);assert.equal(r.data.cards[0].blocks.length,3);
 assert.equal(r.data.cards[0].blocks[1].rows.length,6);assert.equal(r.data.cards[0].counts,'1 registro na Renovação · 7 registros de endosso');
 assert.equal(r.data.cards[0].blocks[1].title,'Endosso 01.2025');assert.equal(r.data.cards[0].blocks[2].title,'Endosso 08.2025');
 assert.equal(r.p.totals(c).fields.vrBuildings.amount,null);assert.equal(c.units.length,0);
 const before=JSON.stringify(r.state);r.card.html(r.state);assert.equal(JSON.stringify(r.state),before);
});
test('não traz candidatos da mesma pessoa, outra propriedade, histórico excluído ou total consolidado',()=>{
 const base=setup(),rs=[record('a'),record('other',{municipality:'Outra cidade'}),record('history',{municipality:'Histórico excluído'}),record('total',{vrBuildings:'888888',raw:{totalPropriedade:true}})];
 const c=base.p.create(rs,'P');base.p.assign(c,['other'],{kind:'other'});base.p.assign(c,['history'],{kind:'history'});base.p.assign(c,['total'],{kind:'total'});
 const r=setup({}, {composition:c,relatedCandidates:[record('candidate',{municipality:'Candidato não selecionado'})]});
 assert.equal(rows(r).length,1);for(const x of ['Outra cidade','Histórico excluído','888.888','Candidato não selecionado'])assert(!r.html.includes(x));
 assert.equal(c.records.length,4);
});
test('versões de instalação selecionada aparecem individualmente; danos não reduzem a seleção',()=>{
 const base=setup(),rs=[record('a'),record('e',{category:'Endosso',reference:'02.2025'}),record('b',{municipality:'Cidade B'})],c=base.p.create(rs,'P');
 const unit=base.p.assign(c,['a','e'],{kind:'new',label:'A',applicable:true});base.p.assign(c,['b'],{kind:'new',label:'B',applicable:true});
 c.units[0].affected=false;c.units[1].affected=true;
 assert.equal(rows(setup({}, {composition:c})).length,3);assert.equal(base.p.totals(c).fields.vrBuildings.amount,200.02);
 c.units.find(u=>u.id===unit).selected=false;const r=setup({}, {composition:c});assert.equal(rows(r).length,1);assert(r.html.includes('Cidade B'));
});
test('atividades expressamente adicionadas mantêm rótulo e quadro próprios, sem pocilga para aves',()=>{
 const base=setup(),c=base.p.create([record('a'),record('b',{activity:'Aves de Corte',capacityConcept:'Quantidade de aves',capacity:12000})],'P');
 const r=setup({}, {composition:c});assert.equal(r.data.cards.length,2);
 assert.equal(r.data.cards[0].activity,'SUÍNOS');assert.equal(r.data.cards[1].activity,'AVES DE CORTE');
 assert.equal(r.data.cards[1].blocks[0].columns.at(-2),'QUANTIDADE DE AVES');
 assert(!r.card.chunkHtml(r.data.cards[1]).includes('POCILGA'));
});
test('coordenadas conservam sinal, precisão e zeros finais; nomes, campos e origens não são inventados',()=>{
 const r=setup({latitude:'-27.1234567890120',longitude:'-52,6543210000',sourceCategory:'Pessoa sintética',sourceReference:'Pessoa sintética'});
 assert(rows(r)[0].includes('-27,1234567890120'));assert(rows(r)[0].includes('-52,6543210000'));
 assert.equal(r.data.cards[0].origin,'');assert(!r.html.includes('risk-card-origin'));
 assert.equal(setup().card.data({cooperatorSelection:null}),null);
});
test('ajustes e origem privada continuam no estado; apresentação usa valores por registro, nunca agregado compatível',()=>{
 const base=setup(),c=base.p.create([record('selected',{vrBuildings:'125'}),record('b',{vrBuildings:'250'})],'P');
 base.p.assign(c,['selected'],{kind:'new',label:'A',applicable:true});base.p.assign(c,['b'],{kind:'new',label:'B',applicable:true});
 const r=setup({municipality:'Cidade ajustada',vrAnimals:'999'}, {composition:c,source:{rawRecord:{secret:'privado'}},fieldSources:{vrBuildings:{type:'manual',reference:'segredo'}}});
 assert(r.html.includes('Cidade ajustada'));assert.equal(rows(r)[0].at(-1),'R$\u00a0125,00');assert.equal(r.p.totals(c).fields.vrBuildings.amount,375);
 for(const x of ['375,00','privado','segredo','Origem deste valor','VR de animais'])assert(!r.html.includes(x));
 const reopened=setup(r.state.cooperatorSelection.confirmed,JSON.parse(JSON.stringify(r.state.cooperatorSelection)));
 assert.equal(reopened.html,r.html);
});
test('texto é escapado em todos os campos visíveis e não acrescenta metadados internos',()=>{
 const r=setup({name:'<script>Nome</script>',municipality:'<img src=x onerror=alert(1)>',sourceCategory:'<b>Origem</b>'});
 assert(!r.html.includes('<script>'));assert(!r.html.includes('<img '));assert(r.html.includes('&lt;img'));assert(r.html.includes('&lt;B&gt;'));
 for(const x of ['CPF','Apólice','Identificador','Conferência'])assert(!r.html.includes(x));
});
test('registro manual selecionado preserva zero e campos ausentes, sem transformar capacidade em instalações',()=>{
 const base=setup(),c=base.p.create([],'Propriedade manual');base.p.manual(c,'Pocilga A',{activity:'Suínos',capacity:'1980',vrBuildings:0});
 const r=setup({}, {composition:c});assert.equal(rows(r).length,1);assert.equal(rows(r)[0].at(-2),'1.980');assert.equal(rows(r)[0].at(-1),'R$\u00a00,00');
 assert.equal(c.units.length,1);assert.equal(r.data.cards[0].origin,'CADASTRO MANUAL');
});
