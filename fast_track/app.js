(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const DRAFT_KEY = 'hsFastTrackDraftV01';
  const EVENTS_KEY = 'hsFastTrackEventsV01';
  const VERSION = '0.1';

  const EVENT_FIELDS = [
    'eventName','eventDate','eventType','eventRegion','insurer','insuredCooperative','policyNumber','broker',
    'eventCoverage','insurerAnalyst','fastTrackInstructionDate','eventBaseNarrative','eventEvidence'
  ];
  const SIMPLE_FIELDS = [
    ...EVENT_FIELDS,
    'insurerClaim','hsClaim','claimantName','claimantDocument','lossDate','lossTime','riskAddress','coordinates',
    'contactName','contactPhone','inspectionType','riskActivity','riskDataSource','reporterName','occurrenceNarrative',
    'inspectionFindings','documentsPresented','coverageName','eventLimit','unitLimit','aggregateLimit','customLimit',
    'applicableLimitType','deductiblePct','deductibleMin','causeAnalysis','contractAnalysis','coverageDecision',
    'regulatorOpinion','salvageStatus','recoveryStatus','salvageNotes','recoveryAgainst','recoveryProtocol',
    'recoveryNotes','otherInsurance','otherInsurer','otherPolicy','beneficiaryName','beneficiaryDocument','bankName',
    'bankAgency','bankAccount','noticeDate','appointmentDate','contactDate','inspectionDate','closingDate','reportDate',
    'emissionCity','regulatorName','regulatorDocument','finalNotes'
  ];

  let currentStep = 1;
  let currentEventId = '';
  let sequence = 0;
  let saveTimer;
  let photos = [];

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[char]));
  }

  function numberValue(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
    if (!text) return 0;
    if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
    else if (text.includes(',')) text = text.replace(',', '.');
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function money(value) {
    return numberValue(value).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }

  function formatDate(value) {
    if (!value) return 'A INFORMAR';
    const parts = String(value).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
  }

  function longDate(value) {
    if (!value) return 'A INFORMAR';
    const [year, month, day] = String(value).split('-');
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${day} de ${months[Number(month) - 1] || ''} de ${year}`;
  }

  function slug(value) {
    return String(value || 'processo-fast-track')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'processo-fast-track';
  }

  function setField(id, value) {
    const element = $(id);
    if (!element) return;
    if (element.type === 'checkbox') element.checked = Boolean(value);
    else element.value = value ?? '';
  }

  function getField(id) {
    const element = $(id);
    if (!element) return '';
    return element.type === 'checkbox' ? element.checked : element.value;
  }

  function resolveCaseId() {
    const insurerClaim = $('insurerClaim').value.trim();
    const hsClaim = $('hsClaim').value.trim();
    const claimant = $('claimantName').value.trim();
    const primary = insurerClaim || hsClaim || claimant || 'Processo não identificado';
    if ((insurerClaim || hsClaim) && claimant) return `${primary} — ${claimant}`;
    return primary;
  }

  function updateCaseIdentity() {
    const resolved = resolveCaseId();
    $('resolvedCaseId').textContent = resolved;
    $('caseIdBadge').textContent = resolved;
    $('claimNumberNotice').classList.toggle('hidden', Boolean($('insurerClaim').value.trim()));
  }

  function getEvents() {
    try {
      const value = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function storeEvents(events) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }

  function refreshEventSelect() {
    const select = $('savedEventSelect');
    const previous = currentEventId || select.value;
    select.innerHTML = '<option value="">Selecione um evento salvo</option>' + getEvents()
      .sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .map((event) => `<option value="${escapeHTML(event.id)}">${escapeHTML(event.eventName || 'Evento sem nome')}</option>`).join('');
    select.value = previous;
  }

  function collectEventData() {
    const event = {};
    EVENT_FIELDS.forEach((id) => { event[id] = getField(id); });
    return event;
  }

  function saveEventTemplate() {
    const event = collectEventData();
    if (!String(event.eventName || '').trim()) {
      alert('Informe um nome para o evento antes de salvá-lo.');
      $('eventName').focus();
      return;
    }
    const events = getEvents();
    const id = currentEventId || `evt_${Date.now()}`;
    const item = {...event, id, updatedAt:new Date().toISOString()};
    const index = events.findIndex((entry) => entry.id === id);
    if (index >= 0) events[index] = item; else events.push(item);
    storeEvents(events);
    currentEventId = id;
    refreshEventSelect();
    $('savedEventSelect').value = id;
    status('Evento-base salvo neste navegador.');
  }

  function loadEventTemplate() {
    const id = $('savedEventSelect').value;
    const event = getEvents().find((entry) => entry.id === id);
    if (!event) {
      alert('Selecione um evento salvo.');
      return;
    }
    EVENT_FIELDS.forEach((field) => setField(field, event[field]));
    currentEventId = id;
    if (!$('lossDate').value) $('lossDate').value = event.eventDate || '';
    if (!$('coverageName').value) $('coverageName').value = event.eventCoverage || '';
    updateCaseIdentity();
    saveDraft();
    status('Evento-base carregado.');
  }

  function newEventTemplate() {
    EVENT_FIELDS.forEach((field) => setField(field, ''));
    currentEventId = '';
    $('savedEventSelect').value = '';
    status('Campos do evento limpos.');
  }

  function deleteEventTemplate() {
    const id = $('savedEventSelect').value;
    if (!id) {
      alert('Selecione um evento salvo para excluir.');
      return;
    }
    const selected = getEvents().find((entry) => entry.id === id);
    if (!confirm(`Excluir o evento-base “${selected?.eventName || 'selecionado'}”?`)) return;
    storeEvents(getEvents().filter((entry) => entry.id !== id));
    if (currentEventId === id) currentEventId = '';
    refreshEventSelect();
    status('Evento-base excluído.');
  }

  function installationHTML(item = {}) {
    sequence += 1;
    const id = sequence;
    const option = (value, label, current) => `<option value="${value}"${current === value ? ' selected' : ''}>${label}</option>`;
    return `
      <div class="dynamic-card installation-card" data-row-id="${id}">
        <div class="dynamic-head"><strong>Instalação</strong><div class="small-actions"><button class="small-btn" type="button" data-action="copy-installation">Copiar recebidos</button><button class="small-btn danger" type="button" data-action="remove-row">Remover</button></div></div>
        <div class="source-grid">
          <div class="source-panel received"><h4>Dados recebidos</h4>
            <div class="grid2"><div><label class="field">Nº / Identificação</label><input class="inst-base-number" value="${escapeHTML(item.baseNumber || '')}"></div><div><label class="field">Ano</label><input class="inst-base-year" value="${escapeHTML(item.baseYear || '')}"></div></div>
            <label class="field">Dimensões / metragem</label><input class="inst-base-dimensions" value="${escapeHTML(item.baseDimensions || '')}">
            <label class="field">Capacidade / uso</label><input class="inst-base-capacity" value="${escapeHTML(item.baseCapacity || '')}">
            <label class="field">Conservação</label><input class="inst-base-condition" value="${escapeHTML(item.baseCondition || '')}">
          </div>
          <div class="source-panel"><h4>Confirmado pelo regulador</h4>
            <div class="grid2"><div><label class="field">Nº / Identificação</label><input class="inst-confirmed-number" value="${escapeHTML(item.confirmedNumber || '')}"></div><div><label class="field">Ano</label><input class="inst-confirmed-year" value="${escapeHTML(item.confirmedYear || '')}"></div></div>
            <label class="field">Dimensões / metragem</label><input class="inst-confirmed-dimensions" value="${escapeHTML(item.confirmedDimensions || '')}">
            <label class="field">Capacidade / uso</label><input class="inst-confirmed-capacity" value="${escapeHTML(item.confirmedCapacity || '')}">
            <label class="field">Conservação</label><input class="inst-confirmed-condition" value="${escapeHTML(item.confirmedCondition || '')}">
          </div>
        </div>
        <div class="grid2">
          <div><label class="field">Situação da conferência</label><select class="inst-status">
            ${option('nao_confirmado','Não confirmado',item.status || 'nao_confirmado')}
            ${option('confirmada','Confirmada sem alteração',item.status)}
            ${option('ajustada','Ajustada após vistoria',item.status)}
            ${option('nao_aplicavel','Não aplicável',item.status)}
          </select></div>
          <div><label class="field">Equipamentos / estruturas compartilhados?</label><select class="inst-shared">
            ${option('nao','Não',item.shared || 'nao')}${option('sim','Sim',item.shared)}${option('incerto','Não foi possível confirmar',item.shared)}
          </select></div>
        </div>
        <label class="field">Observação da conferência</label><textarea class="inst-notes">${escapeHTML(item.notes || '')}</textarea>
      </div>`;
  }

  function addInstallation(item = {}, persist = true) {
    $('installationList').insertAdjacentHTML('beforeend', installationHTML(item));
    renumberCards('#installationList .installation-card', 'Instalação');
    renderRiskAlerts();
    if (persist) saveDraft();
  }

  function damageHTML(item = {}) {
    sequence += 1;
    return `
      <div class="dynamic-card damage-card" data-row-id="${sequence}">
        <div class="dynamic-head"><strong>Item de dano</strong><button class="small-btn danger" type="button" data-action="remove-row">Remover</button></div>
        <label class="field">Descrição</label><input class="damage-desc" value="${escapeHTML(item.desc || '')}">
        <div class="grid3"><div><label class="field">Quantidade</label><input class="damage-qty" value="${escapeHTML(item.qty || '')}"></div><div><label class="field">Unidade</label><input class="damage-unit" value="${escapeHTML(item.unit || '')}"></div><div><label class="field">Idade / uso</label><input class="damage-age" value="${escapeHTML(item.age || '')}"></div></div>
      </div>`;
  }

  function addDamage(item = {}, persist = true) {
    $('damageList').insertAdjacentHTML('beforeend', damageHTML(item));
    renumberCards('#damageList .damage-card', 'Item');
    if (persist) saveDraft();
  }

  function assessmentHTML(item = {}) {
    sequence += 1;
    const owner = item.owner || 'cooperado';
    return `
      <div class="dynamic-card assessment-card" data-row-id="${sequence}">
        <div class="dynamic-head"><strong>Item de apuração</strong><button class="small-btn danger" type="button" data-action="remove-row">Remover</button></div>
        <label class="field">Descrição do bem, material ou serviço</label><input class="apu-desc" value="${escapeHTML(item.desc || '')}">
        <div class="grid2"><div><label class="field">Proprietário / beneficiário</label><select class="apu-owner"><option value="cooperado"${owner === 'cooperado' ? ' selected' : ''}>Cooperado</option><option value="cooperativa"${owner === 'cooperativa' ? ' selected' : ''}>Cooperativa</option></select></div><div><label class="field">Unidade</label><input class="apu-unit" value="${escapeHTML(item.unit || 'un.')}"></div></div>
        <div class="source-grid">
          <div class="source-panel received"><h4>Reclamado</h4><div class="grid2"><div><label class="field">Quantidade</label><input class="apu-claimed-qty" type="number" min="0" step="0.01" value="${escapeHTML(item.claimedQty ?? '')}"></div><div><label class="field">Valor unitário (R$)</label><input class="apu-claimed-unit" type="number" min="0" step="0.01" value="${escapeHTML(item.claimedUnit ?? '')}"></div></div></div>
          <div class="source-panel"><h4>Acatado</h4><div class="grid2"><div><label class="field">Quantidade</label><input class="apu-accepted-qty" type="number" min="0" step="0.01" value="${escapeHTML(item.acceptedQty ?? '')}"></div><div><label class="field">Valor unitário (R$)</label><input class="apu-accepted-unit" type="number" min="0" step="0.01" value="${escapeHTML(item.acceptedUnit ?? '')}"></div></div></div>
        </div>
        <div class="grid3"><div><label class="field">Desconto (%)</label><input class="apu-discount-pct" type="number" min="0" max="100" step="0.01" value="${escapeHTML(item.discountPct ?? 0)}"></div><div><label class="field">Glosa fixa (R$)</label><input class="apu-fixed-glosa" type="number" min="0" step="0.01" value="${escapeHTML(item.fixedGlosa ?? 0)}"></div><div><label class="field">Depreciação (%)</label><input class="apu-dep-pct" type="number" min="0" max="100" step="0.01" value="${escapeHTML(item.depPct ?? 0)}"></div></div>
        <label class="field">Salvados dedutíveis (R$)</label><input class="apu-salvage" type="number" min="0" step="0.01" value="${escapeHTML(item.salvage ?? 0)}">
        <label class="checkline"><input class="apu-dvn" type="checkbox"${item.dvnEligible ? ' checked' : ''}> A depreciação poderá ser recuperada como DVN após comprovação de reposição</label>
        <label class="field">Justificativa de ajuste / glosa</label><textarea class="apu-notes">${escapeHTML(item.notes || '')}</textarea>
        <div class="item-calculation">
          <div>Reclamado<strong data-calc="claimed">R$ 0,00</strong></div>
          <div>Acatado bruto<strong data-calc="accepted">R$ 0,00</strong></div>
          <div>Ajustes<strong data-calc="adjustments">R$ 0,00</strong></div>
          <div>Prejuízo apurado<strong data-calc="current">R$ 0,00</strong></div>
        </div>
      </div>`;
  }

  function addAssessmentItem(item = {}, persist = true) {
    $('assessmentList').insertAdjacentHTML('beforeend', assessmentHTML(item));
    renumberCards('#assessmentList .assessment-card', 'Item');
    updateFinancialSummary();
    if (persist) saveDraft();
  }

  function renumberCards(selector, prefix) {
    qsa(selector).forEach((card, index) => {
      const strong = card.querySelector('.dynamic-head strong');
      if (strong) strong.textContent = `${prefix} ${index + 1}`;
    });
  }

  function readInstallation(card) {
    return {
      baseNumber:card.querySelector('.inst-base-number').value,
      baseYear:card.querySelector('.inst-base-year').value,
      baseDimensions:card.querySelector('.inst-base-dimensions').value,
      baseCapacity:card.querySelector('.inst-base-capacity').value,
      baseCondition:card.querySelector('.inst-base-condition').value,
      confirmedNumber:card.querySelector('.inst-confirmed-number').value,
      confirmedYear:card.querySelector('.inst-confirmed-year').value,
      confirmedDimensions:card.querySelector('.inst-confirmed-dimensions').value,
      confirmedCapacity:card.querySelector('.inst-confirmed-capacity').value,
      confirmedCondition:card.querySelector('.inst-confirmed-condition').value,
      status:card.querySelector('.inst-status').value,
      shared:card.querySelector('.inst-shared').value,
      notes:card.querySelector('.inst-notes').value
    };
  }

  function readDamage(card) {
    return {
      desc:card.querySelector('.damage-desc').value,
      qty:card.querySelector('.damage-qty').value,
      unit:card.querySelector('.damage-unit').value,
      age:card.querySelector('.damage-age').value
    };
  }

  function readAssessment(card) {
    return {
      desc:card.querySelector('.apu-desc').value,
      owner:card.querySelector('.apu-owner').value,
      unit:card.querySelector('.apu-unit').value,
      claimedQty:card.querySelector('.apu-claimed-qty').value,
      claimedUnit:card.querySelector('.apu-claimed-unit').value,
      acceptedQty:card.querySelector('.apu-accepted-qty').value,
      acceptedUnit:card.querySelector('.apu-accepted-unit').value,
      discountPct:card.querySelector('.apu-discount-pct').value,
      fixedGlosa:card.querySelector('.apu-fixed-glosa').value,
      depPct:card.querySelector('.apu-dep-pct').value,
      salvage:card.querySelector('.apu-salvage').value,
      dvnEligible:card.querySelector('.apu-dvn').checked,
      notes:card.querySelector('.apu-notes').value
    };
  }

  function collectData({includePhotoData = false} = {}) {
    const fields = {};
    SIMPLE_FIELDS.forEach((id) => { fields[id] = getField(id); });
    fields.includeBankInReport = $('includeBankInReport').checked;
    return {
      version:VERSION,
      savedAt:new Date().toISOString(),
      currentEventId,
      fields,
      installations:qsa('#installationList .installation-card').map(readInstallation),
      damages:qsa('#damageList .damage-card').map(readDamage),
      assessment:qsa('#assessmentList .assessment-card').map(readAssessment),
      photos:photos.map((photo) => ({
        id:photo.id,name:photo.name,caption:photo.caption,
        dataUrl:includePhotoData ? photo.dataUrl : undefined
      }))
    };
  }

  function clearDynamicLists() {
    $('installationList').replaceChildren();
    $('damageList').replaceChildren();
    $('assessmentList').replaceChildren();
  }

  function applyData(data = {}) {
    const fields = data.fields || data;
    SIMPLE_FIELDS.forEach((id) => setField(id, fields[id] ?? ''));
    $('includeBankInReport').checked = Boolean(fields.includeBankInReport);
    currentEventId = data.currentEventId || '';
    clearDynamicLists();
    (data.installations || []).forEach((item) => addInstallation(item, false));
    (data.damages || []).forEach((item) => addDamage(item, false));
    (data.assessment || []).forEach((item) => addAssessmentItem(item, false));
    if (!qsa('#installationList .installation-card').length) addInstallation({}, false);
    if (!qsa('#damageList .damage-card').length) addDamage({}, false);
    if (!qsa('#assessmentList .assessment-card').length) addAssessmentItem({}, false);
    photos = (data.photos || []).filter((photo) => photo.dataUrl).map((photo) => ({...photo, id:photo.id || `photo_${Date.now()}_${Math.random()}`}));
    renderPhotos();
    refreshEventSelect();
    if (currentEventId) $('savedEventSelect').value = currentEventId;
    updateCaseIdentity();
    renderRiskAlerts();
    updateFinancialSummary();
  }

  function status(message) {
    $('saveStatus').textContent = message;
    clearTimeout(status.timer);
    status.timer = setTimeout(() => { $('saveStatus').textContent = ''; }, 4500);
  }

  function saveDraft(manual = false) {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectData({includePhotoData:false})));
      if (manual) status('Rascunho salvo neste dispositivo.');
      return true;
    } catch (error) {
      $('saveStatus').textContent = 'Não foi possível salvar o rascunho neste navegador.';
      return false;
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return false;
      applyData(data);
      if ((data.photos || []).length && !photos.length) {
        $('globalNotice').insertAdjacentHTML('afterend', '<div class="notice notice-warn no-print">O rascunho possuía referências de fotografias, mas as imagens precisam ser selecionadas novamente nesta sessão.</div>');
      }
      return true;
    } catch {
      return false;
    }
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  }

  function riskWarnings() {
    const warnings = [];
    qsa('#installationList .installation-card').forEach((card, index) => {
      const item = readInstallation(card);
      const label = `Instalação ${index + 1}`;
      if (item.status === 'nao_confirmado') warnings.push(`${label}: informações ainda não confirmadas.`);
      if (item.status === 'ajustada') warnings.push(`${label}: dados ajustados após a vistoria${item.notes ? ` — ${item.notes}` : ''}.`);
      if (item.shared === 'sim') warnings.push(`${label}: há estruturas ou equipamentos compartilhados; confira a metragem e a capacidade consolidadas.`);
      if (item.shared === 'incerto') warnings.push(`${label}: não foi possível confirmar se existem estruturas ou equipamentos compartilhados.`);
      const comparisons = [
        ['número',item.baseNumber,item.confirmedNumber],['ano',item.baseYear,item.confirmedYear],
        ['dimensões',item.baseDimensions,item.confirmedDimensions],['capacidade',item.baseCapacity,item.confirmedCapacity],
        ['conservação',item.baseCondition,item.confirmedCondition]
      ];
      comparisons.forEach(([field, base, confirmed]) => {
        if (base && confirmed && normalize(base) !== normalize(confirmed) && item.status === 'confirmada') {
          warnings.push(`${label}: ${field} diverge entre a base recebida e a confirmação, mas foi marcada como “confirmada sem alteração”.`);
        }
      });
    });
    return warnings;
  }

  function renderRiskAlerts() {
    const warnings = riskWarnings();
    const box = $('riskAlerts');
    if (!warnings.length) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    box.classList.remove('hidden');
    box.innerHTML = `<strong>Conferências necessárias:</strong><ul>${warnings.map((warning) => `<li>${escapeHTML(warning)}</li>`).join('')}</ul>`;
  }

  function calculateItem(item) {
    const claimed = numberValue(item.claimedQty) * numberValue(item.claimedUnit);
    const accepted = numberValue(item.acceptedQty) * numberValue(item.acceptedUnit);
    const discount = accepted * Math.min(Math.max(numberValue(item.discountPct), 0), 100) / 100;
    const fixedGlosa = Math.max(numberValue(item.fixedGlosa), 0);
    const afterAdjustments = Math.max(accepted - discount - fixedGlosa, 0);
    const depreciation = afterAdjustments * Math.min(Math.max(numberValue(item.depPct), 0), 100) / 100;
    const salvage = Math.min(Math.max(numberValue(item.salvage), 0), Math.max(afterAdjustments - depreciation, 0));
    const current = Math.max(afterAdjustments - depreciation - salvage, 0);
    const dvn = item.dvnEligible ? depreciation : 0;
    return {claimed,accepted,discount,fixedGlosa,afterAdjustments,depreciation,salvage,current,dvn};
  }

  function applicableLimitValue(fields = null) {
    const data = fields || Object.fromEntries(['eventLimit','unitLimit','aggregateLimit','customLimit','applicableLimitType'].map((id) => [id,getField(id)]));
    const map = {
      event:numberValue(data.eventLimit),unit:numberValue(data.unitLimit),
      aggregate:numberValue(data.aggregateLimit),custom:numberValue(data.customLimit),none:0
    };
    return map[data.applicableLimitType] || 0;
  }

  function calculateFinancial(data = null) {
    const source = data || collectData();
    const itemResults = (source.assessment || []).map((item) => ({item,...calculateItem(item)}));
    const totals = itemResults.reduce((sum, result) => {
      Object.keys(result).forEach((key) => {
        if (key !== 'item' && typeof result[key] === 'number') sum[key] = (sum[key] || 0) + result[key];
      });
      return sum;
    }, {claimed:0,accepted:0,discount:0,fixedGlosa:0,afterAdjustments:0,depreciation:0,salvage:0,current:0,dvn:0});
    const fields = source.fields || {};
    const deductiblePercent = Math.max(numberValue(fields.deductiblePct), 0);
    const deductibleMinimum = Math.max(numberValue(fields.deductibleMin), 0);
    const deductibleCalculated = totals.current * deductiblePercent / 100;
    const deductible = totals.current > 0 ? Math.min(totals.current, Math.max(deductibleCalculated, deductibleMinimum)) : 0;
    const afterDeductible = Math.max(totals.current - deductible, 0);
    const limit = applicableLimitValue(fields);
    const beforeDecision = limit > 0 ? Math.min(afterDeductible, limit) : afterDeductible;
    const limitReduction = Math.max(afterDeductible - beforeDecision, 0);
    const decision = fields.coverageDecision || 'amparado';
    const indemnity = decision === 'sem_amparo' ? 0 : beforeDecision;
    return {...totals,deductible,afterDeductible,limit,limitReduction,indemnity,itemResults,decision};
  }

  function updateAssessmentCards() {
    qsa('#assessmentList .assessment-card').forEach((card) => {
      const result = calculateItem(readAssessment(card));
      const mapping = {claimed:result.claimed,accepted:result.accepted,adjustments:result.discount + result.fixedGlosa + result.depreciation + result.salvage,current:result.current};
      Object.entries(mapping).forEach(([key,value]) => {
        const target = card.querySelector(`[data-calc="${key}"]`);
        if (target) target.textContent = money(value);
      });
    });
  }

  function updateFinancialSummary() {
    updateAssessmentCards();
    const result = calculateFinancial();
    const metrics = [
      ['Total reclamado',result.claimed,''],['Acatado bruto (VRN)',result.accepted,''],
      ['Descontos / glosas',result.discount + result.fixedGlosa,'warn'],['Depreciação',result.depreciation,''],
      ['Salvados',result.salvage,''],['Prejuízo apurado (VA)',result.current,'primary'],
      ['Franquia',result.deductible,'warn'],['Redução por limite',result.limitReduction,'warn'],
      ['Indenização indicada',result.indemnity,'ok'],['DVN retido',result.dvn,'']
    ];
    $('financialSummary').innerHTML = metrics.map(([label,value,kind]) => `<div class="metric ${kind}"><span>${escapeHTML(label)}</span><strong>${money(value)}</strong></div>`).join('');
    const warning = $('limitWarning');
    const messages = [];
    if (getField('applicableLimitType') === 'none' && ['eventLimit','unitLimit','aggregateLimit','customLimit'].some((id) => numberValue(getField(id)) > 0)) {
      messages.push('Há limites transcritos, mas nenhum foi selecionado para limitar automaticamente a apuração.');
    }
    if (result.limitReduction > 0) messages.push(`A indenização foi reduzida em ${money(result.limitReduction)} pelo limite selecionado.`);
    if (result.decision === 'sem_amparo') messages.push('O parecer está marcado como sem amparo técnico; por isso, a indenização indicada foi zerada, embora a apuração permaneça registrada.');
    if (result.decision === 'pendente') messages.push('O parecer ainda está pendente de definição. O valor exibido é apenas indicativo.');
    if (messages.length) {
      warning.classList.remove('hidden');
      warning.innerHTML = messages.map((message) => `<div>${escapeHTML(message)}</div>`).join('');
    } else {
      warning.classList.add('hidden');
      warning.innerHTML = '';
    }
  }

  function copyInstallation(card) {
    const pairs = [
      ['.inst-base-number','.inst-confirmed-number'],['.inst-base-year','.inst-confirmed-year'],
      ['.inst-base-dimensions','.inst-confirmed-dimensions'],['.inst-base-capacity','.inst-confirmed-capacity'],
      ['.inst-base-condition','.inst-confirmed-condition']
    ];
    pairs.forEach(([from,to]) => { card.querySelector(to).value = card.querySelector(from).value; });
    card.querySelector('.inst-status').value = 'confirmada';
    renderRiskAlerts();
    saveDraft();
  }

  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const max = 1600;
          const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', .78);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
      image.src = url;
    });
  }

  async function addPhotos(files) {
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file);
        photos.push({id:`photo_${Date.now()}_${Math.random().toString(16).slice(2)}`,name:file.name,caption:'',dataUrl});
      } catch {
        alert(`Não foi possível carregar a imagem “${file.name}”.`);
      }
    }
    renderPhotos();
    $('photoInput').value = '';
  }

  function renderPhotos() {
    const gallery = $('photoGallery');
    if (!photos.length) {
      gallery.innerHTML = '<p class="helper">Nenhuma fotografia selecionada.</p>';
      return;
    }
    gallery.innerHTML = photos.map((photo,index) => `
      <div class="photo-card" data-photo-id="${escapeHTML(photo.id)}">
        <img src="${photo.dataUrl}" alt="Fotografia ${index + 1}">
        <div class="photo-card-body"><div class="photo-meta"><span>Figura ${index + 1} — ${escapeHTML(photo.name)}</span><button class="small-btn danger" type="button" data-action="remove-photo">Remover</button></div>
        <label class="field">Legenda</label><textarea class="photo-caption">${escapeHTML(photo.caption || '')}</textarea></div>
      </div>`).join('');
  }

  function syncPhotoCaptions() {
    qsa('#photoGallery .photo-card').forEach((card) => {
      const photo = photos.find((item) => item.id === card.dataset.photoId);
      if (photo) photo.caption = card.querySelector('.photo-caption').value;
    });
  }

  function copyEventNarrative() {
    const base = $('eventBaseNarrative').value.trim();
    if (!base) {
      alert('O evento não possui uma descrição-base preenchida.');
      return;
    }
    if ($('occurrenceNarrative').value.trim() && !confirm('Substituir o relato individual pelo texto-base do evento?')) return;
    $('occurrenceNarrative').value = base;
    saveDraft();
  }

  function importV75() {
    let data;
    try { data = JSON.parse(localStorage.getItem('ataV7_5') || 'null'); } catch { data = null; }
    if (!data) {
      alert('Nenhum rascunho da Ata V7.5 foi encontrado neste navegador.');
      return;
    }
    const map = {
      insurer:'seguradora',insuredCooperative:'cooperativaIntegradora',policyNumber:'apolice',broker:'corretor',
      claimantName:'segurado',claimantDocument:'cpfCnpj',lossDate:'dataSinistro',lossTime:'horaSinistro',
      riskAddress:'endereco',coordinates:'coords',reporterName:'relator',occurrenceNarrative:'relato',
      inspectionFindings:'constatacoes',documentsPresented:'documentos',noticeDate:'c2',appointmentDate:'c3',
      contactDate:'c4',inspectionDate:'c5',emissionCity:'cidadeEmissao',regulatorName:'regulador',
      regulatorDocument:'cpfReg',beneficiaryName:'representante',beneficiaryDocument:'cpfRep'
    };
    Object.entries(map).forEach(([target,source]) => { if (data[source] !== undefined && data[source] !== '') setField(target,data[source]); });
    if (data.dataSinistro && !$('eventDate').value) setField('eventDate',data.dataSinistro);
    if (data.outroSeguro) setField('otherInsurance',data.outroSeguro);
    if (data.sinistro) {
      if (/^s\d+/i.test(String(data.sinistro).trim())) setField('hsClaim',data.sinistro);
      else setField('insurerClaim',data.sinistro);
    }
    $('installationList').replaceChildren();
    (data.inst || []).forEach((item) => addInstallation({
      baseNumber:item.num,baseYear:item.year,baseDimensions:item.dim,baseCapacity:item.cap,baseCondition:item.state,
      confirmedNumber:item.num,confirmedYear:item.year,confirmedDimensions:item.dim,confirmedCapacity:item.cap,confirmedCondition:item.state,
      status:'confirmada',shared:'nao',notes:'Importado da Ata V7.5; confirmar na vistoria.'
    },false));
    $('damageList').replaceChildren();
    (data.damage || []).forEach((item) => addDamage(item,false));
    if (!qsa('#installationList .installation-card').length) addInstallation({},false);
    if (!qsa('#damageList .damage-card').length) addDamage({},false);
    updateCaseIdentity();
    renderRiskAlerts();
    saveDraft();
    status('Dados disponíveis da Ata V7.5 importados. Confira os números do processo e os dados do risco.');
  }

  function loadExample() {
    const today = new Date().toISOString().slice(0,10);
    const example = {
      fields:{
        eventName:'Granizo de 28/09/2026 — Norte do RS',eventDate:'2026-09-28',eventType:'Granizo',eventRegion:'Ciriaco e região — RS',
        insurer:'SOMPO SEGUROS S/A',insuredCooperative:'COOPERATIVA CENTRAL AURORA ALIMENTOS',policyNumber:'9600131927',
        broker:'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',eventCoverage:'Vendaval — Modalidade B',insurerAnalyst:'Analista Exemplo',
        fastTrackInstructionDate:'2026-09-29',eventBaseNarrative:'Em 28 de setembro de 2026, chuva intensa acompanhada de granizo atingiu propriedades rurais da região, causando danos às coberturas e a componentes das instalações.',
        eventEvidence:'Evento de abrangência regional, confirmado por registros meteorológicos e reportagem anexada ao processo.',
        insurerClaim:'1325000',hsClaim:'S2609000',claimantName:'Cooperado Exemplo',claimantDocument:'000.000.000-00',lossDate:'2026-09-28',lossTime:'17:30',
        riskAddress:'Linha Exemplo, Município/RS',coordinates:'00°00\'00.0"S 00°00\'00.0"W',contactName:'Cooperado Exemplo',contactPhone:'',inspectionType:'presencial',
        riskActivity:'Criação de frangos de corte',riskDataSource:'Planilha geral da cooperativa e confirmação em vistoria',reporterName:'Cooperado Exemplo',
        occurrenceNarrative:'Segundo o cooperado, a precipitação de granizo ocorreu no fim da tarde e atingiu diretamente as instalações da propriedade.',
        inspectionFindings:'Em vistoria, foram evidenciados danos compatíveis com impacto de granizo na cobertura, no cortinado e em acessórios da instalação. Os remanescentes foram apresentados para análise.',
        documentsPresented:'Orçamentos dos reparos, documentos cadastrais e comprovação do evento.',coverageName:'Vendaval — Modalidade B',eventLimit:'15000000',unitLimit:'3000000',aggregateLimit:'35000000',customLimit:'',applicableLimitType:'unit',
        deductiblePct:'15',deductibleMin:'0',causeAnalysis:'O conjunto probatório e os vestígios evidenciados são compatíveis com ação direta de granizo sobre as instalações vistoriadas, estabelecendo nexo causal entre o evento e os danos relacionados.',
        contractAnalysis:'A apólice contempla a cobertura reclamada, incluindo danos decorrentes de granizo, observados os limites e a participação obrigatória previstos no contrato.',coverageDecision:'amparado',
        regulatorOpinion:'Com base nas constatações, nos documentos apresentados e na apuração realizada em vistoria, concluímos pelo amparo técnico do sinistro e indicamos o pagamento do valor líquido apurado.',
        salvageStatus:'nao',recoveryStatus:'nao',salvageNotes:'Não foram identificados salvados com valor comercial.',recoveryAgainst:'',recoveryProtocol:'',recoveryNotes:'Não foi identificada possibilidade de ressarcimento neste momento.',
        otherInsurance:'nao',otherInsurer:'',otherPolicy:'',beneficiaryName:'Cooperado Exemplo',beneficiaryDocument:'000.000.000-00',bankName:'Banco Exemplo',bankAgency:'0001',bankAccount:'12345-6',includeBankInReport:false,
        noticeDate:'2026-09-29',appointmentDate:'2026-09-29',contactDate:'2026-09-30',inspectionDate:'2026-10-02',closingDate:'2026-10-02',reportDate:today,emissionCity:'Blumenau (SC)',regulatorName:'Regulador Exemplo',regulatorDocument:'000.000.000-00',
        finalNotes:'Processo concluído pelo fluxo Fast Track de contingência, com apuração realizada durante a vistoria.'
      },
      installations:[
        {baseNumber:'Estrutura consolidada',baseYear:'2018',baseDimensions:'2.400 m²',baseCapacity:'33.000 aves',baseCondition:'Bom',confirmedNumber:'Aviários 1 e 2',confirmedYear:'2018',confirmedDimensions:'2 x 100,00 x 12,00 m',confirmedCapacity:'33.000 aves',confirmedCondition:'Bom',status:'ajustada',shared:'sim',notes:'A base consolidava as duas instalações; dimensões individualizadas em vistoria.'}
      ],
      damages:[
        {desc:'Telhas e componentes de cobertura',qty:'1',unit:'conjunto',age:'Uso regular'},
        {desc:'Cortinado lateral',qty:'1',unit:'conjunto',age:'Uso regular'},
        {desc:'Tampa e acessórios de reservatório',qty:'1',unit:'conjunto',age:'Uso regular'}
      ],
      assessment:[
        {desc:'Materiais, cortinado e mão de obra',owner:'cooperado',unit:'serviço',claimedQty:'1',claimedUnit:'45180',acceptedQty:'1',acceptedUnit:'45180',discountPct:'3',fixedGlosa:'0',depPct:'0',salvage:'0',dvnEligible:false,notes:'Desconto comercial de 3% negociado com o fornecedor.'},
        {desc:'Tampa, boia, frete e mão de obra',owner:'cooperado',unit:'serviço',claimedQty:'1',claimedUnit:'1896',acceptedQty:'1',acceptedUnit:'1896',discountPct:'0',fixedGlosa:'0',depPct:'0',salvage:'0',dvnEligible:false,notes:'Valores acatados integralmente.'}
      ],photos:[]
    };
    applyData(example);
    setField('includeBankInReport',false);
    currentEventId = '';
    saveDraft();
    status('Exemplo carregado. A apuração resulta em R$ 38.862,51 líquidos.');
  }

  function go(step) {
    const target = document.querySelector(`.screen[data-step="${step}"]`);
    if (!target) return;
    syncPhotoCaptions();
    if (step === 3) renderRiskAlerts();
    if (step === 6) updateFinancialSummary();
    if (step === 8) renderReviewAndReport();
    qsa('.screen').forEach((screen) => screen.classList.toggle('active', screen === target));
    currentStep = step;
    qsa('#progress span').forEach((bar,index) => bar.classList.toggle('on', index < step));
    saveDraft();
    window.scrollTo(0,0);
    const heading = target.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
  }

  function reviewWarnings(data, calculation) {
    const fields = data.fields;
    const warnings = [];
    const required = [
      ['eventName','nome do evento'],['insurer','companhia seguradora'],['insuredCooperative','segurado/cooperativa'],
      ['policyNumber','apólice'],['claimantName','cooperado/beneficiário'],['riskAddress','local do risco'],
      ['coverageName','cobertura reclamada'],['causeAnalysis','análise de causa'],['contractAnalysis','análise contratual'],
      ['regulatorOpinion','parecer do regulador']
    ];
    required.forEach(([id,label]) => { if (!String(fields[id] || '').trim()) warnings.push(`Preencher ${label}.`); });
    if (!fields.insurerClaim && !fields.hsClaim && !fields.claimantName) warnings.push('O processo não possui identificador disponível.');
    if (!data.assessment.length || !data.assessment.some((item) => String(item.desc || '').trim())) warnings.push('Nenhum item de prejuízo foi informado.');
    riskWarnings().forEach((warning) => warnings.push(warning));
    if (fields.coverageDecision === 'pendente') warnings.push('O parecer está pendente de definição, embora o Fast Track seja um fluxo conclusivo.');
    if (calculation.current > 0 && calculation.indemnity === 0 && fields.coverageDecision !== 'sem_amparo') warnings.push('Há prejuízo apurado, mas a indenização indicada está zerada. Confira a franquia e o limite selecionado.');
    return warnings;
  }

  function renderReviewSummary(data, calculation) {
    const fields = data.fields;
    const confirmedInstallations = data.installations.filter((item) => item.status !== 'nao_aplicavel').length;
    const blocks = [
      ['Identificação',[
        ['Processo',resolveCaseId()],['Seguradora',fields.insurer],['Segurado',fields.insuredCooperative],['Cooperado',fields.claimantName],['Apólice',fields.policyNumber]
      ]],
      ['Evento e risco',[
        ['Evento',fields.eventName],['Data',formatDate(fields.lossDate || fields.eventDate)],['Local',fields.riskAddress],['Instalações',String(confirmedInstallations)],['Vistoria',fields.inspectionType]
      ]],
      ['Cobertura',[
        ['Cobertura',fields.coverageName],['Decisão',decisionLabel(fields.coverageDecision)],['Franquia',`${fields.deductiblePct || 0}%${numberValue(fields.deductibleMin) ? `, mín. ${money(fields.deductibleMin)}` : ''}`],['Limite aplicado',calculation.limit ? money(calculation.limit) : 'Sem limitação automática']
      ]],
      ['Resultado financeiro',[
        ['Reclamado',money(calculation.claimed)],['Apurado (VA)',money(calculation.current)],['Franquia',money(calculation.deductible)],['Indenização indicada',money(calculation.indemnity)],['DVN retido',money(calculation.dvn)]
      ]]
    ];
    $('reviewSummary').innerHTML = blocks.map(([title,lines]) => `<div class="review-block"><h4>${escapeHTML(title)}</h4><dl>${lines.map(([key,value]) => `<dt>${escapeHTML(key)}</dt><dd>${escapeHTML(value || 'A INFORMAR')}</dd>`).join('')}</dl></div>`).join('');
  }

  function decisionLabel(value) {
    return ({amparado:'Amparado',parcial:'Parcialmente amparado',sem_amparo:'Sem amparo técnico',pendente:'Pendente de definição'})[value] || 'A informar';
  }

  function reportBrand() {
    return '<div class="report-brand"><div class="brand-mark"><span class="brand-ring a"></span><span class="brand-ring b"></span><span class="brand-hs">HS</span></div><div class="brand-text">beyond<br>solutions</div></div>';
  }

  function reportWatermark() { return '<div class="report-watermark"></div>'; }

  function reportFooter(index,total) {
    return `<div class="report-footer"><div class="footer-mark"></div><div class="footer-text">Matriz - Rua XV de novembro 1336, salas 34 e 35 – Blumenau – SC – CEP 89010-903<br>www.horizonservitas.com +55 47 3326-1844</div><div class="footer-page">${index} de ${total}</div></div>`;
  }

  function reportPage(content,index,total) {
    return `<section class="report-page">${reportBrand()}${reportWatermark()}<div class="report-content">${content}</div>${reportFooter(index,total)}</section>`;
  }

  function reportMetaRow(label,value) {
    return `<tr><th>${escapeHTML(label)}:</th><td>${escapeHTML(value || 'A INFORMAR')}</td></tr>`;
  }

  function confirmedRiskTable(installations) {
    const rows = installations.filter((item) => item.status !== 'nao_aplicavel').map((item,index) => `
      <tr><td>${escapeHTML(item.confirmedNumber || item.baseNumber || String(index + 1))}</td><td>${escapeHTML(item.confirmedYear || item.baseYear || 'A INFORMAR')}</td><td>${escapeHTML(item.confirmedDimensions || item.baseDimensions || 'A INFORMAR')}</td><td>${escapeHTML(item.confirmedCapacity || item.baseCapacity || 'A INFORMAR')}</td><td>${escapeHTML(item.confirmedCondition || item.baseCondition || 'A INFORMAR')}</td></tr>`).join('');
    return `<table class="doc-table"><thead><tr><th>Número</th><th>Ano</th><th>Dimensões</th><th>Capacidade</th><th>Conservação</th></tr></thead><tbody>${rows || '<tr><td colspan="5">A INFORMAR</td></tr>'}</tbody></table>`;
  }

  function coverageTable(fields) {
    const franchise = `${numberValue(fields.deductiblePct).toLocaleString('pt-BR')}%${numberValue(fields.deductibleMin) ? ` com mínimo de ${money(fields.deductibleMin)}` : ''}`;
    return `<table class="doc-table"><thead><tr><th class="left">Cobertura</th><th>LMI por evento</th><th>Sublimite por unidade</th><th>Agregado</th><th>Franquia</th></tr></thead><tbody><tr><td class="left">${escapeHTML(fields.coverageName || 'A INFORMAR')}</td><td>${numberValue(fields.eventLimit) ? money(fields.eventLimit) : 'A INFORMAR'}</td><td>${numberValue(fields.unitLimit) ? money(fields.unitLimit) : 'A INFORMAR'}</td><td>${numberValue(fields.aggregateLimit) ? money(fields.aggregateLimit) : 'A INFORMAR'}</td><td>${escapeHTML(franchise)}</td></tr></tbody></table>`;
  }

  function damageListHTML(damages) {
    const items = damages.filter((item) => String(item.desc || '').trim()).map((item) => `<li>${escapeHTML(`${item.qty || ''} ${item.unit || ''} ${item.desc || ''}${item.age ? ` — ${item.age}` : ''}`.trim())}</li>`).join('');
    return `<ul class="doc-list">${items || '<li>A INFORMAR</li>'}</ul>`;
  }

  function assessmentTable(results) {
    const rows = results.map(({item,...result}) => {
      const adjustments = result.discount + result.fixedGlosa;
      return `<tr><td class="left">${escapeHTML(item.desc || 'A INFORMAR')}</td><td>${item.owner === 'cooperativa' ? 'Cooperativa' : 'Cooperado'}</td><td>${money(result.claimed)}</td><td>${money(result.accepted)}</td><td>${money(adjustments)}</td><td>${money(result.depreciation)}</td><td>${money(result.salvage)}</td><td>${money(result.current)}</td></tr>`;
    }).join('');
    return `<table class="doc-table"><thead><tr><th class="left" style="width:25%">Descrição</th><th>Beneficiário</th><th>Reclamado</th><th>Acatado</th><th>Desc./glosa</th><th>Deprec.</th><th>Salvados</th><th>Apurado</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Nenhum item informado.</td></tr>'}</tbody></table>`;
  }

  function financialKPIs(calculation) {
    const items = [
      ['Total reclamado',calculation.claimed],['Prejuízo apurado (VA)',calculation.current],['Franquia',calculation.deductible],
      ['Redução por limite',calculation.limitReduction],['Indenização indicada',calculation.indemnity],['DVN retido',calculation.dvn]
    ];
    return `<div class="doc-kpi-grid">${items.map(([label,value]) => `<div class="doc-kpi"><span>${escapeHTML(label)}</span><strong>${money(value)}</strong></div>`).join('')}</div>`;
  }

  function buildReportContents(data, calculation) {
    const fields = data.fields;
    const contents = [];
    const cover = `
      <div class="doc-title">RELATÓRIO FAST TRACK</div><div class="doc-subtitle">CONTINGÊNCIA — RISCOS NOMEADOS EMPRESARIAL</div>
      <div class="claim-numbers"><div class="claim-row"><span>Sinistro Seguradora:</span><b>${escapeHTML(fields.insurerClaim || 'A INFORMAR')}</b></div><div class="claim-row"><span>Sinistro Horizon Servitas:</span><b>${escapeHTML(fields.hsClaim || 'A INFORMAR')}</b></div></div>
      <table class="doc-meta"><tbody>
        ${reportMetaRow('COMPANHIA SEGURADORA',fields.insurer)}${reportMetaRow('SEGURADO',fields.insuredCooperative)}${reportMetaRow('COOPERADO',fields.claimantName)}${reportMetaRow('CPF / CNPJ',fields.claimantDocument)}
        ${reportMetaRow('LOCAL DO SINISTRO',fields.riskAddress)}${reportMetaRow('APÓLICE DE SEGUROS',fields.policyNumber)}${reportMetaRow('PRODUTO','FAST TRACK — CONTINGÊNCIA')}${reportMetaRow('CORRETOR',fields.broker)}
        ${reportMetaRow('DATA DO SINISTRO',longDate(fields.lossDate || fields.eventDate))}${reportMetaRow('COBERTURA RECLAMADA',fields.coverageName || fields.eventCoverage)}
      </tbody></table>`;
    contents.push(cover);

    const eventRisk = `
      <div class="doc-section">1 &nbsp; EVENTO DE CONTINGÊNCIA</div>
      <p class="doc-text"><b>${escapeHTML(fields.eventName || 'Evento a informar')}</b>${fields.eventRegion ? ` — ${escapeHTML(fields.eventRegion)}` : ''}.</p>
      <p class="doc-text">${escapeHTML(fields.eventBaseNarrative || 'A INFORMAR')}</p>
      ${fields.eventEvidence ? `<div class="doc-subsection">1.1 &nbsp; Evidências gerais do evento</div><p class="doc-text">${escapeHTML(fields.eventEvidence)}</p>` : ''}
      <div class="doc-section">2 &nbsp; PROPRIEDADE RURAL RECLAMADA</div>
      <p class="doc-text">Trata-se de propriedade destinada a ${escapeHTML(fields.riskActivity || 'atividade a informar')}, situada em ${escapeHTML(fields.riskAddress || 'local a informar')}${fields.coordinates ? ` — coordenadas ${escapeHTML(fields.coordinates)}` : ''}.</p>
      ${confirmedRiskTable(data.installations)}
      ${riskWarnings().length ? `<div class="doc-warning"><b>Registro de conferência:</b> ${escapeHTML(riskWarnings().join(' '))}</div>` : ''}
      <div class="doc-section">3 &nbsp; DESCRIÇÃO DA OCORRÊNCIA PELO COOPERADO</div>
      <p class="doc-text"><b>Relato prestado por:</b> ${escapeHTML(fields.reporterName || fields.claimantName || 'A INFORMAR')}</p><p class="doc-text">${escapeHTML(fields.occurrenceNarrative || 'A INFORMAR')}</p>`;
    contents.push(eventRisk);

    const analysis = `
      <div class="doc-section">4 &nbsp; APURAÇÕES DA REGULAÇÃO</div>
      <div class="doc-subsection">4.1 &nbsp; Levantamentos em vistoria</div><p class="doc-text">${escapeHTML(fields.inspectionFindings || 'A INFORMAR')}</p>
      <div class="doc-subsection">Relação de danos</div>${damageListHTML(data.damages)}
      <div class="doc-subsection">4.2 &nbsp; Levantamentos documentais</div><p class="doc-text">${escapeHTML(fields.documentsPresented || 'A INFORMAR')}</p>
      <div class="doc-section">5 &nbsp; COBERTURA RECLAMADA</div>${coverageTable(fields)}
      <div class="doc-section">6 &nbsp; ANÁLISE E DEFINIÇÃO DE CAUSA</div><p class="doc-text">${escapeHTML(fields.causeAnalysis || 'A INFORMAR')}</p>
      <div class="doc-section">7 &nbsp; ANÁLISE CONTRATUAL</div><p class="doc-text">${escapeHTML(fields.contractAnalysis || 'A INFORMAR')}</p>
      <div class="doc-section">8 &nbsp; PARECER DO REGULADOR</div><p class="doc-text"><b>${escapeHTML(decisionLabel(fields.coverageDecision))}.</b> ${escapeHTML(fields.regulatorOpinion || 'A INFORMAR')}</p>`;
    contents.push(analysis);

    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      const photoPage = `<div class="doc-section">9 &nbsp; REGISTRO FOTOGRÁFICO${i ? ' — CONTINUAÇÃO' : ''}</div><div class="doc-photo-grid">${pair.map((photo,index) => `<figure class="doc-photo${pair.length === 1 ? ' single' : ''}"><img src="${photo.dataUrl}" alt="Figura ${i + index + 1}"><figcaption>Figura ${i + index + 1} — ${escapeHTML(photo.caption || photo.name || 'Fotografia da vistoria')}</figcaption></figure>`).join('')}</div>`;
      contents.push(photoPage);
    }

    const chunks = [];
    for (let i = 0; i < calculation.itemResults.length; i += 7) chunks.push(calculation.itemResults.slice(i, i + 7));
    if (!chunks.length) chunks.push([]);
    chunks.forEach((chunk,index) => {
      const isLast = index === chunks.length - 1;
      contents.push(`
        <div class="doc-section">${photos.length ? 10 : 9} &nbsp; APURAÇÃO SIMPLIFICADA DOS PREJUÍZOS${index ? ' — CONTINUAÇÃO' : ''}</div>
        ${assessmentTable(chunk)}
        ${isLast ? `${financialKPIs(calculation)}<p class="doc-note">A participação obrigatória foi calculada sobre o prejuízo apurado. Os limites foram transcritos da apólice e somente o limite selecionado pelo regulador foi aplicado automaticamente.</p>${calculation.dvn ? `<p class="doc-note"><b>DVN:</b> ${money(calculation.dvn)} permanece retido e não integra a indenização indicada nesta etapa.</p>` : ''}` : ''}`);
    });

    const bankBlock = fields.includeBankInReport ? `<div class="doc-subsection">Dados de pagamento</div><table class="doc-meta"><tbody>${reportMetaRow('BENEFICIÁRIO',fields.beneficiaryName)}${reportMetaRow('CPF / CNPJ',fields.beneficiaryDocument)}${reportMetaRow('BANCO',fields.bankName)}${reportMetaRow('AGÊNCIA',fields.bankAgency)}${reportMetaRow('CONTA',fields.bankAccount)}</tbody></table>` : '';
    const closing = `
      <div class="doc-section">${photos.length ? 11 : 10} &nbsp; SALVADOS E RESSARCIMENTO</div>
      <p class="doc-text"><b>Salvados:</b> ${escapeHTML(fields.salvageStatus === 'sim' ? 'Há salvados.' : fields.salvageStatus === 'avaliar' ? 'Dependem de avaliação.' : 'Não há salvados.')} ${escapeHTML(fields.salvageNotes || '')}</p>
      <p class="doc-text"><b>Ressarcimento:</b> ${escapeHTML(fields.recoveryStatus === 'sim' ? 'Há possibilidade identificada.' : fields.recoveryStatus === 'avaliar' ? 'Deverá ser avaliado posteriormente.' : 'Não foi identificada possibilidade.')} ${fields.recoveryAgainst ? `Possível responsável: ${escapeHTML(fields.recoveryAgainst)}. ` : ''}${escapeHTML(fields.recoveryNotes || '')}${fields.recoveryProtocol ? ` Protocolo: ${escapeHTML(fields.recoveryProtocol)}.` : ''}</p>
      <div class="doc-section">${photos.length ? 12 : 11} &nbsp; DECLARAÇÃO SOBRE OUTROS SEGUROS</div>
      <p class="doc-text">${fields.otherInsurance === 'sim' ? `Foi informada a existência de outro seguro: ${escapeHTML(fields.otherInsurer || 'seguradora a informar')}, apólice ${escapeHTML(fields.otherPolicy || 'a informar')}.` : 'Foi declarado que não existe outra apólice de seguro que conceda cobertura aos mesmos bens amparados pela apólice em questão.'}</p>
      ${bankBlock}
      <div class="doc-section">${photos.length ? 13 : 12} &nbsp; CRONOLOGIA</div>
      <table class="doc-chrono"><tbody><tr><td>Data da ocorrência</td><td>${formatDate(fields.lossDate || fields.eventDate)}</td></tr><tr><td>Data do aviso</td><td>${formatDate(fields.noticeDate)}</td></tr><tr><td>Data da nomeação</td><td>${formatDate(fields.appointmentDate)}</td></tr><tr><td>Data do contato / agendamento</td><td>${formatDate(fields.contactDate)}</td></tr><tr><td>Data da vistoria</td><td>${formatDate(fields.inspectionDate)}</td></tr><tr><td>Data do encerramento</td><td>${formatDate(fields.closingDate)}</td></tr><tr><td>Data do relatório</td><td>${formatDate(fields.reportDate)}</td></tr></tbody></table>
      <div class="doc-section">${photos.length ? 14 : 13} &nbsp; CONSIDERAÇÕES FINAIS</div><p class="doc-text">${escapeHTML(fields.finalNotes || 'Processo concluído pelo fluxo Fast Track de contingência.')}</p>
      <p style="text-align:right;margin-top:10mm">${escapeHTML(fields.emissionCity || 'Blumenau (SC)')}, ${longDate(fields.reportDate || fields.closingDate)}.</p>
      <div class="doc-signature"><div class="doc-signature-line">Regulador</div><div style="margin-top:3mm">${escapeHTML(fields.regulatorName || 'A INFORMAR')}</div><div style="margin-top:1mm">CPF: ${escapeHTML(fields.regulatorDocument || 'A INFORMAR')}</div></div>`;
    contents.push(closing);
    return contents;
  }

  function buildReportHTML(data = collectData({includePhotoData:true})) {
    const calculation = calculateFinancial(data);
    const contents = buildReportContents(data, calculation);
    const total = contents.length;
    return contents.map((content,index) => reportPage(content,index + 1,total)).join('');
  }

  function renderReviewAndReport() {
    syncPhotoCaptions();
    const data = collectData({includePhotoData:true});
    const calculation = calculateFinancial(data);
    const warnings = reviewWarnings(data,calculation);
    $('reviewAlerts').innerHTML = warnings.length
      ? `<div class="notice notice-warn"><strong>Itens para conferência:</strong><ul>${warnings.map((warning) => `<li>${escapeHTML(warning)}</li>`).join('')}</ul></div>`
      : '<div class="notice notice-ok"><strong>Conferência automática concluída:</strong> não foram identificadas pendências estruturais.</div>';
    renderReviewSummary(data,calculation);
    $('reportPreview').innerHTML = buildReportHTML(data);
  }

  function preparePrint() {
    syncPhotoCaptions();
    $('printHost').innerHTML = buildReportHTML(collectData({includePhotoData:true}));
  }

  function reportHasOverflow(root) {
    const container = root || $('reportPreview');
    return qsa('.report-content', container).some((content) => content.scrollHeight > content.clientHeight + 3);
  }

  function printReport() {
    renderReviewAndReport();
    preparePrint();
    if (reportHasOverflow($('printHost')) && !confirm('Uma ou mais páginas excedem o espaço A4 e podem sofrer cortes. Deseja imprimir mesmo assim?')) return;
    window.print();
  }

  function wordStyles() {
    return `@page{size:595.3pt 841.9pt;margin:48pt 64pt 52pt}body{font-family:Arial,sans-serif;font-size:10pt;color:#111}table{border-collapse:collapse;width:100%}.word-page{page-break-after:always}.word-page:last-child{page-break-after:auto}.word-brand{width:100%;margin-bottom:12pt}.word-brand td{border:0}.doc-title{font-size:23pt;margin-top:12pt}.doc-subtitle{font-size:17pt;color:#2da9df}.claim-numbers{width:55%;margin-left:auto}.claim-row{margin:4pt 0}.doc-meta th,.doc-meta td{text-align:left;vertical-align:top;padding:5pt 0}.doc-meta th{width:38%}.doc-section{font-size:14pt;margin:18pt 0 10pt}.doc-subsection{font-size:11.5pt;font-weight:bold;margin:14pt 0 8pt}.doc-text{white-space:pre-wrap;text-align:justify;line-height:1.45}.doc-table{table-layout:fixed;font-size:8.5pt}.doc-table th,.doc-table td{border:1pt solid #555;padding:5pt;text-align:center;overflow-wrap:anywhere}.doc-table .left{text-align:left}.doc-list{margin-left:20pt}.doc-kpi-grid{display:table;width:100%;border-collapse:separate;border-spacing:4pt}.doc-kpi{display:table-cell;border:1pt solid #555;padding:6pt}.doc-photo-grid{display:table;width:100%;table-layout:fixed}.doc-photo{display:table-cell;width:50%;padding:6pt;vertical-align:top;text-align:center}.doc-photo img{max-width:100%;max-height:440pt}.doc-chrono td{border-bottom:1pt solid #555;padding:5pt}.doc-chrono td:last-child{text-align:right}.doc-signature{width:40%;margin:60pt 0 0 auto;text-align:center}.doc-signature-line{border-top:1pt solid #555;padding-top:5pt}.word-footer{font-size:8pt;color:#2da9df;margin-top:22pt}`;
  }

  function wordHTML() {
    const data = collectData({includePhotoData:true});
    const calculation = calculateFinancial(data);
    const contents = buildReportContents(data,calculation);
    const pages = contents.map((content,index) => `<div class="word-page"><table class="word-brand"><tr><td style="font-size:25pt;color:#2da9df;font-weight:bold;text-align:right;width:50%">HS</td><td style="font-size:13pt;font-weight:bold">beyond<br>solutions</td></tr></table>${content}<p class="word-footer">Horizon Servitas — www.horizonservitas.com — Página ${index + 1} de ${contents.length}</p></div>`).join('');
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Fast Track</title><style>${wordStyles()}</style></head><body>${pages}</body></html>`;
  }

  async function exportWord() {
    syncPhotoCaptions();
    saveDraft();
    const fileName = `Relatorio_Fast_Track_${slug(resolveCaseId())}.doc`;
    const file = new File(['\ufeff',wordHTML()],fileName,{type:'application/msword'});
    try {
      if (navigator.canShare && navigator.canShare({files:[file]})) {
        await navigator.share({files:[file],title:'Relatório Fast Track'});
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    downloadBlob(file,fileName);
  }

  function downloadBlob(blob,fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function exportJSON() {
    syncPhotoCaptions();
    const data = collectData({includePhotoData:true});
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    downloadBlob(blob,`Fast_Track_${slug(resolveCaseId())}.json`);
  }

  async function importJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error('Formato inválido');
      applyData(data);
      saveDraft();
      go(1);
      status('Backup importado com sucesso.');
    } catch {
      alert('Não foi possível importar o arquivo de backup.');
    } finally {
      $('jsonImport').value = '';
    }
  }

  function clearDraft() {
    if (!confirm('Iniciar um novo processo? O rascunho atual será removido deste navegador. Os eventos-base salvos serão preservados.')) return;
    localStorage.removeItem(DRAFT_KEY);
    photos = [];
    location.reload();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action], [data-go]');
    if (!button) return;
    if (button.dataset.go) { go(Number(button.dataset.go)); return; }
    const action = button.dataset.action;
    if (action === 'save-event') saveEventTemplate();
    else if (action === 'load-event') loadEventTemplate();
    else if (action === 'new-event') newEventTemplate();
    else if (action === 'delete-event') deleteEventTemplate();
    else if (action === 'load-example') loadExample();
    else if (action === 'import-v75') importV75();
    else if (action === 'add-installation') addInstallation();
    else if (action === 'add-damage') addDamage();
    else if (action === 'add-assessment-item') addAssessmentItem();
    else if (action === 'copy-installation') copyInstallation(button.closest('.installation-card'));
    else if (action === 'copy-event-narrative') copyEventNarrative();
    else if (action === 'remove-row') {
      const card = button.closest('.dynamic-card');
      const parent = card.parentElement;
      card.remove();
      if (parent.id === 'installationList') renumberCards('#installationList .installation-card','Instalação');
      if (parent.id === 'damageList') renumberCards('#damageList .damage-card','Item');
      if (parent.id === 'assessmentList') renumberCards('#assessmentList .assessment-card','Item');
      renderRiskAlerts(); updateFinancialSummary(); saveDraft();
    } else if (action === 'remove-photo') {
      const card = button.closest('.photo-card');
      photos = photos.filter((photo) => photo.id !== card.dataset.photoId);
      renderPhotos();
    } else if (action === 'save-draft') saveDraft(true);
    else if (action === 'export-json') exportJSON();
    else if (action === 'print-report') printReport();
    else if (action === 'export-word') exportWord();
    else if (action === 'clear-draft') clearDraft();
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('input,select,textarea')) {
      if (event.target.classList.contains('photo-caption')) syncPhotoCaptions();
      updateCaseIdentity();
      if (event.target.closest('.installation-card')) renderRiskAlerts();
      if (event.target.closest('.assessment-card') || ['deductiblePct','deductibleMin','eventLimit','unitLimit','aggregateLimit','customLimit','applicableLimitType','coverageDecision'].includes(event.target.id)) updateFinancialSummary();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveDraft(), 450);
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'photoInput') addPhotos(Array.from(event.target.files || []));
    else if (event.target.id === 'jsonImport' && event.target.files?.[0]) importJSON(event.target.files[0]);
    else {
      updateCaseIdentity(); renderRiskAlerts(); updateFinancialSummary(); saveDraft();
    }
  });

  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('pagehide', () => saveDraft());

  refreshEventSelect();
  if (!restoreDraft()) {
    addInstallation({},false); addDamage({},false); addAssessmentItem({},false);
    setField('inspectionType','presencial'); setField('coverageDecision','amparado');
    setField('salvageStatus','nao'); setField('recoveryStatus','nao'); setField('otherInsurance','nao');
    setField('applicableLimitType','none');
  }
  updateCaseIdentity(); renderRiskAlerts(); updateFinancialSummary(); go(1);
})();
