(() => {
  'use strict';
  const P=()=>window.FastTrackProperty;
  const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const input=(label,key,value='',type='text')=>`<label>${esc(label)}<input type="${type}" data-property-field="${key}" value="${esc(value)}"></label>`;
  const option=(value,label,current)=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`;
  const location=r=>[r.localIdentification,r.municipality,r.state,[r.latitude,r.longitude].filter(Boolean).join(' / ')].filter(Boolean).join(' · ') || 'Não informado';
  const ref=r=>[r.category,r.reference,r.activity].filter(Boolean).join(' · ') || 'Registro sem referência';
  const vr=r=>`Benfeitorias: ${P().money(P().number(r?.vrBuildings))} · Animais: ${P().money(P().number(r?.vrAnimals))}`;
  let controller,changed;
  function historyRow(c,r) {
    const a=c.assignments[r.id]||{},current=a.kind==='unit'?a.unitId:a.kind;
    return `<div class="property-history-row" data-property-record="${esc(r.id)}"><strong>${esc(ref(r))}</strong><p>${esc(location(r))}</p><p>${esc(vr(r))}</p>
      <div class="grid2"><label>Identificação deste lançamento<select data-property-kind>${option('unresolved','A identificar',current)}${option('new','Nova instalação física desta propriedade',current)}${c.units.filter(u=>!u.manual).map(u=>option(u.id,`Histórico / versão de ${u.label}`,current)).join('')}${option('total','Total consolidado desta propriedade',current)}${option('history','Somente histórico; não aplicável à ficha',current)}${option('other','Pertence a outra propriedade',current)}</select></label>
      <label>Nome da nova instalação<input data-property-label placeholder="Ex.: Aviário 1 — núcleo norte"></label></div>
      <label class="property-check"><input type="checkbox" data-property-applicable> Usar expressamente os valores deste registro para a instalação</label>
      <p class="helper">Ao associar uma instalação ou um total, confirmo que pertence à propriedade identificada acima, inclusive se a atividade for diferente.</p>
      <button type="button" class="small-btn" data-property-action="associate">Confirmar identificação / associação</button>
      <details><summary>Dados originais preservados</summary><pre>${esc(JSON.stringify(r.raw||r.source?.rawRecord||r,null,2))}</pre></details></div>`;
  }
  function html(selection) {
    const c=selection.composition,t=P().totals(c);
    const units=c.units.map(u=>{const r=P().effective(c,u),identity=P().details(c,u),versions=P().versions(c,u);return `<article class="property-unit" data-property-unit="${esc(u.id)}">
      <div class="property-unit-head"><label class="property-check"><input type="checkbox" data-property-unit-field="selected" ${u.selected?'checked':''}> ${esc(u.label)}</label><label class="property-check"><input type="checkbox" data-property-unit-field="affected" ${u.affected?'checked':''}> Atingida pelo sinistro</label></div>
      <p>${esc(identity.activity || 'Atividade não informada')} · ${esc(location(identity))}</p><p>${esc(vr(r))}</p>
      ${u.manual ? '<span class="helper">Cadastro manual confirmado</span><button class="small-btn" type="button" data-property-action="remove-manual">Remover instalação manual</button>' : `<label>Registro com valores aplicáveis<select data-property-unit-field="applicable">${option('','Escolher expressamente; não usar a data mais recente',u.applicable)}${versions.map(r=>option(r.id,`${ref(r)} · ${vr(r)}`,u.applicable)).join('')}</select></label>`}
      ${!r?'<p class="notice warn">Valores pendentes: selecione a versão aplicável desta instalação.</p>':''}</article>`;}).join('');
    const totalRecords=c.records.filter(r=>c.assignments[r.id]?.kind==='total');
    return `<section class="property-composition" aria-label="Composição da propriedade">
      <h3>Instalações da mesma propriedade</h3><p class="helper">Identifique as instalações físicas no histórico. Nome, coordenadas e valores iguais não comprovam que dois lançamentos sejam a mesma instalação. A seleção dos danos é independente.</p>
      ${input('Identificação da propriedade','name',c.name)}
      <p class="property-count" role="status">${t.count} de ${t.totalCount} instalações selecionadas</p><div class="actions"><button type="button" class="small-btn" data-property-action="all">Selecionar todas desta propriedade</button><button type="button" class="small-btn" data-property-action="none">Limpar seleção</button></div>
      <div class="property-value-summary"><h4>${esc(t.scope)}</h4>${[['vrBuildings','VR de benfeitorias'],['vrAnimals','VR de animais']].map(([key,label])=>`<p><strong>${label}:</strong> ${esc(t.fields[key].display)}</p>${t.fields[key].status?`<p class="helper">${esc(t.fields[key].status)}</p>`:''}`).join('')}</div>
      ${units || '<p class="notice info">Nenhuma instalação física identificada. Classifique os registros no histórico ou cadastre uma instalação.</p>'}
      <label class="property-check"><input type="checkbox" data-property-field="complete" ${c.complete?'checked':''}> Confirmei que a lista contém todas as instalações desta propriedade</label>
      ${t.unresolved?`<p class="notice warn">${t.unresolved} registro(s) aguardam identificação no histórico. Não há total definitivo da propriedade.</p>`:''}
      ${totalRecords.length?`<details class="property-totals"><summary>Usar totais consolidados da propriedade</summary><p class="helper">Um total consolidado substitui a soma das instalações. Só se aplica à composição completa, após resolver os registros pendentes.</p><div class="grid2">${[['vrBuildings','VR de benfeitorias'],['vrAnimals','VR de animais']].map(([key,label])=>`<label>${label}<select data-property-total="${key}">${option('','Somar instalações distintas',c.totals[key])}${totalRecords.map(r=>option(r.id,`${ref(r)} — ${P().money(P().number(r[key]))}`,c.totals[key])).join('')}</select></label>`).join('')}</div></details>`:''}
      <details class="property-manual"><summary>Cadastrar instalação física manualmente</summary><p class="helper">Confirme que é uma instalação distinta da mesma propriedade. Campos vazios permanecem não informados.</p><div class="grid2">${input('Identificação da instalação','label')}${P().fields.map(k=>input(({activity:'Atividade',municipality:'Município',state:'UF',localIdentification:'Localização',latitude:'Latitude',longitude:'Longitude',area:'Área',areaUnit:'Unidade da área',capacity:'Capacidade / quantidade',capacityUnit:'Unidade da capacidade',capacityConcept:'Descrição da quantidade',vrBuildings:'VR de benfeitorias',vrAnimals:'VR de animais'})[k],k)).join('')}</div><button type="button" class="small-btn" data-property-action="manual">Adicionar instalação à propriedade</button></details>
      <details class="property-history" open><summary>Histórico do cadastro (${c.records.length} registros preservados)</summary><p class="helper">Renovações, endossos e repetições não são instalações adicionais. Indique o destino de cada lançamento. A associação mantém todos os dados originais.</p>${P().groups(c).map(rs=>`<details class="property-history-group" ${rs.length===1?'open':''}><summary>${esc(ref(rs[0]))} — ${rs.length} registro(s)${rs.length>1?' com conteúdo idêntico; identidade física não confirmada':''}</summary>${rs.length>1?'<label class="property-check"><input type="checkbox" data-property-repetitions> Aplicar minha associação a estas repetições, confirmando o mesmo destino físico</label>':''}${rs.map(r=>historyRow(c,r)).join('')}</details>`).join('')}</details>
      <p class="helper">Para acrescentar instalações ou outra atividade à mesma propriedade, use “Acrescentar instalação à mesma propriedade” no resultado da pesquisa. Para trocar o cooperado ou o local, use “Utilizar dados deste local”; os demais dados do atendimento são preservados.</p>
      ${selection.requiresReselection?'<button type="button" class="small-btn" data-property-action="confirm-snapshot">Conferi a composição preservada e seus valores após a atualização da base</button>':''}
      <p class="property-message notice hidden" role="status"></p></section>`;
  }
  function init(nextController,onChanged) {
    controller=nextController;changed=onChanged;
    document.addEventListener('click',e=>{
      const button=e.target.closest('[data-property-action]');if(!button)return;
      const s=controller.getState().cooperatorSelection;if(!s?.composition)return;
      const c=s.composition,action=button.dataset.propertyAction;
      try {
        if(action==='all'||action==='none')c.units.forEach(u=>u.selected=action==='all');
        else if(action==='associate') {
          const row=button.closest('[data-property-record]'),value=row.querySelector('[data-property-kind]').value;
          const group=row.closest('.property-history-group');
          const ids=group.querySelector('[data-property-repetitions]')?.checked ? [...group.querySelectorAll('[data-property-record]')].map(x=>x.dataset.propertyRecord) : [row.dataset.propertyRecord];
          // Keep the expressly clicked record as the applicable source even within a repetition group.
          ids.sort((a,b)=>a===row.dataset.propertyRecord?-1:b===row.dataset.propertyRecord?1:0);
          P().assign(c,ids,{kind:c.units.some(u=>u.id===value)?'unit':value,unitId:value,label:row.querySelector('[data-property-label]').value,applicable:row.querySelector('[data-property-applicable]').checked});
        } else if(action==='manual') {
          const form=button.closest('.property-manual'),values=Object.fromEntries([...form.querySelectorAll('[data-property-field]')].map(x=>[x.dataset.propertyField,x.value]));
          P().manual(c,values.label,values);
        } else if(action==='remove-manual'){c.units=c.units.filter(u=>u.id!==button.closest('[data-property-unit]').dataset.propertyUnit);c.complete=false;}
        else if(action==='confirm-snapshot'){s.requiresReselection=false;s.reimportReview={...s.reimportReview,confirmedAt:new Date().toISOString()};s.warnings=s.warnings.filter(w=>!/nova leitura|nova base|reimporta/i.test(w));}
        P().sync(s);changed({autofill:false,renderNow:true});
      } catch(error) { const message=document.querySelector('.property-message');message.textContent=error.message;message.className='property-message notice error'; }
    });
    document.addEventListener('change',e=>{
      const el=e.target;if(!el.closest('.property-composition')||el.closest('.property-manual'))return;
      const s=controller.getState().cooperatorSelection;if(!s?.composition)return;const c=s.composition;
      if(el.dataset.propertyField)c[el.dataset.propertyField]=el.type==='checkbox'?el.checked:el.value;
      else if(el.dataset.propertyUnitField){const u=c.units.find(x=>x.id===el.closest('[data-property-unit]').dataset.propertyUnit);u[el.dataset.propertyUnitField]=el.type==='checkbox'?el.checked:el.value;}
      else if(el.dataset.propertyTotal)c.totals[el.dataset.propertyTotal]=el.value;else return;
      // Classifying installations and editing their values must not undo personal edits.
      P().sync(s);changed({autofill:el.dataset.propertyField==='name'?'location':false,renderNow:true});
    });
  }
  window.FastTrackPropertyUI={html,init};
})();
