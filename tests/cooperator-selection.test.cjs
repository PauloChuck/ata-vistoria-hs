const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {test}=require('node:test'),assert=require('node:assert/strict'),fixture=require('./cooperator-selection-fixture.cjs');
const clone=v=>JSON.parse(JSON.stringify(v));
function api(){
 class DOMParser {parseFromString(html){return {querySelectorAll:()=>[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>({textContent:m[1]}))};}}
 const ctx=vm.createContext({window:{},document:{getElementById:()=>null},DOMParser,crypto:crypto.webcrypto,TextEncoder,Blob},{codeGeneration:{strings:false,wasm:false}});
 for(const file of ['property','cooperators','risk-card'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../fast_track/v06/${file}-0639.js`),'utf8'),ctx);
 return {a:ctx.window.FastTrackCooperators,p:ctx.window.FastTrackProperty,card:ctx.window.FastTrackRiskCard};
}
async function setup(){const apiSet=api(),base=await apiSet.a.buildBase(fixture.html(fixture.source()));return {...apiSet,base,record:id=>base.records.find(r=>r.installationCode===id)};}
function state(){return {caseUid:'same-case',fields:{claimantName:'Pessoa anterior',claimantCpf:'111.444.777-35',riskAddress:'Local anterior',insured:'Contratante preservado',coverageName:'Cobertura preservada',insurerClaim:'CLAIM-1',lossDate:'2026-01-01',regulatorOpinion:'Texto preservado',affiliatedCooperative:'Afiliada anterior'},damages:[{assessedTotal:0}],photos:[{id:'photo'}],map:{id:'map'},causeEvidence:[{id:'evidence'}],contract:{id:'contract'},signatures:{regulator:'regulator-image',claimant:'previous-image'},signatureDetails:{regulator:{type:'profile'},claimant:{person:'previous'}},finalizedAt:'previous-date'};}
const use=(a,s,r)=>a.applySelection(s,a._test.localSelection(r),{autofill:true,replaceSelection:true});
test('first click replaces personal data while pending VR still exposes known property details',async()=>{
 const {a,card,record}=await setup(),s=state(),original=clone(s);use(a,s,record('B1'));
 assert.equal(s.fields.claimantName,'Pessoa Beta Sintética');assert.equal(s.fields.claimantCpf,'');assert.equal(s.fields.riskAddress,'Local B1, Cidade Beta');assert.equal(s.fields.companyGroup,'Lar');assert.equal(s.fields.affiliatedCooperative,'');
 assert.equal(s.signatures.claimant,null);assert.equal(s.signatureDetails.claimant,null);assert.equal(s.signatures.regulator,original.signatures.regulator);assert.deepEqual(s.signatureDetails.regulator,original.signatureDetails.regulator);
 for(const k of ['caseUid','damages','photos','map','causeEvidence','contract'])assert.deepEqual(s[k],original[k],k);
 for(const k of ['insured','coverageName','insurerClaim','lossDate','regulatorOpinion'])assert.equal(s.fields[k],original.fields[k]);
 const text=card.html(s);for(const value of ['PESSOA BETA SINTÉTICA','Cidade Beta','Local B1','-22','-52','800','6.000','Aves de Corte','Base inicial'])assert(text.includes(value),value);
 assert(text.includes('aguardam identificação'));assert(!text.includes('Local anterior'));assert.equal(s.cooperatorSelection.composition.records.length,1);
 assert.deepEqual(clone(a.normalizeSelection(clone(s.cooperatorSelection))),clone(s.cooperatorSelection));
});
test('source CPF is tied to selected person; missing or ambiguous CPF cannot reuse former person data',async()=>{
 const {a,record}=await setup(),s=state();use(a,s,record('A1'));assert.equal(s.fields.claimantCpf,'529.982.247-25');assert.equal(s.fields.affiliatedCooperative,'Afiliada Alfa');
 use(a,s,record('C1'));assert.equal(s.fields.claimantCpf,'111.444.777-35');assert.equal(s.fields.affiliatedCooperative,'');use(a,s,record('B1'));assert.equal(s.fields.claimantCpf,'');
 const raw=fixture.source();raw.lar.A.inicial[0].nome='Outro nome na linha';const base=await a.buildBase(fixture.html(raw));assert.equal(base.records.find(r=>r.installationCode==='A1').cpf,'');
 assert.equal(a._test.personFields({cpf:'111.444.777-35','cpf cooperado':'529.982.247-25'},{cpf:'529.982.247-25'},'aurora').cpf,'');
 assert.equal(a._test.personFields({}, {},'aurora').cooperative,'');assert.equal(a._test.personFields({}, {},'aurora').companyGroup,'Aurora');
});
test('another property of same person replaces composition and VR; homonym is not proof of person identity',async()=>{
 const {a,p,record}=await setup(),s=state();use(a,s,record('A1'));p.assign(s.cooperatorSelection.composition,[record('A1').id],{kind:'new',label:'A1',applicable:true});
 use(a,s,record('A3'));assert.equal(s.fields.riskAddress,'Local A3, Cidade Outra - SC');assert.equal(s.cooperatorSelection.confirmed.latitude,'-21');assert.deepEqual(clone(s.cooperatorSelection.composition.records.map(r=>r.id)),[record('A3').id]);assert.equal(p.totals(s.cooperatorSelection.composition).fields.vrBuildings.amount,null);
 use(a,s,record('D1'));assert.equal(s.fields.claimantCpf,'');assert.equal(s.fields.claimantName,'Pessoa Alfa Sintética');
 const previous=a._test.localSelection(record('B1')),next=clone(previous);previous.sourceRecordId='old';next.sourceRecordId='new';previous.source={baseKey:'lar',cooperatorKey:'B',cooperatorPath:['lar','B'],baseSha256:'same'};next.source=clone(previous.source);
 s.cooperatorSelection=previous;s.fields.claimantName=previous.confirmed.name;s.fields.claimantCpf='529.982.247-25';a.applySelection(s,next,{autofill:true,replaceSelection:true});assert.equal(s.fields.claimantCpf,'529.982.247-25');
});
test('explicit installation addition preserves personal edits and selected units, without summing historical versions',async()=>{
 const {a,p,record}=await setup(),s=state();use(a,s,record('A1'));s.fields.claimantCpf='CPF manual preservado';s.fields.claimantName='Nome manual preservado';
 const c=s.cooperatorSelection.composition;p.assign(c,[record('A1').id],{kind:'new',label:'A1',applicable:true});p.add(c,[record('A2')]);a.applySelection(s,s.cooperatorSelection,{autofill:false});assert.equal(s.fields.claimantCpf,'CPF manual preservado');assert.equal(s.fields.claimantName,'Nome manual preservado');
 const c2=s.cooperatorSelection.composition;p.assign(c2,[record('A2').id],{kind:'new',label:'A2',applicable:true});assert.equal(p.totals(c2).fields.vrBuildings.amount,300000);assert.equal(p.totals(c2).fields.vrAnimals.amount,130000);
 p.add(c2,[record('A2')]);assert.equal(c2.records.length,2);
});
test('legacy selection can be replaced directly; old cached source upgrades without changing record IDs or saved cases',async()=>{
 const {a,base,record}=await setup(),s=state();s.cooperatorSelection={schemaVersion:1,confirmed:{name:'Pessoa antiga',localIdentification:'Local antigo',vrBuildings:'999999'}};use(a,s,record('B1'));assert.equal(s.fields.claimantName,'Pessoa Beta Sintética');assert.equal(s.cooperatorSelection.legacyConfirmed,null);
 const before=clone(s),old=clone(base);old.importerVersion='0.6.3.4';const upgraded=await a._test.compatibleBase(old);assert.deepEqual(clone(upgraded.records.map(r=>r.id)),clone(base.records.map(r=>r.id)));assert.equal(upgraded.records.find(r=>r.installationCode==='A1').cpf,'529.982.247-25');assert.deepEqual(clone(s),before);
 delete old.sourceHtml;for(const r of old.records){delete r.companyGroup;r.cooperative='Lar';}old.records.find(r=>r.installationCode==='B1').raw.atividade='Atividade explícita';const fallback=await a._test.compatibleBase(old);assert.equal(fallback.records.find(r=>r.installationCode==='B1').cooperative,'');assert.equal(fallback.records.find(r=>r.installationCode==='B1').activity,'Atividade explícita');
});
