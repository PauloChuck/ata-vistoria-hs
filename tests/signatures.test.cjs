const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict');
const image={dataUrl:'data:image/png;base64,AAAA',width:640,height:320};
const clone=v=>JSON.parse(JSON.stringify(v));
function api(){const ctx=vm.createContext({window:{},Date,Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06/signatures-0636.js'),'utf8'),ctx);return ctx.window.FastTrackSignatures;}
const state=()=>({caseUid:'case-a',fields:{regulatorName:'Regulador de Teste',regulatorCpf:'529.982.247-25',claimantName:'Pessoa A',claimantCpf:'00000000000'},signatures:{regulator:null,claimant:null}});
test('assinatura fica vinculada ao papel, à pessoa e ao atendimento',()=>{
 const a=api(),s=state();a.set(s,'claimant',image);assert.equal(a.get(s,'claimant'),image.dataUrl);assert.equal(a.get(s,'regulator'),null);
 s.fields.claimantName='Pessoa B';assert.equal(a.get(s,'claimant'),null);a.ensure(s);assert.equal(s.signatures.claimant,null);
 a.set(s,'claimant',image);s.caseUid='case-b';a.ensure(s);assert.equal(s.signatures.claimant,null);
});
test('novo CPF da mesma pessoa invalida a vinculação anterior',()=>{
 const a=api(),s=state();a.set(s,'regulator',image);s.fields.regulatorCpf='11111111111';assert.equal(a.get(s,'regulator'),null);a.ensure(s);assert.equal(s.signatures.regulator,null);
});
test('mudanças de dados conservam imagens e exigem conferência, sem concluir',()=>{
 const a=api(),s=state();a.set(s,'regulator',image);a.set(s,'claimant',image);s.finalizedAt='2026-01-01';a.invalidate(s);
 assert.equal(s.signatures.claimant,image.dataUrl);assert.equal(s.signatures.regulator,image.dataUrl);assert.equal(s.finalizedAt,null);
 assert.equal(s.signatureDetails.claimant.needsReview,true);assert.equal(s.signatureDetails.regulator.needsReview,true);
});
test('preferência automática copia dados; substituir perfil não modifica cópia do atendimento',()=>{
 const a=api(),s=state(),profile={name:'Regulador de Teste',cpf:'529.982.247-25',autoUse:true,image:clone(image)};
 assert.equal(a.applyProfile(s,profile,{automatic:true}),true);assert.equal(s.signatureDetails.regulator.type,'profile');assert.equal(s.signatures.claimant,null);
 profile.name='Outro regulador';profile.image.dataUrl='data:image/png;base64,BBBB';assert.equal(s.fields.regulatorName,'Regulador de Teste');assert.equal(s.signatures.regulator,image.dataUrl);
 a.invalidate(s);assert.equal(s.signatureDetails.regulator.needsReview,false);assert.equal(s.finalizedAt,null);
 a.clear(s,'regulator');assert.equal(s.signatures.regulator,null);assert.equal(profile.image.dataUrl,'data:image/png;base64,BBBB');
});
test('preferência desativada não é aplicada automaticamente e não adota CPF inválido',()=>{
 const a=api(),s=state(),p={name:'Teste',cpf:'529.982.247-25',autoUse:false,image};assert.equal(a.applyProfile(s,p,{automatic:true}),false);assert.equal(a.applyProfile(s,p),true);
 assert.equal(a.applyProfile(state(),{...p,cpf:'00000000000'}),false);assert.equal(a.validCpf('529.982.247-25'),true);assert.equal(a.validCpf('529982247255'),false);
});
test('backup conserva original, enquadramento e identificação; endereços externos são rejeitados',()=>{
 const a=api(),s=state();a.set(s,'claimant',{...image,dataUrl:'data:image/png;base64,BBBB'},{originalDataUrl:image.dataUrl,crop:{left:10,right:10,top:0,bottom:0}});
 const restored=a.ensure(clone(s));assert.deepEqual(clone(restored),clone(s));assert.equal(restored.signatureDetails.claimant.originalDataUrl,image.dataUrl);
 const old=state();old.signatures.claimant=image.dataUrl;a.ensure(old);assert.equal(old.signatureDetails.claimant.type,'legacy');assert.equal(a.get(old,'claimant'),image.dataUrl);
 for(const url of ['https://example.com/signature.png','file:///signature.jpg','blob:temporary','data:image/svg+xml;base64,AAAA']){old.signatures.claimant=url;a.ensure(old);assert.equal(old.signatures.claimant,null);}
});
test('substituir ou remover uma assinatura não troca a imagem da outra pessoa',()=>{
 const a=api(),s=state();a.set(s,'regulator',image);a.set(s,'claimant',{...image,dataUrl:'data:image/jpeg;base64,BBBB'});a.clear(s,'claimant');assert.equal(s.signatures.regulator,image.dataUrl);assert.equal(s.signatures.claimant,null);
});
