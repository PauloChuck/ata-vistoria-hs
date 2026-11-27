const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{test}=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./policies-fixture.cjs'),copy=v=>JSON.parse(JSON.stringify(v));
function api(){const ctx=vm.createContext({window:{},Date,Math,Intl});vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06/policies-0639.js'),'utf8'),ctx);return ctx.window.FastTrackPolicies;}
function contract(id,base,activities=['Aves de Corte']){const d=fixture.contract();Object.assign(d.operacao,{id,numero_apolice:'TEST-'+id,empresa_grupo_exibicao:'Grupo '+id,cooperativa_afiliada:'Afiliada '+id,segurado_razao_social:'Segurado '+id,corretora_relatorio:'Corretora '+id});d.vinculos_propostos_consulta=activities.map(atividade=>({chave_base:base,atividade}));return d;}
function local(s,base,activity='Aves de Corte'){s.cooperatorSelection={...fixture.selection(),source:{baseKey:base,activity,companyGroup:'Grupo do local'},confirmed:{...fixture.selection().confirmed,companyGroup:'Grupo do local',cooperative:'Afiliada do local',activity}};}
function setup(){const p=api();let registry=p.emptyRegistry();const a=p.saveVersion(registry,contract('A','aurora'));const b=p.saveVersion(a.registry,contract('B','lar'));const s=fixture.state();s.fields.broker='Anterior';s.photos=[{id:'photo'}];s.signatures={regulator:'synthetic'};s.map={id:'map'};s.documents=[{id:'doc'}];s.damages=[fixture.damage(12430)];return {p,s,a:a.version,b:b.version,registry:b.registry};}
test('associa somente base e atividade declaradas, com seletores e campos do contrato sem escolher coberturas',()=>{
 const {p,s,b,registry}=setup();local(s,'lar');const r=p.associateLocal(s,registry);assert.equal(r.status,'applied');assert.equal(s.contract.versionId,b.versionId);assert.equal(s.contract.selection.source,'confirmed_local');
 for(const [k,v] of Object.entries({insured:'Segurado B',broker:'Corretora B',companyGroup:'Grupo B',affiliatedCooperative:'Afiliada B',policyNumber:'TEST-B'}))assert.equal(s.fields[k],v);
 assert.equal(s.policyInsuredKey,p.insuredKey(b.data));assert.deepEqual(copy(s.contract.coverageIds),[]);assert.deepEqual(copy(s.contract.sublimitIds),[]);
});
test('Lar Aurora Lar limpa escolhas incompatíveis e mantém danos, fotos, textos, instalações e assinaturas',()=>{
 const {p,s,registry}=setup(),before=copy(s);
 for(const [base,id] of [['lar','B'],['aurora','A'],['lar','B']]){local(s,base);p.associateLocal(s,registry);assert.equal(s.contract.id,id);assert.deepEqual(copy(s.contract.coverageIds),[]);assert.deepEqual(copy(s.contract.sublimitIds),[]);p.chooseCoverages(s,['wind']);p.chooseSublimits(s,['asset']);}
 for(const k of ['photos','signatures','map','documents'])assert.deepEqual(copy(s[k]),before[k]);assert.equal(s.damages[0].assessedTotal,12430);assert.equal(s.fields.regulatorOpinion,before.fields.regulatorOpinion);
 assert.equal(s.contractHistory.length,2);
});
test('sem vínculo compatível remove o contrato anterior e avisa, sem usar nome, seguradora ou vínculo individual',()=>{
 const {p,s,a,registry}=setup();p.apply(s,a);p.chooseCoverages(s,['wind']);p.chooseSublimits(s,['asset']);local(s,'lar','Piscicultura');
 const selected=copy(s.cooperatorSelection);const r=p.associateLocal(s,registry);assert.equal(r.status,'missing');assert.equal(r.reason,'unlinked');assert.equal(s.contract,null);assert.equal(s.policyInsuredKey,'');
 for(const k of ['insured','insuredCnpj','insurer','policyNumber','productName','broker','coverageName'])assert.equal(s.fields[k],'',k);
 assert.equal(s.fields.companyGroup,'Grupo do local');assert.deepEqual(copy(s.cooperatorSelection),selected);
 const d=contract('C','jagua');d.vinculos_propostos_consulta=[null,{},1];const reg=p.saveVersion(registry,d,{bindings:[{baseKey:'lar',activity:'Piscicultura',name:s.cooperatorSelection.confirmed.name}]}).registry;assert.equal(p.localPolicies(s,reg).candidates.length,0);
});
test('mesma apólice preserva versão, cobertura, sublimite, ajustes e histórico mesmo após atualização de catálogo',()=>{
 const {p,s,b,registry}=setup();local(s,'lar');p.associateLocal(s,registry);p.chooseCoverages(s,['wind']);p.chooseSublimits(s,['asset']);s.fields.broker='Ajuste do regulador';const before=copy(s);
 const d=copy(b.data);d.operacao.corretora_relatorio='Novo catálogo';d.coberturas[0].nome_contratual='Nome atualizado';const next=p.saveVersion(registry,d).registry;
 assert.equal(p.associateLocal(s,next).status,'kept');assert.deepEqual(copy(s),before);assert.deepEqual(copy(p.normalizeSnapshot(s.contract)),before.contract);
 assert.equal(p.associateLocal(s,p.emptyRegistry()).status,'kept');
});
test('múltiplas apólices oferecem escolha; preservam a escolha compatível já realizada e permitem opção manual',()=>{
 const {p,s,registry}=setup();const more=p.saveVersion(registry,contract('C','lar')).registry;local(s,'lar');
 const r=p.associateLocal(s,more);assert.equal(r.status,'choice');assert.equal(r.candidates.length,2);assert.equal(s.contract,null);
 p.apply(s,r.candidates[1]);p.chooseCoverages(s,['wind']);assert.equal(p.associateLocal(s,more).status,'kept');assert.deepEqual(copy(s.contract.coverageIds),['wind']);
 p.apply(s,p.activeVersions(more).find(v=>v.id==='A'));const manual=copy(s);p.reconcile(s,more);assert.deepEqual(copy(s),manual);
});
test('Postura e Recria são atividades explícitas; combinação exige ambas, sem vincular outras bases ou atividades',()=>{
 const {p,s}=setup();const d=contract('P','larPostura',['Postura','Recria']);const r=p.saveVersion(p.emptyRegistry(),d).registry;
 for(const activity of ['Postura','Recria','Aves de Postura','Postura e Recria']){local(s,'larPostura',activity);assert.equal(p.localPolicies(s,r).candidates.length,1);}
 local(s,'lar','Recria');assert.equal(p.localPolicies(s,r).candidates.length,0);local(s,'larPostura','Piscicultura');assert.equal(p.localPolicies(s,r).candidates.length,0);
 d.vinculos_propostos_consulta.pop();local(s,'larPostura','Postura e Recria');assert(!p.matchesLocal(d,s.cooperatorSelection));
 local(s,'larPostura','Recria');assert(!p.matchesLocal(d,s.cooperatorSelection));
 d.vinculos_propostos_consulta=[{chave_base:'larPostura',atividade:'Postura e Recria'}];assert(p.matchesLocal(d,s.cooperatorSelection));local(s,'larPostura','Postura');assert(p.matchesLocal(d,s.cooperatorSelection));
});
test('vigência interpreta 24h corretamente e distingue data completa de horário pendente nos limites',()=>{
 const p=api(),d=contract('T','lar');Object.assign(d.operacao.vigencia,{inicio_data_escrita:'2026-01-22',inicio_hora_escrita:'24:00',fim_data_escrita:'2028-01-22',fim_hora_escrita:'24:00'});
 const check=(lossDate,lossTime,expected)=>assert.equal(p.validityAtLoss(d,{lossDate,lossTime}),expected,lossDate+' '+lossTime);
 check('','','valid');check('2026-01-22','','outside');check('2026-01-23','','valid');check('2028-01-22','','valid');check('2028-01-23','00:00','outside');check('2026-02-30','','invalid_date');check('2026-02-01','25:00','invalid_date');
 d.operacao.vigencia.inicio_hora_escrita='12:00';check('2026-01-22','','needs_time');check('2026-01-22','11:59','outside');check('2026-01-22','12:00','valid');
 d.operacao.vigencia.fim_hora_escrita='12:00';check('2028-01-22','','needs_time');check('2028-01-22','12:00','outside');
});
test('data filtra opções; ambiguidade de hora e data inválida nunca fazem uma seleção automática',()=>{
 const {p,s,a,registry}=setup();const d=contract('F','lar');Object.assign(d.operacao.vigencia,{inicio_data_escrita:'2027-01-01',inicio_hora_escrita:'00:00',fim_data_escrita:'2027-12-31',fim_hora_escrita:'24:00'});let reg=p.saveVersion(registry,d).registry;
 local(s,'lar');s.fields.lossDate='2027-06-01';assert.equal(p.associateLocal(s,reg).status,'applied');assert.equal(s.contract.id,'F');
 p.apply(s,a);s.fields.lossDate='2029-01-01';assert.equal(p.associateLocal(s,reg).reason,'outside');assert.equal(s.contract,null);
 s.fields.lossDate='2027-01-01';d.operacao.vigencia.inicio_hora_escrita='12:00';reg=p.saveVersion(reg,d).registry;assert.equal(p.associateLocal(s,reg).reason,'needs_time');assert.equal(s.contract,null);
 s.fields.lossDate='bad';assert.equal(p.associateLocal(s,reg).reason,'invalid_date');assert.equal(s.contract,null);
});
test('seleção automática de outro contrato sem corretora não herda corretora anterior; escolha manual legada é preservada',()=>{
 const {p,s,b,registry}=setup(),d=contract('A','aurora');delete d.operacao.corretora_relatorio;const r=p.saveVersion(registry,d).registry;p.apply(s,b);local(s,'aurora');p.associateLocal(s,r);assert.equal(s.fields.broker,'');
 s.fields.broker='Corretora manual';p.apply(s,p.activeVersions(r).find(v=>v.id==='A'));assert.equal(s.fields.broker,'Corretora manual');
});
test('consultar candidatos, editar data, reabrir backup e atualizar catálogo não aplicam apólice',()=>{
 const {p,s,registry}=setup();local(s,'lar');const before=copy(s);p.localPolicies(s,registry);p.reconcile(s,registry);assert.deepEqual(copy(s),before);
 p.associateLocal(s,registry);p.chooseCoverages(s,['wind']);s.fields.lossDate='2035-01-01';const saved=copy(s);s.contract=p.normalizeSnapshot(saved.contract);p.reconcile(s,p.restore(registry));assert.deepEqual(copy(s),saved);
});
