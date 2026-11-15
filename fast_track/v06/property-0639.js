(() => {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const text = x => String(x == null ? '' : x).trim();
  const fields = ['activity','municipality','state','localIdentification','latitude','longitude','area','areaUnit','capacity','capacityUnit','capacityConcept','vrBuildings','vrAnimals'];
  const id = () => `installation_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const money = value => value == null ? 'Não informado' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
  function number(value) {
    if (!text(value)) return null;
    const n = window.FastTrackCooperators.formatters.number(value);
    return n.value != null && !n.ambiguous && Number.isFinite(n.value) && n.value >= 0 ? n.value : null;
  }
  function normalize(value) {
    const c = copy(value || {});
    c.version = 1; c.name = text(c.name); c.complete = c.complete === true;
    c.records = Array.isArray(c.records) ? c.records.filter((r,i,a)=>r?.id && a.findIndex(x=>x.id===r.id)===i) : [];
    c.assignments = c.assignments || {}; c.totals = c.totals || {};
    c.units = (Array.isArray(c.units) ? c.units : []).filter((u,i,a)=>u?.id && a.findIndex(x=>x.id===u.id)===i).map(u=>({...u,selected:u.selected!==false,affected:u.affected===true}));
    for (const r of c.records) {
      const a=c.assignments[r.id];
      if (!a || !['unit','history','other','total'].includes(a.kind) || (a.kind==='unit' && !c.units.some(u=>u.id===a.unitId))) c.assignments[r.id]={kind:'unresolved'};
    }
    return c;
  }
  function create(records=[],name='') {
    return normalize({name,records:copy(records),units:[],assignments:{},totals:{},complete:false});
  }
  function add(c,records) {
    for (const r of records) if (!c.records.some(x=>x.id===r.id)) { c.records.push(copy(r)); c.assignments[r.id]={kind:'unresolved'}; c.complete=false; }
  }
  function versions(c,unit) { return c.records.filter(r=>c.assignments[r.id]?.kind==='unit' && c.assignments[r.id].unitId===unit.id); }
  function effective(c,unit) { return versions(c,unit).find(r=>r.id===unit.applicable) || (unit.manual ? unit.values : null); }
  function details(c,unit) {
    return effective(c,unit) || Object.fromEntries(['activity','municipality','state','localIdentification','latitude','longitude'].map(key=>[key,unit.identity?.[key] || '']));
  }
  // Repetition is a display grouping only. Physical identity always requires an explicit decision.
  function repetitionKey(r) {
    const stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x==='object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])) : x;
    return JSON.stringify(stable({baseKey:r.baseKey,activity:r.activity,name:r.name,category:r.category,reference:r.reference,raw:r.raw || r.source?.rawRecord || r}));
  }
  function groups(c) {
    const map=new Map();
    for (const r of c.records) { const key=repetitionKey(r); if(!map.has(key))map.set(key,[]); map.get(key).push(r); }
    return [...map.values()];
  }
  function assign(c,recordIds,{kind,unitId,label,applicable=false}) {
    if (!['new','unit','history','other','total','unresolved'].includes(kind)) throw Error('Escolha como identificar o registro.');
    const records=recordIds.map(key=>c.records.find(r=>r.id===key));
    if (!records.length || records.some(r=>!r)) throw Error('Registro não encontrado.');
    if (['new','unit','total'].includes(kind) && !text(c.name)) throw Error('Informe a identificação da propriedade antes de associar registros.');
    if (kind==='new' && !text(label)) throw Error('Informe a identificação da instalação física.');
    if (kind==='unit' && !c.units.some(u=>u.id===unitId && !u.manual)) throw Error('Escolha a instalação que receberá esta versão.');
    if (['new','unit'].includes(kind) && records.some(r=>r.raw?.totalPropriedade===true || r.raw?.escopoValores==='propriedade')) throw Error('Este registro está identificado como total da propriedade. Classifique-o como total consolidado.');
    if (kind==='new') { unitId=id(); c.units.push({id:unitId,label:text(label),identity:copy(records[0]),selected:true,affected:false,applicable:''}); kind='unit'; }
    for (const r of records) {
      for (const u of c.units) if(u.applicable===r.id)u.applicable='';
      for (const key of ['vrBuildings','vrAnimals']) if(c.totals[key]===r.id)c.totals[key]='';
      c.assignments[r.id]={kind,...(kind==='unit'?{unitId}:{})};
    }
    if (kind==='unit' && applicable) c.units.find(u=>u.id===unitId).applicable=records[0].id;
    c.complete=false;
    // A moved source must never leave behind a phantom installation or duplicated value.
    c.units=c.units.filter(u=>u.manual || versions(c,u).length);
    return unitId;
  }
  function manual(c,label,values) {
    if(!text(c.name)||!text(label))throw Error('Identifique a propriedade e a instalação física.');
    const unit={id:id(),label:text(label),selected:true,affected:false,manual:true,values:copy(values)};
    c.units.push(unit);c.complete=false;return unit.id;
  }
  function totals(value) {
    const c=normalize(value),selected=c.units.filter(u=>u.selected);
    const unresolved=c.records.filter(r=>c.assignments[r.id]?.kind==='unresolved').length;
    const full=c.complete && c.units.length>0 && selected.length===c.units.length && !unresolved;
    const scope=full ? 'VR total da propriedade' : 'VR das instalações selecionadas';
    const result={scope,full,unresolved,count:selected.length,totalCount:c.units.length,fields:{}};
    for (const key of ['vrBuildings','vrAnimals']) {
      const totalId=c.totals[key],total=c.records.find(r=>r.id===totalId && c.assignments[r.id]?.kind==='total');
      let amount=null,missing=0,pending=unresolved>0 || !selected.length,origin='Soma das instalações distintas selecionadas';
      if (totalId) {
        // A whole-property figure cannot be attributed to an expressly partial selection.
        if (total && full) { amount=number(total[key]);missing=amount==null?1:0;origin=`Total consolidado confirmado — ${[total.category,total.reference].filter(Boolean).join(' · ') || 'registro do cadastro'}. Substitui a soma das instalações.`; }
        else { pending=true;origin='Total consolidado não aplicado: confirme a composição completa da propriedade ou use a soma das instalações.'; }
      } else {
        let cents=0,available=0;
        for (const u of selected) {
          const r=effective(c,u),v=number(r?.[key]);
          if(!r)pending=true;
          if(v==null)missing++;else {cents+=Math.round(v*100);available++;}
        }
        amount=available ? cents/100 : null;
      }
      const subtotal=missing>0 || pending;
      const status=pending ? 'Consolidação pendente de identificação ou escolha dos valores aplicáveis.' : missing ? 'Subtotal dos valores disponíveis; há valores não informados.' : '';
      result.fields[key]={amount,missing,pending,subtotal,origin,status,display:amount==null ? 'Não informado' : `${subtotal?'Subtotal disponível: ':''}${money(amount)}`};
    }
    if (Object.values(result.fields).some(f=>f.pending)) result.scope='VR das instalações selecionadas — consolidação pendente';
    else if (full && Object.values(result.fields).some(f=>f.subtotal)) result.scope='VR da propriedade — subtotal dos valores disponíveis';
    return result;
  }
  function sync(selection) {
    if(!selection?.composition)return selection;
    const c=selection.composition=normalize(selection.composition),t=totals(c);
    selection.confirmed ||= {};
    selection.confirmed.localIdentification=c.name;
    // Scalar compatibility values are populated only when the applicable result is unambiguous.
    for(const key of ['vrBuildings','vrAnimals'])selection.confirmed[key]=!t.fields[key].subtotal && t.fields[key].amount!=null ? String(t.fields[key].amount) : '';
    selection.confirmed.installations=c.units.map(u=>({id:u.id,code:u.label,involved:u.affected,selected:u.selected,...Object.fromEntries(fields.map(key=>[key,text(details(c,u)?.[key])]))}));
    return selection;
  }
  window.FastTrackProperty={create,normalize,add,assign,manual,versions,effective,details,groups,totals,sync,fields,money,number};
})();
