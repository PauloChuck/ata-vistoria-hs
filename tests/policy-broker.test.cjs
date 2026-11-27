const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{test}=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./policy-broker-fixture.cjs'),legacy=require('./policies-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v));
function setup(){const ctx=vm.createContext({window:{FastTrackV06Report:{longDate:v=>v}},Date,Math,Intl});for(const f of ['settlement-0639.js','report-profile-aurora-0639.js','policies-0639.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',f),'utf8'),ctx);return ctx.window;}
test('corretora opcional cadastrada substitui o valor anterior na seleção direta e por segurado',()=>{
 const {FastTrackPolicies:p}=setup(),d=fixture.contract();d.operacao.corretora_relatorio='  Corretora do contrato B  ';
 const {registry,version}=p.saveVersion(p.emptyRegistry(),d),s=fixture.state();s.fields.broker='Corretora anterior';
 p.apply(s,version);assert.equal(s.fields.broker,'Corretora do contrato B');assert.equal(s.contract.autoFields.broker,s.fields.broker);
 s.fields.broker='Outro valor manual';p.selectInsured(s,registry,p.insuredKey(d));assert.equal(s.fields.broker,'Corretora do contrato B');
 assert.deepEqual(copy(s.contract.data.operacao.corretoras_documentais),d.operacao.corretoras_documentais);
});
test('cadastros antigos sem corretora não limpam nem substituem a corretora do atendimento',()=>{
 const {FastTrackPolicies:p}=setup();
 for(const value of [undefined,null,'','   ']){const d=legacy.contract();if(value!==undefined)d.operacao.corretora_relatorio=value;
 const s=fixture.state();s.fields.broker='Corretora manual preservada';p.apply(s,p.saveVersion(p.emptyRegistry(),d).version);
 assert.equal(s.fields.broker,'Corretora manual preservada');assert(!Object.hasOwn(s.contract.autoFields,'broker'));}
});
test('dois cadastros coexistem e B A B atualiza contrato e corretora sem reaproveitar cobertura',()=>{
 const {FastTrackPolicies:p}=setup(),a=legacy.contract(),b=fixture.contract();a.operacao.corretora_relatorio='Corretora A';
 const one=p.saveVersion(p.emptyRegistry(),a),two=p.saveVersion(one.registry,b);assert.equal(p.activeVersions(two.registry).length,2);
 const s=fixture.state();Object.assign(s.fields,{broker:'Anterior',claimantName:'Pessoa sintética',riskAddress:'Local sintético'});s.photos=[{id:'photo'}];s.documents=[{name:'doc'}];s.map={dataUrl:'synthetic'};s.signatures={regulator:'synthetic'};s.signatureDetails={regulator:{valid:true}};s.damages=[fixture.damage(40000)];
 const before=copy(s);
 for(const v of [two.version,one.version,two.version]){p.apply(s,v);assert.equal(s.fields.broker,v.data.operacao.corretora_relatorio);assert.equal(s.fields.policyNumber,v.data.operacao.numero_apolice);assert.deepEqual(copy(s.contract.coverageIds),[]);assert.deepEqual(copy(s.contract.sublimitIds),[]);
 p.chooseCoverages(s,[v.data.coberturas[0].id]);p.chooseSublimits(s,[v.data.sublimites[0].id]);}
 for(const k of ['cooperatorSelection','photos','documents','map','signatures','signatureDetails'])assert.deepEqual(copy(s[k]),before[k]);
 for(const k of ['claimantName','riskAddress','regulatorOpinion'])assert.equal(s.fields[k],before.fields[k]);
 assert.equal(s.damages[0].assessedTotal,40000);assert.equal(p.calculate(s).deductible,6000);assert.equal(p.calculate(s).net,34000);
});
test('versão do atendimento e corretora manual sobrevivem atualização e backup do catálogo',()=>{
 const {FastTrackPolicies:p}=setup(),d=fixture.contract(),saved=p.saveVersion(p.emptyRegistry(),d),s=fixture.state();p.apply(s,saved.version);p.chooseCoverages(s,['vendaval_b']);s.fields.broker='Ajuste manual';const before=copy(s);
 d.operacao.corretora_relatorio='Atualização';d.coberturas[1].lmi_brl=999;p.reconcile(s,p.saveVersion(saved.registry,d).registry);
 assert.deepEqual(copy(s),before);assert.deepEqual(copy(p.normalizeSnapshot(s.contract)),before.contract);assert.deepEqual(copy(p.restore(saved.registry)),copy(saved.registry));
});
test('outra apólice usa seus nove itens e quatro sublimites sem herdar o perfil aprovado',()=>{
 const {FastTrackPolicies:p,FastTrackAuroraReport:a}=setup(),d=fixture.contract(),s=fixture.state();p.apply(s,p.saveVersion(p.emptyRegistry(),d).version);assert(!a.matches(s));assert.equal(p.reportRows(s).length,0);
 p.chooseCoverages(s,['vendaval_b','vendaval_b','administrative']);assert.equal(p.reportRows(s).length,1);assert.equal(p.reportRows(s)[0][1].replace(/\s/g,''),'R$246.000,00');assert.equal(p.reportRows(s)[0][2].replace(/\s/g,''),'12%commínimodeR$2.400,00');
 p.chooseCoverages(s,['electric']);p.chooseSublimits(s,['sub-0','sub-0','sub-2']);let rows=copy(p.reportRows(s));assert.equal(rows.length,3);assert(!rows.some(r=>r[0].includes('Vendaval')));
 assert.match(rows[1][1],/Por evento ou unidade\/local:/);assert.match(rows[1][1],/17\.000,00/);assert.match(rows[1][1],/Agregado:/);assert.match(rows[1][1],/89\.000,00/);
 assert(!rows.some(r=>r[0].includes('Energia')));assert.equal(s.contract.data.sublimites[2].atividade_exclusiva,'Piscicultura');
 p.chooseSublimits(s,[]);p.chooseCoverages(s,['basic','rescue']);rows=copy(p.reportRows(s));assert.match(rows[0][1],/Por evento/);assert.match(rows[0][2],/Queda de raio/);assert.match(rows[0][2],/Demais eventos: Sem franquia/);assert.equal(rows[1][2],'Sem franquia');
 assert.match(rows[1][1],/Até 2% do LMI de cada cobertura/);assert.match(rows[1][1],/Teto:/);
 assert.deepEqual(copy(s.contract.data.clausulas_administrativas),d.clausulas_administrativas);
 s.damages=[fixture.damage(12430)];assert.equal(p.calculate(s).deductible,3000);assert.equal(p.calculate(s).net,9430);
});
test('limite percentual conserva teto e rejeita percentual inválido sem alterar a apuração',()=>{
 const {FastTrackPolicies:p}=setup();const d=fixture.contract();
 for(const value of [-1,101,'2']){d.coberturas[8].limite_percentual_lmi_cobertura=value;assert.throws(()=>p.validate(d));}
 assert.equal(p.reportLimit({limite_percentual_lmi_cobertura:0,lmi_brl:0}).replace(/\s/g,''),'Até0%doLMIdecadacoberturaTeto:R$0,00');
 assert.equal(p.reportLimit({limite_percentual_lmi_cobertura:2}),'Até 2% do LMI de cada cobertura');
});
