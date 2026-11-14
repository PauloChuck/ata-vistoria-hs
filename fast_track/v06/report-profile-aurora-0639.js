(() => {
  'use strict';
  // Institutional presentation explicitly approved for this policy. No client records or PDFs.
  const identity=Object.freeze({insured:'COOPERATIVA CENTRAL AURORA ALIMENTOS',insurer:'SOMPO SEGUROS S/A',policyNumber:'9600131927',productName:'RISCOS NOMEADOS',broker:'ALPER CONSULTORIA E COR DE SEGS S/A'});
  const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  function matches(state) {
    const o=state.contract?.data?.operacao;
    return !!o && normalize(o.segurado_razao_social)===normalize(identity.insured)
      && normalize(o.seguradora_lider)===normalize(identity.insurer)
      && String(o.numero_apolice??'').replace(/[\s./-]/g,'')===identity.policyNumber;
  }
  const definitions=[
    {key:'wind',ids:['vendaval_b'],names:['Vendaval','Granizo','Vendaval / Granizo','Vendaval / Granizo - Modalidade B','Vendaval Modalidade B - Incluindo Bens ao ar livre'],name:'Vendaval / Granizo',limit:35000000},
    {key:'water',ids:['ruptura_caixa_agua'],names:['Ruptura / explosão de caixa d’água','Sublimite para ruptura / explosão de caixa d’água'],name:'Ruptura / explosão de caixa d’água',limit:1000000,eventLimit:30000},
    {key:'vinyl',ids:['vinilona_grupo_02'],names:['Galpão de Vinilona','Sublimite para Grupo 02 para Vinilona - decorrente de todas as coberturas da apólice'],name:'Galpão de Vinilona',limit:1500000},
    {key:'flood',ids:['alagamento'],names:['Alagamento'],name:'Alagamento',limit:10000000},
    {key:'electric',ids:['danos_eletricos'],names:['Danos Elétricos'],name:'Danos Elétricos',limit:10000000}
  ];
  const definition=c=>definitions.find(d=>d.ids.includes(c.id) || d.names.some(n=>[c.nome_contratual,c.nome_sugerido_seletor].some(v=>normalize(v)===normalize(n))));
  const choices=state=>[...window.FastTrackPolicies.selected(state),...window.FastTrackPolicies.selectedSublimits(state)];
  function coverageRow(state,c) {
    if (!matches(state)) return null;
    const d=definition(c);if (!d) return null;
    const money=window.FastTrackPolicies.money;
    return [d.name,money(d.limit)+(d.eventLimit?`\n(${money(d.eventLimit)}/evento)`:''),`15% com mínimo de ${money(3000)}`];
  }
  function shortName(state,c) {
    const d=definition(c);
    if (d?.key==='wind') {
      const event=normalize(state.contract.cause),selection=normalize(c.nome_sugerido_seletor || c.nome_contratual);
      if (event==='VENDAVAL' || event==='GRANIZO') return event;
      if (selection==='VENDAVAL' || selection==='GRANIZO') return selection;
    }
    if (d) return d.name.toLocaleUpperCase('pt-BR');
    const short={basica_2:'COBERTURA BÁSICA',lucros_cessantes:'LUCROS CESSANTES',interrupcao_utilidades:'INTERRUPÇÃO DE UTILIDADES'};
    return short[c.id] || window.FastTrackPolicies.displayName(c).toLocaleUpperCase('pt-BR');
  }
  function coverFields(state) {
    if (!matches(state)) return state.fields || {};
    return {...state.fields,...identity,coverageName:[...new Set(choices(state).map(c=>shortName(state,c)))].join('; ')};
  }
  function coverRows(state) {
    const f=coverFields(state);
    return [['COMPANHIA SEGURADORA:',f.insurer],['SEGURADO:',f.insured],['COOPERADO:',f.claimantName],['LOCAL DO SINISTRO:',f.riskAddress],['APÓLICE DE SEGUROS:',f.policyNumber],['PRODUTO:',f.productName],['CORRETOR:',f.broker],['DATA DO SINISTRO:',window.FastTrackV06Report.longDate(f.lossDate,true)],['COBERTURA RECLAMADA:',f.coverageName]];
  }
  function coverHTML(state) {
    const esc=window.FastTrackV06Report.esc;
    return `<table class="meta-table aurora-cover"><colgroup><col style="width:65.1mm"><col></colgroup><tbody>${coverRows(state).map(row=>`<tr><th>${esc(row[0])}</th><td>${esc(String(row[1]??'').replace(/\s+/g,' ').trim().toLocaleUpperCase('pt-BR'))}</td></tr>`).join('')}</tbody></table>`;
  }
  window.FastTrackAuroraReport={matches,coverageRow,coverFields,coverRows,coverHTML};
})();
