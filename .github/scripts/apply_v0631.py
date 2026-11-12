from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: esperada 1 ocorrência, encontradas {count}")
    return text.replace(old, new, 1)


DOCUMENTARY_DEFAULT = (
    "O temporal que atingiu a região foi amplamente divulgado na imprensa devido aos danos provocados. "
    "Anexamos matéria jornalística ao processo para ilustrar os registros existentes."
)
OPINION_DEFAULT = (
    "Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice vigente"
)

# Copiar a revisão anterior para novos ativos, preservando a versão publicada anterior.
Path("fast_track/v06/direct-app-0631.js").write_text(
    Path("fast_track/v06/direct-app-0630.js").read_text(encoding="utf-8"), encoding="utf-8"
)
Path("fast_track/v06/direct-layout-0631.js").write_text(
    Path("fast_track/v06/direct-layout-0630.js").read_text(encoding="utf-8"), encoding="utf-8"
)
Path("fast_track/v06/direct-layout-0631.css").write_text(
    Path("fast_track/v06/direct-layout-0630.css").read_text(encoding="utf-8"), encoding="utf-8"
)
Path("fast_track/v06/direct-word-0631.js").write_text(
    Path("fast_track/v06/direct-word-0630.js").read_text(encoding="utf-8"), encoding="utf-8"
)

# Aplicativo e persistência/migração.
app_path = Path("fast_track/v06/direct-app-0631.js")
app = app_path.read_text(encoding="utf-8")
app = replace_once(
    app,
    "  const VERSION = '0.6.10';",
    "  const VERSION = '0.6.11';\n"
    f"  const DOCUMENTARY_DEFAULT = '{DOCUMENTARY_DEFAULT}';\n"
    f"  const REGULATOR_OPINION_DEFAULT = '{OPINION_DEFAULT}';",
    "versão e textos padrão",
)
app = replace_once(
    app,
    "    'occurrenceNarrative','inspectionNarrative','mapFit','mapPosX','mapPosY','regulatorOpinion','otherInsurance',",
    "    'occurrenceNarrative','inspectionNarrative','mapFit','mapPosX','mapPosY','documentaryNarrative','regulatorOpinion','otherInsurance',",
    "simpleFields",
)
app = replace_once(
    app,
    "    'broker','lossDate','coverageName','inspectionDate','occurrenceNarrative','inspectionNarrative','regulatorOpinion','otherInsurance',",
    "    'broker','lossDate','coverageName','inspectionDate','occurrenceNarrative','inspectionNarrative','documentaryNarrative','regulatorOpinion','otherInsurance',",
    "requiredBasic",
)
app = replace_once(
    app,
    "        mapFit:'contain',mapPosX:'50',mapPosY:'50',noDocuments:false,\n"
    "        regulatorOpinion:'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice.',",
    "        mapFit:'contain',mapPosX:'50',mapPosY:'50',noDocuments:false,\n"
    "        documentaryNarrative:DOCUMENTARY_DEFAULT,\n"
    "        regulatorOpinion:REGULATOR_OPINION_DEFAULT,",
    "campos padrão",
)
app = replace_once(
    app,
    '      <div class="summary-tile"><span>Evidências da causa</span><strong>${state.causeEvidence.length}</strong></div>',
    '      <div class="summary-tile"><span>Anexos da seção 4.2</span><strong>${state.causeEvidence.length}</strong></div>',
    "resumo de anexos",
)
app = replace_once(
    app,
    '      : \'<div class="notice info">Nenhuma evidência da causa anexada.</div>\';',
    '      : \'<div class="notice info">Nenhuma imagem ou arquivo anexado à seção 4.2.</div>\';',
    "mensagem vazia de anexos",
)
app = replace_once(
    app,
    "    normalizeNarrativeFields(fields,incomingFields,'inspection');\n    return {",
    "    normalizeNarrativeFields(fields,incomingFields,'inspection');\n"
    "    if (!String(fields.documentaryNarrative || '').trim()) fields.documentaryNarrative = DOCUMENTARY_DEFAULT;\n"
    "    if (!String(fields.regulatorOpinion || '').trim()) fields.regulatorOpinion = REGULATOR_OPINION_DEFAULT;\n"
    "    return {",
    "migração dos textos",
)
app = replace_once(
    app,
    "      regulatorOpinion:'Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice.',",
    "      documentaryNarrative:DOCUMENTARY_DEFAULT,\n"
    "      regulatorOpinion:REGULATOR_OPINION_DEFAULT,",
    "exemplo",
)
app = app.replace(
    "As evidências do parecer permanecem preservadas.",
    "Os anexos dos levantamentos documentais permanecem preservados.",
)
app_path.write_text(app, encoding="utf-8")

