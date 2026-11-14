const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
function setup(){const ctx=vm.createContext({window:{},document:{getElementById:()=>null}});for(const f of ['property-0639.js','cooperators-0639.js','risk-card-0639.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',f),'utf8'),ctx);return {p:ctx.window.FastTrackProperty,coop:ctx.window.FastTrackCooperators,card:ctx.window.FastTrackRiskCard};}
const record=(id,extra={})=>({id,name:'Pessoa sintética',activity:'Aves',category:'Endosso',reference:'01.2025',municipality:'Cidade de Teste',vrBuildings:'100.01',vrAnimals:'20',raw:{valor:100.01},...extra});
const add=(p,c,r,label=r.id)=>p.assign(c,[r.id],{kind:'new',label,applicable:true});
test('oito lançamentos sem identidade física permanecem no histórico; seis repetições não viram instalações',()=>{
 const {p}=setup(),rs=Array.from({length:6},(_,i)=>record('repeat'+i));rs.push(record('aug',{reference:'08.2025',vrBuildings:'300',raw:{valor:300}}),record('renewal',{category:'Renovação',reference:'',vrBuildings:'500',raw:{valor:500}}));
 const c=p.create(rs,'Sítio sintético');assert.equal(c.units.length,0);assert.equal(p.groups(c)[0].length,6);assert.equal(p.totals(c).fields.vrBuildings.amount,null);
 const unit=add(p,c,rs[0]);assert.equal(p.totals(c).fields.vrBuildings.pending,true);
 p.assign(c,rs.slice(1).map(r=>r.id),{kind:'unit',unitId:unit});
 assert.equal(c.records.length,8);assert.equal(c.units.length,1);assert.equal(c.units[0].applicable,'repeat0');assert.equal(p.totals(c).fields.vrBuildings.amount,100.01);
 assert.equal(p.totals(c).scope,'VR das instalações selecionadas');
 c.units[0].applicable='';assert.equal(p.totals(c).fields.vrBuildings.amount,null);assert(p.totals(c).fields.vrBuildings.pending);
 c.units[0].applicable='aug';assert.equal(p.totals(c).fields.vrBuildings.amount,300);
});
test('instalações distintas são aditivas; atividades e propriedades só entram por decisão expressa',()=>{
 const {p}=setup(),a=record('a'),b=record('b',{activity:'Suínos'}),other=record('other',{localIdentification:'Outra propriedade',vrBuildings:'999999'}),c=p.create([a,b,other],'Propriedade A');
 add(p,c,a);assert.equal(c.units.length,1);add(p,c,b);assert.equal(c.units.length,2);
 p.assign(c,['other'],{kind:'other'});c.complete=true;
 assert.equal(p.totals(c).fields.vrBuildings.amount,200.02);assert.equal(p.totals(c).fields.vrAnimals.amount,40);assert(p.totals(c).full);
 c.units[0].affected=true;assert.equal(p.totals(c).fields.vrBuildings.amount,200.02);
 c.units[1].selected=false;assert.equal(p.totals(c).fields.vrBuildings.amount,100.01);assert.equal(p.totals(c).scope,'VR das instalações selecionadas');
 c.units.forEach(u=>u.selected=false);assert.equal(p.totals(c).fields.vrBuildings.amount,null);
});
test('ausências, zeros e números ambíguos produzem os subtotais corretos separadamente',()=>{
 const {p}=setup(),a=record('a',{vrAnimals:'0'}),b=record('b',{vrBuildings:'',vrAnimals:'abc'}),c=p.create([a,b],'P');add(p,c,a);add(p,c,b);c.complete=true;
 const t=p.totals(c);assert.equal(t.fields.vrBuildings.amount,100.01);assert.equal(t.fields.vrBuildings.missing,1);assert(t.fields.vrBuildings.display.startsWith('Subtotal'));assert.equal(t.fields.vrAnimals.amount,0);assert(t.fields.vrAnimals.subtotal);
 c.units[0].selected=false;assert.equal(p.totals(c).fields.vrBuildings.display,'Não informado');
});
test('total consolidado substitui a soma, exige composição completa e não se aplica à seleção parcial',()=>{
 const {p}=setup(),a=record('a'),b=record('b'),total=record('total',{vrBuildings:'900',vrAnimals:'',raw:{totalPropriedade:true}}),c=p.create([a,b,total],'P');
 assert.throws(()=>add(p,c,total),/total da propriedade/);add(p,c,a);add(p,c,b);p.assign(c,['total'],{kind:'total'});c.totals.vrBuildings='total';
 assert.equal(p.totals(c).fields.vrBuildings.amount,null);c.complete=true;
 assert.equal(p.totals(c).fields.vrBuildings.amount,900);assert.equal(p.totals(c).fields.vrAnimals.amount,40);
 c.units[0].selected=false;assert.equal(p.totals(c).fields.vrBuildings.amount,null);assert(p.totals(c).fields.vrBuildings.pending);
 c.totals.vrBuildings='';assert.equal(p.totals(c).fields.vrBuildings.amount,100.01);
});
test('reclassificação nunca duplica a fonte nem deixa instalação fantasma; backup conserva originais e decisões',()=>{
 const {p,coop}=setup(),a=record('a'),b=record('b'),c=p.create([a,b],'P');const unit=add(p,c,a);add(p,c,b);p.assign(c,['b'],{kind:'unit',unitId:unit});assert.equal(c.units.length,1);assert.equal(p.totals(c).fields.vrBuildings.amount,100.01);
 const state={schemaVersion:3,sourceRecordId:'a',confirmed:{name:'Pessoa sintética',activity:'Aves'},composition:c};
 const once=coop.normalizeSelection(state),twice=coop.normalizeSelection(JSON.parse(JSON.stringify(once)));assert.equal(JSON.stringify(once),JSON.stringify(twice));assert.equal(JSON.stringify(c.records),JSON.stringify(twice.composition.records));assert.equal(twice.confirmed.installations[0].id,unit);
 p.assign(c,['a'],{kind:'history'});assert.equal(c.units[0].applicable,'');assert(p.totals(c).fields.vrBuildings.pending);
});
test('ficha usa todas as instalações selecionadas e mantém a marcação de danos independente',()=>{
 const {p,card}=setup(),a=record('a'),b=record('b',{activity:'Suínos',vrAnimals:''}),c=p.create([a,b],'Propriedade Sintética');add(p,c,a,'Galpão A');add(p,c,b,'Pocilga B');c.units[0].affected=true;c.complete=true;
 const state={cooperatorSelection:{schemaVersion:3,confirmed:{name:'Pessoa sintética',activity:'Aves'},composition:c}};
 const d=card.data(state),html=card.html(state);assert.equal(d.groups.filter(g=>g.kind==='installation').length,2);for(const s of ['Galpão A','Pocilga B','Suínos','Não indicada','Subtotal disponível','Propriedade Sintética'])assert(html.includes(s),s);
 assert(!html.includes('Não informado na base'));assert.equal(JSON.stringify(state.cooperatorSelection.composition),JSON.stringify(c));
});
test('legacy: normalização preserva ajustes, fontes e instalações até migração expressa',()=>{
 const {coop}=setup(),s={schemaVersion:3,confirmed:{name:'Pessoa',activity:'Aves',vrBuildings:'1234',installations:[{id:'old',code:'A',involved:false}]},source:{rawRecord:{legacy:true}}};
 const n=coop.normalizeSelection(s);assert.equal(n.composition,null);assert.equal(n.confirmed.vrBuildings,'1234');assert.equal(n.confirmed.installations[0].involved,false);assert(n.source.rawRecord.legacy);
});
