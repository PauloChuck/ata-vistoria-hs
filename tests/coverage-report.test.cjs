const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict'),fixture=require('./policies-fixture.cjs');
const plain=v=>JSON.parse(JSON.stringify(v)),norm=s=>s.replace(/\s+/g,' ');
function setup(data=fixture.contract()) {
  const ctx=vm.createContext({window:{FastTrackV06Report:{}}});
  for(const f of ['settlement-0639.js','policies-0639.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',f),'utf8'),ctx);
  const p=ctx.window.FastTrackPolicies,s=fixture.state();p.apply(s,p.saveVersion(p.emptyRegistry(),data).version);return {p,s};
}
test('somente seleção geral: nome de apresentação e três colunas sem detalhamento',()=>{
 const data=fixture.contract();data.coberturas[0].nome_sugerido_seletor='Vendaval / Granizo';
 const {p,s}=setup(data),original=JSON.stringify(s.contract.data);p.chooseCoverages(s,['wind','wind']);
 s.damages=[fixture.damage(40000,{coverageId:'electric',sublimitId:'asset'})];
 const rows=plain(p.reportRows(s));assert.equal(rows.length,1);assert.equal(rows[0].length,3);assert.equal(rows[0][0],'Vendaval / Granizo');
 assert.equal(norm(rows[0][2]),'10% com mínimo de R$ 1.000,00');assert.equal(s.fields.coverageName,'Vendaval / Granizo');
 assert.equal(JSON.stringify(s.contract.data),original);assert(!JSON.stringify(rows).includes('Bem especial'));
 assert(!/Identificação contratual|Vigência|Versão utilizada|Eventos da mesma cobertura|Condição|Fonte|Base:|Unidade:/.test(JSON.stringify(rows)));
});
test('trocar, combinar e desmarcar coberturas substitui as linhas anteriores sem duplicar',()=>{
 const {p,s}=setup();p.chooseCoverages(s,['wind']);p.chooseCoverages(s,['electric']);
 assert.deepEqual(plain(p.reportRows(s)).map(r=>r[0]),['Danos elétricos de teste']);
 p.chooseCoverages(s,['electric','wind','electric','missing']);assert.equal(p.reportRows(s).length,2);
 p.chooseCoverages(s,[]);assert.equal(p.reportRows(s).length,0);assert.equal(p.reportRows({}).length,0);
});
test('sublimite geral usa valor próprio sem incluir cobertura principal ou demais sublimites',()=>{
 const {p,s}=setup();p.chooseSublimits(s,['asset','asset']);let rows=p.reportRows(s);
 assert.equal(rows.length,1);assert.equal(rows[0][0],'Bem especial de teste');
 assert.equal(norm(rows[0][1]),'Por evento ou unidade/local: R$ 5.000,00 Agregado: R$ 20.000,00');
 p.chooseCoverages(s,['wind']);assert.equal(p.reportRows(s).length,2);p.chooseSublimits(s,[]);assert.equal(p.reportRows(s).length,1);
});
test('limites de evento, local e agregado conservam escopo inclusive quando iguais',()=>{
 const {p}=setup();assert.equal(norm(p.reportLimit({limites:{por_evento_brl:1000,por_unidade_brl:1000,agregado_brl:1000},agregado_brl:1000})),
 'Por evento: R$ 1.000,00 Por unidade/local: R$ 1.000,00 Agregado: R$ 1.000,00');
 assert.equal(norm(p.reportLimit({lmi_brl:9000,sublimite_por_evento_brl:3000})),'LMI: R$ 9.000,00 Por evento: R$ 3.000,00');
 assert.equal(norm(p.reportLimit({limites:{agregado_brl:2000}})),'Agregado: R$ 2.000,00');
});
test('dados ausentes não herdam limites nem franquias; zero e centavos são preservados',()=>{
 const {p}=setup();assert.equal(p.reportLimit({}),'Não informado');assert.equal(p.reportDeductible(null),'Não informada');
 assert.equal(norm(p.reportLimit({lmi_brl:0})),'R$ 0,00');assert.equal(norm(p.reportLimit({lmi_brl:1234.56})),'R$ 1.234,56');
 assert.equal(norm(p.reportDeductible({tipo:'percentual_com_minimo',percentual:0,minimo_brl:0})),'0% com mínimo de R$ 0,00');
 assert.equal(norm(p.reportDeductible({tipo:'percentual_com_minimo',percentual:12.5,minimo_brl:null})),'12,5%; mínimo não informado');
});
test('franquias temporais e condicionadas não viram regra percentual incondicional',()=>{
 const {p}=setup();assert.equal(p.reportDeductible({tipo:'temporal',dias:10,texto_original:'Cláusula interna'}),'10 dias');
 assert.equal(p.reportDeductible({tipo:'sem_franquia'}),'Sem franquia');
 assert.equal(norm(p.reportDeductible({texto_original:'Cláusula interna',aplicacao_condicionada:{evento:'Evento especial',tipo:'percentual_com_minimo',percentual:5,minimo_brl:200},demais_eventos:'Sem franquia.'})), 'Evento especial: 5% com mínimo de R$ 200,00 Demais eventos: Sem franquia');
});
test('backup mantém escolhas gerais e cadastro integral; metadados antigos não selecionam sublimite',()=>{
 const {p,s}=setup();p.chooseCoverages(s,['wind']);p.chooseSublimits(s,['asset']);
 s.contract.review={evidence:'Conferência antiga'};s.damages=[fixture.damage(40000,{sublimitId:'asset'})];
 const restored=plain(s);restored.contract=p.normalizeSnapshot(restored.contract);
 assert.deepEqual(plain(restored),plain(s));assert.deepEqual(plain(p.reportRows(restored)),plain(p.reportRows(s)));
 delete restored.contract.sublimitIds;restored.contract=p.normalizeSnapshot(restored.contract);assert.equal(p.reportRows(restored).length,1);
 const invalid=plain(s.contract);invalid.sublimitIds=['inexistente'];assert.throws(()=>p.normalizeSnapshot(invalid));
});
test('trocar apólice limpa as escolhas gerais e preserva o atendimento e histórico',()=>{
 const {p,s}=setup();p.chooseCoverages(s,['wind']);p.chooseSublimits(s,['asset']);s.damages=[fixture.damage(12430)];
 const previous=plain(s.contract),data=fixture.contract();data.operacao.id='second';data.coberturas=data.coberturas.slice(1);
 p.apply(s,p.saveVersion(p.emptyRegistry(),data).version);assert.equal(p.reportRows(s).length,0);assert.deepEqual(plain(s.contractHistory.at(-1)),previous);assert.equal(s.damages[0].assessedTotal,12430);
});
test('transcrição contratual não altera franquia única do fluxo de contingência',()=>{
 const {p,s}=setup();p.chooseCoverages(s,['wind','electric']);p.chooseSublimits(s,['asset']);
 for(const [total,deductible,net] of [[12430,3000,9430],[40000,6000,34000],[2500,3000,0]]){
  s.damages=[fixture.damage(total)];assert.equal(p.calculate(s).deductible,deductible);assert.equal(p.calculate(s).net,net);
 }
 assert.match(norm(p.reportRows(s)[0][2]),/^10%/);assert.match(norm(p.reportRows(s)[1][2]),/^20%/);
});
