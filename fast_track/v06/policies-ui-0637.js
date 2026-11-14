(() => {
  'use strict';
  const P=window.FastTrackPolicies, esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), $=id=>document.getElementById(id);
  let hooks,registry=P.emptyRegistry(),draft=null,caseRenderKey='',busy=false;
  const field=(id,label,value='',type='text')=>`<div><label class="field" for="${id}">${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}"${type==='number'?' min="0" step="0.01"':''}></div>`;
  const option=(value,label,sel)=>`<option value="${esc(value)}"${value===sel?' selected':''}>${esc(label)}</option>`;
  const check=(id,label,value)=>`<label class="policy-check"><input type="checkbox" id="${id}"${value?' checked':''}>${esc(label)}</label>`;
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
  const inputNumber=id=>{const v=$(id)?.value;return v===''?null:Number(v);};
  function renderLibrary() {
    $('policyLibrary').innerHTML=P.activeVersions(registry).map(v=>`<article class="policy-entry"><strong>${esc(label(v))}</strong><p>${esc(v.data.operacao.segurado_razao_social)} · ${v.data.coberturas.length} coberturas · ${v.bindings.length} vínculos individuais · ${v.pdfs.length} PDFs locais</p><small>Versão ${esc(v.versionId)} · ${esc(v.savedAt)}</small><div class="inline-actions"><button class="btn secondary" type="button" data-policy="edit" data-version="${esc(v.versionId)}">Consultar / atualizar</button></div></article>`).join('') || '<p>Nenhuma apólice cadastrada neste navegador.</p>';
    const history=registry.versions.filter(v=>registry.active[v.id]!==v.versionId);
    if (history.length) $('policyLibrary').innerHTML+=`<details><summary>Histórico de versões (${history.length})</summary>${history.map(v=>`<div class="policy-entry"><strong>${esc(label(v))}</strong><p>${esc(v.versionId)} · ${esc(v.savedAt)}</p><button class="btn secondary" type="button" data-policy="edit" data-version="${esc(v.versionId)}">Consultar / preparar nova versão</button></div>`).join('')}</details>`;
  }
  function blank() {
    return {formato:'cadastro_contratual_de_referencia',versao_formato:1,operacao:{id:P.uid(),empresa_grupo_exibicao:'',cooperativa_afiliada:'',segurado_razao_social:'',segurado_cnpj:'',seguradora_lider:'',numero_apolice:'',produto:'',vigencia:{inicio_data_escrita:'',inicio_hora_escrita:'24:00',fim_data_escrita:'',fim_hora_escrita:'24:00',fuso:'Horário local do risco'}},documentos:[],coberturas:[],sublimites:[],endossos:[],pendencias_documentais:[],vinculos_propostos_consulta:[],clausulas_administrativas:[]};
  }
  const operationFields=[['empresa_grupo_exibicao','Empresa / grupo'],['cooperativa_afiliada','Cooperativa afiliada (quando aplicável)'],['segurado_razao_social','Segurado contratante'],['segurado_cnpj','CNPJ do segurado'],['seguradora_lider','Seguradora líder'],['numero_apolice','Número da apólice'],['produto','Produto']];
  function readDraft() {
    if (!draft) return;
    const o=draft.data.operacao;
    for (const [k] of operationFields) o[k]=$(`po_${k}`).value.trim();
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
    host.innerHTML=`<h3>Conferência do cadastro</h3><p>Os dados abaixo ainda não foram salvos. Uma atualização gera nova versão; atendimentos existentes conservam a versão anterior.</p><div class="grid2">${operationFields.map(([k,l])=>field(`po_${k}`,l,o[k])).join('')}</div><div class="grid2">${field('pv_inicio_data_escrita','Início — data escrita',v.inicio_data_escrita,'date')}${field('pv_inicio_hora_escrita','Início — hora escrita (00:00 a 24:00)',v.inicio_hora_escrita)}${field('pv_fim_data_escrita','Fim — data escrita',v.fim_data_escrita,'date')}${field('pv_fim_hora_escrita','Fim — hora escrita (00:00 a 24:00)',v.fim_hora_escrita)}</div><label class="field" for="policyBases">Bases e atividades propostas (uma por linha: chave da base | atividade | seção)</label><textarea id="policyBases" rows="3">${esc(d.vinculos_propostos_consulta.map(b=>[b.chave_base,b.atividade,b.secao_contratual].join(' | ')).join('\n'))}</textarea><p class="helper">Propostas de base não comprovam inclusão da propriedade. Cada local exige confirmação individual com referência e período.</p><h4>Coberturas estruturadas</h4>${d.coberturas.map((c,i)=>`<details class="policy-entry"><summary>${esc(c.nome_contratual || 'Nova cobertura')}</summary><div class="grid2">${field(`pc_name_${i}`,'Nome contratual',c.nome_contratual)}${field(`pc_code_${i}`,'Código contratual',c.codigo_contratual)}${field(`pc_lmi_${i}`,'LMI nominal (R$)',c.lmi_brl,'number')}${field(`pc_event_${i}`,'Limite por evento (R$)',c.limites?.por_evento_brl,'number')}${field(`pc_unit_${i}`,'Limite por unidade/local (R$)',c.limites?.por_unidade_brl,'number')}${field(`pc_aggregate_${i}`,'Agregado contratual — não é saldo (R$)',c.limites?.agregado_brl,'number')}</div>${!c.franquia?.aplicacao_condicionada && (!c.franquia?.tipo || c.franquia.tipo==='percentual_com_minimo')?`<div class="grid2">${field(`pc_percent_${i}`,'Franquia (%)',c.franquia?.percentual,'number')}${field(`pc_min_${i}`,'Mínimo (R$)',c.franquia?.minimo_brl,'number')}${field(`pc_base_${i}`,'Base de cálculo',c.franquia?.base_de_calculo)}${field(`pc_scope_${i}`,'Unidade de aplicação — deixe vazia se pendente',c.franquia?.unidade_de_aplicacao)}</div>`:`<p>${esc(P.deductibleText(c.franquia))}</p><p class="helper">Regra temporal/condicionada preservada; pode ser atualizada no cadastro detalhado abaixo.</p>`}<label class="field" for="pc_condition_${i}">Condições adicionais</label><textarea id="pc_condition_${i}">${esc(c.condicao || '')}</textarea><p>${esc((c.observacoes || []).join(' '))}</p><small>${esc(P.sourceText(c.fontes))}</small></details>`).join('')}<button class="btn secondary" type="button" data-policy="add-coverage">Adicionar cobertura</button><h4>Sublimites, condições e pendências</h4>${rowsHTML(d.sublimites.map(s=>[s.nome_contratual,[...P.limits(s),s.condicao,s.vinculo_cobertura].filter(Boolean).join(' · ')]))}${rowsHTML(d.pendencias_documentais.map(p=>[p.campo,`${p.descricao} ${p.impacto || ''}`]))}<details><summary>Endossos e documentos de origem</summary><p>Emissão, eficácia e mês de ajustamento são conservados separadamente. Nenhuma alteração é aplicada pela ordem dos arquivos.</p><pre class="policy-json">${esc(JSON.stringify({endossos:d.endossos,documentos:d.documentos,cobertura_temporal_dos_documentos:d.cobertura_temporal_dos_documentos,clausulas_administrativas:d.clausulas_administrativas},null,2))}</pre></details><h4>PDFs vinculados somente neste navegador</h4><div class="grid2"><div><label class="field" for="policyDocumentId">Documento de origem</label><select id="policyDocumentId">${option('','Documento adicional','')}${d.documentos.map(x=>option(x.id,x.arquivo,'')).join('')}</select></div><label class="btn secondary file-button">Anexar PDF<input id="policyPdfInput" type="file" accept="application/pdf,.pdf"></label></div><div>${draft.pdfs.map((p,i)=>`<p>${esc(p.name)} · SHA-256 ${esc(p.sha256)} <button class="small-btn" data-policy="open-pdf" data-index="${i}" type="button">Abrir PDF</button></p>`).join('') || '<p>Nenhum PDF anexado. A referência estruturada pode ser salva; a ausência do arquivo será indicada.</p>'}</div><details><summary>Cadastro detalhado — condições, sublimites e endossos</summary><p>Atualização integral no mesmo formato de referência. Use este campo para regras que não aparecem nos campos simplificados.</p><button class="btn secondary" type="button" data-policy="refresh-json">Trazer campos atuais para o cadastro detalhado</button><label class="field" for="policyJson">Cadastro contratual completo</label><textarea id="policyJson" rows="15" spellcheck="false">${esc(JSON.stringify(d,null,2))}</textarea><button class="btn secondary" type="button" data-policy="apply-json">Conferir alterações do cadastro detalhado</button></details><div class="inline-actions"><button class="btn primary" type="button" data-policy="save">Salvar versão do cadastro</button><button class="btn secondary" type="button" data-policy="cancel">Fechar conferência</button></div>`;
  }
  function renderCase(force=false) {
    if (!hooks) return;
    const opened=Array.from(document.querySelectorAll('#policyCase details[open],#policyCalculationReview details[open]')).map(d=>d.querySelector('summary')?.textContent);
    const s=state(),c=current(s), all=P.activeVersions(registry), matches=P.candidates(registry,s);
    const key=JSON.stringify([s.caseUid,P.context(s),c,registry.active]);
    if (!force && key===caseRenderKey) return;caseRenderKey=key;
    const selectedVersion=c?.versionId || '', eligible=all.filter(v=>v.data.vinculos_propostos_consulta.some(b=>b.chave_base===s.cooperatorSelection?.source?.baseKey));
    const msg=c ? `Apólice vinculada. Versão do atendimento: ${c.versionId}. ${registry.active[c.id] && registry.active[c.id]!==c.versionId?'Existe atualização no cadastro; este atendimento conserva a versão anterior.':''}` : !P.riskKey(s.cooperatorSelection) ? 'Selecione e confirme uma propriedade na consulta.' : !s.fields.lossDate ? 'Preencha a data do sinistro para consultar a vigência.' : matches.length>1 ? 'Mais de uma apólice confirmada é compatível. Escolha explicitamente.' : 'Não há vínculo individual suficiente para esta data. Confirme a inclusão e a vigência com documento; nome, marca e seguradora não comprovam o vínculo.';
    const r=c?.review || {};
    $('policyCase').innerHTML=`<h3>Apólice do atendimento</h3><p class="notice info">${esc(msg)}</p><label class="field" for="policyChoice">Apólice confirmada ou seleção assistida</label><select id="policyChoice">${option('','Selecione uma apólice',selectedVersion)}${all.map(v=>option(v.versionId,`${label(v)}${matches.includes(v)?' — vínculo confirmado':eligible.includes(v)?' — comprovação individual pendente':' — base não vinculada'}`,selectedVersion)).join('')}${c&&!all.some(v=>v.versionId===c.versionId)?option(c.versionId,`${c.data.operacao.numero_apolice} — versão preservada neste atendimento`,c.versionId):''}</select><div class="inline-actions"><button class="btn secondary" type="button" data-policy="apply">Aplicar apólice selecionada</button>${c?'<button class="btn secondary" type="button" data-policy="use-contract-values">Usar identificação do contrato após conferência</button>':''}</div><details id="policyBinding"><summary>Confirmar vínculo individual da propriedade</summary><p>Este vínculo vale somente para o local, a atividade e as instalações atualmente selecionados. Confira a relação de locais e os endossos pertinentes ao período, inclusive alterações posteriores.</p><div class="grid2">${field('policyBindFrom','Inclusão comprovada desde','','date')}${field('policyBindTo','Inclusão comprovada até','','date')}</div>${field('policyBindEvidence','Documento, página e referência da inclusão individual')}${field('policyBindCoop','Cooperativa afiliada confirmada',s.cooperatorSelection?.confirmed?.cooperative)}${check('policyBindConfirmed','Conferi a propriedade/instalações, atividade, inclusão e período nos documentos.',false)}<button class="btn primary" type="button" data-policy="bind">Salvar vínculo individual</button></details>${c?`<h4>Cobertura reclamada</h4><p>Escolha as coberturas contratuais. Vendaval e Granizo pertencentes à mesma cobertura não criam dois limites.</p><div id="policyCoverageChoices">${c.data.coberturas.map(cov=>`<label class="policy-check"><input type="checkbox" data-policy-coverage="${esc(cov.id)}"${c.coverageIds.includes(cov.id)?' checked':''}>${esc(cov.nome_sugerido_seletor || cov.nome_contratual)}</label>`).join('')}</div>${field('policyCause','Causa do dano — informada pelo regulador',c.cause)}<details><summary>Dados contratuais que irão para o relatório</summary>${rowsHTML(P.reportRows(s))}</details><p>Documentos preservados na versão: ${c.documents.length} PDF(s) com referência de integridade. O backup das apólices inclui os arquivos; o backup do atendimento inclui os dados e referências da versão.</p>`:''}`;
    $('policyCoverageSummary').innerHTML=rowsHTML(P.reportRows(s));
    $('policyCalculationReview').innerHTML=c?`<details><summary>Conferência contratual da apuração</summary><p>O valor apurado de cada item deve ser o prejuízo indenizável conferido, após exclusões, depreciação e eventual rateio aplicável. Esta conferência não altera o parecer do regulador.</p>${field('policyReviewEvidence','Fundamentação e referências da conferência',r.evidence)}${check('policyReviewConfirmed','Conferi a base indenizável, a causa e o agrupamento dos itens/locais segurados.',r.confirmed)}<label class="field" for="policyUnitScope">Unidade de franquia não expressa na tabela</label><select id="policyUnitScope">${option('','Pendente de confirmação',r.unitScope)}${option('local','Por item/local segurado — confirmado nos documentos',r.unitScope)}</select><label class="field" for="policyMultipleRule">Mesmo evento com mais de uma cobertura</label><select id="policyMultipleRule">${option('','Pendente / não se aplica',r.multipleRule)}${option('highest_local','Maior franquia por local — conforme disposição contratual conferida',r.multipleRule)}</select>${check('policySubconditions','Conferi os bens, a causa e as condições do sublimite selecionado.',r.subconditions)}${check('policyRateio','Conferi primeiro risco relativo/absoluto e, quando cabível, já considerei o rateio no prejuízo apurado.',r.rateioConfirmed)}<p>VR da Ficha de risco (somente referência): benfeitorias ${esc(s.cooperatorSelection?.confirmed?.vrBuildings || 'não informado')}; animais ${esc(s.cooperatorSelection?.confirmed?.vrAnimals || 'não informado')}. Confirme abaixo o VR aplicável ao local; ajustes manuais e origens na ficha são preservados.</p><div class="grid2">${field('policyVrBuildings','VR confirmado — benfeitorias (R$)',r.vrBuildings,'number')}${field('policyVrAnimals','VR confirmado — animais (R$)',r.vrAnimals,'number')}</div>${field('policyBalanceEvidence','Comprovação da suficiência dos saldos dos agregados',r.balanceEvidence)}${check('policyBalance','Conferi utilização/reintegração e há saldo suficiente em todos os agregados aplicáveis para esta apuração.',r.balanceConfirmed)}</details>`:'<p>Cadastre a apólice para conferir as regras da apuração.</p>';
    for (const d of document.querySelectorAll('#policyCase details,#policyCalculationReview details')) if (opened.includes(d.querySelector('summary')?.textContent)) d.open=true;
  }
  function changed() { hooks.onChange();renderCase(true); }
  function reconcile() {
    if (!hooks) return false;
    const s=state();
    if (s.contractHold && s.contractHold!==P.context(s)) s.contractHold=null;
    const changed=P.reconcile(s,registry);
    if (s.contract) {
      for (const [k,v] of Object.entries(s.contract.autoFields || {})) {
        if (s.fields[k]!==v) s.contract.manualFields[k]=s.fields[k];
        else delete s.contract.manualFields[k];
      }
    }
    return changed;
  }
  async function persist(next) { await hooks.saveRegistry(next);registry=next;renderLibrary(); }
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
  function damageFields(item) {
    const s=state(),c=current(s),covs=P.selected(s);
    if (!c) return '';
    return `<div class="policy-damage"><div class="grid2"><div><label class="field">Cobertura do dano</label><select data-damage="coverageId">${option('','Usar única cobertura selecionada',item.coverageId)}${covs.map(cov=>option(cov.id,cov.nome_contratual,item.coverageId)).join('')}</select></div><div><label class="field">Item/local segurado (mesmo código para materiais do mesmo local)</label><input data-damage="insuredUnit" value="${esc(item.insuredUnit)}" placeholder="Código do local / item segurado"></div></div><div class="grid2"><div><label class="field">Grupo do bem — VR separado</label><select data-damage="assetClass">${option('','Selecione',item.assetClass)}${option('buildings','Benfeitorias',item.assetClass)}${option('animals','Animais',item.assetClass)}</select></div><div><label class="field">Condição específica do bem / sublimite</label><select data-damage="sublimitId">${option('','Nenhum sublimite selecionado',item.sublimitId)}${c.data.sublimites.map(x=>option(x.id,x.nome_contratual,item.sublimitId)).join('')}</select></div></div></div>`;
  }
  function captureReview() {
    const c=current(state());if (!c) return;
    c.review={evidence:$('policyReviewEvidence').value,confirmed:$('policyReviewConfirmed').checked,unitScope:$('policyUnitScope').value,multipleRule:$('policyMultipleRule').value,subconditions:$('policySubconditions').checked,rateioConfirmed:$('policyRateio').checked,vrBuildings:$('policyVrBuildings').value,vrAnimals:$('policyVrAnimals').value,balanceEvidence:$('policyBalanceEvidence').value,balanceConfirmed:$('policyBalance').checked,basis:P.reviewBasis(state())};
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
    if (act==='apply') { const v=version($('policyChoice').value);if (!v) throw Error('Escolha uma apólice do cadastro.');P.apply(s,v);changed(); }
    if (act==='use-contract-values') { const c=current(s);if (!c) return;const v={id:c.id,versionId:c.versionId,savedAt:c.savedAt,data:c.data,bindings:[c.binding],pdfs:c.documents};const ids=[...c.coverageIds];P.apply(s,v,{replaceManual:true});P.chooseCoverages(s,ids);changed(); }
    if (act==='bind') {
      const v=version($('policyChoice').value),key=P.riskKey(s.cooperatorSelection),from=$('policyBindFrom').value,to=$('policyBindTo').value,evidence=$('policyBindEvidence').value.trim();
      if (!v || !key) throw Error('Selecione a propriedade e a apólice.');
      if (!v.data.vinculos_propostos_consulta.some(b=>b.chave_base===s.cooperatorSelection.source.baseKey && b.atividade===s.cooperatorSelection.confirmed.activity)) throw Error('Base/atividade não prevista neste cadastro. Atualize o vínculo de base documentado antes de confirmar esta propriedade.');
      if (!$('policyBindConfirmed').checked || !evidence || !P.date(from) || !P.date(to) || from>to) throw Error('Informe período, referência documental e confirmação do vínculo individual.');
      const binding={riskKey:key,from,to,evidence,cooperative:$('policyBindCoop').value.trim(),confirmedAt:new Date().toISOString(),property:P.copy(s.cooperatorSelection)};
      const saved=P.saveVersion(registry,v.data,{pdfs:v.pdfs,bindings:[...v.bindings.filter(b=>b.riskKey!==key),binding]});await persist(saved.registry);
      reconcile();changed();notify('Vínculo individual salvo. A apólice só será aplicada quando a data for compatível e a escolha não for ambígua.');
    }
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
        if (el.matches('[data-policy-coverage]')) { P.chooseCoverages(state(),Array.from(document.querySelectorAll('[data-policy-coverage]:checked')).map(x=>x.dataset.policyCoverage));changed(); }
        if (el.id==='policyCause') { current(state()).cause=el.value;current(state()).review.confirmed=false;changed(); }
        if (el.closest('#policyCalculationReview')) { captureReview();changed(); }
      } catch(err) { notify(err.message,true); }
      finally { if (el.type==='file') el.value=''; }
    });
  }
  window.FastTrackPolicyUI={init,reconcile,render:renderCase,damageFields,rowsHTML,getRegistry:()=>P.copy(registry)};
})();
