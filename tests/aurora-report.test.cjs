const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{test}=require('node:test'),assert=require('node:assert/strict'),fixture=require('./aurora-report-fixture.cjs');
const clone=v=>JSON.parse(JSON.stringify(v)),norm=s=>s.replace(/\s+/g,' ');
function setup(data=fixture.contract()){
 const ctx=vm.createContext({window:{FastTrackV06Report:{longDate:v=>v}}});
 for(const file of ['settlement-0639.js','report-profile-aurora-0639.js','policies-0639.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',file),'utf8'),ctx);
 const p=ctx.window.FastTrackPolicies,a=ctx.window.FastTrackAuroraReport,s=fixture.state();p.apply(s,p.saveVersion(p.emptyRegistry(),data).version);return {p,a,s};
}
test('perfil exige os três dados do cadastro, não o cooperado nem campos manuais da capa',()=>{
 const {a,s}=setup();assert(a.matches(s));
 for(const key of ['segurado_razao_social','seguradora_lider','numero_apolice']){const c=clone(s);c.contract.data.operacao[key]+=' diferente';assert(!a.matches(c),key);}
 assert(!a.matches({fields:{...s.fields}}));
 const c=clone(s);c.contract.data.operacao.seguradora_lider='Sompo Seguros S.A.';assert(a.matches(c));c.contract.data.operacao.numero_apolice='96001319270';assert(!a.matches(c));
});
test('apenas seleções expressas recebem a tabela aprovada e nenhum dado original é alterado',()=>{
 const {p,s}=setup();const original=JSON.stringify(s.contract.data);assert.equal(p.reportRows(s).length,0);
 p.chooseCoverages(s,['vendaval_b','vendaval_b']);assert.deepEqual(clone(p.reportRows(s)).map(r=>r.map(norm)),[['Vendaval / Granizo','R$ 35.000.000,00','15% com mínimo de R$ 3.000,00']]);
 p.chooseCoverages(s,['danos_eletricos','alagamento']);p.chooseSublimits(s,['ruptura_caixa_agua','vinilona_grupo_02']);
 assert.deepEqual(clone(p.reportRows(s)).map(r=>r.map(norm)),[
  ['Danos Elétricos','R$ 10.000.000,00','15% com mínimo de R$ 3.000,00'],['Alagamento','R$ 10.000.000,00','15% com mínimo de R$ 3.000,00'],
  ['Ruptura / explosão de caixa d’água','R$ 1.000.000,00 (R$ 30.000,00/evento)','15% com mínimo de R$ 3.000,00'],['Galpão de Vinilona','R$ 1.500.000,00','15% com mínimo de R$ 3.000,00']]);
 assert.equal(JSON.stringify(s.contract.data),original);
});
test('outra cobertura do mesmo contrato e outras apólices conservam seus próprios limites e franquias',()=>{
 const {p,s}=setup();p.chooseCoverages(s,['other']);assert.equal(norm(p.reportRows(s)[0][1]),'R$ 12.345,67');assert.equal(norm(p.reportRows(s)[0][2]),'10% com mínimo de R$ 1.000,00');
 const d=fixture.contract();d.operacao.numero_apolice='ANOTHER-POLICY';const other=setup(d);other.p.chooseCoverages(other.s,['danos_eletricos']);assert.equal(norm(other.p.reportRows(other.s)[0][1]),'R$ 60.000,00');assert.equal(norm(other.p.reportRows(other.s)[0][2]),'20% com mínimo de R$ 500,00');
});
test('capa usa identidade institucional e escolhas curtas sem substituir dados dinâmicos ou armazenados',()=>{
 const {p,a,s}=setup();Object.assign(s.fields,{claimantName:'Cooperado sintético',riskAddress:'Endereço dinâmico',insurerClaim:'CLAIM-9',hsClaim:'HS-1',broker:'Corretor original',coverageName:'Texto manual'});p.chooseCoverages(s,['vendaval_b']);const before=JSON.stringify(s);
 let f=a.coverFields(s);assert.equal(f.productName,'RISCOS NOMEADOS');assert.equal(f.broker,'ALPER CONSULTORIA E COR DE SEGS S/A');assert.equal(f.coverageName,'VENDAVAL / GRANIZO');
 for(const k of ['claimantName','riskAddress','insurerClaim','hsClaim','lossDate'])assert.equal(f[k],s.fields[k]);assert.equal(JSON.stringify(s),before);
 s.contract.cause='Vendaval';assert.equal(a.coverFields(s).coverageName,'VENDAVAL');s.contract.cause='Granizo';assert.equal(a.coverFields(s).coverageName,'GRANIZO');s.contract.cause='Vendaval e granizo';assert.equal(a.coverFields(s).coverageName,'VENDAVAL / GRANIZO');
 assert(a.coverRows(s).some(r=>r[0]==='COBERTURA RECLAMADA:'));
});
test('nomes de outras coberturas não são interpretados como vendaval pelo texto extenso',()=>{
 const d=fixture.contract();d.coberturas.push({id:'lucros_cessantes',nome_contratual:'Lucros Cessantes Decorrentes da Cobertura Básica 2, Vendaval e Desmoronamento',lmi_brl:50000,franquia:{tipo:'temporal',dias:10}});
 const {p,a,s}=setup(d);p.chooseCoverages(s,['lucros_cessantes']);assert.equal(p.reportRows(s)[0][0],d.coberturas.at(-1).nome_contratual);assert.equal(norm(p.reportRows(s)[0][1]),'R$ 50.000,00');assert.equal(a.coverFields(s).coverageName,'LUCROS CESSANTES');
});
test('restauração e troca de apólice preservam snapshot e retiram o perfil; apuração continua única',()=>{
 const {p,a,s}=setup();p.chooseCoverages(s,['vendaval_b','danos_eletricos']);p.chooseSublimits(s,['ruptura_caixa_agua']);s.damages=[fixture.damage(40000)];const restored=clone(s);restored.contract=p.normalizeSnapshot(restored.contract);assert.deepEqual(clone(p.reportRows(restored)),clone(p.reportRows(s)));assert.equal(p.calculate(restored).deductible,6000);assert.equal(p.calculate(restored).net,34000);
 const other=fixture.contract();other.operacao.numero_apolice='OTHER';p.apply(restored,p.saveVersion(p.emptyRegistry(),other).version);assert(!a.matches(restored));assert.equal(p.reportRows(restored).length,0);assert.deepEqual(clone(restored.contractHistory.at(-1)),clone(s.contract));assert.equal(p.calculate(restored).net,34000);
});
