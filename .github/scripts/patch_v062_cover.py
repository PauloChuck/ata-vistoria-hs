from pathlib import Path
import re

report = Path('fast_track/v06/direct-report.js')
text = report.read_text(encoding='utf-8')
pattern = re.compile(r"  function coverContent\(state\) \{.*?\n  \}\n\n  function technicalStartContent", re.S)
replacement = r'''  function coverContent(state) {
    const f = state.fields || {};
    const compact = (value, fallback = 'A INFORMAR') => {
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
            <tr><td>Sinistro Seguradora:</td><td>${esc(compact(f.insurerClaim))}</td></tr>
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

  function technicalStartContent'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'coverContent não localizado: {count}')
report.write_text(text, encoding='utf-8')

css = Path('fast_track/v06/direct.css')
text = css.read_text(encoding='utf-8')
old = '''.doc-title{font-family:"Arial Black",Arial,sans-serif;font-size:28pt;line-height:1;margin:8mm 0 1mm;font-weight:900}
.doc-subtitle{font-family:"Arial Black",Arial,sans-serif;font-size:24pt;line-height:1;color:#29a8e0;margin:0 0 12mm;font-weight:900}
.claim-table{width:95mm;margin:0 0 9mm auto;border-collapse:collapse;font-size:11pt}
.claim-table td{border:0;padding:1.2mm 0}
.claim-table td:first-child{width:52mm}
.meta-table{width:172.6mm;border-collapse:collapse;table-layout:fixed}
.meta-table th,.meta-table td{border:0;text-align:left;vertical-align:top;padding:3.2mm 0;font-size:12pt}
.meta-table th{width:68mm;font-weight:800;padding-right:5mm}'''
new = '''.cover-layout{width:172.6mm}
.report-page.first .doc-title{font-family:"Arial Black",Arial,sans-serif;font-size:26pt;line-height:1;margin:13mm 0 3mm;font-weight:900;white-space:nowrap}
.report-page.first .doc-subtitle{font-family:"Arial Black",Arial,sans-serif;font-size:24pt;line-height:1;color:#29a8e0;margin:0 0 10mm;font-weight:900;letter-spacing:-.5pt;white-space:nowrap}
.report-page.first .claim-table{width:88mm;margin:0 0 11mm auto;border-collapse:collapse;table-layout:fixed;font-size:11pt}
.report-page.first .claim-table .claim-label-col{width:58mm}
.report-page.first .claim-table .claim-value-col{width:30mm}
.report-page.first .claim-table td{border:0;padding:1mm 0;line-height:1;vertical-align:middle;white-space:nowrap;text-align:left}
.report-page.first .meta-table{width:172.6mm;border-collapse:collapse;table-layout:fixed}
.report-page.first .meta-table .meta-label-col{width:65.1mm}
.report-page.first .meta-table .meta-shift-col{width:12.4mm}
.report-page.first .meta-table .meta-value-col{width:95.1mm}
.report-page.first .meta-table tr{height:11.25mm}
.report-page.first .meta-table th,.report-page.first .meta-table td{border:0;text-align:left;vertical-align:middle;padding:0;font-size:12pt;line-height:1;word-break:normal;overflow-wrap:normal}
.report-page.first .meta-table th{font-weight:800;padding-right:0}'''
if old not in text:
    raise SystemExit('Bloco CSS da capa não localizado')
css.write_text(text.replace(old, new, 1), encoding='utf-8')

word = Path('fast_track/v06/direct-word.js')
text = word.read_text(encoding='utf-8')
old_import = '''HorizontalPositionAlign,VerticalPositionRelativeFrom,
      VerticalPositionAlign,TextWrappingType,TableLayoutType'''
new_import = '''HorizontalPositionAlign,VerticalPositionRelativeFrom,
      VerticalPositionAlign,TextWrappingType,TableLayoutType,HeightRule'''
if old_import not in text:
    raise SystemExit('Importação de TableLayoutType não localizada')
text = text.replace(old_import, new_import, 1)
pattern = re.compile(r"    // Capa\n.*?\n    // Página técnica inicial", re.S)
replacement = r'''    // Capa — estrutura isolada do restante do relatório
    const COVER_TABLE_WIDTH = 9786;
    const COVER_COLUMNS = [3691,703,5392];
    const COVER_ROW_HEIGHT = 650;
    const compactCoverText = (value, fallback = 'A INFORMAR') => {
      const normalized = text(value).replace(/\s+/g, ' ').trim();
      return normalized || fallback;
    };
    const coverParagraph = (value,{bold=false,size=24}={}) => new Paragraph({
      children:[new TextRun({text:compactCoverText(value,''),font:'Arial',size,bold,color:BLACK})],
      alignment:AlignmentType.LEFT,
      spacing:{before:0,after:0,line:240},
      indent:{left:0,right:0},
      keepLines:true
    });
    const coverCell = (value,{width,columnSpan=1,bold=false,size=24,left=0,right=0}={}) => new TableCell({
      children:[coverParagraph(value,{bold,size})],
      width:{size:width,type:WidthType.DXA},
      columnSpan,
      verticalAlign:VerticalAlign.CENTER,
      borders:noBorder,
      margins:{top:0,bottom:0,left,right}
    });
    const coverRow = (label,value,{shifted=false}={}) => new TableRow({
      cantSplit:true,
      height:{value:COVER_ROW_HEIGHT,rule:HeightRule.ATLEAST},
      children:shifted
        ? [coverCell(label,{width:COVER_COLUMNS[0]+COVER_COLUMNS[1],columnSpan:2,bold:true,right:40}),coverCell(compactCoverText(value),{width:COVER_COLUMNS[2],left:0})]
        : [coverCell(label,{width:COVER_COLUMNS[0],bold:true,right:40}),coverCell(compactCoverText(value),{width:COVER_COLUMNS[1]+COVER_COLUMNS[2],columnSpan:2,left:0})]
    });
    const claimCell = (value,width) => new TableCell({
      children:[new Paragraph({children:[new TextRun({text:compactCoverText(value),font:'Arial',size:22,color:BLACK})],alignment:AlignmentType.LEFT,spacing:{before:0,after:0,line:240},keepLines:true})],
      width:{size:width,type:WidthType.DXA},
      verticalAlign:VerticalAlign.CENTER,
      borders:noBorder,
      margins:{top:60,bottom:60,left:0,right:0}
    });
    const claimTable = new Table({
      width:{size:4989,type:WidthType.DXA},
      alignment:AlignmentType.RIGHT,
      layout:TableLayoutType.FIXED,
      columnWidths:[3288,1701],
      borders:noBorder,
      rows:[
        new TableRow({cantSplit:true,children:[claimCell('Sinistro Seguradora:',3288),claimCell(f.insurerClaim || 'A INFORMAR',1701)]}),
        new TableRow({cantSplit:true,children:[claimCell('Sinistro Horizon Servitas:',3288),claimCell(f.hsClaim || 'A INFORMAR',1701)]})
      ]
    });
    const metaTable = new Table({
      width:{size:COVER_TABLE_WIDTH,type:WidthType.DXA},
      layout:TableLayoutType.FIXED,
      columnWidths:COVER_COLUMNS,
      borders:noBorder,
      rows:[
        coverRow('COMPANHIA SEGURADORA:',f.insurer),
        coverRow('SEGURADO:',f.insured),
        coverRow('COOPERADO:',f.claimantName),
        coverRow('LOCAL DO SINISTRO:',f.riskAddress),
        coverRow('APÓLICE DE SEGUROS:',f.policyNumber),
        coverRow('PRODUTO:',f.productName),
        coverRow('CORRETOR:',f.broker),
        coverRow('DATA DO SINISTRO:',REPORT().longDate(f.lossDate,true),{shifted:true}),
        coverRow('COBERTURA:',f.coverageName,{shifted:true})
      ]
    });
    children.push(
      new Paragraph({children:[new TextRun({text:'RELATÓRIO DE CONTINGÊNCIA',font:'Arial Black',size:52,bold:true,color:BLACK})],alignment:AlignmentType.LEFT,spacing:{before:340,after:0,line:240},keepLines:true}),
      new Paragraph({children:[new TextRun({text:'RISCOS NOMEADOS EMPRESARIAL',font:'Arial Black',size:48,bold:true,color:BLUE,characterSpacing:-10})],alignment:AlignmentType.LEFT,spacing:{before:0,after:420,line:240},keepLines:true}),
      claimTable,
      new Paragraph({spacing:{after:180,line:20}}),
      metaTable,
      pageBreak()
    );

    // Página técnica inicial'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Bloco Word da capa não localizado: {count}')
word.write_text(text, encoding='utf-8')

for path in [Path('fast_track/v062.html'), Path('fast_track/v06.html')]:
    html = path.read_text(encoding='utf-8')
    if '?v=0625' not in html:
        raise SystemExit(f'Cache-buster 0625 não localizado em {path}')
    path.write_text(html.replace('?v=0625', '?v=0626'), encoding='utf-8')
