(() => {
  'use strict';
  const clean=v=>String(v ?? '').replace(/\s+/g,' ').trim();
  const esc=v=>window.FastTrackV06Report.esc(v);
  function insurerLabel(value) {
    const name=clean(value).replace(/_/g,' ');
    if(!name)return 'Sinistro Seguradora:';
    const normal=name===name.toUpperCase() || name===name.toLowerCase()
      ? name.split(' ').map(word=>/^(de|da|do|dos|das|e|em)$/i.test(word) ? word.toLowerCase() : word.length<=3 ? word.toUpperCase() : word[0].toLocaleUpperCase('pt-BR')+word.slice(1).toLocaleLowerCase('pt-BR')).join(' ') : name;
    return `Sinistro ${normal}:`;
  }
  function claimData(state) {
    const f=state.fields || {};
    const rows=[[insurerLabel(f.insurer),clean(f.insurerClaim)||'A INFORMAR'],['Sinistro Horizon Servitas:',clean(f.hsClaim)||'A INFORMAR']];
    const context=document.createElement('canvas').getContext('2d'),maxWidth=172.6*96/25.4,gap=3*96/25.4;
    let size=10,labelWidth,valueWidth;
    do {context.font=`${size}pt Arial`;labelWidth=Math.max(...rows.map(r=>context.measureText(r[0]).width))+gap;valueWidth=Math.max(...rows.map(r=>context.measureText(r[1]).width))+2;if(labelWidth+valueWidth<=maxWidth||size<=9)break;size-=0.5;}while(true);
    const width=Math.max(88*96/25.4,labelWidth+valueWidth);
    return {rows,size,widthMm:Math.min(width,maxWidth)*25.4/96,labelMm:labelWidth*25.4/96,fits:width<=maxWidth};
  }
  function claimHtml(state) {
    const data=claimData(state);
    return `<table class="claim-table claim-identifiers" style="width:${data.widthMm}mm;font-size:${data.size}pt"><colgroup><col style="width:${data.labelMm}mm"><col></colgroup><tbody>${data.rows.map(row=>`<tr>${row.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function claimError(state) {return claimData(state).fits ? '' : 'As identificações da capa excedem a largura disponível mesmo em 9 pt. Confira o nome da seguradora e os números informados; nenhum identificador será cortado ou abreviado.';}
  function signatureHtml(state) {
    const f=state.fields||{};
    return `<div class="closing-signature-block"><p class="doc-text report-date">${esc(f.reportCity||'')}, ${esc(window.FastTrackV06Report.longDate(f.reportDate))}.</p><div class="signature-report-grid">${['regulator','claimant'].map(role=>{
      const image=window.FastTrackSignatures.get(state,role),person=window.FastTrackSignatures.identity(state,role);
      return `<div class="signature-report"><div class="signature-image-frame">${image?`<img src="${esc(image)}" alt="Assinatura ${role==='regulator'?'do regulador':'do cooperado/segurado'}">`:''}</div><div class="signature-line">Assinatura ${role==='regulator'?'do regulador':'do cooperado/segurado'}</div><div>${esc(person.name)}</div><div>${person.cpf?`CPF: ${esc(person.cpf)}`:''}</div></div>`;
    }).join('')}</div></div>`;
  }
  window.FastTrackPresentation={claimData,claimHtml,claimError,signatureHtml,insurerLabel};
})();
