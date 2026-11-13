(() => {
  'use strict';

  const REPORT = window.FastTrackV06Report;
  if (!REPORT || typeof REPORT.buildContents !== 'function') return;

  const originalBuildContents = REPORT.buildContents.bind(REPORT);
  const {ASSETS, esc, attr, money, formatDate, longDate, effectiveOccurrenceText, effectiveInspectionText, calculate} = REPORT;

  const clean = (value) => String(value == null ? '' : value).trim();
  const quantityUnit = (item) => [clean(item?.quantity), clean(item?.unit)].filter(Boolean).join(' ');
  const ageText = (item) => {
    const age = [clean(item?.age), clean(item?.ageUnit)].filter(Boolean).join(' ');
    return age ? `Idade: ${age}` : 'Idade: não informada';
  };
  const assessedMoney = (item) => item?.assessedTotal === '' || item?.assessedTotal == null
    ? 'A INFORMAR'
    : money(item.assessedTotal);

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

  function technicalStartBlocks(state) {
    const f = state.fields || {};
    const map = state.map || {};
    const cooperatorBlock = window.FastTrackCooperators?.reportHtml?.(state,{esc}) || '';
    const local = `
      <div class="doc-section">1. LOCAL DO SINISTRO</div>
      <p class="doc-text">Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.</p>
      ${cooperatorBlock}`;
    const mapBlock = `
      <div class="map-report">${map.dataUrl ? `<img src="${attr(map.dataUrl)}" style="object-fit:${map.fit || 'contain'};object-position:${Number(map.posX ?? 50)}% ${Number(map.posY ?? 50)}%">` : '<span>Imagem de localização não informada.</span>'}</div>
      <p class="doc-caption">Localização da propriedade sinistrada.</p>`;
    const occurrence = `
      <div class="doc-section">2. DESCRIÇÃO DA OCORRÊNCIA</div>
      <p class="doc-text">${esc(effectiveOccurrenceText(state))}</p>`;
    const coverage = `
      <div class="doc-section">3. COBERTURA RECLAMADA</div>
      <div class="coverage-clean" role="table" aria-label="Cobertura reclamada">
        <div class="coverage-clean-row coverage-clean-head" role="row">
          <div role="columnheader">Cobertura</div>
          <div role="columnheader">Limite de Indenização</div>
          <div role="columnheader">Franquia</div>
        </div>
        <div class="coverage-clean-row coverage-clean-data" role="row">
          <div role="cell">${esc(f.coverageName || 'Vendaval / Granizo')}</div>
          <div role="cell">${money(35000000)}</div>
          <div role="cell">15% com mínimo<br>de ${money(3000)}</div>
        </div>
      </div>`;
    return [local,mapBlock,occurrence,coverage];
  }

  function surveyRow(item) {
    return `<div class="survey-damage-row" role="listitem">
      <div class="survey-damage-quantity">${esc(quantityUnit(item) || '—')}</div>
      <div class="survey-damage-description">${esc(item?.description || '')}</div>
      <div class="survey-damage-age">${esc(ageText(item))}</div>
    </div>`;
  }

  function indemnityRow(item) {
    return `<div class="indemnity-clean-row" role="row">
      <div class="indemnity-clean-description" role="cell">
        <div>${esc(item?.description || '')}</div>
        <small>${esc(ageText(item))}</small>
      </div>
      <div class="indemnity-clean-quantity" role="cell">${esc(quantityUnit(item) || '—')}</div>
      <div class="indemnity-clean-money" role="cell">${money(item?.claimedTotal)}</div>
      <div class="indemnity-clean-money" role="cell">${assessedMoney(item)}</div>
    </div>`;
  }

  function chronologyBlock(fields) {
    const rows = [
      ['Data da ocorrência', formatDate(fields.lossDate)],
      ['Data do aviso', formatDate(fields.noticeDate)],
      ['Data do agendamento da vistoria', formatDate(fields.scheduleDate)],
      ['Data da realização da vistoria', formatDate(fields.inspectionDate)]
    ];
    return `<div class="chronology-clean" role="table" aria-label="Cronologia">
      ${rows.map(([label,date]) => `<div class="chronology-clean-row" role="row"><div role="cell">${esc(label)}</div><div role="cell">${esc(date)}</div></div>`).join('')}
    </div>`;
  }

  function financialSummary(calc) {
    return `<div class="financial-summary-clean">
      <div class="financial-summary-row"><span>Total de Prejuízos Reclamados</span><strong>${money(calc.totalClaimed)}</strong></div>
      <div class="financial-summary-row"><span>Total de Prejuízos Apurados</span><strong>${money(calc.totalAssessed)}</strong></div>
      <div class="financial-summary-row"><span>Franquia contratual</span><strong>${money(calc.deductible)}</strong></div>
      <div class="financial-summary-row financial-summary-net"><span>Prejuízo Indenizável</span><strong>${money(calc.net)}</strong></div>
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
    const addRecordList = ({prefix = '', continuationPrefix = '', rows = [], wrapClass = ''}) => {
      if (!rows.length) {
        add(prefix + '<p class="doc-text">Nenhum item cadastrado.</p>');
        return;
      }
      let offset = 0;
      let first = true;
      while (offset < rows.length) {
        const heading = first ? prefix : continuationPrefix;
        const block = (count) => `<div class="${wrapClass}">${rows.slice(offset, offset + count).join('')}</div>`;
        if (heading && !fits(heading + block(1)) && !isEmpty()) newPage();
        if (heading) push(heading);
        let best = 0;
        for (let count = 1; offset + count <= rows.length; count += 1) {
          if (fits(block(count))) best = count;
          else break;
        }
        if (!best) {
          if (!isEmpty()) {
            newPage();
            if (continuationPrefix) push(continuationPrefix);
          }
          for (let count = 1; offset + count <= rows.length; count += 1) {
            if (fits(block(count))) best = count;
            else break;
          }
        }
        if (!best) best = 1;
        push(block(best));
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
      const paragraphs = String(value || '').replace(/\r\n/g,'\n').split('\n');
      if (!paragraphs.length) {
        add(title + '<p class="doc-text"></p>');
        return;
      }
      let firstParagraph = true;
      for (const paragraphValue of paragraphs) {
        const words = paragraphValue.trim().split(/\s+/).filter(Boolean);
        if (!words.length) {
          const heading = firstParagraph ? title : '';
          add(`${heading}<p class="doc-text">&nbsp;</p>`);
          firstParagraph = false;
          continue;
        }
        let offset = 0;
        let firstChunk = true;
        while (offset < words.length) {
          const heading = firstParagraph && firstChunk ? title : (firstChunk ? continuationTitle : '');
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
              firstChunk = false;
              continue;
            }
            best = Math.min(20,words.length - offset);
          }
          push(paragraph(best));
          offset += best;
          firstChunk = false;
          if (offset < words.length) newPage();
        }
        firstParagraph = false;
      }
    };
    const finish = () => pages.filter(page => page.join('').trim()).map(page => page.join(''));
    const destroy = () => host.remove();
    return {add,push,newPage,fits,isEmpty,addRecordList,addList,addTextSection,finish,destroy};
  }

  function photoRowContent(items, start) {
    const cells = items.map((photo,index) => `<div class="photo-cell-report">
      <img src="${attr(photo.dataUrl)}" alt="">
      <p class="doc-caption">Figura ${start + index + 1} — ${esc(photo.caption || '')}</p>
    </div>`).join('');
    return `<div class="photo-row-report">${cells}</div>`;
  }

  function isImageEvidence(item) {
    const mime = String(item?.mime || '').toLowerCase();
    const name = String(item?.name || '').toLowerCase();
    return mime.startsWith('image/') || /\.(jpe?g|png)$/i.test(name);
  }

  function evidenceImageRowContent(items) {
    const cells = items.map((entry) => `<div class="cause-evidence-cell-report">
      <img src="${attr(entry.item.dataUrl)}" alt="">
      <p class="doc-caption">Evidência ${entry.index + 1} — ${esc(entry.item.caption || entry.item.name || 'Imagem')}</p>
    </div>`).join('');
    return `<div class="cause-evidence-row-report${items.length === 1 ? ' single' : ''}">${cells}</div>`;
  }

  function evidenceFileRowContent(entry) {
    const item = entry.item;
    const label = item.caption ? ` — ${esc(item.caption)}` : '';
    return `<div class="cause-evidence-file-report"><strong>Evidência ${entry.index + 1}: ${esc(item.name || 'Arquivo')}</strong><span>${esc(item.mime || 'arquivo')}${label}</span></div>`;
  }

  function buildContents(state) {
    const f = state.fields || {};
    const damages = Array.isArray(state.damages) ? state.damages : [];
    const photos = Array.isArray(state.photos) ? state.photos.filter(photo => photo.dataUrl) : [];
    const evidence = Array.isArray(state.causeEvidence) ? state.causeEvidence : [];
    const calc = calculate(state);
    const originalPages = originalBuildContents(state);
    const cover = originalPages[0] || {html:'', first:true};
    const paginator = createFlowPaginator();

    try {
      for (const block of technicalStartBlocks(state)) {
        paginator.add(block);
      }

      const damagePrefix = `<div class="doc-section">4. APURAÇÕES DA REGULAÇÃO</div>
        <div class="doc-subsection">4.1. LEVANTAMENTOS EM VISTORIA</div>
        <p class="doc-text">${esc(effectiveInspectionText(state))}</p>
        <div class="doc-subsection"><u>RELAÇÃO DE DANOS:</u></div>`;
      const damageContinuation = `<div class="doc-section">4.1. LEVANTAMENTOS EM VISTORIA — CONTINUAÇÃO</div>
        <div class="doc-subsection"><u>RELAÇÃO DE DANOS:</u></div>`;
      paginator.addRecordList({
        prefix:damagePrefix,
        continuationPrefix:damageContinuation,
        rows:damages.map(surveyRow),
        wrapClass:'survey-damage-list'
      });

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

      paginator.addTextSection('<div class="doc-subsection">4.2. LAVANTAMENTOS DOCUMENTAIS</div>',f.documentaryNarrative || '','<div class="doc-subsection">4.2. LAVANTAMENTOS DOCUMENTAIS — CONTINUAÇÃO</div>');

      const evidenceHeading = '<div class="doc-subsection cause-evidence-heading">IMAGENS E ARQUIVOS</div>';
      if (!evidence.length) {
        paginator.add(`${evidenceHeading}<p class="doc-text">Nenhuma imagem ou arquivo anexado.</p>`);
      } else {
        const indexedEvidence = evidence.map((item,index) => ({item,index}));
        const firstEntry = indexedEvidence[0];
        const firstBlock = isImageEvidence(firstEntry.item) && firstEntry.item.dataUrl
          ? evidenceImageRowContent([firstEntry])
          : evidenceFileRowContent(firstEntry);
        paginator.add(evidenceHeading,{keepWithNext:firstBlock});
        let offset = 0;
        while (offset < indexedEvidence.length) {
          const entry = indexedEvidence[offset];
          let row;
          if (isImageEvidence(entry.item) && entry.item.dataUrl) {
            const group = [entry];
            const next = indexedEvidence[offset + 1];
            if (next && isImageEvidence(next.item) && next.item.dataUrl) group.push(next);
            row = evidenceImageRowContent(group);
            offset += group.length;
          } else {
            row = evidenceFileRowContent(entry);
            offset += 1;
          }
          if (!paginator.fits(row) && !paginator.isEmpty()) {
            paginator.newPage();
            paginator.push('<div class="doc-subsection">4.2. LAVANTAMENTOS DOCUMENTAIS — IMAGENS E ARQUIVOS (CONTINUAÇÃO)</div>');
          }
          paginator.push(row);
        }
      }

      paginator.addTextSection('<div class="doc-section">5. PARECER DO REGULADOR</div>',f.regulatorOpinion || '','<div class="doc-section">5. PARECER DO REGULADOR — CONTINUAÇÃO</div>');

      const indemnityHeader = `<div class="indemnity-clean-head" role="row">
        <div role="columnheader">Descrição</div>
        <div role="columnheader">Quantidade / unidade</div>
        <div role="columnheader">Valor reclamado</div>
        <div role="columnheader">Valor apurado</div>
      </div>`;
      const indemnityPrefix = `<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO</div>
        <p class="doc-text">Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.</p>
        ${indemnityHeader}`;
      const indemnityContinuation = `<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO — CONTINUAÇÃO</div>
        ${indemnityHeader}`;
      const indemnityRows = damages.map(indemnityRow);
      if (indemnityRows.length) {
        paginator.addRecordList({
          prefix:indemnityPrefix,
          continuationPrefix:indemnityContinuation,
          rows:indemnityRows.map((row) => row),
          wrapClass:'indemnity-clean-body'
        });
      } else {
        paginator.add(`<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO</div>
          <p class="doc-text">Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.</p>
          <p class="doc-text">Nenhum item cadastrado.</p>`);
      }

      const totals = financialSummary(calc);
      if (!paginator.fits(totals) && !paginator.isEmpty()) {
        paginator.newPage();
        paginator.push('<div class="doc-section">6. DEMONSTRATIVO DE INDENIZAÇÃO — CONTINUAÇÃO</div>');
      }
      paginator.add(totals);

      const other = f.otherInsurance === 'nao'
        ? 'O cooperado declara não possuir outros seguros contratados para os bens sinistrados.'
        : f.otherInsurance === 'sim'
          ? `O cooperado declarou a existência de outro(s) seguro(s): ${esc(f.otherInsuranceDetails || '')}`
          : 'Declaração sobre outros seguros não informada.';
      paginator.add(`<div class="doc-section">7. DECLARAÇÃO DE OUTROS SEGUROS</div><p class="doc-text">${other}</p>`);
      const chronology = `<div class="doc-section">8. CRONOLOGIA</div>${chronologyBlock(f)}`;
      paginator.add(chronology,{keepWithNext:'<div class="chronology-clean-row"><div>Data</div><div>00/00/0000</div></div>'});

      paginator.add(`<div class="doc-section">9. INFORMAÇÕES COMPLEMENTARES</div><p class="doc-text">As orientações não representam o reconhecimento prévio de cobertura do sinistro ora reclamado ou de eventual valor a indenizar, os quais dependem da análise das Condições do Seguro contratado, e da devida análise e manifestação da Companhia Seguradora.</p>`);

      const regulatorSig = state.signatures?.regulator;
      const claimantSig = state.signatures?.claimant;
      const signatureBlock = `<div class="closing-signature-block"><p class="doc-text report-date">${esc(f.reportCity || '')}, ${esc(longDate(f.reportDate))}.</p>
        <div class="signature-report-grid">
          <div class="signature-report">${regulatorSig ? `<img src="${attr(regulatorSig)}" alt="">` : '<div class="signature-spacer"></div>'}<div class="signature-line">Regulador</div><div>${esc(f.regulatorName || '')}</div><div>CPF: ${esc(f.regulatorCpf || '')}</div></div>
          <div class="signature-report">${claimantSig ? `<img src="${attr(claimantSig)}" alt="">` : '<div class="signature-spacer"></div>'}<div class="signature-line">Cooperado / Representante</div><div>${esc(f.claimantName || '')}</div><div>CPF: ${esc(f.claimantCpf || '')}</div></div>
        </div></div>`;
      paginator.add(signatureBlock);

      return [cover, ...paginator.finish().map((html) => ({html}))];
    } finally {
      paginator.destroy();
    }
  }

  function buildHTML(state, {draft = false} = {}) {
    const contents = buildContents(state);
    return contents.map((page,index) => reportPage(page.html,index + 1,contents.length,{first:page.first,draft})).join('');
  }

  REPORT.buildContents = buildContents;
  REPORT.buildHTML = buildHTML;
})();
