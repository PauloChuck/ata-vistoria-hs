/* Contract registry and case snapshots. No customer contracts are bundled. */
(() => {
  'use strict';
  const copy = v => JSON.parse(JSON.stringify(v));
  const text = v => String(v == null ? '' : v).trim();
  const uid = () => `contract_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const unique = a => [...new Set(a)];
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
    if (!o || ['id','empresa_grupo_exibicao','segurado_razao_social','segurado_cnpj','seguradora_lider','numero_apolice'].some(k=>!text(o[k]))) throw Error('Complete grupo, segurado, CNPJ, seguradora, número e identificação do cadastro.');
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
      if (v.bindings == null) v.bindings=[];
      if (!v.versionId || seen.has(v.versionId) || v.id!==v.data.operacao.id || !Array.isArray(v.pdfs)) throw Error('Versões contratuais inválidas.');
      seen.add(v.versionId);
      // Legacy inclusion metadata is retained for history, never required or applied.
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
  const contractFields=['companyGroup','affiliatedCooperative','insured','insuredCnpj','insurer','policyNumber','productName','coverageName'];
  const insuredKey = data => {
    const o=data.operacao,cnpj=text(o.segurado_cnpj).replace(/\D/g,'');
    return cnpj.length===14 && !/^0+$/.test(cnpj) ? `cnpj:${cnpj}` : `name:${text(o.segurado_razao_social).toLocaleLowerCase('pt-BR')}`;
  };
  const forInsured = (r,key) => activeVersions(r).filter(v=>insuredKey(v.data)===key);
  const insureds = r => [...new Map(activeVersions(r).map(v=>[insuredKey(v.data),{key:insuredKey(v.data),name:v.data.operacao.segurado_razao_social,group:v.data.operacao.empresa_grupo_exibicao,cnpj:v.data.operacao.segurado_cnpj}])).values()];
  const current = s => s.contract || null;
  const selected = s => { const c=current(s); return c ? c.data.coberturas.filter(x=>(c.coverageIds || []).includes(x.id)) : []; };
  const selectedSublimits = s => { const c=current(s); return c ? c.data.sublimites.filter(x=>(c.sublimitIds || []).includes(x.id)) : []; };
  const displayName = c => text(c.nome_sugerido_seletor) || text(c.nome_contratual);
  function updateCoverageName(state) {
    state.fields.coverageName=[...selected(state),...selectedSublimits(state)].map(displayName).join('; ');
    state.contract.autoFields.coverageName=state.fields.coverageName;
  }
  function clearAutomatic(state) {
    const c=state.contract;
    for (const k of contractFields) state.fields[k]='';
    if (c) { state.contractHistory=state.contractHistory || []; state.contractHistory.push(copy(c)); }
    state.contract=null;
    state.policyInsuredKey='';
    delete state.contractHold;
    for (const d of state.damages || []) { d.coverageId='';d.sublimitId=''; }
  }
  function apply(state,version,{source='policy'}={}) {
    if (!version?.versionId) throw Error('Selecione uma apólice do cadastro.');
    const data=validate(version.data);
    clearAutomatic(state);
    const o=data.operacao,values={companyGroup:o.empresa_grupo_exibicao,affiliatedCooperative:o.cooperativa_afiliada || '',insured:o.segurado_razao_social,insuredCnpj:o.segurado_cnpj,insurer:o.seguradora_lider,policyNumber:o.numero_apolice,productName:o.produto || '',coverageName:''};
    Object.assign(state.fields,values);
    state.policyInsuredKey=insuredKey(data);
    state.contract={schemaVersion:2,id:version.id,versionId:version.versionId,savedAt:version.savedAt,appliedAt:new Date().toISOString(),selection:{mode:'case_choice',source,insuredKey:state.policyInsuredKey},data,documents:(version.pdfs || []).map(p=>({documentId:p.documentId,name:p.name,sha256:p.sha256})),coverageIds:[],sublimitIds:[],autoFields:copy(values),manualFields:{},review:{},cause:''};
    return state.contract;
  }
  function selectInsured(state,registry,key) {
    const list=forInsured(registry,key);
    clearAutomatic(state);state.policyInsuredKey=key;
    if (list.length===1) return apply(state,list[0],{source:'insured_single_policy'});
    if (list.length) Object.assign(state.fields,{insured:list[0].data.operacao.segurado_razao_social,insuredCnpj:list[0].data.operacao.segurado_cnpj});
    return null;
  }
  // Property/date edits and registry updates never replace the case's chosen version.
  const reconcile = () => false;
  function chooseCoverages(state,ids) {
    const c=current(state); if (!c) throw Error('Selecione uma apólice.');
    const accepted=unique(ids).filter(id=>c.data.coberturas.some(x=>x.id===id));
    c.coverageIds=accepted; c.review={};
    updateCoverageName(state);
    for (const d of state.damages || []) { if (!accepted.includes(d.coverageId)) d.coverageId=''; d.sublimitId=''; }
  }

  function chooseSublimits(state,ids) {
    const c=current(state); if (!c) throw Error('Selecione uma apólice.');
    c.sublimitIds=unique(ids).filter(id=>c.data.sublimites.some(x=>x.id===id));
    updateCoverageName(state);
  }

  function normalizeSnapshot(snapshot) {
    if (!snapshot) return null;
    const c=copy(snapshot);c.data=validate(c.data);
    if (![1,2].includes(c.schemaVersion) || !c.versionId || !Array.isArray(c.coverageIds) || !Array.isArray(c.documents)) throw Error('Versão contratual do atendimento inválida.');
    if (c.id!==c.data.operacao.id || c.coverageIds.some(id=>!c.data.coberturas.some(x=>x.id===id))) throw Error('Cobertura da versão contratual inválida.');
    if (c.sublimitIds==null) c.sublimitIds=[];
    if (!Array.isArray(c.sublimitIds) || c.sublimitIds.some(id=>!c.data.sublimites.some(x=>x.id===id))) throw Error('Sublimite da versão contratual inválido.');
    c.coverageIds=unique(c.coverageIds);c.sublimitIds=unique(c.sublimitIds);
    c.autoFields=c.autoFields || {};c.manualFields=c.manualFields || {};c.review=c.review || {};return c;
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
  // Report projection only: the immutable contract snapshot keeps all source details.
  function reportLimit(c) {
    const entries=[];
    const add=(label,value)=>{if (amount(value)!=null) entries.push(`${label}: ${money(value)}`);};
    add('LMI',c.lmi_brl);
    add('Por evento',c.sublimite_por_evento_brl);
    add('Por evento ou unidade/local',c.limite_evento_ou_teto_unidade_brl);
    add('Por evento',c.limites?.por_evento_brl);
    add('Por unidade/local',c.limites?.por_unidade_brl);
    add('Agregado',c.agregado_brl);
    add('Agregado',c.limites?.agregado_brl);
    const values=unique(entries);
    if (values.length===1 && values[0].startsWith('LMI: ')) return values[0].slice(5);
    return values.join('\n') || 'Não informado';
  }
  function reportDeductible(f) {
    if (!f) return 'Não informada';
    if (f.aplicacao_condicionada) {
      const rule=f.aplicacao_condicionada;
      const other=typeof f.demais_eventos==='object' ? reportDeductible(f.demais_eventos)
        : /^(?:sem franquia|não (?:há|ha|se aplica) franquia)[.\s]*$/i.test(text(f.demais_eventos)) ? 'Sem franquia' : 'Não informada';
      return `${text(rule.evento) || 'Aplicação condicionada'}: ${reportDeductible(rule)}${f.demais_eventos ? `\nDemais eventos: ${other}` : ''}`;
    }
    if (f.tipo==='sem_franquia') return 'Sem franquia';
    if (f.tipo==='temporal') return amount(f.dias)==null ? 'Não informada' : `${f.dias} dias`;
    if (f.tipo==='percentual_com_minimo') {
      const percent=amount(f.percentual),minimum=amount(f.minimo_brl);
      return `${percent==null ? 'Percentual não informado' : `${percent.toLocaleString('pt-BR')}%`}${minimum==null ? '; mínimo não informado' : ` com mínimo de ${money(minimum)}`}`;
    }
    return 'Não informada';
  }
  function reportRows(state) {
    // Only explicit case-level choices; legacy damage metadata never selects a row.
    return [...selected(state),...selectedSublimits(state)].map(c=>[displayName(c),reportLimit(c),reportDeductible(c.franquia)]);
  }
  const calculate = state => window.FastTrackSettlement.calculate(state);
  const api={copy,uid,amount,money,date,stamp,validate,emptyRegistry,restore,activeVersions,saveVersion,insuredKey,insureds,forInsured,selectInsured,current,selected,selectedSublimits,displayName,apply,reconcile,clearAutomatic,chooseCoverages,chooseSublimits,normalizeSnapshot,limits,deductibleText,sourceText,reportLimit,reportDeductible,reportRows,calculate};
  window.FastTrackPolicies=api;
  if (window.FastTrackV06Report) window.FastTrackV06Report.calculate=calculate;
})();
