(() => {
  'use strict';

  const WORD_ACTION = 'export-word';
  const VERSION = '0.2';

  function byId(id) {
    return document.getElementById(id);
  }

  function textValue(id) {
    return String(byId(id)?.value || '').trim();
  }

  function slug(value) {
    return String(value || 'processo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,80) || 'processo';
  }

  function resolveCaseId() {
    return textValue('insurerClaim') || textValue('hsClaim') || textValue('claimantName') || 'processo';
  }

  function setStatus(message,isError = false) {
    const status = byId('saveStatus');
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? '#a64b4b' : '#2b835d';
  }

  function downloadBlob(blob,fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }

  function canvasDataUrl(width,height,drawer) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,width,height);
    drawer(ctx,width,height);
    return canvas.toDataURL('image/png');
  }

  function brandImage() {
    return canvasDataUrl(760,220,(ctx) => {
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#2da9df';
      ctx.beginPath(); ctx.ellipse(145,110,105,77,0,0,Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(265,110,105,77,0,0,Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#2da9df';
      ctx.font = '900 92px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HS',205,114);
      ctx.fillStyle = '#101820';
      ctx.textAlign = 'left';
      ctx.font = '800 50px Arial';
      ctx.fillText('beyond',405,85);
      ctx.fillText('solutions',405,145);
    });
  }

  function watermarkImage() {
    return canvasDataUrl(1000,760,(ctx) => {
      ctx.lineWidth = 28;
      ctx.strokeStyle = 'rgba(66,190,228,.13)';
      ctx.beginPath(); ctx.ellipse(390,380,300,260,0,0,Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(610,380,300,260,0,0,Math.PI * 2); ctx.stroke();
    });
  }

  function footerMarkImage() {
    return canvasDataUrl(260,130,(ctx) => {
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#2da9df';
      ctx.beginPath(); ctx.ellipse(90,66,70,48,0,0,Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(170,66,70,48,0,0,Math.PI * 2); ctx.stroke();
    });
  }

  function replaceBranding(root) {
    const brand = brandImage();
    const watermark = watermarkImage();
    const footerMark = footerMarkImage();

    root.querySelectorAll('.report-brand').forEach((node) => {
      node.innerHTML = `<img class="word-brand-image" src="${brand}" alt="Horizon Servitas — beyond solutions">`;
    });
    root.querySelectorAll('.report-watermark').forEach((node) => {
      node.innerHTML = `<img class="word-watermark-image" src="${watermark}" alt="">`;
    });
    root.querySelectorAll('.footer-mark').forEach((node) => {
      node.innerHTML = `<img class="word-footer-mark-image" src="${footerMark}" alt="">`;
    });
  }

  function transformClaimNumbers(root) {
    root.querySelectorAll('.claim-numbers').forEach((block) => {
      const table = document.createElement('table');
      table.className = 'word-claim-table';
      const body = document.createElement('tbody');
      block.querySelectorAll('.claim-row').forEach((row) => {
        const tr = document.createElement('tr');
        const label = document.createElement('td');
        const value = document.createElement('td');
        label.textContent = row.querySelector('span')?.textContent || '';
        value.innerHTML = `<b>${row.querySelector('b')?.textContent || ''}</b>`;
        tr.append(label,value);
        body.appendChild(tr);
      });
      table.appendChild(body);
      block.replaceWith(table);
    });
  }

  function transformKpis(root) {
    root.querySelectorAll('.doc-kpi-grid').forEach((grid) => {
      const items = Array.from(grid.querySelectorAll('.doc-kpi'));
      const table = document.createElement('table');
      table.className = 'word-kpi-table';
      const body = document.createElement('tbody');
      for (let i = 0; i < items.length; i += 3) {
        const row = document.createElement('tr');
        items.slice(i,i + 3).forEach((item) => {
          const cell = document.createElement('td');
          cell.innerHTML = item.innerHTML;
          row.appendChild(cell);
        });
        while (row.children.length < 3) row.appendChild(document.createElement('td'));
        body.appendChild(row);
      }
      table.appendChild(body);
      grid.replaceWith(table);
    });
  }

  function transformPhotoGrids(root) {
    root.querySelectorAll('.doc-photo-grid').forEach((grid) => {
      const figures = Array.from(grid.querySelectorAll('.doc-photo'));
      const table = document.createElement('table');
      table.className = figures.length === 1 ? 'word-photo-table single' : 'word-photo-table';
      const body = document.createElement('tbody');
      const row = document.createElement('tr');
      figures.forEach((figure) => {
        const cell = document.createElement('td');
        const image = figure.querySelector('img')?.cloneNode(true);
        const caption = figure.querySelector('figcaption')?.cloneNode(true);
        if (image) cell.appendChild(image);
        if (caption) cell.appendChild(caption);
        row.appendChild(cell);
      });
      if (figures.length === 1) row.appendChild(document.createElement('td'));
      body.appendChild(row);
      table.appendChild(body);
      grid.replaceWith(table);
    });
  }

  function transformSignature(root) {
    root.querySelectorAll('.doc-signature').forEach((signature) => {
      const table = document.createElement('table');
      table.className = 'word-signature-table';
      const row = document.createElement('tr');
      const blank = document.createElement('td');
      const content = document.createElement('td');
      content.innerHTML = signature.innerHTML;
      row.append(blank,content);
      table.appendChild(row);
      signature.replaceWith(table);
    });
  }

  function prepareReportClone() {
    const preview = byId('reportPreview');
    const pages = preview ? Array.from(preview.querySelectorAll('.report-page')) : [];
    if (!pages.length) throw new Error('A prévia do relatório ainda não foi gerada. Avance até a etapa 8 e revise o documento antes de exportar.');

    const root = document.createElement('div');
    root.className = 'word-document';
    pages.forEach((page) => root.appendChild(page.cloneNode(true)));

    root.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    replaceBranding(root);
    transformClaimNumbers(root);
    transformKpis(root);
    transformPhotoGrids(root);
    transformSignature(root);
    return root;
  }

  function wordCss() {
    return `
      @page{size:21cm 29.7cm;margin:0}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,sans-serif}
      .word-document{margin:0;padding:0}
      .report-page{position:relative;width:210mm;height:297mm;background:#fff;color:#111;padding:27mm 23mm 24mm;font-family:Arial,sans-serif;font-size:10pt;line-height:1.42;page-break-after:always;overflow:hidden}
      .report-page:last-child{page-break-after:auto}
      .report-content{height:246mm;position:relative;z-index:2;overflow:hidden}
      .report-brand{position:absolute;right:17mm;top:8mm;width:61mm;height:18mm;z-index:5}
      .word-brand-image{display:block;width:61mm;height:auto}
      .report-watermark{position:absolute;left:34mm;top:86mm;width:142mm;height:122mm;z-index:1}
      .word-watermark-image{display:block;width:142mm;height:108mm}
      .report-footer{position:absolute;left:0;right:0;bottom:7mm;height:18mm;color:#2da9df;font-size:7.4pt;z-index:5}
      .footer-mark{position:absolute;left:1mm;bottom:0;width:22mm;height:14mm}
      .word-footer-mark-image{display:block;width:22mm;height:11mm}
      .footer-text{position:absolute;left:27mm;bottom:1mm;line-height:1.6}
      .footer-page{position:absolute;right:12mm;bottom:0;color:#222;font-style:italic}
      .doc-title{font-size:23pt;font-weight:400;margin:15mm 0 0}
      .doc-subtitle{font-size:17pt;color:#2da9df;margin:1mm 0 10mm}
      .word-claim-table{width:84mm;margin:0 0 7mm auto;border-collapse:collapse;font-size:9.5pt}
      .word-claim-table td{border:0;padding:1.1mm 0;vertical-align:top}
      .word-claim-table td:first-child{width:52mm}
      .doc-meta{width:100%;border-collapse:collapse}
      .doc-meta th,.doc-meta td{padding:2.1mm 0;text-align:left;vertical-align:top;font-size:10pt;border:0}
      .doc-meta th{width:60mm;padding-right:5mm;font-weight:bold}
      .doc-section{font-size:14pt;font-weight:400;margin:7mm 0 5mm;page-break-after:avoid}
      .doc-subsection{font-size:11.5pt;font-weight:700;margin:5.5mm 0 3mm;page-break-after:avoid}
      .doc-text{margin:0 0 3.5mm;text-align:justify;white-space:pre-wrap}
      .doc-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.6pt;margin:3mm 0}
      .doc-table th,.doc-table td{border:.25mm solid #555;padding:1.8mm 1.5mm;text-align:center;vertical-align:middle;overflow-wrap:anywhere}
      .doc-table td.left,.doc-table th.left{text-align:left}
      .doc-list{margin:2mm 0 0 6mm;padding-left:5mm}
      .doc-list li{margin:1.6mm 0}
      .doc-note{font-size:8.6pt;color:#333;margin:2.5mm 0}
      .word-kpi-table{width:100%;border-collapse:separate;border-spacing:2.5mm;margin:4mm 0;table-layout:fixed}
      .word-kpi-table td{border:.25mm solid #555;padding:2.3mm;vertical-align:top;width:33.33%}
      .word-kpi-table span{display:block;font-size:7.8pt;color:#444}
      .word-kpi-table strong{display:block;margin-top:1mm;font-size:10pt}
      .word-photo-table{width:100%;border-collapse:separate;border-spacing:4mm;table-layout:fixed}
      .word-photo-table td{width:50%;border:.25mm solid #ccc;padding:2mm;text-align:center;vertical-align:top}
      .word-photo-table img{display:block;width:100%;height:88mm;object-fit:contain;background:#f7f7f7}
      .word-photo-table figcaption{font-size:8.5pt;text-align:center;margin-top:2mm}
      .word-photo-table.single td:first-child{width:100%}
      .word-photo-table.single td:first-child img{height:170mm}
      .word-photo-table.single td:last-child{display:none}
      .doc-chrono{width:100%;border-collapse:collapse;margin-top:3mm}
      .doc-chrono td{border:0;border-bottom:.25mm solid #555;padding:1.7mm 0}
      .doc-chrono td:last-child{text-align:right;width:42mm}
      .word-signature-table{width:100%;border-collapse:collapse;margin-top:24mm}
      .word-signature-table td{width:50%;border:0;text-align:center;vertical-align:top}
      .doc-signature-line{border-top:.25mm solid #555;padding-top:2mm}
      .doc-warning{border:.25mm solid #b78932;background:#fff9e9;padding:2.5mm;margin:3mm 0;font-size:8.8pt}
      p{orphans:2;widows:2}
      table{page-break-inside:avoid}
    `;
  }

  function buildWordHtml(root) {
    return `<!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Fast Track</title>
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
        <style>${wordCss()}</style>
      </head>
      <body>${root.outerHTML}</body>
      </html>`;
  }

  async function exportFormattedWord() {
    if (!window.htmlDocx?.asBlob) {
      throw new Error('O conversor DOCX não foi carregado. Atualize a página e tente novamente.');
    }

    setStatus('Gerando o Word formatado…');
    const report = prepareReportClone();
    const html = buildWordHtml(report);
    const blob = window.htmlDocx.asBlob(html,{
      orientation:'portrait',
      margins:{top:0,right:0,bottom:0,left:0,header:0,footer:0,gutter:0}
    });
    const fileName = `Relatorio_Fast_Track_${slug(resolveCaseId())}.docx`;
    const file = new File([blob],fileName,{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});

    try {
      if (navigator.canShare && navigator.canShare({files:[file]})) {
        await navigator.share({files:[file],title:'Relatório Fast Track'});
        setStatus('Word formatado gerado com sucesso.');
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('Compartilhamento cancelado.');
        return;
      }
    }

    downloadBlob(file,fileName);
    setStatus('Word formatado gerado com sucesso.');
  }

  function install() {
    const badge = document.querySelector('.header-badges .badge');
    if (badge) badge.textContent = `Protótipo ${VERSION}`;

    const button = document.querySelector(`[data-action="${WORD_ACTION}"]`);
    if (button) {
      button.textContent = 'Exportar Word formatado (.docx)';
      button.title = 'Gera um arquivo DOCX preservando o layout visual do relatório';
    }

    document.addEventListener('click',async (event) => {
      const target = event.target.closest(`[data-action="${WORD_ACTION}"]`);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      target.disabled = true;
      const originalText = target.textContent;
      target.textContent = 'Gerando Word…';
      try {
        await exportFormattedWord();
      } catch (error) {
        console.error(error);
        setStatus(error.message || 'Não foi possível gerar o Word formatado.',true);
        alert(error.message || 'Não foi possível gerar o Word formatado.');
      } finally {
        target.disabled = false;
        target.textContent = originalText;
      }
    },true);

    window.fastTrackWordV02 = {exportFormattedWord};
  }

  install();
})();
