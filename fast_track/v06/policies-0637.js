/* Contract registry and case snapshots. No customer contracts are bundled. */
(() => {
  'use strict';
  const copy = v => JSON.parse(JSON.stringify(v));
  const text = v => String(v == null ? '' : v).trim();
  const uid = () => `contract_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const unique = a => [...new Set(a)];
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const amount = v => v === '' || v == null ? null : typeof v === 'number' ? (Number.isFinite(v) ? v : null) : /^\d+(\.\d+)?$/.test(v) ? Number(v) : null;
  const money = v => v == null ? 'A apurar' : Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const date = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && Number.isFinite(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
  const stamp = (d,h) => {
    if (!date(d) || !/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(h || '')) return NaN;
    return Date.parse(`${d}T00:00:00Z`) + (Number(h.slice(0,2))*60+Number(h.slice(3)))*60000;
  };
  function validate(input) {
    if (!input || input.formato !== 'cadastro_contratual_de_referencia' || input.versao_formato !== 1) throw Error('Selecione um cadastro contratual de referência, versão 1. Este importador é separado do backup de atendimento e da base de cooperados.');
    const r = copy(input), o = r.operacao;
    if (!o || ['id','empresa_grupo_exibicao','segurado_razao_social','segurado_cnpj','seguradora_lider','numero_apolice','produto'].some(k=>!text(o[k]))) throw Error('Complete grupo, segurado, CNPJ, seguradora, número, produto e identificação do cadastro.');
    const v=o.vigencia || {};
    if (!(stamp(v.inicio_data_escrita,v.inicio_hora_escrita)<stamp(v.fim_data_escrita,v.fim_hora_escrita))) throw Error('Confira a vigência e as horas escritas no contrato. 24:00 corresponde ao fim da data.');
    if (!Array.isArray(r.coberturas) || !r.coberturas.length || r.coberturas.length>100) throw Error('Estruture ao menos uma cobertura. Anexar um PDF não conclui o cadastro.');
    for (const key of ['documentos','sublimites','endossos','pendencias_documentais','vinculos_propostos_consulta','clausulas_administrativas']) {
      if (r[key] == null) r[key]=[];
      if (!Array.isArray(r[key])) throw Error(`O campo ${key} deve ser uma lista.`);
    }
    for (const list of [r.coberturas,r.sublimites]) {
      if (unique(list.map(c=>c.id)).length !== list.length) throw Error('Há identificações de cobertura ou sublimite duplicadas.');
      for (const c of list) {
        if (!text(c.id) || !text(c.nome_contratual)) throw Error('Cada cobertura/sublimite deve possuir identificação e nome contratual.');
        if (c.tipo && c.tipo !== 'cobertura' && list === r.coberturas) throw Error('Cláusulas administrativas e sublimites não são coberturas reclamadas.');
      }
    }
    function numbers(obj) {
      for (const [k,vv] of Object.entries(obj || {})) {
        if (['__proto__','prototype','constructor'].includes(k)) throw Error('Chave de cadastro inválida.');
        if (vv && typeof vv === 'object') numbers(vv);
        else if (vv != null && (k.endsWith('_brl') || ['percentual','dias','periodo_indenitario_meses'].includes(k))) {
          if (typeof vv !== 'number' || !Number.isFinite(vv) || vv < 0 || (k==='percentual' && vv>100)) throw Error(`Valor contratual inválido em ${k}. Use número não negativo ou deixe pendente.`);
        }
      }
    }
    numbers(r);
    if (['__proto__','prototype','constructor'].includes(o.id)) throw Error('Identificação de cadastro inválida.');
    return r;
  }
  const emptyRegistry = () => ({formato:'fast_track_apolices',versao:1,versions:[],active:{}});
  function restore(input) {
    if (input?.formato !== 'fast_track_apolices' || input.versao !== 1 || !Array.isArray(input.versions) || !input.active || Array.isArray(input.active)) throw Error('Backup de apólices inválido.');
    const r=copy(input), seen=new Set();
    for (const v of r.versions) {
      v.data=validate(v.data);
      if (!v.versionId || seen.has(v.versionId) || v.id!==v.data.operacao.id || !Array.isArray(v.bindings) || !Array.isArray(v.pdfs)) throw Error('Versões contratuais inválidas.');
      seen.add(v.versionId);
      for (const b of v.bindings) if (!b.riskKey || !b.evidence || !date(b.from) || !date(b.to) || b.from>b.to) throw Error('Vínculo de propriedade inválido.');
      for (const p of v.pdfs) if (!/^data:application\/pdf;base64,JVBERi0/.test(p.dataUrl || '') || !/^[a-f0-9]{64}$/.test(p.sha256 || '')) throw Error('Documento PDF inválido no backup.');
    }
    for (const [id,versionId] of Object.entries(r.active)) if (!r.versions.some(v=>v.id===id && v.versionId===versionId)) throw Error('Versão ativa inexistente.');
    return r;
  }
  const activeVersions = r => Object.entries(r.active).map(([id,ver])=>r.versions.find(v=>v.id===id && v.versionId===ver)).filter(Boolean);
  function saveVersion(registry,data,{bindings=[],pdfs=[]}={}) {
    const checked=validate(data), r=copy(registry), v={id:checked.operacao.id,versionId:uid(),savedAt:new Date().toISOString(),data:checked,bindings:copy(bindings),pdfs:copy(pdfs)};
    for (const p of pdfs) { const ref=checked.documentos.find(d=>d.id===p.documentId);if (!ref || (ref.sha256 && ref.sha256!==p.sha256)) throw Error('A referência documental mudou. Confira o PDF vinculado antes de salvar a versão.'); }
    r.versions.push(v); r.active[v.id]=v.versionId; return {registry:r,version:v};
  }
  function riskKey(selection) {
    if (!selection?.sourceRecordId || !selection.source?.baseKey || selection.requiresReselection) return '';
    const c=selection.confirmed || {};
    return JSON.stringify([selection.source.baseKey,selection.sourceRecordId,selection.baseVersion?.sha256 || '',c.name,c.cooperative,c.activity,c.localIdentification,c.municipality,c.state,c.latitude,c.longitude,(c.installations || []).filter(i=>i.involved!==false).map(i=>[i.id,i.code,i.type]).sort()]);
  }
  const context = state => JSON.stringify([riskKey(state.cooperatorSelection),state.fields?.lossDate || '',state.fields?.lossTime || '']);
  function inPeriod(v,lossDate,lossTime='') {
    if (!date(lossDate)) return false;
    const start=stamp(v?.inicio_data_escrita,v?.inicio_hora_escrita), end=stamp(v?.fim_data_escrita,v?.fim_hora_escrita);
    const a=stamp(lossDate,lossTime || '00:00'), b=lossTime ? a : stamp(lossDate,'24:00')-1;
    return a>=start && b<end;
  }
  function compatible(version,state) {
    const key=riskKey(state.cooperatorSelection), day=state.fields?.lossDate;
    if (!key || !inPeriod(version.data.operacao.vigencia,day,state.fields?.lossTime)) return null;
    return version.bindings.find(b=>b.riskKey===key && b.from<=day && b.to>=day && text(b.evidence)) || null;
  }
  const candidates = (r,s) => activeVersions(r).filter(v=>compatible(v,s));
  const current = s => s.contract?.context===context(s) ? s.contract : null;
  const selected = s => { const c=current(s); return c ? c.data.coberturas.filter(x=>(c.coverageIds || []).includes(x.id)) : []; };
  function clearAutomatic(state) {
    const c=state.contract;
    for (const [k,v] of Object.entries(c?.autoFields || {})) if (state.fields[k]===v) state.fields[k]='';
    if (c) { state.contractHistory=state.contractHistory || []; state.contractHistory.push(copy(c)); }
    state.contract=null;
  }
  function apply(state,version,{replaceManual=false}={}) {
    const binding=compatible(version,state);
    if (!binding) throw Error('Confirme o vínculo individual e a vigência antes de aplicar esta apólice.');
    clearAutomatic(state);
    const o=version.data.operacao;
    const values={companyGroup:o.empresa_grupo_exibicao,affiliatedCooperative:binding.cooperative || state.cooperatorSelection.confirmed.cooperative || '',insured:o.segurado_razao_social,insuredCnpj:o.segurado_cnpj,insurer:o.seguradora_lider,policyNumber:o.numero_apolice,productName:o.produto};
    const autoFields={}, manualFields={};
    for (const [k,v] of Object.entries(values)) {
      if (!state.fields[k] || replaceManual) { state.fields[k]=v; autoFields[k]=v; }
      else if (state.fields[k]!==v) manualFields[k]=state.fields[k];
      else autoFields[k]=v;
    }
    state.contract={schemaVersion:1,id:version.id,versionId:version.versionId,savedAt:version.savedAt,appliedAt:new Date().toISOString(),context:context(state),data:copy(version.data),binding:copy(binding),documents:version.pdfs.map(p=>({documentId:p.documentId,name:p.name,sha256:p.sha256})),coverageIds:[],autoFields,manualFields,review:{},cause:''};
    return state.contract;
  }
  function reconcile(state,registry) {
    let changed=false;
    if (state.contract && !current(state)) { clearAutomatic(state); changed=true; }
    if (!state.contract && !state.contractHold) {
      const list=candidates(registry,state);
      if (list.length===1) { apply(state,list[0]); changed=true; }
    }
    return changed;
  }
  function chooseCoverages(state,ids) {
    const c=current(state); if (!c) throw Error('Selecione uma apólice com vínculo confirmado.');
    const accepted=unique(ids).filter(id=>c.data.coberturas.some(x=>x.id===id));
    c.coverageIds=accepted; c.review={};
    state.fields.coverageName=selected(state).map(x=>x.nome_contratual).join('; ');
    c.autoFields.coverageName=state.fields.coverageName;
    for (const d of state.damages || []) { if (!accepted.includes(d.coverageId)) d.coverageId=''; d.sublimitId=''; }
  }
  function reviewBasis(state) {
    const c=current(state),v=state.cooperatorSelection?.confirmed;
    return JSON.stringify([c?.versionId,c?.coverageIds,c?.cause,v?.vrBuildings,v?.vrAnimals,(state.damages || []).map(d=>[d.id,d.assessedTotal,d.coverageId,d.insuredUnit,d.assetClass,d.sublimitId])]);
  }
  function normalizeSnapshot(snapshot) {
    if (!snapshot) return null;
    const c=copy(snapshot);c.data=validate(c.data);
    if (c.schemaVersion!==1 || !c.context || !c.versionId || !c.binding?.riskKey || !c.binding?.evidence || !Array.isArray(c.coverageIds) || !Array.isArray(c.documents)) throw Error('Versão contratual do atendimento inválida.');
    if (c.id!==c.data.operacao.id || c.coverageIds.some(id=>!c.data.coberturas.some(x=>x.id===id))) throw Error('Cobertura da versão contratual inválida.');
    c.autoFields=c.autoFields || {};c.manualFields=c.manualFields || {};c.review=c.review || {};return c;
  }
  function damageNote(state,d) {
    const c=current(state);if (!c) return '';
    const cov=selected(state).find(x=>x.id===d.coverageId) || (selected(state).length===1?selected(state)[0]:null),sub=c.data.sublimites.find(x=>x.id===d.sublimitId);
    return [cov?.nome_contratual,`Item/local: ${d.insuredUnit || 'a confirmar'}`,d.assetClass==='buildings'?'Benfeitorias':d.assetClass==='animals'?'Animais':'Grupo do bem a confirmar',sub?.nome_contratual].filter(Boolean).join(' · ');
  }
  function sourceText(refs) {
    return (refs || []).map(r=>[r.documento,(r.paginas_pdf || []).length ? `p. ${r.paginas_pdf.join(', ')}` : '',r.clausula_ou_secao].filter(Boolean).join(' · ')).join('; ');
  }
  function limits(c) {
    const rows=[];
    for (const [key,label] of [['lmi_brl','LMI nominal'],['sublimite_por_evento_brl','Sublimite por evento'],['limite_evento_ou_teto_unidade_brl','Por evento ou teto por unidade'],['agregado_brl','Agregado contratual']]) if (c[key]!=null) rows.push(`${label}: ${money(c[key])}`);
    for (const [key,label] of [['por_evento_brl','Por evento'],['por_unidade_brl','Por unidade/local'],['agregado_brl','Agregado contratual']]) if (c.limites?.[key]!=null) rows.push(`${label}: ${money(c.limites[key])}`);
    return rows;
  }
  function deductibleText(f={}) {
    if (f.aplicacao_condicionada) return [f.texto_original,f.demais_eventos,`Base e unidade: ${deductibleText(f.aplicacao_condicionada)}`].filter(Boolean).join(' ');
    if (f.tipo==='temporal') return `${f.dias} dias. ${f.cumulatividade || ''}`;
    if (f.tipo==='percentual_com_minimo') return `${f.percentual}% com mínimo de ${money(f.minimo_brl)}. Base: ${f.base_de_calculo || 'a confirmar'}. Unidade: ${f.unidade_de_aplicacao || 'pendente de confirmação documental'}.`;
    if (f.tipo==='sem_franquia') return 'Sem franquia, conforme referência cadastrada.';
    return f.texto_original || 'Franquia pendente de estruturação.';
  }
  function reportRows(state) {
    const c=current(state);
    if (!c) return [['Situação','Cadastro contratual e vínculo individual pendentes. Dados manuais não confirmam contratação ou amparo.']];
    const o=c.data.operacao,v=o.vigencia, rows=[['Identificação contratual',`${o.empresa_grupo_exibicao} · ${o.segurado_razao_social} · CNPJ ${o.segurado_cnpj} · ${o.seguradora_lider} · Apólice ${o.numero_apolice} · ${o.produto}`],['Vigência',`${v.inicio_data_escrita} às ${v.inicio_hora_escrita} até ${v.fim_data_escrita} às ${v.fim_hora_escrita}. ${v.fuso || ''}`],['Versão utilizada',`${c.versionId} · cadastrada em ${c.savedAt}. Vínculo: ${c.binding.evidence} (${c.binding.from} a ${c.binding.to}).`]];
    if (!selected(state).length) rows.push(['Cobertura reclamada','Seleção pendente.']);
    for (const cov of selected(state)) {
      rows.push([cov.nome_contratual,[cov.codigo_contratual,...limits(cov)].filter(Boolean).join(' · ')],['Franquia',deductibleText(cov.franquia)]);
      if (cov.eventos_previstos?.length) rows.push(['Eventos da mesma cobertura',`${cov.eventos_previstos.join(', ')}. ${cov.observacao_eventos || ''}`]);
      if (cov.atividades_expressamente_indicadas) rows.push(['Atividades indicadas',cov.atividades_expressamente_indicadas.join(', ')]);
      if (Object.hasOwn(cov,'periodo_indenitario_meses')) rows.push(['Período indenitário',cov.periodo_indenitario_meses==null ? 'Pendente de conciliação documental.' : `${cov.periodo_indenitario_meses} meses`]);
      for (const note of cov.observacoes || []) rows.push(['Condição / observação',note]);
      if (cov.condicao) rows.push(['Condição',cov.condicao]);
      rows.push(['Fonte',sourceText(cov.fontes)]);
    }
    rows.push(['Causa do dano',c.cause || 'A definir pelo regulador; não inferida pela cobertura selecionada.']);
    const used=unique((state.damages || []).map(d=>d.sublimitId).filter(Boolean));
    for (const sub of c.data.sublimites) {
      rows.push([`${used.includes(sub.id)?'Sublimite selecionado':'Sublimite a conferir'} — ${sub.nome_contratual}`,[...limits(sub),sub.texto_limite,sub.condicao,sub.vinculo_cobertura,deductibleText(sub.franquia),sourceText(sub.fontes)].filter(Boolean).join(' · ')]);
    }
    if (c.data.limites_gerais?.lmg_nominal_especificacao_brl!=null) rows.push(['LMG nominal da especificação',`${money(c.data.limites_gerais.lmg_nominal_especificacao_brl)}. ${c.data.limites_gerais.pendencia || ''}`]);
    rows.push(['Limites e amparo','Agregado não representa saldo disponível nem limite individual. VR de benfeitorias e animais permanecem separados. Seleção contratual não substitui análise de amparo nem altera o parecer.']);
    for (const p of c.data.pendencias_documentais) rows.push([`Pendência — ${p.campo}`,`${p.descricao} ${p.impacto || ''} ${sourceText(p.fontes)}`]);
    for (const [key,val] of Object.entries(c.manualFields || {})) rows.push(['Ajuste manual preservado',`${key}: ${val}. Confira a identificação divergente antes de concluir.`]);
    if (c.review?.evidence) rows.push(['Conferência da apuração',c.review.evidence]);
    return rows;
  }
  function calculate(state) {
    const ds=state.damages || [], total=k=>round(ds.reduce((sum,d)=>sum+(amount(d[k]) || 0),0));
    const result={totalClaimed:total('claimedTotal'),totalAssessed:total('assessedTotal'),deductible:null,net:null,estimatedNet:null,materialNet:null,groups:[],pending:[]};
    const c=current(state), fail=m=>result.pending.push(m);
    if (!c) { fail('Apólice e vínculo individual pendentes.'); return result; }
    const covs=selected(state), review=c.review || {};
    if (!covs.length) { fail('Selecione a cobertura reclamada.'); return result; }
    if (!ds.length) { fail('Apuração ainda sem itens.'); return result; }
    if (!review.confirmed || !text(review.evidence)) fail('Confirme a base indenizável, as exclusões, a causa e o agrupamento por item/local, com referência documental.');
    if (review.confirmed && review.basis!==reviewBasis(state)) fail('A apuração ou o VR mudou após a conferência. Confira novamente a base indenizável e os limites.');
    const groups=new Map(), expected=new Map();
    let hasLC=false, deductibleUnknown=false, limitUnknown=false;
    for (const d of ds) {
      const id=d.coverageId || (covs.length===1 ? covs[0].id : ''), cov=covs.find(x=>x.id===id), a=amount(d.assessedTotal);
      if (!cov) { fail('Associe cada dano a uma cobertura selecionada.'); deductibleUnknown=true; continue; }
      if (a==null || a<0) { fail('Preencha os prejuízos indenizáveis conferidos de cada item.'); deductibleUnknown=true; continue; }
      if (cov.franquia?.tipo==='temporal' || cov.id==='lucros_cessantes') { hasLC=true; fail('Lucros Cessantes exigem apuração específica e conciliação do período indenitário; fórmula material não aplicada.'); continue; }
      if (!text(d.insuredUnit)) { fail('Informe o item/local segurado de cada dano; linhas de materiais não são unidades de franquia.'); deductibleUnknown=true; continue; }
      const key=JSON.stringify([id,d.insuredUnit]), g=groups.get(key) || {id,unit:d.insuredUnit,cov,loss:0,items:[],deductible:null,net:null};
      g.loss=round(g.loss+a);g.items.push(d);groups.set(key,g);
    }
    for (const g of groups.values()) {
      let f=g.cov.franquia || {};
      if (f.aplicacao_condicionada) {
        if (c.cause!==f.aplicacao_condicionada.evento) { fail(`Franquia condicionada à causa: ${g.cov.nome_contratual}. Demais causas exigem regra documental própria.`); deductibleUnknown=true; continue; }
        f=f.aplicacao_condicionada;
      }
      if (g.cov.id==='basica_2' && !review.rateioConfirmed) { fail('Cobertura Básica: conferir contratação a primeiro risco relativo e eventual rateio por insuficiência de VR.'); limitUnknown=true; }
      const normalized=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if (f.tipo==='percentual_com_minimo' && !normalized(f.base_de_calculo).includes('prejuizos indenizaveis')) { fail(`Base de cálculo não automatizada: ${g.cov.nome_contratual}. Confira a fórmula contratual específica.`);deductibleUnknown=true;continue; }
      if (f.unidade_de_aplicacao && !/^por (?:item\s*\/\s*local(?: sinistrado)?|local(?: segurado| sinistrado)?|item segurado)$/.test(normalized(f.unidade_de_aplicacao))) { fail(`Unidade de franquia exige apuração específica: ${f.unidade_de_aplicacao}.`);deductibleUnknown=true;continue; }
      if (!f.unidade_de_aplicacao && review.unitScope!=='local') { fail(`Unidade de aplicação da franquia pendente: ${g.cov.nome_contratual}.`); deductibleUnknown=true; continue; }
      if (f.tipo==='percentual_com_minimo' && amount(f.percentual)!=null && amount(f.minimo_brl)!=null) g.deductible=round(Math.max(g.loss*f.percentual/100,f.minimo_brl));
      else if (f.tipo==='sem_franquia') g.deductible=0;
      else { fail(`Franquia não automatizada: ${g.cov.nome_contratual}.`); deductibleUnknown=true; continue; }
      g.net=round(Math.max(0,g.loss-g.deductible));
      const subs=unique(g.items.map(d=>d.sublimitId || ''));
      if (subs.some(Boolean)) {
        if (subs.length>1) { fail('Há bens sujeitos a sublimites diferentes no mesmo local/cobertura. A distribuição da franquia e dos limites exige apuração específica.'); limitUnknown=true; }
        else {
          const sub=c.data.sublimites.find(x=>x.id===subs[0]);
          if (!sub || !review.subconditions) { fail('Confirme o enquadramento da causa e as condições do sublimite (inclusive instalação, quando exigida).'); limitUnknown=true; }
          else {
            if (!sub.franquia?.unidade_de_aplicacao && review.unitScope!=='local') { fail('Confirme a unidade de aplicação da franquia do sublimite.'); deductibleUnknown=true; }
            if (sub.franquia?.tipo!==f.tipo || sub.franquia?.percentual!==f.percentual || sub.franquia?.minimo_brl!==f.minimo_brl) { fail('Franquias da cobertura e do sublimite diferem; conferir sua interação.'); deductibleUnknown=true; }
            if (sub.limite_evento_ou_teto_unidade_brl!=null) g.net=Math.min(g.net,sub.limite_evento_ou_teto_unidade_brl);
            if (sub.agregado_brl!=null) expected.set(`sub:${sub.id}`,sub.agregado_brl);
          }
        }
      }
      const lim=g.cov.limites || {};
      if (lim.por_unidade_brl!=null) g.net=Math.min(g.net,lim.por_unidade_brl);
      if (c.data.limites_gerais?.limite_ao_vr_local) {
        const types=unique(g.items.map(d=>d.assetClass));
        if (types.length!==1 || !['buildings','animals'].includes(types[0])) { fail('Separe a apuração por benfeitorias/animais; não há compensação automática de VR entre grupos.'); limitUnknown=true; }
        else {
          const vr=amount(review[types[0]==='buildings'?'vrBuildings':'vrAnimals']);
          if (vr==null) { fail(`Confirme o VR do local para ${types[0]==='buildings'?'benfeitorias':'animais'}, sem somá-los.`); limitUnknown=true; }
          else g.net=Math.min(g.net,vr);
        }
      }
      if (lim.agregado_brl!=null) expected.set(`cov:${g.id}`,lim.agregado_brl);
    }
    result.groups=[...groups.values()];
    const locals=unique(result.groups.map(g=>g.unit));
    for (const local of locals) {
      const same=result.groups.filter(g=>g.unit===local);
      if (same.length>1) {
        if (review.multipleRule!=='highest_local') { fail('Confirme a regra do mesmo evento com múltiplas coberturas: maior franquia por local ou disposição particular.'); deductibleUnknown=true; }
        else if (same.some(g=>g.net!=null && g.net<Math.max(0,g.loss-g.deductible))) { fail('Múltiplas coberturas atingem limites/sublimites no mesmo local: apurar a alocação da franquia sem rateio presumido.'); limitUnknown=true; }
      }
    }
    if (!deductibleUnknown && result.groups.length) {
      result.deductible=round(locals.reduce((sum,local)=>sum+Math.max(...result.groups.filter(g=>g.unit===local).map(g=>g.deductible)),0));
      let material=result.groups.reduce((sum,g)=>sum+(g.net || 0),0);
      for (const local of locals) {
        const same=result.groups.filter(g=>g.unit===local);
        if (same.length>1) {
          const localNet=Math.max(0,same.reduce((s,g)=>s+g.loss,0)-Math.max(...same.map(g=>g.deductible)));
          material+=localNet-same.reduce((s,g)=>s+(g.net || 0),0);
          if (c.data.limites_gerais?.limite_ao_vr_local) {
            const types=unique(same.flatMap(g=>g.items.map(d=>d.assetClass)));
            const vr=types.length===1 ? amount(review[types[0]==='buildings'?'vrBuildings':'vrAnimals']) : null;
            if (vr==null || localNet>vr) { fail('VR compartilhado entre coberturas/grupos: conferir a alocação por tipo de bem e local.');limitUnknown=true; }
          }
        }
      }
      for (const cov of covs) {
        const gs=result.groups.filter(g=>g.id===cov.id), before=gs.reduce((s,g)=>s+(g.net || 0),0);
        const caps=[cov.lmi_brl,cov.sublimite_por_evento_brl,cov.limites?.por_evento_brl].filter(v=>v!=null);
        if (caps.length && before>Math.min(...caps)) {
          if (locals.some(l=>result.groups.filter(g=>g.unit===l).length>1)) { fail('Limite por evento atingido com coberturas simultâneas: conferir alocação.'); limitUnknown=true; }
          else material-=before-Math.min(...caps);
        }
      }
      // A shared sublimit is one event ceiling, not a fresh allowance per local or coverage.
      for (const sub of c.data.sublimites) {
        const gs=result.groups.filter(g=>g.items.some(d=>d.sublimitId===sub.id));
        if (gs.length>1) { fail('Sublimite compartilhado entre locais/coberturas: conciliar o teto do evento e a alocação antes do líquido.'); limitUnknown=true; }
      }
      if (locals.length>1 && c.data.limites_gerais?.limite_ao_vr_local) { fail('Múltiplos locais: conferir VR e saldos de cada local separadamente.'); limitUnknown=true; }
      if (c.data.limites_gerais?.lmg_nominal_especificacao_brl!=null && !c.data.limites_gerais.pendencia) material=Math.min(material,c.data.limites_gerais.lmg_nominal_especificacao_brl);
      result.materialNet=limitUnknown ? null : round(Math.max(0,material));
      result.estimatedNet=result.materialNet;
    }
    if (expected.size && !review.balanceConfirmed) fail('Saldo disponível dos agregados não confirmado; limites nominais não são saldos.');
    if (expected.size && review.balanceConfirmed && !text(review.balanceEvidence)) fail('Informe a comprovação dos saldos disponíveis e de sua suficiência para esta apuração.');
    for (const [key,nominal] of expected) {
      const [kind,id]=key.split(':');
      const used=result.groups.filter(g=>kind==='cov'?g.id===id:g.items.some(d=>d.sublimitId===id)).reduce((sum,g)=>sum+(g.net || 0),0);
      if (used>nominal) fail('A apuração supera um agregado nominal; a confirmação de suficiência não substitui a conciliação dos saldos/limites.');
    }
    if (Object.keys(c.manualFields || {}).length) fail('Há identificação contratual ajustada manualmente; confira as divergências.');
    if (c.data.limites_gerais?.pendencia) fail('LMG/cosseguro pendentes de conciliação documental. A estimativa material é preservada; o líquido final e o rateio entre seguradoras não são automatizados.');
    if (!result.pending.length && !hasLC && result.estimatedNet!=null) result.net=result.estimatedNet;
    result.pending=unique(result.pending); return result;
  }
  const api={copy,uid,amount,money,date,stamp,validate,emptyRegistry,restore,activeVersions,saveVersion,riskKey,context,inPeriod,compatible,candidates,current,selected,apply,reconcile,clearAutomatic,chooseCoverages,reviewBasis,normalizeSnapshot,damageNote,limits,deductibleText,sourceText,reportRows,calculate};
  window.FastTrackPolicies=api;
  if (window.FastTrackV06Report) window.FastTrackV06Report.calculate=calculate;
})();
