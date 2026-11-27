(() => {
  'use strict';
  const P=window.FastTrackPolicies, esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), $=id=>document.getElementById(id);
  let hooks,registry=P.emptyRegistry(),draft=null,caseRenderKey='',busy=false,localMatch=null;
  const field=(id,label,value='',type='text')=>`<div><label class="field" for="${id}">${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}"${type==='number'?' min="0" step="0.01"':''}></div>`;
  const option=(value,label,sel)=>`<option value="${esc(value)}"${value===sel?' selected':''}>${esc(label)}</option>`;
  const label=v=>`${v.data.operacao.empresa_grupo_exibicao} · ${v.data.operacao.numero_apolice} · ${v.data.operacao.seguradora_lider}`;
  const notify=(message,error=false)=>{
    $('policyNotice').textContent=message; $('policyNotice').className=`notice ${error?'error':'info'}`;
    $('policyCaseError')?.remove();
    if (error) { const p=document.createElement('p');p.id='policyCaseError';p.className='notice error';p.setAttribute('role','alert');p.textContent=message;$('policyCase').prepend(p); }
  };
  const download=(name,obj)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
  const state=()=>hooks.getState();
  const version=id=>registry.versions.find(v=>v.versionId===id);
  const current=P.current;
  const rowsHTML=rows=>rows.map(([a,b])=>`<div class="policy-fact"><strong>${esc(a)}</strong><p>${esc(b)}</p></div>`).join('');
  const reportHTML=s=>`<div class="coverage-report-table" role="table" aria-label="Cobertura reclamada"><div class="coverage-report-row coverage-report-header${window.FastTrackAuroraReport?.matches(s)?' aurora-coverage':''}" role="row">${['Cobertura','Limite de Indenização','Franquia'].map(v=>`<div role="columnheader">${esc(v)}</div>`).join('')}</div>${P.reportRows(s).map(row=>`<div class="coverage-report-row${window.FastTrackAuroraReport?.matches(s)?' aurora-coverage':''}" role="row">${row.map(v=>`<div role="cell">${esc(v)}</div>`).join('')}</div>`).join('')}</div>`;
  const inputNumber=id=>{const v=$(id)?.value;return v===''?null:Number(v);};
  function renderLibrary() {
    $('policyLibrary').innerHTML=P.activeVersions(registry).map(v=>`<article class="policy-entry"><strong>${esc(label(v))}</strong><p>${esc(v.data.operacao.segurado_razao_social)} · ${v.data.coberturas.length} coberturas · ${v.pdfs.length} PDFs locais</p><small>Versão ${esc(v.versionId)} · ${esc(v.savedAt)}</small><div class="inline-actions"><button class="btn secondary" type="button" data-policy="edit" data-version="${esc(v.versionId)}">Consultar / atualizar</button></div></article>`).join('') || '<p>Nenhuma apólice cadastrada neste navegador.</p>';
    const history=registry.versions.filter(v=>registry.active[v.id]!==v.versionId);
    if (history.length) $('policyLibrary').innerHTML+=`<details><summary>Histórico de versões (${history.length})</summary>${history.map(v=>`<div class="policy-entry"><strong>${esc(label(v))}</strong><p>${esc(v.versionId)} · ${esc(v.savedAt)}</p><button class="btn secondary" type="button" data-policy="edit" data-version="${esc(v.versionId)}">Consultar / preparar nova versão</button></div>`).join('')}</details>`;
  }
  function blank() {
    return {formato:'cadastro_contratual_de_referencia',versao_formato:1,operacao:{id:P.uid(),empresa_grupo_exibicao:'',cooperativa_afiliada:'',segurado_razao_social:'',segurado_cnpj:'',seguradora_lider:'',numero_apolice:'',produto:'',vigencia:{inicio_data_escrita:'',inicio_hora_escrita:'24:00',fim_data_escrita:'',fim_hora_escrita:'24:00',fuso:'Horário local do risco'}},documentos:[],coberturas:[],sublimites:[],endossos:[],pendencias_documentais:[],vinculos_propostos_consulta:[],clausulas_administrativas:[]};
  }
  const operationFields=[['empresa_grupo_exibicao','Empresa / grupo'],['cooperativa_afiliada','Cooperativa afiliada (quando aplicável)'],['segurado_razao_social','Segurado contratante'],['segurado_cnpj','CNPJ do segurado'],['seguradora_lider','Seguradora líder'],['numero_apolice','Número da apólice'],['produto','Produto'],['corretora_relatorio','Corretora para o relatório (opcional)']];
  function readDraft() {
    if (!draft) return;
    const o=draft.data.operacao;
    for (const [k] of operationFields) {
      const value=$(`po_${k}`).value.trim();
      if (k!=='corretora_relatorio' || value || Object.hasOwn(o,k)) o[k]=value;
    }
    for (const k of ['inicio_data_escrita','inicio_hora_escrita','fim_data_escrita','fim_hora_escrita']) o.vigencia[k]=$(`pv_${k}`).value;
    draft.data.vinculos_propostos_consulta=$('policyBases').value.split('\n').filter(s=>s.trim()).map(s=>{const [chave_base,atividade,secao_contratual]=s.split('|').map(x=>x.trim());return {chave_base,atividade,secao_contratual};});
    draft.data.coberturas.forEach((c,i)=>{
      c.nome_contratual=$(`pc_name_${i}`).value.trim();
      c.codigo_contratual=$(`pc_code_${i}`).value.trim();
      c.lmi_brl=inputNumber(`pc_lmi_${i}`);
      c.limites={...c.limites,por_evento_brl:inputNumber(`pc_event_${i}`),por_unidade_brl:inputNumber(`pc_unit_${i}`),agregado_brl:inputNumber(`pc_aggregate_${i}`)};
      c.condicao=$(`pc_condition_${i}`).value.trim();
      if ($(`pc_percent_${i}`)) c.franquia={...c.franquia,tipo:'percentual_com_minimo',percentual:inputNumber(`pc_percent_${i}`),minimo_brl:inputNumber(`pc_min_${i}`),base_de_calculo:$(`pc_base_${i}`).value.trim(),unidade_de_aplicacao:$(`pc_scope_${i}`).value.trim() || null};
    });
  }
  function renderEditor() {
    const host=$('policyEditor');host.hidden=!draft;if (!draft) return;
    const d=draft.data,o=d.operacao,v=o.vigencia;
    host.innerHTML=`<h3>Conferência do cadastro</h3><p>Os dados abaixo ainda não foram salvos. Uma atualização gera nova versão; atendimentos existentes conservam a versão anterior.</p><div class="grid2">${operationFields.map(([k,l])=>field(`po_${k}`,l,o[k])).join('')}</div><div class="grid2">${field('pv_inicio_data_escrita','Início — data escrita',v.inicio_data_escrita,'date')}${field('pv_inicio_hora_escrita','Início — hora escrita (00:00 a 24:00)',v.inicio_hora_escrita)}${field('pv_fim_data_escrita','Fim — data escrita',v.fim_data_escrita,'date')}${field('pv_fim_hora_escrita','Fim — hora escrita (00:00 a 24:00)',v.fim_hora_escrita)}</div><label class="field" for="policyBases">Bases e atividades propostas (uma por linha: chave da base | atividade | seção)</label><textarea id="policyBases" rows="3">${esc(d.vinculos_propostos_consulta.map(b=>[b.chave_base,b.atividade,b.secao_contratual].join(' | ')).join('\n'))}</textarea><p class="helper">Referências de base e atividade do cadastro. A escolha da apólice no atendimento independe da consulta de propriedades.</p><h4>Coberturas estruturadas</h4>${d.coberturas.map((c,i)=>`<details class="policy-entry"><summary>${esc(c.nome_contratual || 'Nova cobertura')}</summary><div class="grid2">${field(`pc_name_${i}`,'Nome contratual',c.nome_contratual)}${field(`pc_code_${i}`,'Código contratual',c.codigo_contratual)}${field(`pc_lmi_${i}`,'LMI nominal (R$)',c.lmi_brl,'number')}${field(`pc_event_${i}`,'Limite por evento (R$)',c.limites?.por_evento_brl,'number')}${field(`pc_unit_${i}`,'Limite por unidade/local (R$)',c.limites?.por_unidade_brl,'number')}${field(`pc_aggregate_${i}`,'Agregado contratual — não é saldo (R$)',c.limites?.agregado_brl,'number')}</div>${!c.franquia?.aplicacao_condicionada && (!c.franquia?.tipo || c.franquia.tipo==='percentual_com_minimo')?`<div class="grid2">${field(`pc_percent_${i}`,'Franquia (%)',c.franquia?.percentual,'number')}${field(`pc_min_${i}`,'Mínimo (R$)',c.franquia?.minimo_brl,'number')}${field(`pc_base_${i}`,'Base de cálculo',c.franquia?.base_de_calculo)}${field(`pc_scope_${i}`,'Unidade de aplicação — deixe vazia se pendente',c.franquia?.unidade_de_aplicacao)}</div>`:`<p>${esc(P.deductibleText(c.franquia))}</p><p class="helper">Regra temporal/condicionada preservada; pode ser atualizada no cadastro detalhado abaixo.</p>`}<label class="field" for="pc_condition_${i}">Condições adicionais</label><textarea id="pc_condition_${i}">${esc(c.condicao || '')}</textarea><p>${esc((c.observacoes || []).join(' '))}</p><small>${esc(P.sourceText(c.fontes))}</small></details>`).join('')}<button class="btn secondary" type="button" data-policy="add-coverage">Adicionar cobertura</button><h4>Sublimites, condições e pendências</h4>${rowsHTML(d.sublimites.map(s=>[s.nome_contratual,[...P.limits(s),s.condicao,s.vinculo_cobertura].filter(Boolean).join(' · ')]))}${rowsHTML(d.pendencias_documentais.map(p=>[p.campo,`${p.descricao} ${p.impacto || ''}`]))}<details><summary>Endossos e documentos de origem</summary><p>Emissão, eficácia e mês de ajustamento são conservados separadamente. Nenhuma alteração é aplicada pela ordem dos arquivos.</p><pre class="policy-json">${esc(JSON.stringify({endossos:d.endossos,documentos:d.documentos,cobertura_temporal_dos_documentos:d.cobertura_temporal_dos_documentos,clausulas_administrativas:d.clausulas_administrativas},null,2))}</pre></details><h4>PDFs vinculados somente neste navegador</h4><div class="grid2"><div><label class="field" for="policyDocumentId">Documento de origem</label><select id="policyDocumentId">${option('','Documento adicional','')}${d.documentos.map(x=>option(x.id,x.arquivo,'')).join('')}</select></div><label class="btn secondary file-button">Anexar PDF<input id="policyPdfInput" type="file" accept="application/pdf,.pdf"></label></div><div>${draft.pdfs.map((p,i)=>`<p>${esc(p.name)} · SHA-256 ${esc(p.sha256)} <button class="small-btn" data-policy="open-pdf" data-index="${i}" type="button">Abrir PDF</button></p>`).join('') || '<p>Nenhum PDF anexado. A referência estruturada pode ser salva; a ausência do arquivo será indicada.</p>'}</div><details><summary>Cadastro detalhado — condições, sublimites e endossos</summary><p>Atualização integral no mesmo formato de referência. Use este campo para regras que não aparecem nos campos simplificados.</p><button class="btn secondary" type="button" data-policy="refresh-json">Trazer campos atuais para o cadastro detalhado</button><label class="field" for="policyJson">Cadastro contratual completo</label><textarea id="policyJson" rows="15" spellcheck="false">${esc(JSON.stringify(d,null,2))}</textarea><button class="btn secondary" type="button" data-policy="apply-json">Conferir alterações do cadastro detalhado</button></details><div class="inline-actions"><button class="btn primary" type="button" data-policy="save">Salvar versão do cadastro</button><button class="btn secondary" type="button" data-policy="cancel">Fechar conferência</button></div>`;
  }
  function renderCase(force=false) {
    if (!hooks) return;
    const opened=Array.from(document.querySelectorAll('#policyCase details[open]')).map(d=>d.querySelector('summary')?.textContent);
    const s=state(),c=current(s),all=P.activeVersions(registry);
    if (localMatch && (localMatch.selection!==s.cooperatorSelection || localMatch.lossDate!==s.fields.lossDate || localMatch.lossTime!==s.fields.lossTime)) { localMatch=null;force=true; }
    const match=localMatch?.result;
    const selectedKey=c?P.insuredKey(c.data):s.policyInsuredKey || '';
    const key=JSON.stringify([s.caseUid,c,selectedKey,registry.active,s.cooperatorSelection?.confirmed,s.fields.lossDate,s.fields.lossTime]);
    if (!force && key===caseRenderKey) return;caseRenderKey=key;
    const people=P.insureds(registry),choices=selectedKey?P.forInsured(registry,selectedKey):all;
    if(c&&!people.some(p=>p.key===selectedKey))people.push({key:selectedKey,name:c.data.operacao.segurado_razao_social,group:c.data.operacao.empresa_grupo_exibicao});
    const selectedVersion=c?.versionId || '';
    const contractLabel=v=>`${v.data.operacao.numero_apolice} · ${v.data.operacao.seguradora_lider} · ${v.data.operacao.vigencia.inicio_data_escrita} a ${v.data.operacao.vigencia.fim_data_escrita}`;
    let msg=c?`Dados da apólice preenchidos. Escolha a cobertura e continue o atendimento.${registry.active[c.id]&&registry.active[c.id]!==c.versionId?' Existe atualização no cadastro; este atendimento conserva a versão anterior.':''}`:selectedKey&&choices.length>1?'Este segurado possui mais de uma apólice. Escolha o contrato abaixo.':'Selecione o segurado/empresa ou escolha diretamente uma apólice. Os dados serão preenchidos ao selecionar.';
    if (match) {
      if (match.status==='applied') msg='Apólice preenchida pela base e atividade do local selecionado. Escolha as coberturas; a seleção manual continua disponível.';
      else if (match.status==='kept') msg=`A apólice deste atendimento continua compatível; sua versão e coberturas foram preservadas.${match.candidates.length>1?' Há outras apólices compatíveis disponíveis para escolha.':''}`;
      else if (match.reason==='invalid_date') msg='Confira a data/hora do sinistro para relacionar a vigência, ou selecione a apólice manualmente.';
      else if (match.reason==='needs_time') msg='A compatibilidade de vigência depende da hora do sinistro. Confira a vigência e escolha a apólice abaixo; a seleção manual continua disponível.';
      else if (match.status==='choice') msg=match.candidates.length===1?'Há uma apólice compatível com o local. Selecione-a abaixo.':`Há ${match.candidates.length} apólices compatíveis com a base, atividade e data informadas. Escolha uma abaixo.`;
      else msg=match.reason==='outside'?'Nenhuma apólice vinculada ao local está vigente na data informada. Importe o cadastro correspondente ou selecione a apólice manualmente.':'Não há apólice cadastrada compatível com a base e atividade deste local. Importe o cadastro correspondente ou selecione a apólice manualmente.';
    }
    if (c) {
      const validity=P.validityAtLoss(c.data,s.fields);
      if (validity==='outside') msg+=' A vigência cadastrada não abrange a data/hora informada. Confira a apólice escolhida.';
      if (validity==='needs_time') msg+=' A vigência depende da hora do sinistro nesta data. Confira a apólice escolhida.';
    }
    const choiceLabel=v=>`${selectedKey?'':v.data.operacao.segurado_razao_social+' · '}${contractLabel(v)}`;
    const suggested=match?.candidates.filter(v=>!selectedKey || P.insuredKey(v.data)===selectedKey) || [];
    const choiceHTML=suggested.length?`<optgroup label="Compatíveis com o local selecionado">${suggested.map(v=>option(v.versionId,choiceLabel(v),selectedVersion)).join('')}</optgroup><optgroup label="Outras apólices — escolha manual">${choices.filter(v=>!suggested.some(x=>x.id===v.id)).map(v=>option(v.versionId,choiceLabel(v),selectedVersion)).join('')}</optgroup>`:choices.map(v=>option(v.versionId,choiceLabel(v),selectedVersion)).join('');
    $('policyCase').innerHTML=`<h3>Contrato do atendimento</h3><p class="notice info">${esc(msg)}</p>
      <label class="field" for="policyInsuredChoice">Segurado / empresa</label><select id="policyInsuredChoice">${option('','Todos os segurados — escolher diretamente a apólice',selectedKey)}${people.map(p=>option(p.key,[p.name,p.group].filter(Boolean).join(' · '),selectedKey)).join('')}</select>
      <label class="field" for="policyChoice">Apólice</label><select id="policyChoice">${option('','Selecione uma apólice',selectedVersion)}${choiceHTML}${c&&![...choices,...suggested].some(v=>v.versionId===c.versionId)?option(c.versionId,`${contractLabel(c)} — versão preservada neste atendimento`,c.versionId):''}</select>
      ${c?`<h4>Cobertura reclamada</h4><div id="policyCoverageChoices">${c.data.coberturas.map(cov=>`<label class="policy-check"><input type="checkbox" data-policy-coverage="${esc(cov.id)}"${c.coverageIds.includes(cov.id)?' checked':''}>${esc(cov.nome_sugerido_seletor || cov.nome_contratual)}</label>`).join('')}</div>${c.data.sublimites.length?`<h4>Sublimites reclamados (opcional)</h4><div id="policySublimitChoices">${c.data.sublimites.map(sub=>`<label class="policy-check"><input type="checkbox" data-policy-sublimit="${esc(sub.id)}"${(c.sublimitIds || []).includes(sub.id)?' checked':''}>${esc(P.displayName(sub))}</label>`).join('')}</div>`:''}${field('policyCause','Causa do dano — informada pelo regulador',c.cause)}<details><summary>Coberturas que irão para o relatório</summary>${reportHTML(s)}</details>`:''}`;
    $('policyCoverageSummary').innerHTML=reportHTML(s);
    for (const d of document.querySelectorAll('#policyCase details')) if (opened.includes(d.querySelector('summary')?.textContent)) d.open=true;
  }
  function changed() { hooks.onChange();renderCase(true); }
  function reconcile() {
    if (!hooks) return false;
    const s=state();
    delete s.contractHold;
    const changed=P.reconcile(s,registry);
    if (s.contract) {
      for (const [k,v] of Object.entries(s.contract.autoFields || {})) {
        if (s.fields[k]!==v) s.contract.manualFields[k]=s.fields[k];
        else delete s.contract.manualFields[k];
      }
    }
    return changed;
  }
  async function persist(next) {
    await hooks.saveRegistry(next);registry=next;renderLibrary();
    // Refresh choices only; importing a registry must never apply a contract to the case.
    if (localMatch?.selection===state().cooperatorSelection) {
      const result=P.localPolicies(state(),registry);
      localMatch.result={...result,status:current(state())?'kept':result.candidates.length?'choice':'missing'};
    }
  }
  async function attachPDF(file) {
    if (!draft || !file) return;
    if (file.size>40*1024*1024) throw Error('PDF acima de 40 MB. Divida o documento preservando as referências.');
    const buffer=await file.arrayBuffer(), bytes=new Uint8Array(buffer);
    if (new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-') throw Error('Arquivo sem cabeçalho PDF válido.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const documentId=$('policyDocumentId').value || P.uid(), ref=draft.data.documentos.find(d=>d.id===documentId);
    if (ref?.sha256 && ref.sha256.toLowerCase()!==hash) throw Error('O PDF não corresponde à referência de integridade do cadastro. Confira o arquivo selecionado.');
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(new Blob([buffer],{type:'application/pdf'}));});
    readDraft();draft.pdfs=draft.pdfs.filter(p=>p.documentId!==documentId);draft.pdfs.push({documentId,name:file.name,sha256:hash,dataUrl});
    if (!ref) draft.data.documentos.push({id:documentId,arquivo:file.name,sha256:hash});
    renderEditor();notify('PDF conferido. Salve a versão para conservar o arquivo neste navegador.');
  }
  async function action(button) {
    const act=button.dataset.policy,s=state();
    if (act==='new') { draft={data:blank(),bindings:[],pdfs:[]};renderEditor(); }
    if (act==='edit') { draft=P.copy(version(button.dataset.version));renderEditor(); }
    if (act==='cancel') { draft=null;renderEditor(); }
    if (act==='add-coverage') { readDraft();draft.data.coberturas.push({id:P.uid(),tipo:'cobertura',nome_contratual:'',franquia:{tipo:'percentual_com_minimo'}});renderEditor(); }
    if (act==='refresh-json') { readDraft();$('policyJson').value=JSON.stringify(draft.data,null,2); }
    if (act==='apply-json') { draft.data=P.validate(JSON.parse($('policyJson').value));renderEditor();notify('Cadastro detalhado conferido. Salve a versão para concluir.'); }
    if (act==='save') { readDraft();const saved=P.saveVersion(registry,draft.data,draft);await persist(saved.registry);draft=null;renderEditor();reconcile();changed();notify('Versão salva neste navegador. Atendimentos anteriores conservam a sua versão. Faça backup para outro dispositivo.'); }
    if (act==='backup') download('Backup_privado_apolices.json',registry);
    if (act==='open-pdf') { const p=draft.pdfs[Number(button.dataset.index)], bytes=Uint8Array.from(atob(p.dataUrl.split(',')[1]),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000); }
  }

  async function init(config) {
    hooks=config;const loaded=await hooks.loadRegistry();if (loaded) registry=P.restore(loaded);
    renderLibrary();renderCase(true);
    document.addEventListener('click',async e=>{const button=e.target.closest('[data-policy]');if (!button || busy) return;busy=true;button.disabled=true;try { await action(button); } catch(err) { notify(err.message,true); } finally { busy=false;button.disabled=false; }});
    document.addEventListener('change',async e=>{
      const el=e.target;
      try {
        if (el.id==='policyImport') {
          const f=el.files?.[0];if (!f) return;if (f.size>5*1024*1024) throw Error('Cadastro de referência acima de 5 MB.');
          const data=P.validate(JSON.parse(await f.text())), previous=P.activeVersions(registry).find(v=>v.id===data.operacao.id);
          draft={data,bindings:P.copy(previous?.bindings || []),pdfs:P.copy(previous?.pdfs || [])};renderEditor();notify('Importação interpretada. Confira os dados e use “Salvar versão do cadastro”.');
        }
        if (el.id==='policyRestore') {
          const f=el.files?.[0];if (!f) return;if (f.size>160*1024*1024) throw Error('Backup acima de 160 MB.');
          const incoming=P.restore(JSON.parse(await f.text()));
          // Verify every PDF before any storage mutation, not only its claimed hash.
          for (const v of incoming.versions) for (const p of v.pdfs) {
            const bytes=Uint8Array.from(atob(p.dataUrl.split(',')[1]),c=>c.charCodeAt(0));
            const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
            if (digest!==p.sha256) throw Error('Falha de integridade em PDF do backup. Nenhum cadastro foi substituído.');
          }
          const merged=P.copy(registry);
          for (const v of incoming.versions) { const existing=merged.versions.find(x=>x.versionId===v.versionId);if (existing && JSON.stringify(existing)!==JSON.stringify(v)) throw Error('Conflito entre versões do backup; restauração cancelada.');if (!existing) merged.versions.push(v); }
          // Existing active versions stay active; restored alternatives are available in history.
          for (const [id,ver] of Object.entries(incoming.active)) if (!merged.active[id]) merged.active[id]=ver;
          await persist(merged);reconcile();changed();notify('Backup restaurado e PDFs conferidos. Versões ativas existentes e versões dos atendimentos foram preservadas.');
        }
        if (el.id==='policyPdfInput') await attachPDF(el.files?.[0]);
        if (el.id==='policyInsuredChoice') { localMatch=null;P.selectInsured(state(),registry,el.value);changed(); }
        if (el.id==='policyChoice') {
          localMatch=null;
          if (!el.value) { const key=state().policyInsuredKey;P.clearAutomatic(state());state().policyInsuredKey=key; }
          else if (el.value!==current(state())?.versionId) { const selected=version(el.value);if (!selected) throw Error('Apólice não encontrada no cadastro.');P.apply(state(),selected); }
          changed();
        }
        if (el.matches('[data-policy-coverage]')) { P.chooseCoverages(state(),Array.from(document.querySelectorAll('[data-policy-coverage]:checked')).map(x=>x.dataset.policyCoverage));changed(); }
        if (el.matches('[data-policy-sublimit]')) { P.chooseSublimits(state(),Array.from(document.querySelectorAll('[data-policy-sublimit]:checked')).map(x=>x.dataset.policySublimit));changed(); }
        if (el.id==='policyCause') { current(state()).cause=el.value;changed(); }
      } catch(err) { notify(err.message,true); }
      finally { if (el.type==='file') el.value=''; }
    });
  }
  function associateLocal() {
    const result=P.associateLocal(state(),registry);
    localMatch={selection:state().cooperatorSelection,lossDate:state().fields.lossDate,lossTime:state().fields.lossTime,result};
    caseRenderKey='';
    return result;
  }
  window.FastTrackPolicyUI={init,reconcile,render:renderCase,rowsHTML,getRegistry:()=>P.copy(registry),associateLocal};
})();
