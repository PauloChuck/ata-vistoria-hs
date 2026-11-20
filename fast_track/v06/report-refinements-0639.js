(() => {
  'use strict';
  const report = window.FastTrackV06Report;
  const opinion = 'Mediante exposto e documentado pelas mídias locais, o evento encontra amparo técnico pela cobertura de Vendaval/Granizo contratada na apólice vigente.';
  const oldOpinions = new Set([
    'Análise de cobertura pendente de conclusão pelo regulador.',
    'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice.',
    'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice vigente'
  ]);
  const normalizeOpinion = value => !String(value ?? '').trim() || oldOpinions.has(value) ? opinion : value;

  // Match the realization of the inspection, never another occurrence of the same date.
  const dateToken = '(?:\\d{1,2}\\s+de\\s+[A-Za-zÀ-ÿ]+\\s+de\\s+\\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\[data da vistoria\\])';
  const inspectionDatePattern = new RegExp('(\\bvistoria(?:\\s+presencial)?(?:\\s+(?:(?:foi\\s+)?(?:realizada|efetuada|concluída)|ocorreu))?(?:\\s+(?:no dia|em|de|do dia)\\s+|:\\s*))(' + dateToken + ')', 'gi');
  const precedingDatePattern = new RegExp('((?:\\bEm|\\bNo dia)\\s+)(' + dateToken + ')(,?\\s+(?:realizamos|efetuamos|foi realizada|foi efetuada)\\s+(?:a |uma )?vistoria\\b)', 'gi');
  function inspectionText(fields) {
    if (fields.inspectionNarrativeMode === 'default' || !Object.prototype.hasOwnProperty.call(fields,'inspectionNarrative')) return report.inspectionText(fields.inspectionDate);
    const replacement = report.longDate(fields.inspectionDate) || '[data da vistoria]';
    const format = date => /^\d{1,2}[/-]/.test(date) && report.isValidIsoDate(fields.inspectionDate)
      ? report.formatDate(fields.inspectionDate).replaceAll('/',date.includes('-') ? '-' : '/')
      : /^\d{4}-/.test(date) && report.isValidIsoDate(fields.inspectionDate) ? fields.inspectionDate : replacement;
    return String(fields.inspectionNarrative ?? '').replace(inspectionDatePattern,(match,prefix,date,offset,source) => {
      // An appointment/notice is not the inspection itself.
      const sentence = source.slice(0,offset).split(/[.!?\n]/).pop();
      if (/(?:agend|program|previs|aviso)/i.test(sentence)) return match;
      return prefix + format(date);
    }).replace(precedingDatePattern,(match,prefix,date,suffix)=>prefix+format(date)+suffix);
  }
  function syncInspection(fields) {
    const updated = inspectionText(fields);
    if (updated !== fields.inspectionNarrative || fields.inspectionNarrativeMode === 'default') {
      fields.inspectionNarrative = updated;
      fields.inspectionNarrativeDate = fields.inspectionDate || '';
    }
  }
  report.effectiveInspectionText = state => inspectionText(state?.fields || {});

  // The same line wrapping and space budget is used by the preview, print and Word.
  // Captions stay at 10 pt; long captions use image space rather than smaller type.
  function photoPages(photos) {
    const context = document.createElement('canvas').getContext('2d');
    context.font = '10pt Arial';
    const width = 75 * 96 / 25.4;
    const wrap = value => String(value).split(/\r?\n/).flatMap(paragraph => {
      const lines = []; let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (line && context.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
        if (line) line+=' ';
        for (const letter of word) {
          if (line && context.measureText(line+letter).width>width) { lines.push(line); line=''; }
          line+=letter;
        }
      }
      lines.push(line); return lines;
    });
    const entries = photos.filter(photo => photo.dataUrl).map((photo,index) => ({photo,index,lines:wrap(`Figura ${index + 1} — ${photo.caption || ''}`)}));
    const rows = [];
    for (let start=0; start<entries.length; start+=2) {
      const cells=entries.slice(start,start+2);
      rows.push({cells,captionMm:Math.max(...cells.map(cell=>cell.lines.length))*12*25.4/72+2});
    }
    const pages=[];
    while (rows.length) {
      const budget=pages.length ? 224 : 210;
      let count=Math.min(3,rows.length);
      const room=n=>(budget-rows.slice(0,n).reduce((sum,row)=>sum+row.captionMm+5,0))/n;
      while(count>1 && room(count)<24) count--;
      const imageMm=Math.max(12,Math.min(60,room(count)));
      pages.push({first:pages.length===0,rows:rows.splice(0,count).map(row=>({...row,imageMm}))});
    }
    return pages;
  }
  window.FastTrackReportRefinements = {opinion,normalizeOpinion,inspectionText,syncInspection,photoPages};
})();
