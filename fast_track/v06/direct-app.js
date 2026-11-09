(() => {
  'use strict';

  const REPORT = () => window.FastTrackV06Report;
  const DB_NAME = 'HSFastTrackV06Direct';
  const STORE = 'state';
  const KEY = 'current';
  const VERSION = '0.6.6';
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const simpleFields = [
    'insurerClaim','hsClaim','insurer','insured','claimantName','claimantCpf','riskAddress',
    'policyNumber','productName','broker','lossDate','coverageName','inspectionDate',
    'mapFit','mapPosX','mapPosY','noDocuments','regulatorOpinion','otherInsurance',
    'otherInsuranceDetails','bankName','bankAgency','bankAccount','noticeDate','scheduleDate',
    'reportCity','reportDate','regulatorName','regulatorCpf'
  ];
  const requiredBasic = [
    'insurer','insured','claimantName','claimantCpf','riskAddress','policyNumber','productName',
    'broker','lossDate','coverageName','inspectionDate','regulatorOpinion','otherInsurance',
    'bankName','bankAgency','bankAccount','noticeDate','scheduleDate','reportCity','reportDate',
    'regulatorName','regulatorCpf'
  ];

  let state = createDefaultState();
  let saveTimer = null;
  let currentStep = 1;
  let activeSignatureRole = null;
  let signatureDirty = false;
  let drawing = false;
  let lastPoint = null;
  let dbPromise = null;

  function createDefaultState() {
    const today = new Date().toISOString().slice(0,10);
    return {
      version:VERSION,
      updatedAt:new Date().toISOString(),
      finalizedAt:null,
      fields:{
        insurerClaim:'',hsClaim:'',insurer:'SOMPO SEGUROS S/A',insured:'',
        claimantName:'',claimantCpf:'',riskAddress:'',policyNumber:'',productName:'RISCOS NOMEADOS',
        broker:'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',lossDate:'',
        coverageName:'Vendaval / Granizo',inspectionDate:'2026-11-10',
        mapFit:'contain',mapPosX:'50',mapPosY:'50',noDocuments:false,
        regulatorOpinion:'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice.',
        otherInsurance:'',otherInsuranceDetails:'',bankName:'',bankAgency:'',bankAccount:'',
        noticeDate:'',scheduleDate:'',reportCity:'Blumenau (SC)',reportDate:today,
        regulatorName:'',regulatorCpf:''
      },
      map:null,
      damages:[],
      photos:[],
      documents:[],
      signatures:{regulator:null,claimant:null}
    };
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject) => {
      const request = indexedDB.open(DB_NAME,1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function dbGet() {
    try {
      const db = await openDb();
      return await new Promise((resolve,reject) => {
        const tx = db.transaction(STORE,'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try { return JSON.parse(localStorage.getItem('hsFastTrackV06Direct') || 'null'); } catch { return null; }
    }
  }

  async function dbSet(data) {
    try {
      const db = await openDb();
      await new Promise((resolve,reject) => {
        const tx = db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(data,KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.setItem('hsFastTrackV06Direct', JSON.stringify(data));
    }
  }

  async function dbClear() {
    try {
      const db = await openDb();
      await new Promise((resolve,reject) => {
        const tx = db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
    localStorage.removeItem('hsFastTrackV06Direct');
  }

  function status(message, kind = '') {
    const el = $('saveStatus');
    el.textContent = message || '';
    el.className = kind || '';
    if (message) setTimeout(() => { if (el.textContent === message) el.textContent = ''; }, 5000);
  }

  function cloneForSave() {
    return JSON.parse(JSON.stringify({...state,updatedAt:new Date().toISOString()}));
  }

  async function saveState(manual = false) {
    clearTimeout(saveTimer);
    syncFieldsFromDom();
    state.updatedAt = new Date().toISOString();
    await dbSet(cloneForSave());
    if (manual) status('Rascunho salvo neste navegador.');
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(false), 450);
  }

  function invalidateSignatures(reason = 'Os dados foram alterados após a assinatura. As assinaturas precisam ser refeitas.') {
    if (state.signatures.regulator || state.signatures.claimant || state.finalizedAt) {
      state.signatures.regulator = null;
      state.signatures.claimant = null;
      state.finalizedAt = null;
      renderSignatures();
      const box = $('signatureWarning');
      box.textContent = reason;
      box.classList.remove('hidden');
    }
  }

  function syncFieldsFromDom() {
    simpleFields.forEach((id) => {
      const el = $(id);
      if (!el) return;
      state.fields[id] = el.type === 'checkbox' ? el.checked : el.value;
    });
  }

  function applyStateToDom() {
    simpleFields.forEach((id) => {
      const el = $(id);
      if (!el) return;
      const value = state.fields?.[id];
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else if (value != null) el.value = value;
    });
    renderMap();
    renderDamages();
    renderPhotos();
    renderDocuments();
    renderSignatures();
    updateDerived();
  }

  function resolveCaseId() {
    const f = state.fields;
    return String(f.insurerClaim || f.hsClaim || f.claimantName || 'Processo não identificado').trim();
  }

  function updateCaseIdentity() {
    syncFieldsFromDom();
    const value = resolveCaseId();
    $('resolvedCaseId').textContent = value;
    $('caseBadge').textContent = value;
    $('claimantSignatureName').textContent = state.fields.claimantName || 'Cooperado não informado';
    $('claimantSignatureCpf').textContent = state.fields.claimantCpf ? `CPF: ${state.fields.claimantCpf}` : 'CPF não informado';
  }

  function updateDerived() {
    updateCaseIdentity();
    const f = state.fields;
    $('occurrenceAutoText').textContent = REPORT().occurrenceText(f.lossDate);
    $('inspectionAutoText').textContent = REPORT().inspectionText(f.inspectionDate);

    const lossWarn = $('lossDateWarning');
    if (f.lossDate && !/^2026-11-\d{2}$/.test(f.lossDate)) {
      lossWarn.textContent = 'A data do sinistro não pertence a novembro de 2026. Corrija a divergência antes da conclusão.';
      lossWarn.classList.remove('hidden');
    } else lossWarn.classList.add('hidden');

    $('otherInsuranceDetailsWrap').classList.toggle('hidden', f.otherInsurance !== 'sim');
    renderChronologyWarning();
    renderFinancialSummary();
  }

  function go(step) {
    const screen = document.querySelector(`.screen[data-step="${step}"]`);
    if (!screen) return;
    syncFieldsFromDom();
    if (step === 7) renderReview();
    qsa('.screen').forEach((section) => section.classList.toggle('active', section === screen));
    currentStep = step;
    qsa('#progress span').forEach((bar,index) => bar.classList.toggle('on',index < step));
    window.scrollTo({top:0,behavior:'instant'});
    scheduleSave();
  }

  function newDamage(item = {}) {
    return {
      id:item.id || uid('damage'),
      description:item.description || item.desc || '',
      quantity:item.quantity ?? item.qty ?? '',
      unit:item.unit || '',
      age:item.age ?? '',
      ageUnit:item.ageUnit || (String(item.age || '').toLowerCase().includes('mes') ? 'meses' : 'anos'),
      claimedTotal:item.claimedTotal ?? '',
      assessedTotal:item.assessedTotal ?? ''
    };
  }

  function damageCard(item,index) {
    return `<div class="dynamic-card damage-card" data-id="${item.id}">
      <div class="dynamic-head">
        <strong>Item ${index + 1}</strong>
        <div class="small-actions">
          <button type="button" class="small-btn" data-action="move-damage-up" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="small-btn" data-action="move-damage-down" ${index === state.damages.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="small-btn danger" data-action="remove-damage">Remover</button>
        </div>
      </div>
      <label class="field required">Nome ou descrição do material danificado</label>
      <input data-damage="description" value="${REPORT().esc(item.description)}">
      <div class="grid3">
        <div><label class="field required">Quantidade</label><input data-damage="quantity" inputmode="decimal" value="${REPORT().esc(item.quantity)}"></div>
        <div><label class="field required">Unidade de medida</label><input data-damage="unit" value="${REPORT().esc(item.unit)}" placeholder="un., m², m, conjunto"></div>
        <div><label class="field required">Idade</label><div class="grid2 compact"><input data-damage="age" inputmode="decimal" value="${REPORT().esc(item.age)}"><select data-damage="ageUnit"><option value="meses"${item.ageUnit === 'meses' ? ' selected' : ''}>meses</option><option value="anos"${item.ageUnit === 'anos' ? ' selected' : ''}>anos</option></select></div></div>
      </div>
      <div class="grid2">
        <div><label class="field required">Valor reclamado total (R$)</label><input data-damage="claimedTotal" type="number" min="0" step="0.01" value="${REPORT().esc(item.claimedTotal)}"></div>
        <div><label class="field">Valor apurado (R$)</label><div class="inline-field"><input data-damage="assessedTotal" type="number" min="0" step="0.01" value="${REPORT().esc(item.assessedTotal)}"><button type="button" class="small-btn" data-action="accept-claimed">Acatar valor reclamado</button></div></div>
      </div>
    </div>`;
  }

  function renderDamages() {
    const list = $('damageList');
    if (!state.damages.length) {
      list.innerHTML = '<div class="notice info">Nenhum item cadastrado. Adicione o primeiro dano apurado em vistoria.</div>';
    } else {
      list.innerHTML = state.damages.map(damageCard).join('');
    }
    renderFinancialSummary();
  }

  function syncDamageCard(card) {
    const item = state.damages.find((entry) => entry.id === card.dataset.id);
    if (!item) return;
    qsa('[data-damage]',card).forEach((input) => { item[input.dataset.damage] = input.value; });
  }

  function renderFinancialSummary() {
    const calc = REPORT().calculate(state);
    $('financialSummary').innerHTML = `
      <div class="financial-card"><span>Total reclamado</span><strong>${REPORT().money(calc.totalClaimed)}</strong></div>
      <div class="financial-card"><span>Prejuízo apurado</span><strong>${REPORT().money(calc.totalAssessed)}</strong></div>
      <div class="financial-card"><span>Franquia</span><strong>${REPORT().money(calc.deductible)}</strong></div>
      <div class="financial-card highlight"><span>Valor líquido</span><strong>${REPORT().money(calc.net)}</strong></div>`;
  }

  async function fileToDataUrl(file) {
    return await new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function compressImage(file, maxWidth = 1800, maxHeight = 1500, quality = .88) {
    const source = await fileToDataUrl(file);
    const image = await new Promise((resolve,reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });
    let {width,height} = image;
    const ratio = Math.min(1,maxWidth/width,maxHeight/height);
    width = Math.max(1,Math.round(width*ratio));
    height = Math.max(1,Math.round(height*ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height);
    ctx.drawImage(image,0,0,width,height);
    return canvas.toDataURL('image/jpeg',quality);
  }

  async function setMapFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    invalidateSignatures();
    const dataUrl = await compressImage(file,2000,1500,.9);
    state.map = {dataUrl,name:file.name,fit:state.fields.mapFit || 'contain',posX:state.fields.mapPosX || '50',posY:state.fields.mapPosY || '50'};
    renderMap();
    scheduleSave();
  }

  function renderMap() {
    const editor = $('mapEditor');
    if (!state.map?.dataUrl) {
      editor.classList.add('hidden');
      $('mapPreview').removeAttribute('src');
      return;
    }
    editor.classList.remove('hidden');
    const img = $('mapPreview');
    img.src = state.map.dataUrl;
    img.style.objectFit = state.fields.mapFit || 'contain';
    img.style.objectPosition = `${state.fields.mapPosX || 50}% ${state.fields.mapPosY || 50}%`;
  }

  async function addPhotos(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await compressImage(file,1800,1400,.88);
      state.photos.push({id:uid('photo'),name:file.name,caption:'',dataUrl});
    }
    invalidateSignatures();
    renderPhotos();
    scheduleSave();
  }

  function photoCard(photo,index) {
    return `<div class="photo-card" data-id="${photo.id}">
      <div class="dynamic-head"><strong>Figura ${index + 1}</strong><div class="small-actions">
        <button type="button" class="small-btn" data-action="move-photo-up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="small-btn" data-action="move-photo-down" ${index === state.photos.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="small-btn" data-action="replace-photo">Substituir</button>
        <button type="button" class="small-btn danger" data-action="remove-photo">Remover</button>
      </div></div>
      <img src="${REPORT().attr(photo.dataUrl)}" alt="">
      <label class="field required">Legenda</label>
      <textarea data-photo-caption rows="2">${REPORT().esc(photo.caption || '')}</textarea>
    </div>`;
  }

  function renderPhotos() {
    $('photoGallery').innerHTML = state.photos.length
      ? state.photos.map(photoCard).join('')
      : '<div class="notice info">Nenhuma fotografia adicionada.</div>';
  }

  async function addDocuments(files) {
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      state.documents.push({id:uid('doc'),name:file.name,type:file.name,description:'',mime:file.type || 'application/octet-stream',dataUrl});
    }
    state.fields.noDocuments = false;
    $('noDocuments').checked = false;
    invalidateSignatures();
    renderDocuments();
    scheduleSave();
  }

  function documentCard(doc,index) {
    return `<div class="document-card" data-id="${doc.id}">
      <div class="dynamic-head"><div><strong>Documento ${index + 1}</strong><div class="document-name">${REPORT().esc(doc.name)}</div></div><div class="small-actions">
        <button type="button" class="small-btn" data-action="view-document">Visualizar</button>
        <button type="button" class="small-btn" data-action="replace-document">Substituir</button>
        <button type="button" class="small-btn danger" data-action="remove-document">Remover</button>
      </div></div>
      <div class="document-meta">
        <div><label class="field">Nome ou tipo</label><input data-document="type" value="${REPORT().esc(doc.type || '')}"></div>
        <div><label class="field">Descrição</label><input data-document="description" value="${REPORT().esc(doc.description || '')}"></div>
      </div>
    </div>`;
  }

  function renderDocuments() {
    $('documentList').innerHTML = state.documents.length
      ? state.documents.map(documentCard).join('')
      : '<div class="notice info">Nenhum documento anexado.</div>';
  }

  function syncDocumentCard(card) {
    const doc = state.documents.find((entry) => entry.id === card.dataset.id);
    if (!doc) return;
    qsa('[data-document]',card).forEach((input) => { doc[input.dataset.document] = input.value; });
  }

  function renderSignatures() {
    for (const role of ['regulator','claimant']) {
      const preview = $(`${role}SignaturePreview`);
      const dataUrl = state.signatures?.[role];
      preview.innerHTML = dataUrl ? `<img src="${REPORT().attr(dataUrl)}" alt="Assinatura ${role}">` : '<span>Sem assinatura registrada</span>';
    }
  }

  function openSignature(role) {
    activeSignatureRole = role;
    signatureDirty = false;
    const modal = $('signatureModal');
    $('signatureModalTitle').textContent = role === 'regulator' ? 'Assinatura do regulador' : 'Assinatura do cooperado';
    modal.classList.remove('hidden');
    const canvas = $('signatureCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const existing = state.signatures?.[role];
    if (existing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img,0,0,canvas.width,canvas.height);
      img.src = existing;
    }
  }

  function closeSignature() {
    $('signatureModal').classList.add('hidden');
    activeSignatureRole = null;
    drawing = false;
    lastPoint = null;
  }

  function canvasPoint(event) {
    const canvas = $('signatureCanvas');
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX ?? event.touches?.[0]?.clientX;
    const clientY = event.clientY ?? event.touches?.[0]?.clientY;
    return {x:(clientX-rect.left)*(canvas.width/rect.width),y:(clientY-rect.top)*(canvas.height/rect.height)};
  }

  function clearSignatureCanvas() {
    const canvas = $('signatureCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    signatureDirty = false;
  }

  function confirmSignature() {
    if (!activeSignatureRole) return;
    if (!signatureDirty && !state.signatures[activeSignatureRole]) {
      alert('A área de assinatura está em branco.');
      return;
    }
    state.signatures[activeSignatureRole] = $('signatureCanvas').toDataURL('image/png');
    state.finalizedAt = null;
    renderSignatures();
    closeSignature();
    scheduleSave();
  }

  function renderChronologyWarning() {
    const f = state.fields;
    const values = [f.lossDate,f.noticeDate,f.scheduleDate,f.inspectionDate].filter(Boolean);
    let warning = '';
    if (values.length === 4) {
      const nums = values.map((v) => new Date(`${v}T00:00:00`).getTime());
      if (!(nums[0] <= nums[1] && nums[1] <= nums[2] && nums[2] <= nums[3])) {
        warning = 'As datas da cronologia não estão em ordem. Verifique ocorrência, aviso, agendamento e vistoria.';
      }
    }
    const box = $('chronologyWarning');
    box.textContent = warning;
    box.classList.toggle('hidden',!warning);
  }

  function validationErrors({signed = false} = {}) {
    syncFieldsFromDom();
    const f = state.fields;
    const errors = [];
    if (!f.insurerClaim && !f.hsClaim) errors.push('Informe o número da seguradora ou o número Horizon Servitas.');
    requiredBasic.forEach((id) => {
      if (!String(f[id] ?? '').trim()) {
        const label = document.querySelector(`label[for="${id}"]`)?.textContent?.replace(' *','') || id;
        errors.push(`Preencha: ${label}.`);
      }
    });
    if (f.lossDate && !/^2026-11-\d{2}$/.test(f.lossDate)) errors.push('A data do sinistro deve pertencer a novembro de 2026.');
    if (!state.map?.dataUrl) errors.push('Inclua a captura do Google Maps.');
    if (!state.damages.length) errors.push('Cadastre ao menos um item de dano.');
    state.damages.forEach((item,index) => {
      const n=index+1;
      if (!String(item.description).trim()) errors.push(`Item ${n}: informe a descrição.`);
      if (!String(item.quantity).trim()) errors.push(`Item ${n}: informe a quantidade.`);
      if (!String(item.unit).trim()) errors.push(`Item ${n}: informe a unidade.`);
      if (!String(item.age).trim()) errors.push(`Item ${n}: informe a idade.`);
      if (item.claimedTotal === '' || item.claimedTotal == null) errors.push(`Item ${n}: informe o valor reclamado.`);
      if (item.assessedTotal === '' || item.assessedTotal == null) errors.push(`Item ${n}: informe ou confirme o valor apurado.`);
    });
    if (!state.photos.length) errors.push('Inclua ao menos uma fotografia de vistoria.');
    state.photos.forEach((photo,index) => { if (!String(photo.caption).trim()) errors.push(`Figura ${index+1}: informe a legenda.`); });
    if (!f.noDocuments && !state.documents.length) errors.push('Anexe os documentos coletados ou marque que não foram apresentados.');
    if (f.otherInsurance === 'sim' && !String(f.otherInsuranceDetails).trim()) errors.push('Informe os dados dos outros seguros.');
    const order = [f.lossDate,f.noticeDate,f.scheduleDate,f.inspectionDate];
    if (order.every(Boolean)) {
      const nums=order.map(v=>new Date(`${v}T00:00:00`).getTime());
      if (!(numms[0] <= nums[1] && nums[1] <= nums[2] && nums[2] <= nums[3])) {
        warning = 'As datas da cronologia não estão em ordem. Verifique ocorrência, aviso, agendamento e vistoria.';
      }
    }
    const box = $('chronologyWarning');
    box.textContent = warning;
    box.classList.toggle('hidden',!warning);
  }

  function validationErrors({signed = false} = {}) {
    syncFieldsFromDom();
    const f = state.fields;
    const errors = [];
    if (!f.insurerClaim && !f.hsClaim) errors.push('Informe o número da seguradora ou o número Horizon Servitas.');
    requiredBasic.forEach((id) => {
      if (!String(f[id] ?? '').trim()) {
        const label = document.querySelector(`label[for="${id}"]`)?.textContent?.replace(' *','') || id;
        errors.push(`Preencha: ${label}.`);
      }
    });
    if (f.lossDate && !/^2026-11-\d{2}$/.test(f.lossDate)) errors.push('A data do sinistro deve pertencer a novembro de 2026.');
    if (!state.map?.dataUrl) errors.push('Inclua a captura do Google Maps.');
    if (!state.damages.length) errors.push('Cadastre ao menos um item de dano.');
    state.damages.forEach((item,index) => {
      const n=index+1;
      if (!String(item.description).trim()) errors.push(`Item ${n}: informe a descrição.`);
      if (!String(item.quantity).trim()) errors.push(`Item ${n}: informe a quantidade.`);
      if (!String(item.unit).trim()) errors.push(`Item ${n}: informe a unidade.`);
      if (!String(item.age).trim()) errors.push(`Item ${n}: informe a idade.`);
      if (item.claimedTotal === '' || item.claimedTotal == null) errors.push(`Item ${n}: informe o valor reclamado.`);
      if (item.assessedTotal === '' || item.assessedTotal == null) errors.push(`Item ${n}: informe ou confirme o valor apurado.`);
    });
    if (!state.photos.length) errors.push('Inclua ao menos uma fotografia de vistoria.');
    state.photos.forEach((photo,index) => { if (!String(photo.caption).trim()) errors.push(`Figura ${index+1}: informe a legenda.`); });
    if (!f.noDocuments && !state.documents.length) errors.push('Anexe os documentos coletados ou marque que não foram apresentados.');
    if (f.otherInsurance === 'sim' && !String(f.otherInsuranceDetails).trim()) errors.push('Informe os dados dos outros seguros.');
    const order = [f.lossDate,f.noticeDate,f.scheduleDate,f.inspectionDate];
    if (order.every(Boolean)) {
      const nums=order.map(v=>new Date(`${v}T00:00:00`).getTime());
      if (!(nums[0] <= nums[1] && nums[1] <= nums[2] && nums[2] <= nums[3])) errors.push('Corrija a ordem cronológica das datas.');
    }
    if (signed) {
      if (!state.signatures.regulator) errors.push('Registre a assinatura do regulador.');
      if (!state.signatures.claimant) errors.push('Registre a assinatura do cooperado.');
    }
    return [...new Set(errors)];
  }

  function renderReview() {
    syncFieldsFromDom();
    const errors = validationErrors({signed:false});
    $('reviewAlerts').innerHTML = errors.length
      ? `<div class="notice warn"><strong>Pendências para conclusão:</strong><ul>${errors.map((e)=>`<li>${REPORT().esc(e)}</li>`).join('')}</ul></div>`
      : '<div class="notice ok"><strong>Conferência concluída:</strong> os campos estruturais estão preenchidos.</div>';
    const calc = REPORT().calculate(state);
    $('reviewSummary').innerHTML = `
      <div class="summary-tile"><span>Processo</span><strong>${REPORT().esc(resolveCaseId())}</strong></div>
      <div class="summary-tile"><span>Itens de dano</span><strong>${state.damages.length}</strong></div>
      <div class="summary-tile"><span>Fotografias</span><strong>${state.photos.length}</strong></div>
      <div class="summary-tile"><span>Total reclamado</span><strong>${REPORT().money(calc.totalClaimed)}</strong></div>
      <div class="summary-tile"><span>Franquia</span><strong>${REPORT().money(calc.deductible)}</strong></div>
      <div class="summary-tile"><span>Valor líquido</span><strong>${REPORT().money(calc.net)}</strong></div>`;
    $('reportPreview').innerHTML = REPORT().buildHTML(state,{draft:!state.finalizedAt});
  }

  function finalizeSigned() {
    const errors = validationErrors({signed:true});
    if (errors.length) {
      alert(`Não foi possível concluir a versão assinada:\n\n• ${errors.join('\n• ')}`);
      renderReview();
      return;
    }
    state.finalizedAt = new Date().toISOString();
    saveState(true);
    renderReview();
    status('Versão assinada concluída.','ok');
  }

  function preparePrint() {
    syncFieldsFromDom();
    $('printHost').innerHTML = REPORT().buildHTML(state,{draft:!state.finalizedAt});
  }

  function exportPdf() {
    preparePrint();
    window.print();
  }

  async function exportWord() {
    syncFieldsFromDom();
    try {
      if (!window.docx) throw new Error('A biblioteca de geração do Word não foi carregada. Verifique sua conexão e atualize a página.');
      await window.FastTrackV06Word.exportDocx(state, {draft:!state.finalizedAt});
    } catch (error) {
      console.error(error);
      alert(`Não foi possível gerar o Word:\n${error.message || error}`);
    }
  }

  function exportBackup() {
    syncFieldsFromDom();
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    download(blob,`Fast_Track_V06_${slug(resolveCaseId())}.json`);
  }

  async function importBackup(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object') throw new Error('Formato inválido');
      state = normalizeState(parsed);
      applyStateToDom();
      await saveState(false);
      go(1);
      status('Backup importado com sucesso.');
    } catch (error) {
      alert(`Não foi possível importar o backup: ${error.message || error}`);
    } finally {
      $('backupInput').value = '';
    }
  }

  function normalizeState(data) {
    const base = createDefaultState();
    return {
      ...base,
      ...data,
      fields:{...base.fields,...(data.fields || {})},
      map:data.map || null,
      damages:Array.isArray(data.damages) ? data.damages.map(newDamage) : [],
      photos:Array.isArray(data.photos) ? data.photos : [],
      documents:Array.isArray(data.documents) ? data.documents : [],
      signatures:{...base.signatures,...(data.signatures || {})}
    };
  }

  function download(blob,name) {
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  function slug(value) {
    return String(value || 'processo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  }

  function importV75() {
    let data=null;
    for (const key of ['ataV7_5','ataV7_4','ataV7']) {
      try { data=JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
      if (data) break;
    }
    if (!data) {
      alert('Nenhum rascunho da Ata V7.5 foi encontrado neste navegador.');
      return;
    }
    invalidateSignatures();
    const f=state.fields;
    f.insurer=data.seguradora || f.insurer;
    f.insured=data.cooperativaIntegradora || f.insured;
    f.claimantName=data.segurado || f.claimantName;
    f.claimantCpf=data.cpfCnpj || f.claimantCpf;
    f.riskAddress=data.endereco || f.riskAddress;
    f.policyNumber=data.apolice || f.policyNumber;
    f.broker=data.corretor || f.broker;
    f.lossDate=data.dataSinistro || f.lossDate;
    if (data.sinistro) {
      if (/^S/i.test(data.sinistro)) f.hsClaim=data.sinistro;
      else f.insurerClaim=data.sinistro;
    }
    f.inspectionDate=data.c5 || f.inspectionDate;
    f.noticeDate=data.c2 || f.noticeDate;
    f.scheduleDate=data.c4 || f.scheduleDate;
    if (Array.isArray(data.damage)) state.damages=data.damages.map(newDamage);
    applyStateToDom();
    scheduleSave();
    status('Dados da Ata V7.5 importados para conferência.');
  }

  function loadExample() {
    const today = new Date().toISOString().slice(0,10);
    state = createDefaultState();
    Object.assign(state.fields, {
      insurerClaim:'1325000',hsClaim:'S2609000',insurer:'SOMPO SEGUROS S/A',
      insured:'COOPERATIVA CENTRAL AURORA ALIMENTOS',claimantName:'Cooperado Exemplo',
      claimantCpf':'000.000.000-00',riskAddress:'Linha Exemplo, Município/SC',
      policyNumber:'9600131927',productName:'RISCOS NOMEADOS',broker:'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',
      lossDate:'2026-11-04',coverageName:'Vendaval / Granizo',inspectionDate:'2026-11-10',
      regulatorOpinion:'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice.',
      otherInsurance:'nao',bankName:'CRESOL',bankAgency:'2508',bankAccount:'1.801-5',noticeDate:'2026-11-05',scheduleDate:'2026-11-06',
      reportCity:'Blumenau (SC)',reportDate:today,regulatorName:'Paulo R. Schlosser',regulatorCpf:'068.613.739-66'
    });
    state.damages = [
      newDamage({description:'Telhas de fibrocimento de 6 mm',{}),
    newDamage({description:'Cumeeiras de fibrocimento 6 mm',{}),
    newDamage({description:'Parafusos telheiros completos 5/16',{})
    ];
    const values = [
      [120,'un.',2,'anos',7800,7800],
      [8,'un.',2,'anos',640,640],
      [350,'un.',1,'ano',770,770]
    ];
    state.damages.forEach((item,i)=>{
      const [q,u.,age,ageUnit,claimed,assessed]=values[i];
      Object.assign(item,{quantity:q,unit:u,age,ageUnit,claimedTotal:claimed,aistro;
    }
    if (Array.isArray(data.damage) && data.damage.length) {
      state.damages=data.damage.map((d)=>newDamage({
        description:d.desc,quantity:d.qty,unit:d.unit,age:String(d.age || '').replace(/[^\d,.]/g,''),ageUnit:String(d.age || '').toLowerCase().includes('mes')?'meses':'anos'
      }));
    }
    applyStateToDom();
    scheduleSave();
    status('Dados disponíveis da Ata V7.5 importados para conferência.');
  }

  function loadExample() {
    if (!confirm('Carregar o exemplo de teste e substituir o preenchimento atual?')) return;
    const f=createDefaultState().fields;
    Object.assign(f,{
      insurerClaim:'1325000',hsClaim:'S2609000',insurer:'SOMPO SEGUROS S/A',
      insured:'COOPERATIVA CENTRAL AURORA ALIMENTOS',claimantName:'Cooperado Exemplo',
      claimantCpf:'000.000.000-00',riskAddress:'Linha Exemplo, Município/SC',
      policyNumber:'9600131927',productName:'RISCOS NOMEADOS',
      broker:'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',lossDate:'2026-11-04',
      coverageName:'Vendaval / Granizo',inspectionDate:'2026-11-10',
      regulatorOpinion:'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice.',
      otherInsurance:'nao',bankName:'CRESOL',bankAgency:'2508',bankAccount:'1.801-5',
      noticeDate:'2026-11-05',scheduleDate:'2026-11-06',reportCity:'Blumenau (SC)',reportDate:'2026-11-10',
      regulatorName:'Paulo R. Schlosser',regulatorCpf:'068.613.739-66'
    });
    state=createDefaultState();
    state.fields=f;
    state.damages=[
      newDamage({description:'Telhas e componentes de cobertura',quantity:'120',unit:'un.',age:'4',ageUnit:'anos',claimedTotal:'10000',assessedTotal:'10000'}),
      newDamage({description:'Cortinado lateral',quantity:'220',unit:'m²',age:'2',ageUnit:'anos',claimedTotal:'6480',assessedTotal:'6480'}),
      newDamage({description:'Tampa e acessórios do reservatório',quantity:'1',unit:'conjunto',age:'3',ageUnit:'anos',claimedTotal:'1896',assessedTotal:'1896'})
    ];
    applyStateToDom();
    scheduleSave();
  }

  async function newProcess() {
    if (!confirm('Iniciar um novo processo? O rascunho atual será removido deste navegador.')) return;
    await dbClear();
    state=createDefaultState();
    applyStateToDom();
    go(1);
  }

  function swap(array,index,delta) {
    const target=index+delta;
    if (target<0 || target>=array.length) return;
    [array[index],array[target]]=[array[target],array[index]];
  }

  async function replacePhoto(id) {
    const file=await pickFile('image/*');
    if (!file) return;
    const photo=state.photos.find(p=>p.id===id);
    if (!photo) return;
    photo.dataUrl=await compressImage(file,1800,1400,.88);
    photo.name=file.name;
    invalidateSignatures();
    renderPhotos();scheduleSave();
  }

  async function replaceDocument(id) {
    const file=await pickFile('*/*');
    if (!file) return;
    const doc=state.documents.find(d=>d.id===id);
    if (!doc) return;
    doc.name=file.name;doc.type=file.name;doc.mime=file.type || 'application/octet-stream';doc.dataUrl=await fileToDataUrl(file);
    invalidateSignatures();
    renderDocuments();scheduleSave();
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input=document.createElement('input');input.type='file';input.accept=accept;
      input.onchange=()=>resolve(input.files?.[0] || null);
      input.click();
    });
  }

  document.addEventListener('click', async (event) => {
    const button=event.target.closest('[data-action],[data-go]');
    if (!button) return;
    if (button.dataset.go) { go(Number(button.dataset.go)); return; }
    const action=button.dataset.action;

    if (action==='import-v75') importV75();
    else if (action==='load-example') loadExample();
    else if (action==='add-damage') { invalidateSignatures();state.damages.push(newDamage());renderDamages();scheduleSave(); }
    else if (action==='remove-damage') {
      const id=button.closest('.damage-card').dataset.id;invalidateSignatures();state.damages=state.damages.filter(d=>d.id!==id);renderDamages();scheduleSave();
    } else if (action==='move-damage-up' || action==='move-damage-down') {
      const card=button.closest('.damage-card');syncDamageCard(card);const i=state.damages.findIndex(d=>d.id===card.dataset.id);swap(state.damages,i,action.endsWith('up')?-1:1);invalidateSignatures();renderDamages();scheduleSave();
    } else if (action==='accept-claimed') {
      const card=button.closest('.damage-card');syncDamageCard(card);const item=state.damages.find(d=>d.id===card.dataset.id);item.assessedTotal=item.claimedTotal;invalidateSignatures();renderDamages();scheduleSave();
    } else if (action==='remove-map') { invalidateSignatures();state.map=null;renderMap();scheduleSave(); }
    else if (action==='remove-photo') {
      const id=button.closest('.photo-card').dataset.id;invalidateSignatures();state.photos=state.photos.filter(p=>p.id!==id);renderPhotos();scheduleSave();
    } else if (action==='move-photo-up' || action==='move-photo-down') {
      const card=button.closest('.photo-card');const i=state.photos.findIndex(p=>p.id===card.dataset.id);swap(state.photos,i,action.endsWith('up')?-1:1);invalidateSignatures();renderPhotos();scheduleSave();
    } else if (action==='replace-photo') replacePhoto(button.closest('.photo-card').dataset.id);
    else if (action==='remove-document') {
      const id=button.closest('.document-card').dataset.id;invalidateSignatures();state.documents=state.documents.filter(d=>d.id!==id);renderDocuments();scheduleSave();
    } else if (action==='replace-document') replaceDocument(button.closest('.document-card').dataset.id);
    else if (action==='view-document') {
      const doc=state.documents.find(d=>d.id===button.closest('.document-card').dataset.id);if(doc?.dataUrl) window.open(doc.dataUrl,'_blank','noopener');
    } else if (action==='sign-regulator') openSignature('regulator');
    else if (action==='sign-claimant') openSignature('claimant');
    else if (action==='clear-signature') clearSignatureCanvas();
    else if (action==='cancel-signature') closeSignature();
    else if (action==='confirm-signature') confirmSignature();
    else if (action==='save-draft') saveState(true);
    else if (action==='export-backup') exportBackup();
    else if (action==='finalize-signed') finalizeSigned();
    else if (action==='export-pdf') exportPdf();
    else if (action==='export-word') exportWord();
    else if (action==='new-process') newProcess();
  });

  document.addEventListener('input', (event) => {
    const target=event.target;
    if (target.matches('[data-field]')) {
      const old=state.fields[target.id];
      state.fields[target.id]=target.type==='checkbox'?target.checked:target.value;
      if (old!==state.fields[target.id] && target.id!=='mapPosX' && target.id!=='mapPosY') invalidateSignatures();
      if (['mapFit','mapPosX','mapPosY'].includes(target.id) && state.map) {
        state.map.fit=state.fields.mapFit;state.map.posX=state.fields.mapPosX;state.map.posY=state.fields.mapPosY;renderMap();
      }
      updateDerived();scheduleSave();
    }
    const damageCard=target.closest('.damage-card');
    if (damageCard && target.matches('[data-damage]')) {
      syncDamageCard(damageCard);invalidateSignatures();renderFinancialSummary();scheduleSave();
    }
    const photoCard=target.closest('.photo-card');
    if (photoCard && target.matches('[data-photo-caption]')) {
      const photo=state.photos.find(p=>p.id===photoCard.dataset.id);if(photo) photo.caption=target.value;invalidateSignatures();scheduleSave();
    }
    const documentCard=target.closest('.document-card');
    if (documentCard && target.matches('[data-document]')) {
      syncDocumentCard(documentCard);invalidateSignatures();scheduleSave();
    }
  });

  $('mapDrop').addEventListener('click',()=>$('mapInput').click());
  $('mapDrop').addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('mapInput').click();}});
  $('mapDrop').addEventListener('dragover',(e)=>{e.preventDefault();});
  $('mapDrop').addEventListener('drop',(e)=>{e.preventDefault();setMapFromFile(e.dataTransfer.files?.[0]);});
  $('mapInput').addEventListener('change',()=>{setMapFromFile($('mapInput').files?.[0]);$('mapInput').value='';});
  document.addEventListener('paste',(event)=>{
    if (currentStep!==2) return;
    const file=Array.from(event.clipboardData?.files||[]).find(f=>f.type.startsWith('image/'));
    if(file){event.preventDefault();setMapFromFile(file);}
  });
  $('photoInput').addEventListener('change',async()=>{await addPhotos(Array.from($('photoInput').files||[]));$('photoInput').value='';});
  $('documentInput').addEventListener('change',async()=>{await addDocuments(Array.from($('documentInput').files||[]));$('documentInput').value='';});
  $('backupInput').addEventListener('change',()=>importBackup($('backupInput').files?.[0]));

  const canvas=$('signatureCanvas');
  canvas.addEventListener('pointerdown',(e)=>{drawing=true;signatureDirty=true;lastPoint=canvasPoint(e);canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',(e)=>{
    if(!drawing)return;const p=canvasPoint(e);const ctx=canvas.getContext('2d');ctx.beginPath();ctx.moveTo(lastPoint.x,lastPoint.y);ctx.lineTo(p.x,p.y);ctx.stroke();lastPoint=p;
  });
  const stopDraw=()=>{drawing=false;lastPoint=null;};
  canvas.addEventListener('pointerup',stopDraw);canvas.addEventListener('pointercancel',stopDraw);canvas.addEventListener('pointerleave',stopDraw);

  window.addEventListener('beforeprint',preparePrint);
  window.addEventListener('pagehide',()=>saveState(false));

  async function init() {
    const saved=await dbGet();
    if(saved) state=normalizeState(saved);
    if(!state.damages.length) state.damages.push(newDamage());
    applyStateToDom();
    qsa('#progress span')[0].classList.add('on');
    status('V0.6 carregada com sucesso.');
  }

  init().catch((error)=>{
    console.error(error);
    $('statusNotice').className='notice error';
    $('statusNotice').textContent=`Não foi possível inicializar o aplicativo: ${error.message || error}`;
  });
})();
