(() => {
  'use strict';

  const svgUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const BRAND_ASSETS = window.FastTrackV06BrandAssets || {};
const ASSETS = {
  logo: BRAND_ASSETS.logo || svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="830" height="400" viewBox="0 0 830 400"><rect width="830" height="400" fill="white"/><g fill="none" stroke="#29A8E0" stroke-width="18"><ellipse cx="235" cy="190" rx="150" ry="118"/><ellipse cx="365" cy="190" rx="150" ry="118"/></g><text x="205" y="235" font-family="Arial Black,Arial" font-size="130" font-weight="900" fill="#29A8E0">HS</text><text x="540" y="155" font-family="Arial Black,Arial" font-size="58" font-weight="900" fill="#111">beyond</text><text x="540" y="225" font-family="Arial Black,Arial" font-size="58" font-weight="900" fill="#111">solutions</text></svg>`),
  watermark: BRAND_ASSETS.watermark || svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750"><g fill="none" stroke="#29A8E0" stroke-opacity="0.18" stroke-width="28"><ellipse cx="405" cy="375" rx="310" ry="245"/><ellipse cx="595" cy="375" rx="310" ry="245"/></g><text x="320" y="470" font-family="Arial Black,Arial" font-size="260" font-weight="900" fill="#29A8E0" fill-opacity="0.10">HS</text></svg>`),
    footer: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1431"><path fill="#29A8E0" fill-rule="evenodd" d="M165,384L143,429 L123,482 L107,545 L99,603 L97,652 L98,684 L102,725 L113,784 L131,843 L148,884 L163,914 L181,945 L210,987 L251,1035 L270,1054 L304,1084 L352,1119 L389,1141 L423,1158 L462,1174 L495,1185 L525,1193 L572,1202 L606,1206 L645,1208 L689,1207 L730,1203 L770,1196 L769,1193 L701,1120 L683,1122 L625,1122 L594,1119 L553,1112 L515,1102 L486,1092 L439,1071 L386,1039 L345,1007 L307,970 L274,930 L248,891 L223,843 L204,793 L191,742 L184,692 L183,622 L189,571 L200,523 L209,495 L224,458 L239,428 L255,401 L284,360 L307,333 L338,302 L369,276 L400,254 L441,230 L480,212 L516,199 L553,189 L585,183 L637,178 L691,179 L744,186 L796,199 L844,217 L893,242 L931,267 L970,299 L967,302 L755,393 L729,406 L696,427 L663,454 L638,480 L619,504 L602,530 L586,561 L574,591 L565,622 L558,661 L556,686 L556,715 L558,740 L564,775 L571,801 L582,831 L598,864 L621,900 L645,929 L858,1161 L905,1206 L938,1232 L966,1251 L991,1266 L1028,1285 L1074,1304 L1111,1316 L1143,1324 L1205,1334 L1253,1337 L1323,1334 L1359,1329 L1393,1322 L1423,1314 L1456,1303 L1499,1285 L1558,1253 L1585,1235 L1614,1213 L1647,1184 L1669,1162 L1709,1115 L1738,1073 L1770,1014 L1789,968 L1805,916 L1816,861 L1821,812 L1821,746 L1816,697 L1803,634 L1787,584 L1765,533 L1742,491 L1707,440 L1674,401 L1632,360 L1595,330 L1545,297 L1499,273 L1450,253 L1387,235 L1350,228 L1305,223 L1224,223 L1180,228 L1150,234 L1219,309 L1247,307 L1282,307 L1328,311 L1372,319 L1426,335 L1458,348 L1490,364 L1517,380 L1565,415 L1599,446 L1637,489 L1667,532 L1692,578 L1709,619 L1723,665 L1729,693 L1734,727 L1736,751 L1736,807 L1733,839 L1726,879 L1718,910 L1703,953 L1683,996 L1665,1027 L1637,1067 L1618,1090 L1587,1122 L1562,1144 L1533,1166 L1504,1185 L1463,1207 L1433,1220 L1395,1233 L1364,1241 L1316,1249 L1293,1251 L1235,1251 L1212,1249 L1167,1242 L1118,1229 L1069,1210 L1025,1187 L983,1159 L949,1131 L951,1128 L1163,1037 L1203,1016 L1228,999 L1250,981 L1278,953 L1293,935 L1310,911 L1331,873 L1342,847 L1356,799 L1360,776 L1363,743 L1363,715 L1361,690 L1357,664 L1350,635 L1342,611 L1331,585 L1319,562 L1304,538 L1278,505 L1055,262 L1026,234 L987,202 L939,170 L881,140 L832,121 L778,106 L734,98 L679,93 L614,94 L584,97 L542,104 L485,119 L430,140 L384,163 L332,196 L307,215 L278,240 L235,284 L198,331Z M1034,366L1218,566 L1232,584 L1247,608 L1257,628 L1267,655 L1276,696 L1278,738 L1272,784 L1259,825 L1240,862 L1223,886 L1210,901 L1189,921 L1175,932 L1152,947 L1131,958 L885,1064 L704,867 L688,847 L675,827 L657,789 L649,764 L644,740 L641,709 L641,692 L646,650 L651,630 L661,602 L680,566 L705,533 L725,513 L749,494 L785,473Z"/></svg>`)
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
        <img class="report-footer-mark" src="${ASSETS.footer}" alt="Símbolo Horizon Servitas">
        <div class="report-footer-address">Matriz - Rua XV de novembro 1336, salas 34 e 35 – Blumenau – SC – CEP 89010-903</div>
        <div class="report-footer-contact">www.horizonservitas.com +55 47 3326-1844</div>
        <div class="report-page-number">${pageNo} de ${total}</div>
      </div>
    </section>`;
  }

  function coverContent(state) {
    const f = state.fields || {};
    const compact = (value, fallback = '') => {
      const normalized = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
      return normalized || fallback;
    };
    const standardRow = (label, value) => `<tr class="meta-standard"><th>${esc(label)}</th><td colspan="2">${esc(compact(value))}</td></tr>`;
    const shiftedRow = (label, value) => `<tr class="meta-shifted"><th colspan="2">${esc(label)}</th><td>${esc(compact(value))}</td></tr>`;
    return `
      <div class="cover-layout">
        <div class="doc-title">RELATÓRIO DE CONTINGÊNCIA</div>
        <div class="doc-subtitle">RISCOS NOMEADOS EMPRESARIAL</div>
        <table class="claim-table">
          <colgroup><col class="claim-label-col"><col class="claim-value-col"></colgroup>
          <tbody>
            <tr><td>Sinistro Seguradora:</td><td>${esc(compact(f.insurerClaim, 'A INFORMAR'))}</td></tr>
            <tr><td>Sinistro Horizon Servitas:</td><td>${esc(compact(f.hsClaim))}</td></tr>
          </tbody>
        </table>
        <table class="meta-table">
          <colgroup><col class="meta-label-col"><col class="meta-shift-col"><col class="meta-value-col"></colgroup>
          <tbody>
            ${standardRow('COMPANHIA SEGURADORA:', f.insurer)}
            ${standardRow('SEGURADO:', f.insured)}
            ${standardRow('COOPERADO:', f.claimantName)}
            ${standardRow('LOCAL DO SINISTRO:', f.riskAddress)}
            ${standardRow('APÓLICE DE SEGUROS:', f.policyNumber)}
            ${standardRow('PRODUTO:', f.productName)}
            ${standardRow('CORRETOR:', f.broker)}
            ${shiftedRow('DATA DO SINISTRO:', longDate(f.lossDate, true))}
            ${shiftedRow('COBERTURA:', f.coverageName)}
          </tbody>
        </table>
      </div>`;
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
      <div class="cadastral-data">
        <p class="cadastral-line"><strong>Nome completo:</strong> ${esc(f.claimantName || '')}</p>
        <p class="cadastral-line"><strong>CPF:</strong> ${esc(f.claimantCpf || '')}</p>
        <p class="cadastral-line"><strong>Dados Bancários:</strong> ${esc(f.bankName || '')} — AG: ${esc(f.bankAgency || '')} / CC: ${esc(f.bankAccount || '')}</p>
      </div>

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

  function createFlowPaginator() {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden','true');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;visibility:hidden;pointer-events:none;z-index:-10000';
    host.innerHTML = '<section class="report-page"><div class="report-content"></div></section>';
    document.body.appendChild(host);
    const probe = host.querySelector('.report-content');
    const pages = [[]];
    const current = () => pages[pages.length - 1];
    const currentHTML = () => current().join('');
    const isEmpty = () => !currentHTML().trim();
    const fits = (extra = '') => {
      probe.innerHTML = currentHTML() + extra;
      return probe.scrollHeight <= probe.clientHeight + 1;
    };
    const newPage = () => {
      if (!isEmpty()) pages.push([]);
    };
    const push = (html) => {
      if (html) current().push(html);
    };
    const add = (html, {forceNew = false, keepWithNext = ''} = {}) => {
      if (!html) return;
      if (forceNew && !isEmpty()) newPage();
      if (keepWithNext && !fits(html + keepWithNext) && !isEmpty()) newPage();
      if (!fits(html) && !isEmpty()) newPage();
      push(html);
    };
    const tableHTML = (tableClass, headerHTML, rowHTML) => `<table class="doc-table ${tableClass}"><thead>${headerHTML}</thead><tbody>${rowHTML}</tbody></table>`;
    const addTable = ({prefix = '', continuationPrefix = '', tableClass = '', headerHTML = '', rows = [], emptyHTML = ''}) => {
      if (!rows.length) {
        if (prefix) add(prefix,{keepWithNext:emptyHTML});
        add(emptyHTML);
        return;
      }
      let offset = 0;
      let first = true;
      while (offset < rows.length) {
        const heading = first ? prefix : continuationPrefix;
        if (heading) {
const seed = tableHTML(tableClass,headerHTML,rows[offset]);
if (!fits(heading + seed) && !isEmpty()) newPage();
push(heading);
        }
        let best = 0;
        for (let count = 1; offset + count <= rows.length; count += 1) {
const candidate = tableHTML(tableClass,headerHTML,rows.slice(offset,offset + count).join(''));
if (fits(candidate)) best = count;
else break;
        }
        if (!best) {
if (!isEmpty()) {
  newPage();
  if (continuationPrefix) push(continuationPrefix);
}
for (let count = 1; offset + count <= rows.length; count += 1) {
  const candidate = tableHTML(tableClass,headerHTML,rows.slice(offset,offset + count).join(''));
  if (fits(candidate)) best = count;
  else break;
}
        }
        if (!best) best = 1;
        push(tableHTML(tableClass,headerHTML,rows.slice(offset,offset + best).join('')));
        offset += best;
        first = false;
        if (offset < rows.length) newPage();
      }
    };
    const addList = ({prefix = '', continuationPrefix = '', rows = []}) => {
      if (!rows.length) {
        add(prefix + '<p class="doc-text">Documentos não apresentados até o momento.</p>');
        return;
      }
      let offset = 0;
      let first = true;
      while (offset < rows.length) {
        const heading = first ? prefix : continuationPrefix;
        const list = (count) => `<ol class="document-list" start="${offset + 1}">${rows.slice(offset,offset + count).join('')}</ol>`;
        if (heading && !fits(heading + list(1)) && !isEmpty()) newPage();
        if (heading) push(heading);
        let best = 0;
        for (let count = 1; offset + count <= rows.length; count += 1) {
if (fits(list(count))) best = count;
else break;
        }
        if (!best) {
if (!isEmpty()) {
  newPage();
  if (continuationPrefix) push(continuationPrefix);
}
for (let count = 1; offset + count <= rows.length; count += 1) {
  if (fits(list(count))) best = count;
  else break;
}
        }
        if (!best) best = 1;
        push(list(best));
        offset += best;
        first = false;
        if (offset < rows.length) newPage();
      }
    };
    const addTextSection = (title, value, continuationTitle = '') => {
      const words = String(value || '').trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        add(title + '<p class="doc-text"></p>');
        return;
      }
      let offset = 0;
      let first = true;
      while (offset < words.length) {
        const heading = first ? title : continuationTitle;
        const paragraph = (count) => `<p class="doc-text">${esc(words.slice(offset,offset + count).join(' '))}</p>`;
        if (heading && !fits(heading + paragraph(Math.min(12,words.length - offset))) && !isEmpty()) newPage();
        if (heading) push(heading);
        let low = 1;
        let high = words.length - offset;
        let best = 0;
        while (low <= high) {
const mid = Math.floor((low + high) / 2);
if (fits(paragraph(mid))) { best = mid; low = mid + 1; }
else high = mid - 1;
        }
        if (!best) {
if (!isEmpty()) {
  newPage();
  first = false;
  continue;
}
best = Math.min(20,words.length - offset);
        }
        push(paragraph(best));
        offset += best;
        first = false;
        if (offset < words.length) newPage();
      }
    };
    const finish = () => pages.filter(page => page.join('').trim()).map(page => page.join(''));
    const destroy = () => host.remove();
    return {add,push,newPage,fits,isEmpty,addTable,addList,addTextSection,finish,destroy};
  }

  function photoRowContent(items, start) {
    const cells = items.map((photo,index) => `<div class="photo-cell-report">
      <img src="${attr(photo.dataUrl)}" alt="">
      <p class="doc-caption">Figura ${start + index + 1} — ${esc(photo.caption || '')}</p>
    </div>`).join('');
    return `<div class="photo-row-report">${cells}</div>`;
  }

  function buildContents(state) {
    const f = state.fields || {};
    const damages = Array.isArray(state.damages) ? state.damages : [];
    const photos = Array.isArray(state.photos) ? state.photos.filter(photo => photo.dataUrl) : [];
    const docs = f.noDocuments ? [] : (Array.isArray(state.documents) ? state.documents : []);
    const calc = calculate(state);
    const paginator = createFlowPaginator();
    try {
      paginator.add(technicalStartContent(state));

      const damagePrefix = `<div class="doc-section">4. APURAÇÕES DA REGULAÇÃO</div>
        <div class="doc-subsection">4.1. LEVANTAMENTOS EM VISTORIA</div>
        <p class="doc-text">${esc(inspectionText(f.inspectionDate))}</p>
        <div class="doc-subsection"><u>RELAÇÃO DE DANOS:</u></div>`;
      const damageContinuation = `<div class="doc-section">4.1. LEVANTAMENTOS EM VISTORIA — CONTINUAÇÃO</div>
        <div class="doc-subsection"><u>RELAÇÃO DE DANOS:</u></div>`;
      const damageHeader = '<tr><th>Item</th><th class="left">Material danificado</th><th>Quantidade</th><th>Unidade</th><th>Idade</th><th>Valor reclamado</th></tr>';
      const damageRowList = damages.map((item,index) => `<tr><td>${index + 1}</td><td class="left">${esc(item.description || '')}</td><td>${esc(item.quantity || '')}</td><td>${esc(item.unit || '')}</td><td>${esc(item.age || '')} ${esc(item.ageUnit || '')}</td><td>${money(item.claimedTotal)}</td></tr>`);
      paginator.addTable({prefix:damagePrefix,continuationPrefix:damageContinuation,tableClass:'damage-table',headerHTML:damageHeader,rows:damageRowList,emptyHTML:'<p class="doc-text">Nenhum item cadastrado.</p>'});

      if (photos.length) {
        let shownOnPage = 0;
        let started = false;
        for (let start = 0; start < photos.length; start += 2) {
const slice = photos.slice(start,start + 2);
const row = photoRowContent(slice,start);
if (!started) {
  const heading = '<div class="doc-section">REGISTRO FOTOGRÁFICO</div>';
  if (!paginator.fits(heading + row) && !paginator.isEmpty()) paginator.newPage();
  paginator.push(heading);
  started = true;
}
if (shownOnPage + slice.length > 4) {
  paginator.newPage();
  paginator.push('<div class="doc-section">REGISTRO FOTOGRÁFICO — CONTINUAÇÃO</div>');
  shownOnPage = 0;
}
if (!paginator.fits(row)) {
  paginator.newPage();
  paginator.push('<div class="doc-section">REGISTRO FOTOGRÁFICO — CONTINUAÇÃO</div>');
  shownOnPage = 0;
}
paginator.push(row);
shownOnPage += slice.length;
        }
      }

      const documentPrefix = '<div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS</div>';
      const documentContinuation = '<div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS — CONTINUAÇÃO</div>';
      const documentRows = docs.map(doc => `<li><strong>${esc(doc.type || doc.name || 'Documento')}</strong>${doc.description ? ` — ${esc(doc.description)}` : ''}</li>`);
      paginator.addList({prefix:documentPrefix,continuationPrefix:documentContinuation,rows:documentRows});

      paginator.addTextSection('<div class="doc-section">5. PARECER DO REGULADOR</div>',f.regulatorOpinion || '','<div class="doc-section">5. PARECER DO REGULADOR — CONTINUAÇÃO</div>');

      const indemnityPrefix = `<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO</div>
        <p class="doc-text">Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.</p>`;
      const indemnityContinuation = '<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO — CONTINUAÇÃO</div>';
      const indemnityHeader = '<tr><th>Item</th><th class="left">Descrição</th><th>Quantidade / unidade</th><th>Idade</th><th>Valor reclamado</th><th>Valor apurado</th></tr>';
      const indemnityRowList = damages.map((item,index) => `<tr><td>${index + 1}</td><td class="left">${esc(item.description || '')}</td><td>${esc(item.quantity || '')} ${esc(item.unit || '')}</td><td>${esc(item.age || '')} ${esc(item.ageUnit || '')}</td><td>${money(item.claimedTotal)}</td><td>${item.assessedTotal === '' || item.assessedTotal == null ? 'A INFORMAR' : money(item.assessedTotal)}</td></tr>`);
      paginator.addTable({prefix:indemnityPrefix,continuationPrefix:indemnityContinuation,tableClass:'indemnity-table',headerHTML:indemnityHeader,rows:indemnityRowList,emptyHTML:'<p class="doc-text">Nenhum item cadastrado.</p>'});
      const totals = `<table class="doc-table final-table"><tbody>
        <tr><th>Total reclamado</th><td>${money(calc.totalClaimed)}</td></tr>
        <tr><th>Total dos prejuízos apurados</th><td>${money(calc.totalAssessed)}</td></tr>
        <tr><th>Franquia contratual</th><td>${money(calc.deductible)}</td></tr>
        <tr class="total-row"><th>Valor líquido apurado para indenização</th><td>${money(calc.net)}</td></tr>
      </tbody></table>`;
      if (!paginator.fits(totals) && !paginator.isEmpty()) {
        paginator.newPage();
        paginator.push(indemnityContinuation);
      }
      paginator.add(totals);

      const other = f.otherInsurance === 'nao'
        ? 'O cooperado declara não possuir outros seguros contratados para os bens sinistrados.'
        : f.otherInsurance === 'sim'
? `O cooperado declarou a existência de outro(s) seguro(s): ${esc(f.otherInsuranceDetails || '')}`
: 'Declaração sobre outros seguros não informada.';
      paginator.add(`<div class="doc-section">7. DECLARAÇÃO DE OUTROS SEGUROS</div><p class="doc-text">${other}</p>`);
      paginator.add(`<div class="doc-section">8. DADOS CADASTRAIS</div><div class="cadastral-data"><p class="cadastral-line"><strong>Nome completo:</strong> ${esc(f.claimantName || '')}</p><p class="cadastral-line"><strong>CPF:</strong> ${esc(f.claimantCpf || '')}</p><p class="cadastral-line"><strong>Dados Bancários:</strong> ${esc(f.bankName || '')} — AG: ${esc(f.bankAgency || '')} / CC: ${esc(f.bankAccount || '')}</p></div>`);
      paginator.add(`<div class="doc-section">9. CRONOLOGIA</div><table class="doc-table chrono-table"><tbody>
        <tr><td class="left">Data da ocorrência</td><td>${esc(formatDate(f.lossDate))}</td></tr>
        <tr><td class="left">Data do aviso</td><td>${esc(formatDate(f.noticeDate))}</td></tr>
        <tr><td class="left">Data do agendamento da vistoria</td><td>${esc(formatDate(f.scheduleDate))}</td></tr>
        <tr><td class="left">Data da realização da vistoria</td><td>${esc(formatDate(f.inspectionDate))}</td></tr>
      </tbody></table>`);
      paginator.add(`<div class="doc-section">10. INFORMAÇÕES COMPLEMENTARES</div><p class="doc-text">As orientações não representam o reconhecimento prévio de cobertura do sinistro ora reclamado ou de eventual valor a indenizar, os quais dependem da análise das Condições do Seguro contratado, e da devida análise e manifestação da Companhia Seguradora.</p>`);

      const regulatorSig = state.signatures?.regulator;
      const claimantSig = state.signatures?.claimant;
      const signatureBlock = `<div class="closing-signature-block"><p class="doc-text report-date">${esc(f.reportCity || '')}, ${esc(longDate(f.reportDate))}.</p>
        <div class="signature-report-grid">
<div class="signature-report">${regulatorSig ? `<img src="${attr(regulatorSig)}" alt="">` : '<div class="signature-spacer"></div>'}<div class="signature-line">Regulador</div><div>${esc(f.regulatorName || '')}</div><div>CPF: ${esc(f.regulatorCpf || '')}</div></div>
<div class="signature-report">${claimantSig ? `<img src="${attr(claimantSig)}" alt="">` : '<div class="signature-spacer"></div>'}<div class="signature-line">Cooperado / Representante</div><div>${esc(f.claimantName || '')}</div><div>CPF: ${esc(f.claimantCpf || '')}</div></div>
        </div></div>`;
      paginator.add(signatureBlock);

      const flowPages = paginator.finish();
      return [{html:coverContent(state),first:true},...flowPages.map(html => ({html}))];
    } finally {
      paginator.destroy();
    }
  }

  function buildHTML(state, {draft = false} = {}) {
    const contents = buildContents(state);
    return contents.map((page,index) => reportPage(page.html,index + 1,contents.length,{first:page.first,draft})).join('');
  }

  window.FastTrackV06Report = {
    ASSETS, esc, attr, money, plainMoney, formatDate, longDate, occurrenceText, inspectionText,
    calculate, paginateDamageItems, buildContents, buildHTML
  };
})();
