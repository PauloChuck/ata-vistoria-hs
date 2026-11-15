(() => {
  'use strict';
  // A read-only projection of explicitly selected sources. Never infer physical identity,
  // import related candidates, choose an effective version or add monetary values here.
  const clean = v => String(v == null ? '' : v).trim();
  const esc = v => clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normal = v => window.FastTrackCooperators.normalizeText(v);
  const absent = 'Não informado';
  const upper = v => clean(v).toLocaleUpperCase('pt-BR');
  function numeric(value, money=false) {
    if (!clean(value)) return absent;
    const p = window.FastTrackCooperators.formatters.number(value);
    return p.value != null && !p.ambiguous
      ? new Intl.NumberFormat('pt-BR', money ? {style:'currency',currency:'BRL'} : {maximumFractionDigits:20}).format(p.value)
      : clean(value);
  }
  function coordinate(value) {
    const raw=clean(value);
    // Do not round coordinates or drop trailing precision from the source string.
    return /^[+-]?\d+(?:[.,]\d+)?$/.test(raw) ? raw.replace('.',',') : raw || absent;
  }
  function capacityLabel(r) {
    if (/suino/.test(normal(r.activity))) return 'QTDE LOTAÇÃO MAX POCILGA';
    return upper(r.capacityConcept) || 'CAPACIDADE / QUANTIDADE';
  }
  function columnWidths(block) {
    const ctx=typeof document.createElement==='function' ? document.createElement('canvas').getContext('2d') : null;
    if (!ctx) return;
    const width=(value,bold)=>{
      ctx.font=bold?'bold 8.5pt Arial':'9pt Arial';
      return Math.max(...clean(value).split(/[ \t\r\n]+/).map(word=>ctx.measureText(word).width));
    };
    // Reserve the real, unbroken word/number width before distributing spare space.
    // The same widths go to Word, so long coordinates never rely on rounding to fit.
    const min=block.columns.map((label,i)=>Math.max(width(label,true),...block.rows.map(r=>width(r.values[i],false)))+(i===0?17:i===block.columns.length-1?14:11));
    const available=602,spare=Math.max(0,available-min.reduce((a,b)=>a+b,0));
    const widths=min.map((w,i)=>w+spare*block.widths[i]/100),total=widths.reduce((a,b)=>a+b,0);
    block.widths=widths.map(w=>w/total*100);
  }
  function selectedRecords(s) {
    if (!s.composition) return [{...s.confirmed,category:s.confirmed.sourceCategory,reference:s.confirmed.sourceReference}];
    const c=s.composition;
    const records=c.records.filter(r=>{
      const a=c.assignments[r.id];
      // "History only" and property totals are retained in adjustments, outside this card.
      if (['other','history','total'].includes(a?.kind)) return false;
      if (r.raw?.totalPropriedade===true || r.raw?.escopoValores==='propriedade') return false;
      return a?.kind!=='unit' || c.units.some(u=>u.id===a.unitId && u.selected);
    }).map(r=>{
      const row={...r};
      // Identification edits are still available. Aggregate compatibility VRs must never
      // overwrite the original, per-record building value shown in this register.
      if (r.id===s.sourceRecordId) for (const key of ['name','municipality','state','latitude','longitude','capacity','capacityUnit','capacityConcept','activity']) {
        row[key]=s.confirmed[key];
      }
      row.name=s.confirmed.name || r.name;
      return row;
    });
    for (const u of c.units.filter(u=>u.selected && u.manual)) records.push({...u.values,name:s.confirmed.name,companyGroup:s.confirmed.companyGroup,cooperative:s.confirmed.cooperative,category:'Cadastro manual'});
    return records;
  }
  function data(state) {
    const s=window.FastTrackCooperators.normalizeSelection(state?.cooperatorSelection);
    if (!s) return null;
    const cards=[];
    for (const r of selectedRecords(s)) {
      const group=clean(r.companyGroup || r.cooperative || s.confirmed.companyGroup || s.confirmed.cooperative);
      const activity=clean(r.activity);
      const key=JSON.stringify([normal(group),normal(activity)]);
      let card=cards.find(x=>x.key===key);
      if (!card) {
        card={key,group:upper(group),activity:upper(activity),name:upper(s.confirmed.name || r.name),blocks:[],origins:[]};
        cards.push(card);
      }
      const category=normal(r.category)===normal(r.name) ? '' : clean(r.category);
      const reference=normal(r.reference)===normal(r.name) ? '' : clean(r.reference);
      const endosso=/endoss/.test(normal(category));
      const renewal=/renovacao/.test(normal(category));
      const kind=endosso?'endosso':renewal?'renewal':'initial';
      const title=endosso ? (/^endosso\b/i.test(reference)?reference:['Endosso',reference].filter(Boolean).join(' ')) : '';
      const capacity=capacityLabel(r);
      const blockKey=JSON.stringify([kind,category,reference,capacity]);
      let block=card.blocks.find(b=>b.key===blockKey);
      if (!block) {
        block={key:blockKey,kind,title,columns:[...(endosso?['RESULTADO']:[]),'NOME','MUNICÍPIO','LATITUDE','LONGITUDE',capacity,'VALOR EM RISCO BENFEITORIA'],widths:endosso?[14,16,13,15,15,11,16]:[25,14,15,15,13,18],rows:[]};
        card.blocks.push(block);
      }
      block.rows.push({values:[...(endosso?[clean(r.situation || r.movement) || absent]:[]),upper(r.name || card.name),clean(r.municipality) || absent,coordinate(r.latitude),coordinate(r.longitude),numeric(r.capacity),numeric(r.vrBuildings,true)]});
      if (category && !card.origins.includes(category)) card.origins.push(category);
    }
    for (const card of cards) {
      card.blocks.forEach(columnWidths);
      card.blocks.sort((a,b)=>(a.kind==='endosso')-(b.kind==='endosso'));
      const count=kind=>card.blocks.filter(b=>b.kind===kind).reduce((n,b)=>n+b.rows.length,0);
      card.counts=[['renewal','na Renovação'],['initial','no cadastro inicial'],['endosso','de endosso']].map(([kind,label])=>{const n=count(kind);return n?`${n} ${n===1?'registro':'registros'} ${label}`:'';}).filter(Boolean).join(' · ');
      card.origin=card.origins.map(upper).join(' / ');
    }
    return {cards};
  }
  function header(card) {
    return `<div class="risk-card-brand"><div class="risk-card-kicker">CONSULTA DE COOPERADOS</div>${card.group || card.activity?`<h3><span>${esc(card.group)}</span>${card.group && card.activity?' — ':''}${esc(card.activity)}</h3>`:''}</div>`;
  }
  function identity(card) {
    return `<header class="risk-card-header"><div><h4 class="risk-card-name">${esc(card.name)}</h4><p class="risk-card-counts">${esc(card.counts)}</p></div>${card.origin?`<span class="risk-card-origin">${esc(card.origin)}</span>`:''}</header>`;
  }
  function blockHtml(block,rows=block.rows) {
    return `<section class="risk-register-block">${block.title?`<h4 class="risk-register-title">${esc(block.title)}</h4>`:''}<table class="risk-register"><colgroup>${block.widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${block.columns.map((c,i)=>`<th scope="col" class="${c==='NOME'||i===0?'left':''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.values.map((v,i)=>`<td class="${block.columns[i]==='NOME'||i===0?'left':''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
  }
  const entries = card => card.blocks.flatMap(block=>block.rows.map(row=>({block,row})));
  function chunkHtml(card,items=entries(card)) {
    const blocks=[];
    for (const item of items) {
      let b=blocks[blocks.length-1];
      if (!b || b.block!==item.block) {b={block:item.block,rows:[]};blocks.push(b);}
      b.rows.push(item.row);
    }
    return `<article class="risk-card" aria-label="Consulta de cooperados">${header(card)}<div class="risk-card-frame">${identity(card)}${blocks.map(b=>blockHtml(b.block,b.rows)).join('')}</div></article>`;
  }
  const html=state=>data(state)?.cards.map(c=>chunkHtml(c)).join('') || '';
  window.FastTrackRiskCard={data,html,entries,chunkHtml};
})();
