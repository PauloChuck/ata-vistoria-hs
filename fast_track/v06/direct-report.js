(() => {
  'use strict';

  const svgUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const BRAND_ASSETS = window.FastTrackV06BrandAssets || {};
const ASSETS = {
  logo: BRAND_ASSETS.logo || svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="830" height="400" viewBox="0 0 830 400"><rect width="830" height="400" fill="white"/><g fill="none" stroke="#29A8E0" stroke-width="18"><ellipse cx="235" cy="190" rx="150" ry="118"/><ellipse cx="365" cy="190" rx="150" ry="118"/></g><text x="205" y="235" font-family="Arial Black,Arial" font-size="130" font-weight="900" fill="#29A8E0">HS</text><text x="540" y="155" font-family="Arial Black,Arial" font-size="58" font-weight="900" fill="#111">beyond</text><text x="540" y="225" font-family="Arial Black,Arial" font-size="58" font-weight="900" fill="#111">solutions</text></svg>`),
  watermark: BRAND_ASSETS.watermark || svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750"><g fill="none" stroke="#29A8E0" stroke-opacity="0.18" stroke-width="28"><ellipse cx="405" cy="375" rx="310" ry="245"/><ellipse cx="595" cy="375" rx="310" ry="245"/></g><text x="320" y="470" font-family="Arial Black,Arial" font-size="260" font-weight="900" fill="#29A8E0" fill-opacity="0.10">HS</text></svg>`),
    footer: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="239" viewBox="0 0 320 239"><g fill="none" stroke="#29A8E0" stroke-width="13"><ellipse cx="115" cy="120" rx="88" ry="70"/><ellipse cx="205" cy="120" rx="88" ry="70"/></g></svg>`)
  };

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  const attr = (value = '') => esc(value).replace(/\n/g, '&#10;');

  const money = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style:'currency', currency:'BRL', minimumFractionDigits:2, maximumFractionDigits:2
  });

  const plainMoney = (value) => Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits:2, maximumFractionDigits:2
  });

  const formatDate = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '';
    const [y,m,d] = String(iso).split('-');
    return `${d}/${m}/${y}`;
  };

  const longDate = (iso, upper = false) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '';
    const [y,m,d] = String(iso).split('-').map(Number);
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const text = `${String(d).padStart(2,'0')} de ${months[m - 1]} de ${y}`;
    return upper ? text.toUpperCase() : text;
  };

  const dayFromDate = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '';
    return String(iso).split('-')[2];
  };

  const occurrenceText = (lossDate) => {
    const day = dayFromDate(lossDate);
    if (!day) return 'A data do sinistro deve ser informada para gerar a descrição da ocorrência.';
    const [year, month] = String(lossDate).split('-');
    if (year !== '2026' || month !== '11') {
      return 'A data informada diverge da contingência de novembro de 2026. Corrija a data para gerar o texto automático.';
    }
    return `No dia ${day} de novembro de 2026, uma tempestade severa atingiu a região do extremo oeste de Santa Catarina e Norte do Rio Grande do Sul, causando danos às instalações de engorda da propriedade.`;
  };

  const inspectionText = (inspectionDate) => {
    const date = longDate(inspectionDate);
    if (!date) return 'A data da vistoria deve ser informada.';
    return `Em vistoria presencial realizada no dia ${date}, acompanhados do cooperado, foram evidenciados danos característicos da ação de tempos severos com passagem de ventos intensos.`;
  };

  const calculate = (state) => {
    const damages = Array.isArray(state.damages) ? state.damages : [];
    const totalClaimedCents = damages.reduce((sum,item) => sum + toCents(item.claimedTotal), 0);
    const totalAssessedCents = damages.reduce((sum,item) => sum + toCents(item.assessedTotal), 0);
    const deductibleCents = Math.max(Math.round(totalAssessedCents * 0.15), 300000);
    const netCents = Math.max(totalAssessedCents - deductibleCents, 0);
    return {
      totalClaimed: totalClaimedCents / 100,
      totalAssessed: totalAssessedCents / 100,
      deductible: deductibleCents / 100,
      net: netCents / 100
    };
  };

  function toCents(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) : 0;
  }

  const damageRows = (items, start = 0) => items.map((item, index) => `
    <tr>
      <td>${start + index + 1}</td>
      <td class="left">${esc(item.description || '')}</td>
      <td>${esc(item.quantity || '')}</td>
      <td>${esc(item.unit || '')}</td>
      <td>${esc(item.age || '')} ${esc(item.ageUnit || '')}</td>
      <td>${money(item.claimedTotal)}</td>
    </tr>`).join('');

  const indemnityRows = (items, start = 0) => items.map((item, index) => `
    <tr>
      <td>${start + index + 1}</td>
      <td class="left">${esc(item.description || '')}</td>
      <td>${esc(item.quantity || '')} ${esc(item.unit || '')}</td>
      <td>${esc(item.age || '')} ${esc(item.ageUnit || '')}</td>
      <td>${money(item.claimedTotal)}</td>
      <td>${item.assessedTotal === '' || item.assessedTotal == null ? 'A INFORMAR' : money(item.assessedTotal)}</td>
    </tr>`).join('');

  function reportPage(content, pageNo, total, {first = false, draft = false} = {}) {
    return `<section class="report-page${first ? ' first' : ''}">
      <img class="report-logo" src="${ASSETS.logo}" alt="HS beyond solutions">
      <img class="report-watermark" src="${ASSETS.watermark}" alt="">
      ${draft ? '<div class="draft-mark">RASCUNHO</div>' : ''}
      <div class="report-content">${content}</div>
      <div class="report-footer">
        <img class="report-footer-mark" src="${ASSETS.footer}" alt="">
        <div class="report-footer-text">Matriz - Rua XV de novembro 1336, salas 34 e 35 – Blumenau – SC – CEP 89010-903<br>www.horizonservitas.com +55 47 3326-1844</div>
        <div class="report-page-number">${pageNo} de ${total}</div>
      </div>
    </section>`;
  }

  function coverContent(state) {
    const f = state.fields || {};
    return `
      <div class="doc-title">RELATÓRIO FAST TRACK DE CONTINGÊNCIA</div>
      <div class="doc-subtitle">RISCOS NOMEADOS EMPRESARIAL</div>
      <table class="claim-table"><tbody>
        <tr><td>Sinistro Seguradora:</td><td><strong>${esc(f.insurerClaim || 'A INFORMAR')}</strong></td></tr>
        <tr><td>Sinistro Horizon Servitas:</td><td><strong>${esc(f.hsClaim || 'A INFORMAR')}</strong></td></tr>
      </tbody></table>
      <table class="meta-table"><tbody>
        <tr><th>COMPANHIA SEGURADORA:</th><td>${esc(f.insurer || 'A INFORMAR')}</td></tr>
        <tr><th>SEGURADO:</th><td>${esc(f.insured || 'A INFORMAR')}</td></tr>
        <tr><th>COOPERADO:</th><td>${esc(f.claimantName || 'A INFORMAR')}</td></tr>
        <tr><th>LOCAL DO SINISTRO:</th><td>${esc(f.riskAddress || 'A INFORMAR')}</td></tr>
        <tr><th>APÓLICE DE SEGUROS:</th><td>${esc(f.policyNumber || 'A INFORMAR')}</td></tr>
        <tr><th>PRODUTO:</th><td>${esc(f.productName || 'A INFORMAR')}</td></tr>
        <tr><th>CORRETOR:</th><td>${esc(f.broker || 'A INFORMAR')}</td></tr>
        <tr><th>DATA DO SINISTRO:</th><td>${esc(longDate(f.lossDate, true) || 'A INFORMAR')}</td></tr>
        <tr><th>COBERTURA:</th><td>${esc(f.coverageName || 'A INFORMAR')}</td></tr>
      </tbody></table>`;
  }

  function technicalStartContent(state) {
  const f = state.fields || {};
  const map = state.map || {};
  return `
    <div class="doc-section">1. LOCAL DO SINISTRO</div>
    <p class="doc-text">Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.</p>
    <div class="map-report">${map.dataUrl ? `<img src="${attr(map.dataUrl)}" style="object-fit:${map.fit || 'contain'};object-position:${Number(map.posX ?? 50)}% ${Number(map.posY ?? 50)}%">` : '<span>Imagem de localização não informada.</span>'}</div>
    <p class="doc-caption">Localização da propriedade sinistrada.</p>

    <div class="doc-section">2. DESCRIÇÃO DA OCORRÊNCIA</div>
    <p class="doc-text">${esc(occurrenceText(f.lossDate))}</p>

    <div class="doc-section">3. COBERTURA RECLAMADA</div>
    <table class="doc-table coverage-table"><thead><tr><th class="left">Cobertura</th><th>Limite de Indenização</th><th>Franquia</th></tr></thead>
    <tbody><tr><td class="left">${esc(f.coverageName || 'Vendaval / Granizo')}</td><td>${money(35000000)}</td><td>15% com mínimo<br>de ${money(3000)}</td></tr></tbody></table>`;
}

function estimateDamageRowHeight(item) {
  const ageText = `${item?.age || ''} ${item?.ageUnit || ''}`.trim();
  const cells = [
    [String(item?.description || ''), 31],
    [String(item?.quantity || ''), 8],
    [String(item?.unit || ''), 7],
    [ageText, 11],
    [money(item?.claimedTotal), 14]
  ];
  const lines = Math.max(1, ...cells.map(([value, chars]) => Math.ceil(Math.max(1, value.length) / chars)));
  return 3 + (lines * 4.6);
}

function paginateDamageItems(items) {
  const source = Array.isArray(items) ? items : [];
  if (!source.length) return [{items:[], start:0}];
  const pages = [];
  let start = 0;
  while (start < source.length) {
    const available = pages.length ? 184 : 146;
    let used = 0;
    let end = start;
    while (end < source.length) {
      const height = estimateDamageRowHeight(source[end]);
      if (end > start && used + height > available) break;
      used += height;
      end += 1;
      if (used >= available) break;
    }
    pages.push({items:source.slice(start,end), start});
    start = end;
  }
  return pages;
}

function damageStartContent(state, items, start = 0) {
  const f = state.fields || {};
  const table = items.length ? `<table class="doc-table damage-table"><thead><tr><th>Item</th><th class="left">Material danificado</th><th>Quantidade</th><th>Unidade</th><th>Idade</th><th>Valor reclamado</th></tr></thead><tbody>${damageRows(items,start)}</tbody></table>` : '<p class="doc-text">Nenhum item cadastrado.</p>';
  return `
    <div class="doc-section">4. APURAÇÕES DA REGULAÇÃO</div>
    <div class="doc-subsection">4.1. LEVANTAMENTOS EM VISTORIA</div>
    <p class="doc-text">${esc(inspectionText(f.inspectionDate))}</p>
    <div class="doc-subsection"><u>RELAÇÃO DE DANOS:</u></div>
    ${table}`;
}

function damageContinuationContent(items, start) {
    return `
      <div class="doc-section">4.1. LEVANTAMENTOS EM VISTORIA — CONTINUAÇÃO</div>
      <div class="doc-subsection"><u>RELAÇÃO DE DANOS:</u></div>
      <table class="doc-table damage-table"><thead><tr><th>Item</th><th class="left">Material danificado</th><th>Quantidade</th><th>Unidade</th><th>Idade</th><th>Valor reclamado</th></tr></thead>
      <tbody>${damageRows(items,start)}</tbody></table>`;
  }

  function photoPageContent(items, start) {
    const cells = items.map((photo,index) => `<div class="photo-cell-report">
      <img src="${attr(photo.dataUrl)}" alt="">
      <p class="doc-caption">Figura ${start + index + 1} — ${esc(photo.caption || '')}</p>
    </div>`).join('');
    return `<div class="doc-section">${start ? 'REGISTRO FOTOGRÁFICO — CONTINUAÇÃO' : 'REGISTRO FOTOGRÁFICO'}</div>
      <div class="photo-grid-report">${cells}</div>`;
  }

  function documentsContent(state, docs, continuation = false) {
    const f = state.fields || {};
    const list = docs.length ? `<ol class="document-list">${docs.map(doc => `<li><strong>${esc(doc.type || doc.name || 'Documento')}</strong>${doc.description ? ` — ${esc(doc.description)}` : ''}</li>`).join('')}</ol>` : '<p class="doc-text">Documentos não apresentados até o momento.</p>';
    return `
      <div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS${continuation ? ' — CONTINUAÇÃO' : ''}</div>
      ${list}
      ${continuation ? '' : `<div class="doc-section">5. PARECER DO REGULADOR</div><p class="doc-text">${esc(f.regulatorOpinion || '')}</p>`}`;
  }

  function indemnityContent(state, items, start, last, calc) {
    const intro = start === 0 ? `<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO</div>
      <p class="doc-text">Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.</p>` :
      `<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO — CONTINUAÇÃO</div>`;
    const totals = last ? `
      <table class="doc-table final-table"><tbody>
        <tr><th>Total reclamado</th><td>${money(calc.totalClaimed)}</td></tr>
        <tr><th>Total dos prejuízos apurados</th><td>${money(calc.totalAssessed)}</td></tr>
        <tr><th>Franquia contratual</th><td>${money(calc.deductible)}</td></tr>
        <tr class="total-row"><th>Valor líquido apurado para indenização</th><td>${money(calc.net)}</td></tr>
      </tbody></table>` : '';
    return `${intro}
      <table class="doc-table indemnity-table"><thead><tr><th>Item</th><th class="left">Descrição</th><th>Quantidade / unidade</th><th>Idade</th><th>Valor reclamado</th><th>Valor apurado</th></tr></thead>
      <tbody>${indemnityRows(items,start)}</tbody></table>${totals}`;
  }

  function closingContent(state) {
    const f = state.fields || {};
    const other = f.otherInsurance === 'nao'
      ? 'O cooperado declara não possuir outros seguros contratados para os bens sinistrados.'
      : f.otherInsurance === 'sim'
        ? `O cooperado declarou a existência de outro(s) seguro(s): ${esc(f.otherInsuranceDetails || '')}`
        : 'Declaração sobre outros seguros não informada.';
    const regulatorSig = state.signatures?.regulator;
    const claimantSig = state.signatures?.claimant;
    return `
      <div class="doc-section">7. DECLARAÇÃO DE OUTROS SEGUROS</div>
      <p class="doc-text">${other}</p>

      <div class="doc-section">8. DADOS CADASTRAIS</div>
      <p class="doc-text"><strong>Nome completo:</strong> ${esc(f.claimantName || '')}<br>
      <strong>CPF:</strong> ${esc(f.claimantCpf || '')}<br>
      <strong>Dados Bancários:</strong> ${esc(f.bankName || '')} — AG: ${esc(f.bankAgency || '')} / CC: ${esc(f.bankAccount || '')}</p>

      <div class="doc-section">9. CRONOLOGIA</div>
      <table class="doc-table chrono-table"><tbody>
        <tr><td class="left">Data da ocorrência</td><td>${esc(formatDate(f.lossDate))}</td></tr>
        <tr><td class="left">Data do aviso</td><td>${esc(formatDate(f.noticeDate))}</td></tr>
        <tr><td class="left">Data do agendamento da vistoria</td><td>${esc(formatDate(f.scheduleDate))}</td></tr>
        <tr><td class="left">Data da realização da vistoria</td><td>${esc(formatDate(f.inspectionDate))}</td></tr>
      </tbody></table>

      <div class="doc-section">10. INFORMAÇÕES COMPLEMENTARES</div>
      <p class="doc-text">As orientações não representam o reconhecimento prévio de cobertura do sinistro ora reclamado ou de eventual valor a indenizar, os quais dependem da análise das Condições do Seguro contratado, e da devida análise e manifestação da Companhia Seguradora.</p>

      <p class="doc-text" style="text-align:right;margin-top:9mm">${esc(f.reportCity || '')}, ${esc(longDate(f.reportDate))}.</p>
      <div class="signature-report-grid">
        <div class="signature-report">${regulatorSig ? `<img src="${attr(regulatorSig)}" alt="">` : '<div style="height:18mm"></div>'}<div class="signature-line">Regulador</div><div>${esc(f.regulatorName || '')}</div><div>CPF: ${esc(f.regulatorCpf || '')}</div></div>
        <div class="signature-report">${claimantSig ? `<img src="${attr(claimantSig)}" alt="">` : '<div style="height:18mm"></div>'}<div class="signature-line">Cooperado / Representante</div><div>${esc(f.claimantName || '')}</div><div>CPF: ${esc(f.claimantCpf || '')}</div></div>
      </div>`;
  }

  function buildContents(state) {
    const damages = Array.isArray(state.damages) ? state.damages : [];
    const photos = Array.isArray(state.photos) ? state.photos.filter(p => p.dataUrl) : [];
    const docs = state.fields?.noDocuments ? [] : (Array.isArray(state.documents) ? state.documents : []);
    const calc = calculate(state);
    const contents = [];

    contents.push({html:coverContent(state), first:true});
    contents.push({html:technicalStartContent(state)});

    const damagePages = paginateDamageItems(damages);
    damagePages.forEach((page,index) => {
      contents.push({html:index === 0
        ? damageStartContent(state,page.items,page.start)
        : damageContinuationContent(page.items,page.start)});
    });

    for (let start = 0; start < photos.length; start += 4) {
      contents.push({html:photoPageContent(photos.slice(start,start+4),start)});
    }

    if (!docs.length) {
      contents.push({html:documentsContent(state,[])});
    } else {
      for (let start = 0; start < docs.length; start += 12) {
        contents.push({html:documentsContent(state,docs.slice(start,start+12),start > 0)});
      }
    }

    const rowsPerPage = 9;
    if (!damages.length) {
      contents.push({html:indemnityContent(state,[],0,true,calc)});
    } else {
      for (let start = 0; start < damages.length; start += rowsPerPage) {
        const slice = damages.slice(start,start+rowsPerPage);
        contents.push({html:indemnityContent(state,slice,start,start+rowsPerPage>=damages.length,calc)});
      }
    }

    contents.push({html:closingContent(state)});
    return contents;
  }

  function buildHTML(state, {draft = false} = {}) {
    const contents = buildContents(state);
    return contents.map((page,index) => reportPage(page.html,index+1,contents.length,{first:page.first,draft})).join('');
  }

  window.FastTrackV06Report = {
    ASSETS, esc, attr, money, plainMoney, formatDate, longDate, occurrenceText, inspectionText,
    calculate, paginateDamageItems, buildContents, buildHTML
  };
})();
