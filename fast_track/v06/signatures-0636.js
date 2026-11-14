(() => {
  'use strict';
  const roles=['regulator','claimant'];
  const clean=v=>String(v ?? '').trim();
  const copy=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageUrl=v=>typeof v==='string' && /^data:image\/(png|jpeg);base64,[a-z0-9+/=\s]+$/i.test(v);
  const identity=(state,role)=>{
    const prefix=role==='regulator'?'regulator':'claimant';
    return {name:clean(state.fields?.[prefix+'Name']),cpf:clean(state.fields?.[prefix+'Cpf'])};
  };
  const personKey=p=>`${clean(p?.name).normalize('NFC').replace(/\s+/g,' ').toLocaleUpperCase('pt-BR')}|${clean(p?.cpf).replace(/\D/g,'')}`;
  function ensure(state) {
    state.caseUid ||= `case_${globalThis.crypto?.randomUUID?.() || Date.now()+'_'+Math.random()}`;
    state.signatures ||= {}; state.signatureDetails ||= {};
    for(const role of roles) {
      const url=state.signatures[role],detail=state.signatureDetails[role];
      if (!imageUrl(url) || !identity(state,role).name || (detail && (detail.caseUid!==state.caseUid || personKey(detail.person)!==personKey(identity(state,role))))) {
        state.signatures[role]=null; state.signatureDetails[role]=null;
        if(url)state.finalizedAt=null;
      } else if(!detail) {
        state.signatureDetails[role]={type:'legacy',caseUid:state.caseUid,person:identity(state,role),originalDataUrl:url,crop:{left:0,top:0,right:0,bottom:0},needsReview:false};
      }
    }
    return state;
  }
  function set(state,role,image,{type='uploaded',originalDataUrl=image.dataUrl,crop={left:0,top:0,right:0,bottom:0}}={}) {
    ensure(state);
    if(!roles.includes(role)||!identity(state,role).name||!imageUrl(image.dataUrl))throw new Error('Informe o nome da pessoa antes de registrar sua assinatura.');
    state.signatures[role]=image.dataUrl;
    state.signatureDetails[role]={type,caseUid:state.caseUid,person:identity(state,role),originalDataUrl,crop:copy(crop),width:image.width,height:image.height,needsReview:false,confirmedAt:new Date().toISOString()};
    state.finalizedAt=null;
  }
  function clear(state,role) { ensure(state);state.signatures[role]=null;state.signatureDetails[role]=null;state.finalizedAt=null; }
  function invalidate(state) {
    ensure(state);
    for(const role of roles)if(state.signatures[role] && state.signatureDetails[role].type!=='profile')state.signatureDetails[role].needsReview=true;
    state.finalizedAt=null;
  }
  function get(state,role) {
    const url=state.signatures?.[role],detail=state.signatureDetails?.[role];
    if(!imageUrl(url) || (detail && (detail.caseUid!==state.caseUid || personKey(detail.person)!==personKey(identity(state,role)))))return null;
    return url;
  }
  function validCpf(value) {
    const v=clean(value).replace(/\D/g,'');if(!/^\d{11}$/.test(v)||/^(\d)\1+$/.test(v))return false;
    for(let n=9;n<=10;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(v[i])*(n+1-i);const digit=(sum*10)%11%10;if(digit!==Number(v[n]))return false;}return true;
  }
  function normalizeProfile(value) {
    if(!value)return null;
    return {schemaVersion:1,name:clean(value.name),cpf:clean(value.cpf),autoUse:value.autoUse===true,image:imageUrl(value.image?.dataUrl)?copy(value.image):null,updatedAt:clean(value.updatedAt)};
  }
  function profileErrors(profile) {
    const errors=[];
    if(!clean(profile?.name))errors.push('Informe o nome completo do regulador.');
    if(!validCpf(profile?.cpf))errors.push('Informe um CPF válido do regulador, com 11 dígitos.');
    if(!imageUrl(profile?.image?.dataUrl))errors.push('Anexe a assinatura do regulador.');
    return errors;
  }
  function applyProfile(state,profile,{automatic=false}={}) {
    if(!profile || (automatic&&!profile.autoUse) || profileErrors(profile).length)return false;
    state.fields.regulatorName=profile.name;state.fields.regulatorCpf=profile.cpf;
    set(state,'regulator',profile.image,{type:'profile',originalDataUrl:profile.image.originalDataUrl||profile.image.dataUrl,crop:profile.image.crop});
    return true;
  }
  async function decode(dataUrl) {
    if(!imageUrl(dataUrl))throw new Error('Utilize uma imagem JPG, JPEG ou PNG válida.');
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Não foi possível abrir a imagem. Selecione outro arquivo JPG ou PNG.'));i.src=dataUrl;});
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw new Error('A imagem excede 40 megapixels. Utilize uma cópia com resolução menor.');
    return img;
  }
  async function readImage(file) {
    if(!file || !/\.(jpe?g|png)$/i.test(file.name))throw new Error('Selecione uma imagem JPG, JPEG ou PNG.');
    if(file.size>12*1024*1024)throw new Error('A imagem deve ter até 12 MB.');
    const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
    const png=[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if(!png&&!jpeg)throw new Error('O conteúdo do arquivo não é uma imagem JPG ou PNG compatível.');
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).replace(/^data:[^;]+;/,`data:image/${png?'png':'jpeg'};`));r.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));r.readAsDataURL(file);});
    const img=await decode(dataUrl);
    return {dataUrl,width:img.naturalWidth,height:img.naturalHeight,originalDataUrl:dataUrl,crop:{left:0,top:0,right:0,bottom:0}};
  }
  async function cropImage(dataUrl,crop) {
    const img=await decode(dataUrl);
    for(const k of ['left','top','right','bottom'])if(!Number.isFinite(crop[k])||crop[k]<0||crop[k]>45)throw new Error('Enquadramento inválido.');
    if(Object.values(crop).every(v=>v===0))return {dataUrl,width:img.naturalWidth,height:img.naturalHeight};
    const x=Math.round(img.naturalWidth*crop.left/100),y=Math.round(img.naturalHeight*crop.top/100);
    const width=Math.max(1,img.naturalWidth-x-Math.round(img.naturalWidth*crop.right/100)),height=Math.max(1,img.naturalHeight-y-Math.round(img.naturalHeight*crop.bottom/100));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').drawImage(img,x,y,width,height,0,0,width,height);
    return {dataUrl:canvas.toDataURL('image/png'),width,height};
  }

  let controller,profile=null,profileDraft=null,cropSession=null,cropSequence=0;
  const uploadVersions={regulator:0,claimant:0,profile:0};
  const $=id=>document.getElementById(id);
  const message=(text,error=false)=>{const e=$('signatureMessage');e.textContent=text;e.className=`notice ${error?'error':'info'}`;};
  function changed(){controller.onChange();render();}
  function render() {
    if(!controller)return;
    const state=ensure(controller.getState());
    for(const role of roles) {
      const present=!!get(state,role),detail=state.signatureDetails[role];
      const label=$(`${role}SignatureUploadLabel`);if(label)label.textContent=present?'Substituir assinatura':'Anexar assinatura';
      document.querySelectorAll(`[data-signature-role="${role}"]`).forEach(e=>e.hidden=!present);
      const verify=$(`${role}SignatureConfirm`);if(verify)verify.hidden=!present||!detail?.needsReview;
    }
    $('regulatorProfileStatus').textContent=profile ? `Preferência local de ${profile.name}. Uso automático ${profile.autoUse?'ativado':'desativado'}.` : 'Nenhuma assinatura padrão cadastrada neste navegador.';
    $('applyRegulatorProfile').disabled=!profile||profileErrors(profile).length>0;
  }
  function renderProfile() {
    profileDraft=copy(profile || {schemaVersion:1,name:'',cpf:'',image:null,autoUse:false});
    $('profileRegulatorName').value=profileDraft.name;$('profileRegulatorCpf').value=profileDraft.cpf;$('profileRegulatorAuto').checked=profileDraft.autoUse;
    renderProfileImage();render();
  }
  function renderProfileImage(){
    $('profileSignaturePreview').innerHTML=profileDraft?.image?`<img src="${esc(profileDraft.image.dataUrl)}" alt="Assinatura padrão do regulador">`:'<span>Nenhuma imagem cadastrada</span>';
    $('profileSignatureUploadLabel').textContent=profileDraft?.image?'Substituir assinatura padrão':'Anexar assinatura padrão';
    $('profileCropButton').hidden=!profileDraft?.image;
  }
  const snapshot=(state,role)=>({caseUid:state.caseUid,person:personKey(identity(state,role))});
  const matches=(token,state,role)=>token.caseUid===state.caseUid&&token.person===personKey(identity(state,role));
  async function upload(file,target) {
    const state=ensure(controller.getState()),token=target==='profile'?null:snapshot(state,target);
    const version=++uploadVersions[target],previous=target==='profile'?profileDraft.image?.dataUrl:state.signatures[target];
    try {
      if(token&&!identity(state,target).name)throw new Error('Informe o nome da pessoa antes de anexar sua assinatura.');
      const image=await readImage(file);
      if(version!==uploadVersions[target])return;
      if(previous!==(target==='profile'?profileDraft.image?.dataUrl:controller.getState().signatures[target]))return;
      if(target==='profile'){profileDraft.image=image;renderProfileImage();message('Imagem pronta para cadastro. Salve a preferência para confirmar.');}
      else {
        if(!matches(token,controller.getState(),target))throw new Error('O atendimento ou a pessoa mudou durante a leitura. Anexe a assinatura novamente.');
        set(controller.getState(),target,image);changed();message('Assinatura anexada ao atendimento atual.');
      }
    }catch(error){message(error.message,true);}
  }
  async function previewCrop() {
    const sequence=++cropSequence,session=cropSession;if(!session)return;
    const crop=Object.fromEntries(['left','top','right','bottom'].map(k=>[k,Number($('signatureCrop'+k).value)]));
    document.querySelectorAll('[data-crop-output]').forEach(e=>e.textContent=`${crop[e.dataset.cropOutput]}%`);
    try{const result=await cropImage(session.originalDataUrl,crop);if(sequence!==cropSequence||session!==cropSession)return;session.result=result;session.crop=crop;$('signatureCropPreview').src=result.dataUrl;}catch(error){message(error.message,true);}
  }
  function openCrop(target) {
    const state=ensure(controller.getState()),detail=target==='profile'?profileDraft.image:state.signatureDetails[target];
    if(!detail)return;
    cropSession={target,originalDataUrl:detail.originalDataUrl || (target==='profile'?detail.dataUrl:state.signatures[target]),token:target==='profile'?null:snapshot(state,target),previous:target==='profile'?profileDraft.image.dataUrl:state.signatures[target],result:null};
    for(const k of ['left','top','right','bottom'])$('signatureCrop'+k).value=detail.crop?.[k] || 0;
    $('signatureCropModal').classList.remove('hidden');previewCrop();
  }
  function closeCrop(){cropSequence++;cropSession=null;$('signatureCropModal').classList.add('hidden');}
  function downloadProfile() {
    if(!profile){message('Cadastre a preferência antes de exportar.',true);return;}
    const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'fast-track-regulator-profile',profile},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='Preferencia_privada_regulador.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  async function init(next) {
    controller=next;profile=normalizeProfile(await controller.loadProfile());renderProfile();
    document.querySelectorAll('[data-signature-file]').forEach(input=>input.addEventListener('change',async()=>{const file=input.files?.[0];input.value='';if(file)await upload(file,input.dataset.signatureFile);}));
    document.querySelectorAll('[data-signature-crop]').forEach(input=>input.addEventListener('input',previewCrop));
    $('profileImportFile').addEventListener('change',async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      try{const parsed=JSON.parse(await file.text());if(parsed.kind!=='fast-track-regulator-profile')throw new Error('Selecione uma configuração privada de regulador exportada pelo Fast Track.');const nextProfile=normalizeProfile(parsed.profile);const errors=profileErrors(nextProfile);if(errors.length)throw new Error(errors.join(' '));await decode(nextProfile.image.dataUrl);profileDraft=nextProfile;$('profileRegulatorName').value=profileDraft.name;$('profileRegulatorCpf').value=profileDraft.cpf;$('profileRegulatorAuto').checked=profileDraft.autoUse;renderProfileImage();message('Configuração carregada para conferência. Salve a preferência para confirmar; o atendimento atual permanece com sua assinatura.');}catch(error){message(error.message,true);}
    });
    document.addEventListener('click',async event=>{
      const button=event.target.closest('[data-signature-action]');if(!button)return;
      const action=button.dataset.signatureAction,target=button.dataset.target,state=ensure(controller.getState());
      try{
        if(action==='remove'){uploadVersions[target]++;clear(state,target);changed();message('Assinatura removida somente deste atendimento.');}
        if(action==='confirm'){const detail=state.signatureDetails[target];if(detail){detail.needsReview=false;detail.confirmedAt=new Date().toISOString();state.finalizedAt=null;changed();message('Assinatura conferida para os dados atuais.');}}
        if(action==='crop')openCrop(target);
        if(action==='crop-cancel')closeCrop();
        if(action==='crop-reset'){for(const k of ['left','top','right','bottom'])$('signatureCrop'+k).value=0;await previewCrop();}
        if(action==='crop-apply'){
          await previewCrop();const session=cropSession;if(!session?.result)return;
          if(session.target==='profile'){if(profileDraft.image?.dataUrl!==session.previous)throw new Error('A imagem foi substituída. Reabra o enquadramento.');profileDraft.image={...session.result,originalDataUrl:session.originalDataUrl,crop:session.crop};renderProfileImage();}
          else {if(!matches(session.token,state,session.target)||state.signatures[session.target]!==session.previous)throw new Error('A assinatura ou o atendimento mudou. Reabra o enquadramento.');const type=state.signatureDetails[session.target].type;set(state,session.target,session.result,{type,originalDataUrl:session.originalDataUrl,crop:session.crop});changed();}
          closeCrop();message('Enquadramento aplicado. A imagem original continua preservada.');
        }
        if(action==='profile-save'){
          const candidate=normalizeProfile({...profileDraft,name:$('profileRegulatorName').value,cpf:$('profileRegulatorCpf').value,autoUse:$('profileRegulatorAuto').checked,updatedAt:new Date().toISOString()});
          const errors=profileErrors(candidate);if(errors.length)throw new Error(errors.join(' '));
          await controller.saveProfile(candidate);profile=candidate;renderProfile();message('Preferência salva neste navegador/dispositivo. Será aplicada aos novos relatórios se o uso automático estiver ativado.');
        }
        if(action==='profile-remove'){uploadVersions.profile++;await controller.saveProfile(null);profile=null;renderProfile();message('Preferência removida. As assinaturas dos atendimentos salvos foram preservadas.');}
        if(action==='profile-apply'){if(!applyProfile(state,profile))throw new Error('Cadastre uma preferência completa antes de aplicá-la.');controller.applyFields();changed();message('Assinatura padrão aplicada explicitamente ao atendimento atual.');}
        if(action==='profile-export')downloadProfile();
      }catch(error){message(error.message,true);}
    });
  }
  window.FastTrackSignatures={ensure,set,clear,get,invalidate,identity,personKey,validCpf,normalizeProfile,profileErrors,applyProfile,readImage,cropImage,validateImage:decode,init,render,getProfile:()=>copy(profile)};
})();
