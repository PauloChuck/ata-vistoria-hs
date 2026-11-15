(() => {
  'use strict';

  const VERSION = '0.4';
  const TEMPLATE_URL = 'templates/contingencia_base_v04.docx?v=040';
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
  }[char]));

  const value = (id) => String($(id)?.value || '').trim();
  const checked = (id) => Boolean($(id)?.checked);

  function numberValue(input) {
    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
    let text = String(input ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
    if (!text) return 0;
    if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
    else if (text.includes(',')) text = text.replace(',', '.');
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function money(input) {
    return numberValue(input).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }

  function formatDate(input) {
    if (!input) return 'A INFORMAR';
    const parts = String(input).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(input);
  }

  function longDate(input, upper = false) {
    if (!input) return 'A INFORMAR';
    const [year, month, day] = String(input).split('-');
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const result = `${day} de ${months[Number(month) - 1] || ''} de ${year}`;
    return upper ? result.toLocaleUpperCase('pt-BR') : result;
  }

  function slug(input) {
    return String(input || 'processo-fast-track')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'processo-fast-track';
  }

  function resolveCaseId() {
    return value('insurerClaim') || value('hsClaim') || value('claimantName') || 'processo-fast-track';
  }

  function setStatus(message, error = false) {
    const target = $('saveStatus');
    if (!target) return;
    target.textContent = message;
    target.style.color = error ? '#9b2c2c' : '';
  }

  function installTopicLayout() {
    if (document.querySelector('.v04-topic-salvage')) return;
    const salvage = $('salvageStatus');
    const recovery = $('recoveryStatus');
    if (!salvage || !recovery) return;

    const combined = salvage.closest('.grid2');
    const salvageField = salvage.parentElement;
    const recoveryField = recovery.parentElement;
    const salvageNotes = $('salvageNotes');
    const salvageLabel = document.querySelector('label[for="salvageNotes"]');
    const recoveryGrid = $('recoveryAgainst')?.closest('.grid2');
    const recoveryNotes = $('recoveryNotes');
    const recoveryLabel = document.querySelector('label[for="recoveryNotes"]');
    if (!combined || !salvageField || !recoveryField || !salvageNotes || !salvageLabel || !recoveryGrid || !recoveryNotes || !recoveryLabel) return;

    const salvageBox = document.createElement('div');
    salvageBox.className = 'v04-topic v04-topic-salvage';
    salvageBox.innerHTML = '<h3>Salvados</h3><p class="helper">Registre exclusivamente a existência, destinação e eventual valor comercial dos remanescentes.</p>';
    salvageBox.append(salvageField, salvageLabel, salvageNotes);

    const recoveryBox = document.createElement('div');
    recoveryBox.className = 'v04-topic v04-topic-recovery';
    recoveryBox.innerHTML = '<h3>Ressarcimento</h3><p class="helper">Registre separadamente a possibilidade de recuperação contra terceiro responsável.</p>';
    recoveryBox.append(recoveryField, recoveryGrid, recoveryLabel, recoveryNotes);

    combined.replaceWith(salvageBox, recoveryBox);

    const style = document.createElement('style');
    style.textContent = `
      .v04-topic{border:1px solid #dce4ea;border-radius:16px;padding:14px;margin:14px 0;background:#fbfcfd}
      .v04-topic h3{margin:0 0 4px;color:#176d91}
      .v04-topic .helper{margin-bottom:8px}
    `;
    document.head.appendChild(style);
  }

  function collectInstallations() {
    return qsa('#installationList .installation-card').map((card) => ({
      number: card.querySelector('.inst-confirmed-number')?.value.trim() || card.querySelector('.inst-base-number')?.value.trim() || '',
      year: card.querySelector('.inst-confirmed-year')?.value.trim() || card.querySelector('.inst-base-year')?.value.trim() || '',
      dimensions: card.querySelector('.inst-confirmed-dimensions')?.value.trim() || card.querySelector('.inst-base-dimensions')?.value.trim() || '',
      capacity: card.querySelector('.inst-confirmed-capacity')?.value.trim() || card.querySelector('.inst-base-capacity')?.value.trim() || '',
      condition: card.querySelector('.inst-confirmed-condition')?.value.trim() || card.querySelector('.inst-base-condition')?.value.trim() || '',
      status: card.querySelector('.inst-status')?.value || '',
      shared: card.querySelector('.inst-shared')?.value || '',
      notes: card.querySelector('.inst-notes')?.value.trim() || ''
    }));
  }

  function collectDamages() {
    return qsa('#damageList .damage-card').map((card) => ({
      desc: card.querySelector('.damage-desc')?.value.trim() || '',
      qty: card.querySelector('.damage-qty')?.value.trim() || '',
      unit: card.querySelector('.damage-unit')?.value.trim() || '',
      age: card.querySelector('.damage-age')?.value.trim() || ''
    }));
  }

  function collectAssessment() {
    return qsa('#assessmentList .assessment-card').map((card) => ({
      desc: card.querySelector('.apu-desc')?.value.trim() || '',
      owner: card.querySelector('.apu-owner')?.value || 'cooperado',
      unit: card.querySelector('.apu-unit')?.value.trim() || 'un.',
      claimedQty: card.querySelector('.apu-claimed-qty')?.value || '',
      claimedUnit: card.querySelector('.apu-claimed-unit')?.value || '',
      acceptedQty: card.querySelector('.apu-accepted-qty')?.value || '',
      acceptedUnit: card.querySelector('.apu-accepted-unit')?.value || '',
      discountPct: card.querySelector('.apu-discount-pct')?.value || 0,
      fixedGlosa: card.querySelector('.apu-fixed-glosa')?.value || 0,
      depPct: card.querySelector('.apu-dep-pct')?.value || 0,
      salvage: card.querySelector('.apu-salvage')?.value || 0,
      dvnEligible: Boolean(card.querySelector('.apu-dvn')?.checked),
      notes: card.querySelector('.apu-notes')?.value.trim() || ''
    }));
  }

  function collectPhotos() {
    return qsa('#photoGallery .photo-card').map((card, index) => {
      const image = card.querySelector('img');
      return {
        dataUrl: image?.src || '',
        width: image?.naturalWidth || 1600,
        height: image?.naturalHeight || 900,
        caption: card.querySelector('.photo-caption')?.value.trim() || `Figura ${index + 1} — Registro fotográfico da vistoria.`
      };
    }).filter((item) => /^data:image\/(png|jpe?g);base64,/i.test(item.dataUrl));
  }

  function calculateItem(item) {
    const claimed = numberValue(item.claimedQty) * numberValue(item.claimedUnit);
    const accepted = numberValue(item.acceptedQty) * numberValue(item.acceptedUnit);
    const discount = accepted * Math.min(Math.max(numberValue(item.discountPct), 0), 100) / 100;
    const fixedGlosa = Math.max(numberValue(item.fixedGlosa), 0);
    const afterAdjustments = Math.max(accepted - discount - fixedGlosa, 0);
    const depreciation = afterAdjustments * Math.min(Math.max(numberValue(item.depPct), 0), 100) / 100;
    const salvage = Math.min(Math.max(numberValue(item.salvage), 0), Math.max(afterAdjustments - depreciation, 0));
    const current = Math.max(afterAdjustments - depreciation - salvage, 0);
    const dvn = item.dvnEligible ? depreciation : 0;
    return {claimed, accepted, discount, fixedGlosa, afterAdjustments, depreciation, salvage, current, dvn};
  }

  function calculateFinancial(data) {
    const itemResults = data.assessment.map((item) => ({item, ...calculateItem(item)}));
    const totals = itemResults.reduce((sum, result) => {
      ['claimed','accepted','discount','fixedGlosa','afterAdjustments','depreciation','salvage','current','dvn'].forEach((key) => {
        sum[key] += result[key];
      });
      return sum;
    }, {claimed:0, accepted:0, discount:0, fixedGlosa:0, afterAdjustments:0, depreciation:0, salvage:0, current:0, dvn:0});

    const deductiblePct = Math.max(numberValue(data.fields.deductiblePct), 0);
    const deductibleMin = Math.max(numberValue(data.fields.deductibleMin), 0);
    const deductibleCalculated = totals.current * deductiblePct / 100;
    const deductible = totals.current > 0 ? Math.min(totals.current, Math.max(deductibleCalculated, deductibleMin)) : 0;
    const afterDeductible = Math.max(totals.current - deductible, 0);
    const limitMap = {
      event:numberValue(data.fields.eventLimit), unit:numberValue(data.fields.unitLimit),
      aggregate:numberValue(data.fields.aggregateLimit), custom:numberValue(data.fields.customLimit), none:0
    };
    const limit = limitMap[data.fields.applicableLimitType] || 0;
    const beforeDecision = limit > 0 ? Math.min(afterDeductible, limit) : afterDeductible;
    const limitReduction = Math.max(afterDeductible - beforeDecision, 0);
    const indemnity = data.fields.coverageDecision === 'sem_amparo' ? 0 : beforeDecision;
    return {...totals, deductible, afterDeductible, limit, limitReduction, indemnity, itemResults};
  }

  function collectData() {
    const ids = [
      'eventName','eventDate','eventType','eventRegion','insurer','insuredCooperative','policyNumber','broker',
      'eventCoverage','insurerAnalyst','fastTrackInstructionDate','eventBaseNarrative','eventEvidence',
      'insurerClaim','hsClaim','claimantName','claimantDocument','lossDate','lossTime','riskAddress','coordinates',
      'contactName','contactPhone','inspectionType','riskActivity','riskDataSource','reporterName','occurrenceNarrative',
      'inspectionFindings','documentsPresented','coverageName','eventLimit','unitLimit','aggregateLimit','customLimit',
      'applicableLimitType','deductiblePct','deductibleMin','causeAnalysis','contractAnalysis','coverageDecision',
      'regulatorOpinion','salvageStatus','recoveryStatus','salvageNotes','recoveryAgainst','recoveryProtocol',
      'recoveryNotes','otherInsurance','otherInsurer','otherPolicy','beneficiaryName','beneficiaryDocument','bankName',
      'bankAgency','bankAccount','noticeDate','appointmentDate','contactDate','inspectionDate','closingDate','reportDate',
      'emissionCity','regulatorName','regulatorDocument','finalNotes'
    ];
    const fields = Object.fromEntries(ids.map((id) => [id, value(id)]));
    fields.includeBankInReport = checked('includeBankInReport');
    const data = {
      fields,
      installations: collectInstallations(),
      damages: collectDamages(),
      assessment: collectAssessment(),
      photos: collectPhotos()
    };
    data.financial = calculateFinancial(data);
    return data;
  }

  function r(text, options = {}) {
    const {bold=false, italic=false, underline=false, color, size=21} = options;
    return `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${bold?'<w:b/>':''}${italic?'<w:i/>':''}${underline?'<w:u w:val="single"/>':''}${color?`<w:color w:val="${color}"/>`:''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t${/^\s|\s$/.test(String(text))?' xml:space="preserve"':''}>${esc(text)}</w:t></w:r>`;
  }

  function p(content = '', options = {}) {
    const {style, jc, before, after, line, keep=false, indentLeft, hanging, pageBreakBefore=false} = options;
    const pPr = [
      style ? `<w:pStyle w:val="${style}"/>` : '',
      keep ? '<w:keepNext/><w:keepLines/>' : '',
      pageBreakBefore ? '<w:pageBreakBefore/>' : '',
      jc ? `<w:jc w:val="${jc}"/>` : '',
      [before,after,line].some((x)=>x!==undefined) ? `<w:spacing${before!==undefined?` w:before="${before}"`:''}${after!==undefined?` w:after="${after}"`:''}${line!==undefined?` w:line="${line}" w:lineRule="auto"`:''}/>` : '',
      (indentLeft!==undefined || hanging!==undefined) ? `<w:ind${indentLeft!==undefined?` w:left="${indentLeft}"`:''}${hanging!==undefined?` w:hanging="${hanging}"`:''}/>` : ''
    ].join('');
    const runs = Array.isArray(content) ? content.join('') : (String(content).startsWith('<w:') ? content : r(content));
    return `<w:p><w:pPr>${pPr}</w:pPr>${runs}</w:p>`;
  }

  const pageBreak = () => '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>';

  function heading(number, title, pageBreakBefore = false) {
    return p(r(`${number}  ${title}`, {size:26}), {style:'Ttulo1', before:360, after:180, line:300, keep:true, pageBreakBefore});
  }

  function subheading(number, title) {
    return p(r(`${number}  ${title}`, {bold:true, size:22}), {style:'Ttulo2', before:280, after:120, line:270, keep:true});
  }

  function bodyText(text, options = {}) {
    const {boldPrefix, after=140, jc='both'} = options;
    let runs;
    if (boldPrefix && String(text).startsWith(boldPrefix)) {
      runs = [r(boldPrefix,{bold:true,size:21}), r(String(text).slice(boldPrefix.length),{size:21})];
    } else runs = r(text || 'A INFORMAR',{size:21});
    return p(runs,{style:'Normal',jc,after,line:330});
  }

  function tableCell(text, width, options = {}) {
    const {bold=false, jc='center', shade, size=19} = options;
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/>${shade?`<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>`:''}</w:tcPr>${p(r(text,{bold,size}),{jc,after:0,line:240})}</w:tc>`;
  }

  function table(rows, options = {}) {
    const {widths, headerRows=1, border='grid', fontSize=19, cellMargin=70} = options;
    const borderValue = (name) => {
      if (border === 'none') return 'nil';
      if (border === 'horizontal') return ['top','bottom','insideH'].includes(name) ? 'single' : 'nil';
      return 'single';
    };
    const borders = ['top','left','bottom','right','insideH','insideV'].map((name) => `<w:${name} w:val="${borderValue(name)}" w:sz="6" w:space="0" w:color="666666"/>`).join('');
    const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join('');
    const rowXml = rows.map((row, rowIndex) => {
      const header = rowIndex < headerRows;
      const cells = row.map((raw, colIndex) => {
        const cell = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {text:raw};
        return tableCell(cell.text ?? '', widths[colIndex], {
          bold:cell.bold ?? header,
          jc:cell.jc || 'center',
          shade:cell.shade === false ? undefined : (cell.shade || (header ? 'EAF5FA' : undefined)),
          size:cell.size || fontSize
        });
      }).join('');
      return `<w:tr><w:trPr><w:cantSplit/>${header?'<w:tblHeader/>':''}</w:trPr>${cells}</w:tr>`;
    }).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="9071" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellMar><w:top w:w="${cellMargin}" w:type="dxa"/><w:left w:w="${cellMargin}" w:type="dxa"/><w:bottom w:w="${cellMargin}" w:type="dxa"/><w:right w:w="${cellMargin}" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rowXml}</w:tbl>`;
  }

  function imageRun(rid, cx, cy, id, alt) {
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Figura ${id}" descr="${esc(alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="photo_${id}" descr="${esc(alt)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }

  function photoTable(items) {
    const cells = [0,1].map((index) => {
      const item = items[index];
      if (!item) return `<w:tc><w:tcPr><w:tcW w:w="4535" w:type="dxa"/></w:tcPr>${p('',{after:0})}</w:tc>`;
      const maxCx = 4050000, maxCy = 2850000;
      const scale = Math.min(maxCx / Math.max(item.width,1), maxCy / Math.max(item.height,1));
      const cx = Math.max(1,Math.round(item.width * scale));
      const cy = Math.max(1,Math.round(item.height * scale));
      return `<w:tc><w:tcPr><w:tcW w:w="4535" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${p(imageRun(item.rid,cx,cy,item.docId,item.caption),{jc:'center',after:60,line:240})}${p(r(item.caption,{size:18,color:'1F497D'}),{style:'Legenda',jc:'center',after:0,line:240})}</w:tc>`;
    }).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="9071" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9D9D9"/><w:left w:val="single" w:sz="4" w:color="D9D9D9"/><w:bottom w:val="single" w:sz="4" w:color="D9D9D9"/><w:right w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4535"/><w:gridCol w:w="4535"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr></w:tbl>`;
  }

  function coverageDecisionLabel(code) {
    return ({amparado:'Amparado',parcial:'Parcialmente amparado',sem_amparo:'Sem amparo técnico',pendente:'Pendente de definição'})[code] || 'A INFORMAR';
  }

  function salvageText(fields) {
    const base = ({nao:'Não há salvados.',sim:'Há salvados.',avaliar:'A definição dos salvados depende de avaliação.'})[fields.salvageStatus] || 'Situação dos salvados não informada.';
    return [base, fields.salvageNotes].filter(Boolean).join(' ');
  }

  function recoveryText(fields) {
    let base = ({nao:'Não foi identificada possibilidade de ressarcimento.',sim:'Há possibilidade de ressarcimento.',avaliar:'A possibilidade de ressarcimento deverá ser avaliada posteriormente.'})[fields.recoveryStatus] || 'Situação do ressarcimento não informada.';
    if (fields.recoveryStatus === 'sim' && fields.recoveryAgainst) base += ` Possível responsável: ${fields.recoveryAgainst}.`;
    if (fields.recoveryProtocol) base += ` Protocolo / referência: ${fields.recoveryProtocol}.`;
    if (fields.recoveryNotes) base += ` ${fields.recoveryNotes}`;
    return base;
  }

  function riskNotes(installations) {
    const notes = [];
    installations.forEach((item,index) => {
      const label = `Instalação ${index + 1}`;
      if (item.status === 'ajustada') notes.push(`${label}: dados ajustados após a vistoria${item.notes ? ` — ${item.notes}` : ''}.`);
      else if (item.status === 'nao_confirmado') notes.push(`${label}: informações não confirmadas.`);
      if (item.shared === 'sim') notes.push(`${label}: há estruturas ou equipamentos compartilhados; confira a metragem e a capacidade consolidadas.`);
      else if (item.shared === 'incerto') notes.push(`${label}: não foi possível confirmar o compartilhamento de estruturas ou equipamentos.`);
    });
    return notes.join(' ');
  }

  function buildDocument(data, sectPr) {
    const f = data.fields;
    const fin = data.financial;
    const parts = [];

    parts.push(p(r('RELATÓRIO FAST TRACK',{size:48}),{style:'Ttulo',jc:'left',before:120,after:0,line:480}));
    parts.push(p(r('CONTINGÊNCIA — RISCOS NOMEADOS EMPRESARIAL',{size:36,color:'2DA9DF'}),{style:'Ttulo',jc:'left',after:300,line:360}));
    parts.push(table([
      [{text:'Sinistro Seguradora:',jc:'left',shade:false},{text:f.insurerClaim || 'A INFORMAR',jc:'left',bold:true,shade:false}],
      [{text:'Sinistro Horizon Servitas:',jc:'left',shade:false},{text:f.hsClaim || 'A INFORMAR',jc:'left',bold:true,shade:false}]
    ],{widths:[4700,4371],headerRows:0,border:'none',fontSize:20,cellMargin:0}));
    const coverRows = [
      ['COMPANHIA SEGURADORA:',f.insurer],['SEGURADO:',f.insuredCooperative],['COOPERADO:',f.claimantName],['CPF / CNPJ:',f.claimantDocument],
      ['LOCAL DO SINISTRO:',f.riskAddress],['APÓLICE DE SEGUROS:',f.policyNumber],['PRODUTO:','FAST TRACK — CONTINGÊNCIA'],['CORRETOR:',f.broker],
      ['DATA DO SINISTRO:',longDate(f.lossDate || f.eventDate,true)],['COBERTURA RECLAMADA:',f.coverageName || f.eventCoverage]
    ].map(([label,text]) => [{text:label,jc:'left',bold:true,shade:false},{text:text || 'A INFORMAR',jc:'left',shade:false}]);
    parts.push(table(coverRows,{widths:[3400,5671],headerRows:0,border:'none',fontSize:20,cellMargin:50}));
    parts.push(pageBreak());

    parts.push(heading('1','EVENTO DE CONTINGÊNCIA'));
    parts.push(bodyText(`${f.eventName || f.eventType || 'Evento de contingência'}${f.eventRegion ? ` — ${f.eventRegion}` : ''}.`,{after:100,jc:'left'}));
    parts.push(bodyText(f.eventBaseNarrative || 'Descrição geral do evento não informada.'));
    parts.push(subheading('1.1','EVIDÊNCIAS GERAIS DO EVENTO'));
    parts.push(bodyText(f.eventEvidence || 'Evidências gerais não informadas.'));
    parts.push(heading('2','PROPRIEDADE RURAL RECLAMADA'));
    parts.push(bodyText(`Trata-se de propriedade destinada a ${f.riskActivity || 'atividade rural a informar'}, situada em ${f.riskAddress || 'local a informar'}${f.coordinates ? ` — coordenadas ${f.coordinates}` : ''}.`));
    const instRows = [['Número','Ano de Construção','Dimensões (metros)','Capacidade','Estado de Conservação']];
    (data.installations.length ? data.installations : [{}]).forEach((item) => instRows.push([item.number || 'A INFORMAR',item.year || 'A INFORMAR',item.dimensions || 'A INFORMAR',item.capacity || 'A INFORMAR',item.condition || 'A INFORMAR']));
    parts.push(table(instRows,{widths:[1500,1400,2400,1800,1971],fontSize:18}));
    const conference = riskNotes(data.installations);
    if (conference) parts.push(bodyText(`Registro de conferência: ${conference}`,{after:100,jc:'left'}));
    parts.push(heading('3','DESCRIÇÃO DA OCORRÊNCIA PELO COOPERADO'));
    if (f.reporterName) parts.push(bodyText(`Relato prestado por: ${f.reporterName}`,{boldPrefix:'Relato prestado por:',after:70,jc:'left'}));
    parts.push(bodyText(f.occurrenceNarrative || 'Relato da ocorrência não informado.'));
    parts.push(pageBreak());

    parts.push(heading('4','COBERTURA RECLAMADA'));
    const deductible = `${numberValue(f.deductiblePct) ? `${numberValue(f.deductiblePct).toLocaleString('pt-BR')}%` : 'A INFORMAR'}${numberValue(f.deductibleMin) ? ` com mínimo de ${money(f.deductibleMin)}` : ''}`;
    parts.push(table([
      ['Cobertura','LMI por evento','Sublimite por unidade','Limite agregado','Franquia'],
      [f.coverageName || f.eventCoverage || 'A INFORMAR',money(f.eventLimit),money(f.unitLimit),money(f.aggregateLimit),deductible]
    ],{widths:[2200,1700,1700,1700,1771],fontSize:17}));
    parts.push(heading('5','APURAÇÕES DA REGULAÇÃO'));
    parts.push(subheading('5.1','LEVANTAMENTOS EM VISTORIA'));
    parts.push(bodyText(f.inspectionFindings || 'Constatações de vistoria não informadas.'));
    parts.push(p(r('RELAÇÃO DE DANOS:',{bold:true,underline:true,size:21}),{after:100,line:300,keep:true}));
    const damages = data.damages.filter((item) => item.desc || item.qty || item.unit || item.age);
    if (!damages.length) parts.push(bodyText('Não foram relacionados itens de danos.',{jc:'left'}));
    damages.forEach((item) => {
      const text = [item.qty,item.unit,item.desc].filter(Boolean).join(' ') + (item.age ? ` — ${item.age}` : '');
      parts.push(p(r(`•  ${text}`,{size:21}),{style:'PargrafodaLista',jc:'left',after:35,line:285,indentLeft:600,hanging:240}));
    });
    parts.push(subheading('5.2','LEVANTAMENTOS DOCUMENTAIS'));
    parts.push(bodyText(f.documentsPresented || 'Documentos apresentados não informados.'));
    parts.push(heading('6','ANÁLISE E DEFINIÇÃO DE CAUSA'));
    parts.push(bodyText(f.causeAnalysis || 'Análise de causa não informada.'));
    parts.push(heading('7','ANÁLISE CONTRATUAL'));
    parts.push(bodyText(f.contractAnalysis || 'Análise contratual não informada.'));
    parts.push(heading('8','PARECER DO REGULADOR'));
    parts.push(bodyText(`${coverageDecisionLabel(f.coverageDecision)}. ${f.regulatorOpinion || 'Parecer conclusivo não informado.'}`,{boldPrefix:`${coverageDecisionLabel(f.coverageDecision)}.`}));

    if (data.photos.length) {
      const photoPages = [];
      data.photos.forEach((photo,index) => {
        photo.rid = `rIdV04Photo${index + 1}`;
        photo.docId = 200 + index;
      });
      for (let i = 0; i < data.photos.length; i += 2) photoPages.push(data.photos.slice(i,i+2));
      photoPages.forEach((photos,index) => {
        parts.push(heading('9',index ? 'REGISTRO FOTOGRÁFICO — CONTINUAÇÃO' : 'REGISTRO FOTOGRÁFICO', true));
        parts.push(photoTable(photos));
      });
    }

    parts.push(heading('10','DEMONSTRATIVO DE INDENIZAÇÃO', true));
    parts.push(bodyText('Conforme alinhado com a seguradora, os prejuízos foram fixados juntamente com o cooperado durante a vistoria, de acordo com preços médios de mercado e/ou documentos apresentados.'));
    const apuRows = [['Item','Descrição','Beneficiário','Qtde.','Valor Reclamado','Valor Apurado']];
    fin.itemResults.forEach((result,index) => apuRows.push([
      String(index + 1), result.item.desc || 'Item sem descrição', result.item.owner === 'cooperativa' ? 'Cooperativa' : 'Cooperado',
      `${result.item.acceptedQty || result.item.claimedQty || ''} ${result.item.unit || ''}`.trim(), money(result.claimed), money(result.current)
    ]));
    if (!fin.itemResults.length) apuRows.push(['1','A INFORMAR','Cooperado','','R$ 0,00','R$ 0,00']);
    apuRows.push(['','Total Geral','','',money(fin.claimed),money(fin.current)]);
    parts.push(table(apuRows,{widths:[600,3100,1300,1000,1500,1571],fontSize:17}));
    const adjustments = fin.itemResults.map((result,index) => {
      const items = [];
      if (result.discount) items.push(`desconto de ${money(result.discount)}`);
      if (result.fixedGlosa) items.push(`glosa de ${money(result.fixedGlosa)}`);
      if (result.depreciation) items.push(`depreciação de ${money(result.depreciation)}`);
      if (result.salvage) items.push(`salvados de ${money(result.salvage)}`);
      if (result.item.notes) items.push(result.item.notes);
      return items.length ? `Item ${index + 1}: ${items.join('; ')}.` : '';
    }).filter(Boolean);
    if (adjustments.length) {
      parts.push(p(r('AJUSTES DA APURAÇÃO:',{bold:true,underline:true,size:21}),{before:180,after:80,line:300,keep:true}));
      adjustments.forEach((text) => parts.push(bodyText(text,{after:50,jc:'left'})));
    }
    parts.push(table([
      ['Quadro Final','Valor Total'],
      ['Total Reclamado',money(fin.claimed)],['Acatado Bruto (VRN)',money(fin.accepted)],['Descontos / Glosas',money(fin.discount + fin.fixedGlosa)],
      ['Depreciação',money(fin.depreciation)],['Salvados',money(fin.salvage)],['Prejuízo Apurado (VA)',money(fin.current)],
      ['Franquia Contratual',money(fin.deductible)],['Redução por Limite',money(fin.limitReduction)],['Valor Líquido',money(fin.indemnity)],['DVN Retido',money(fin.dvn)]
    ],{widths:[6500,2571],fontSize:19}));
    parts.push(bodyText('SÍNTESE DE APURAÇÃO: Os prejuízos foram analisados com base nos documentos apresentados, nos registros fotográficos e no levantamento realizado durante a vistoria. Os valores acatados refletem os ajustes técnicos registrados e os preços considerados na regulação.',{boldPrefix:'SÍNTESE DE APURAÇÃO:'}));

    parts.push(heading('11','SALVADOS', true));
    parts.push(bodyText(salvageText(f)));
    parts.push(heading('12','RESSARCIMENTO'));
    parts.push(bodyText(recoveryText(f)));
    parts.push(heading('13','DECLARAÇÃO SOBRE OUTROS SEGUROS'));
    const otherInsuranceText = f.otherInsurance === 'sim'
      ? `Foi declarada a existência de outro seguro. Seguradora: ${f.otherInsurer || 'A INFORMAR'}. Apólice: ${f.otherPolicy || 'A INFORMAR'}.`
      : 'Foi declarado que não existe outra apólice de seguro que conceda cobertura aos mesmos bens amparados pela apólice em questão.';
    parts.push(bodyText(otherInsuranceText));

    if (f.beneficiaryName || f.beneficiaryDocument || (f.includeBankInReport && (f.bankName || f.bankAgency || f.bankAccount))) {
      parts.push(heading('14','DADOS CADASTRAIS'));
      const bank = f.includeBankInReport ? [f.bankName && `Banco: ${f.bankName}`,f.bankAgency && `Agência: ${f.bankAgency}`,f.bankAccount && `Conta: ${f.bankAccount}`].filter(Boolean).join(' — ') : 'Dados bancários não incluídos no relatório.';
      parts.push(bodyText(`Nome completo: ${f.beneficiaryName || f.claimantName || 'A INFORMAR'}`,{boldPrefix:'Nome completo:',after:60,jc:'left'}));
      parts.push(bodyText(`CPF / CNPJ: ${f.beneficiaryDocument || f.claimantDocument || 'A INFORMAR'}`,{boldPrefix:'CPF / CNPJ:',after:60,jc:'left'}));
      parts.push(bodyText(`Dados bancários: ${bank || 'A INFORMAR'}`,{boldPrefix:'Dados bancários:',after:120,jc:'left'}));
    }

    parts.push(heading('15','CRONOLOGIA'));
    parts.push(table([
      [{text:'Data da ocorrência',jc:'left',shade:false},{text:formatDate(f.lossDate || f.eventDate),jc:'right',shade:false}],
      [{text:'Data do aviso',jc:'left',shade:false},{text:formatDate(f.noticeDate),jc:'right',shade:false}],
      [{text:'Data da nomeação',jc:'left',shade:false},{text:formatDate(f.appointmentDate),jc:'right',shade:false}],
      [{text:'Data do contato / agendamento',jc:'left',shade:false},{text:formatDate(f.contactDate),jc:'right',shade:false}],
      [{text:'Data da vistoria',jc:'left',shade:false},{text:formatDate(f.inspectionDate),jc:'right',shade:false}],
      [{text:'Data do encerramento',jc:'left',shade:false},{text:formatDate(f.closingDate),jc:'right',shade:false}],
      [{text:'Data do relatório',jc:'left',shade:false},{text:formatDate(f.reportDate),jc:'right',shade:false}]
    ],{widths:[6500,2571],headerRows:0,border:'horizontal',fontSize:19,cellMargin:35}));
    parts.push(heading('16','INFORMAÇÕES COMPLEMENTARES'));
    parts.push(bodyText(f.finalNotes || 'Processo concluído pelo fluxo Fast Track de contingência, com apuração realizada durante a vistoria.'));
    parts.push(bodyText('As orientações e conclusões constantes deste relatório estão condicionadas à análise das condições do seguro contratado e à manifestação da Companhia Seguradora.',{after:160}));
    parts.push(p(r(`${f.emissionCity || 'Blumenau (SC)'}, ${longDate(f.reportDate || f.closingDate || new Date().toISOString().slice(0,10))}.`,{size:21}),{jc:'right',before:240,after:420,line:330}));
    parts.push(table([
      [{text:'',shade:false},{text:'Regulador: _____________________________',shade:false}],
      [{text:'',shade:false},{text:`${f.regulatorName || 'A INFORMAR'} / CPF: ${f.regulatorDocument || 'A INFORMAR'}`,shade:false}],
      [{text:'',shade:false},{text:'Segurado / Representante: _____________________________',shade:false}],
      [{text:'',shade:false},{text:`${f.claimantName || 'A INFORMAR'} / CPF: ${f.claimantDocument || 'A INFORMAR'}`,shade:false}]
    ],{widths:[4200,4871],headerRows:0,border:'none',fontSize:19,cellMargin:35}));

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${parts.join('')}${sectPr}</w:body></w:document>`;
  }

  async function exportWordV04() {
    if (!window.JSZip) throw new Error('O componente de geração DOCX não foi carregado.');
    setStatus('Gerando o Word no padrão de contingência…');
    const data = collectData();
    const response = await fetch(TEMPLATE_URL,{cache:'no-store'});
    if (!response.ok) throw new Error('Não foi possível carregar o modelo de contingência.');
    const zip = await window.JSZip.loadAsync(await response.arrayBuffer());
    const templateDocument = await zip.file('word/document.xml').async('string');
    const sectMatch = templateDocument.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
    if (!sectMatch) throw new Error('O modelo Word não possui configuração de página válida.');

    const docXml = buildDocument(data,sectMatch[0]);
    zip.file('word/document.xml',docXml);

    let rels = await zip.file('word/_rels/document.xml.rels').async('string');
    const photoRelationships = [];
    data.photos.forEach((photo,index) => {
      const mimeMatch = photo.dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
      if (!mimeMatch) return;
      const ext = mimeMatch[1].toLowerCase() === 'png' ? 'png' : 'jpg';
      const fileName = `v04_photo_${index + 1}.${ext}`;
      zip.file(`word/media/${fileName}`,mimeMatch[2],{base64:true});
      photoRelationships.push(`<Relationship Id="rIdV04Photo${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`);
    });
    rels = rels.replace('</Relationships>',`${photoRelationships.join('')}</Relationships>`);
    zip.file('word/_rels/document.xml.rels',rels);

    const blob = await zip.generateAsync({
      type:'blob',
      mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression:'DEFLATE',
      compressionOptions:{level:6}
    });
    const fileName = `Relatorio_Fast_Track_${slug(resolveCaseId())}_v04.docx`;
    const file = new File([blob],fileName,{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});

    try {
      if (navigator.canShare && navigator.canShare({files:[file]})) {
        await navigator.share({files:[file],title:'Relatório Fast Track'});
        setStatus('Word gerado no padrão de contingência.');
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('Compartilhamento cancelado.');
        return;
      }
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
    setStatus('Word gerado no padrão de contingência.');
  }

  function install() {
    installTopicLayout();
    const badge = document.querySelector('.header-badges .badge');
    if (badge) badge.textContent = `Protótipo ${VERSION}`;
    const footer = document.querySelector('.app-footer span:last-child');
    if (footer) footer.textContent = `HS Fast Track — Protótipo ${VERSION}`;
    const button = document.querySelector('[data-action="export-word"]');
    if (button) {
      button.textContent = 'Exportar Word — padrão contingência (.docx)';
      button.title = 'Gera o Word com a identidade visual e a paginação do modelo oficial de contingência';
    }

    window.addEventListener('click', async (event) => {
      const target = event.target.closest?.('[data-action="export-word"]');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const originalText = target.textContent;
      target.disabled = true;
      target.textContent = 'Gerando Word…';
      try {
        await exportWordV04();
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'Não foi possível gerar o Word.',true);
        alert(error.message || 'Não foi possível gerar o Word.');
      } finally {
        target.disabled = false;
        target.textContent = originalText;
      }
    },true);

    window.fastTrackWordV04 = {exportWordV04,collectData,buildDocument};
  }

  install();
})();