# Formulário e carregamento dos novos ativos.
html_path = Path("fast_track/v062.html")
html = html_path.read_text(encoding="utf-8")
html = replace_once(
    html,
    '<span class="step-kicker">Etapa 4 de 7</span><h2>Fotografias da vistoria e parecer</h2>',
    '<span class="step-kicker">Etapa 4 de 7</span><h2>Fotografias, levantamentos documentais e parecer</h2>',
    "título da etapa 4",
)
old_panel = """        <div class="opinion-evidence-panel top-gap">
          <h3>4.2. Parecer do regulador</h3>
          <label class="field required" for="regulatorOpinion">Parecer do regulador</label><textarea id="regulatorOpinion" data-field rows="5"></textarea>
          <h4>Evidências da causa</h4>
          <p class="helper">Anexe fotografias, reportagens, laudos técnicos ou outros arquivos que fundamentem a causa indicada no parecer.</p>
          <input id="causeEvidenceInput" type="file" multiple hidden>
          <button class="btn secondary" type="button" onclick="document.getElementById('causeEvidenceInput').click()">+ Adicionar foto ou arquivo</button>
          <div id="causeEvidenceList" class="cause-evidence-list"></div>
        </div>"""
new_panel = """        <div class="opinion-evidence-panel top-gap">
          <h3>4.2. Lavantamentos documentais</h3>
          <label class="field required" for="documentaryNarrative">Levantamentos documentais</label><textarea id="documentaryNarrative" data-field rows="5"></textarea>
          <h4>Imagens e arquivos da seção 4.2</h4>
          <p class="helper">Anexe fotografias, reportagens, laudos técnicos ou outros arquivos utilizados para demonstrar a divulgação do temporal e fundamentar sua causa.</p>
          <input id="causeEvidenceInput" type="file" multiple hidden>
          <button class="btn secondary" type="button" onclick="document.getElementById('causeEvidenceInput').click()">+ Adicionar foto ou arquivo</button>
          <div id="causeEvidenceList" class="cause-evidence-list"></div>
        </div>

        <div class="opinion-evidence-panel top-gap">
          <h3>5. Parecer do regulador</h3>
          <label class="field required" for="regulatorOpinion">Parecer do regulador</label><textarea id="regulatorOpinion" data-field rows="5"></textarea>
        </div>"""
html = replace_once(html, old_panel, new_panel, "painéis 4.2 e 5")
html = html.replace("v=0630", "v=0631")
html = html.replace("direct-layout-0630.css", "direct-layout-0631.css")
html = html.replace("direct-layout-0630.js", "direct-layout-0631.js")
html = html.replace("direct-word-0630.js", "direct-word-0631.js")
html = html.replace("direct-app-0630.js", "direct-app-0631.js")
html_path.write_text(html, encoding="utf-8")

redirect_path = Path("fast_track/v06.html")
redirect = redirect_path.read_text(encoding="utf-8").replace("0630", "0631")
redirect_path.write_text(redirect, encoding="utf-8")

