(() => {
  'use strict';

  // Presentation only: selection, parsing and provenance remain with the importer.
  const clean = value => String(value == null ? '' : value).trim();
  const esc = value => clean(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const absent = 'Não informado na base';
  const number = value => window.FastTrackCooperators.formatters.number(value);
  function money(value) {
    if (!clean(value)) return absent;
    const parsed = number(value);
    return parsed.value != null && !parsed.ambiguous
      ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parsed.value)
      : clean(value); // Preserve explicit classifications and ambiguous source text.
  }
  function quantity(value,unit) {
    if (!clean(value)) return '';
    const parsed = number(value);
    const formatted = parsed.value != null && !parsed.ambiguous
      ? new Intl.NumberFormat('pt-BR',{maximumFractionDigits:10}).format(parsed.value) : clean(value);
    return window.FastTrackCooperators.formatters.quantity(formatted,unit);
  }
  function coordinate(value,axis) {
    if (!clean(value)) return '';
    const parsed = window.FastTrackCooperators.formatters.coordinate(value,axis);
    return parsed.valid ? new Intl.NumberFormat('pt-BR',{useGrouping:false,maximumFractionDigits:10}).format(parsed.value) : clean(value);
  }
  const field = (label,value) => ({label,value:clean(value)});
  const pairs = fields => fields.reduce((groups,item,index) => {
    if (index % 2 === 0) groups.push({kind:'fields',fields:[]});
    groups[groups.length-1].fields.push(item);
    return groups;
  },[]);
  function data(state) {
    const selection = window.FastTrackCooperators.normalizeSelection(state?.cooperatorSelection);
    if (!selection) return null;
    const c = selection.confirmed;
    const groups = [];
    const addPair = fields => groups.push(...pairs(fields.filter(item => item.value)));
    addPair([
      field(c.municipality ? (c.state ? 'Município / UF' : 'Município') : 'UF',[c.municipality,c.state].filter(clean).join(' / ')),
      field('Propriedade / localidade',c.localIdentification)
    ]);
    addPair([field('Latitude',coordinate(c.latitude,'lat')),field('Longitude',coordinate(c.longitude,'lng'))]);
    addPair([
      field(c.capacityConcept || 'Capacidade / quantidade',quantity(c.capacity,c.capacityUnit)),
      field('Área',quantity(c.area,c.areaUnit))
    ]);
    for (const [index,item] of (c.installations || []).filter(item => item.involved).entries()) {
      const details = [field('Identificação',item.code),field('Tipo',item.type),field('Área',quantity(item.area,item.areaUnit)),field(item.capacityConcept || 'Capacidade / quantidade',quantity(item.capacity,item.capacityUnit))].filter(item => item.value);
      groups.push({kind:'installation',title:`Instalação ${index+1}`,fields:details.length ? details : [field('Identificação',absent)]});
    }
    const sameName = value => window.FastTrackCooperators.normalizeText(value) === window.FastTrackCooperators.normalizeText(c.name);
    const documentary = value => clean(value) && !sameName(value) ? clean(value) : '';
    const values = [['vrBuildings','Valor em risco de benfeitorias'],['vrAnimals','Valor em risco de animais']].map(([key,label]) => {
      const source = selection.fieldSources?.[key];
      let origin = '';
      if (source && (source.type === 'manual' || source.recordId !== selection.sourceRecordId)) {
        origin = source.type === 'manual' ? 'Ajuste manual do regulador' : [source.baseLabel,source.activity,documentary(source.origin || source.source?.category),documentary(source.reference)].filter(clean).join(' · ');
        if (!origin) origin = 'Registro complementar confirmado pelo regulador';
      }
      return {...field(label,money(c[key])),origin};
    });
    groups.push({kind:'values',fields:values});
    const origin = `Origem do registro: ${documentary(c.sourceCategory) || 'Não informada'}`;
    const reference = documentary(c.sourceReference);
    const source = [origin,reference && `Referência: ${reference}`,c.situation && `Situação: ${c.situation}`].filter(Boolean);
    groups.push({kind:'source',lines:source});
    return {
      name:(clean(c.name) || 'Cooperado não informado').toLocaleUpperCase('pt-BR'),
      subtitle:[c.cooperative,c.activity].filter(clean).join(' · '),groups
    };
  }
  function header(card) {
    return `<header class="risk-card-header"><div class="risk-card-kicker">IDENTIFICAÇÃO DO RISCO</div><h3 class="risk-card-name">${esc(card.name)}</h3>${card.subtitle ? `<p class="risk-card-subtitle">${esc(card.subtitle)}</p>` : ''}</header>`;
  }
  function groupHtml(group) {
    if (group.kind === 'source') return `<footer class="risk-card-source">${group.lines.map(line => `<p>${esc(line)}</p>`).join('')}</footer>`;
    const fields = group.fields.map(item => `<div class="risk-card-field"><dt>${esc(item.label)}</dt><dd>${esc(item.value)}</dd>${item.origin ? `<p class="risk-card-value-origin">Origem deste valor: ${esc(item.origin)}</p>` : ''}</div>`).join('');
    return `<section class="risk-card-group risk-card-${group.kind}">${group.title ? `<h4>${esc(group.title)}</h4>` : ''}<dl class="risk-card-grid">${fields}</dl></section>`;
  }
  function wrap(contents,{continuation=false}={}) {
    return `<article class="risk-card${continuation ? ' risk-card-continuation' : ''}" aria-label="Ficha de risco">${contents}</article>`;
  }
  const html = state => { const card = data(state); return card ? wrap(header(card)+card.groups.map(groupHtml).join('')) : ''; };

  // Measure at the report's useful width. Word uses the same keep-together decision;
  // long cards may split only between the corresponding unsplittable table rows.
  function fitsOnPage(card) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:160mm;visibility:hidden;pointer-events:none';
    host.innerHTML = wrap(header(card)+card.groups.map(groupHtml).join(''));
    document.body.appendChild(host);
    const fits = host.getBoundingClientRect().height <= 236 * 96 / 25.4;
    host.remove();
    return fits;
  }
  window.FastTrackRiskCard = {data,html,header,groupHtml,wrap,fitsOnPage};
})();