# Prévia, impressão e PDF.
layout_path = Path("fast_track/v06/direct-layout-0631.js")
layout = layout_path.read_text(encoding="utf-8")
start_marker = "      paginator.addTextSection('<div class=\"doc-subsection\">4.2. PARECER DO REGULADOR</div>'"
end_marker = "\n      const indemnityHeader ="
start = layout.find(start_marker)
end = layout.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Não foi possível localizar o bloco 4.2 no layout")
new_layout_block = """      paginator.addTextSection('<div class="doc-subsection">4.2. LAVANTAMENTOS DOCUMENTAIS</div>',f.documentaryNarrative || '','<div class="doc-subsection">4.2. LAVANTAMENTOS DOCUMENTAIS — CONTINUAÇÃO</div>');

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
"""
layout = layout[:start] + new_layout_block + layout[end:]
layout = layout.replace("5. DEMONSTRATIVO DE INDENIZAÇÃO", "6. DEMONSTRATIVO DE INDENIZAÇÃO")
layout = layout.replace("6. DECLARAÇÃO DE OUTROS SEGUROS", "7. DECLARAÇÃO DE OUTROS SEGUROS")
layout = layout.replace("7. CRONOLOGIA", "8. CRONOLOGIA")
layout = layout.replace("8. INFORMAÇÕES COMPLEMENTARES", "9. INFORMAÇÕES COMPLEMENTARES")
layout_path.write_text(layout, encoding="utf-8")

# Word nativo.
word_path = Path("fast_track/v06/direct-word-0631.js")
word = word_path.read_text(encoding="utf-8")
start_marker = "    // Parecer do regulador e evidências da causa — seção 4.2"
end_marker = "\n    // Demonstrativo sem grades"
start = word.find(start_marker)
end = word.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Não foi possível localizar o bloco 4.2 no Word")
new_word_block = """    // Levantamentos documentais e anexos — seção 4.2
    const documentaryChildren = [subheading('4.2. LAVANTAMENTOS DOCUMENTAIS'),...narrativeParagraphs(f.documentaryNarrative || ''),subheading('IMAGENS E ARQUIVOS')];
    const evidence = Array.isArray(state.causeEvidence) ? state.causeEvidence : [];
    if (!evidence.length) {
      documentaryChildren.push(para('Nenhuma imagem ou arquivo anexado.',{alignment:AlignmentType.LEFT}));
    } else {
      for (let index = 0; index < evidence.length; index += 1) {
        const item = evidence[index] || {};
        const captionText = item.caption || item.name || 'Anexo';
        if (isImageEvidence(item) && item.dataUrl) {
          const image = await canvasBytes(item.dataUrl,1200,900,{background:'#ffffff'});
          const scale = Math.min(460/image.width,260/image.height,1);
          const imageCell = new TableCell({
            width:{size:100,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.TOP,borders:noBorder,margins:{top:80,bottom:100,left:80,right:80},
            children:[
              new Paragraph({children:[new ImageRun({data:image.data,type:'png',transformation:{width:Math.max(1,Math.round(image.width*scale)),height:Math.max(1,Math.round(image.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:80}}),
              caption(`Evidência ${index + 1} — ${captionText}`)
            ]
          });
          documentaryChildren.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:[new TableRow({cantSplit:true,children:[imageCell]})]}));
        } else {
          const details = item.caption ? ` — ${item.caption}` : '';
          documentaryChildren.push(para([run(`Evidência ${index + 1}: ${item.name || 'Arquivo'}`,{bold:true}),run(` (${item.mime || 'arquivo'})${details}`)],{alignment:AlignmentType.LEFT,keepLines:true}));
        }
      }
    }
    children.push(...documentaryChildren);
    children.push(heading('5. PARECER DO REGULADOR'),...narrativeParagraphs(f.regulatorOpinion || ''));
"""
word = word[:start] + new_word_block + word[end:]
word = word.replace("heading('5. DEMONSTRATIVO DE INDENIZAÇÃO')", "heading('6. DEMONSTRATIVO DE INDENIZAÇÃO')")
word = word.replace("heading('6. DECLARAÇÃO DE OUTROS SEGUROS')", "heading('7. DECLARAÇÃO DE OUTROS SEGUROS')")
word = word.replace("heading('7. CRONOLOGIA')", "heading('8. CRONOLOGIA')")
word = word.replace("heading('8. INFORMAÇÕES COMPLEMENTARES')", "heading('9. INFORMAÇÕES COMPLEMENTARES')")
word_path.write_text(word, encoding="utf-8")
