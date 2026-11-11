from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    result, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 bloco, encontrado {count}')
    return result


# -----------------------------------------------------------------------------
# HTML — campos editáveis, data vinculada e introdução documental
# -----------------------------------------------------------------------------
html_path = 'fast_track/v062.html'
html = read(html_path)
html = html.replace('0627', '0628')

old_occurrence = '<div class="auto-text"><span>Descrição automática da ocorrência</span><p id="occurrenceAutoText"></p></div>'
new_occurrence = '''<div class="narrative-editor" id="occurrenceNarrativeEditor">
          <div class="narrative-editor-head">
            <div><label class="field required" for="occurrenceNarrative">DESCRIÇÃO DA OCORRÊNCIA</label><p class="helper">Texto preenchido automaticamente. Você pode editar conforme a vistoria.</p></div>
            <div class="small-actions"><button class="small-btn hidden" id="updateOccurrenceDateButton" type="button" data-action="update-occurrence-date">Atualizar data no texto</button><button class="small-btn" type="button" data-action="restore-occurrence-default">Restaurar texto padrão</button></div>
          </div>
          <label class="field required" for="occurrenceLossDate">Data do sinistro</label>
          <input id="occurrenceLossDate" type="date" data-linked-date="lossDate">
          <textarea id="occurrenceNarrative" data-narrative="occurrence" rows="5" spellcheck="true"></textarea>
          <div id="occurrenceNarrativeWarning" class="notice warn hidden"></div>
        </div>'''
html = replace_once(html, old_occurrence, new_occurrence, 'bloco da descrição da ocorrência')

old_inspection = '<div class="auto-text"><span>Texto automático de vistoria</span><p id="inspectionAutoText"></p></div>'
new_inspection = '''<div class="narrative-editor" id="inspectionNarrativeEditor">
          <div class="narrative-editor-head">
            <div><label class="field required" for="inspectionNarrative">TEXTO DA VISTORIA</label><p class="helper">Texto preenchido automaticamente. Você pode editar conforme a vistoria.</p></div>
            <div class="small-actions"><button class="small-btn hidden" id="updateInspectionDateButton" type="button" data-action="update-inspection-date">Atualizar data no texto</button><button class="small-btn" type="button" data-action="restore-inspection-default">Restaurar texto padrão</button></div>
          </div>
          <textarea id="inspectionNarrative" data-narrative="inspection" rows="5" spellcheck="true"></textarea>
          <div id="inspectionNarrativeWarning" class="notice warn hidden"></div>
        </div>'''
html = replace_once(html, old_inspection, new_inspection, 'bloco do texto da vistoria')

old_documents = '<input id="documentInput" type="file" multiple hidden><button class="btn secondary" type="button" onclick="document.getElementById(\'documentInput\').click()">+ Adicionar documentos</button><div id="documentList"></div>'
new_documents = '<input id="documentInput" type="file" multiple hidden><button class="btn secondary" type="button" onclick="document.getElementById(\'documentInput\').click()">+ Adicionar documentos</button><p id="documentCollectionIntro" class="document-collection-intro hidden">Em vistoria foram coletados os documentos abaixo relacionados</p><div id="documentList"></div>'
html = replace_once(html, old_documents, new_documents, 'introdução dos documentos na tela')
write(html_path, html)

redirect_path = 'fast_track/v06.html'
redirect = read(redirect_path).replace('0627', '0628')
write(redirect_path, redirect)

# -----------------------------------------------------------------------------
# CSS — apresentação clara dos editores, sem alterar o relatório
# -----------------------------------------------------------------------------
css_path = 'fast_track/v06/direct.css'
css = read(css_path)
css_marker = '.auto-text p{margin:5px 0 0;line-height:1.55}\n'
css_addition = '''.auto-text p{margin:5px 0 0;line-height:1.55}
.narrative-editor{border:1px solid var(--line);border-radius:16px;background:#fbfcfd;padding:15px;margin:17px 0}
.narrative-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.narrative-editor-head>div:first-child{flex:1 1 340px}
.narrative-editor-head .field{margin-top:0;text-transform:uppercase}
.narrative-editor-head .helper{margin-bottom:8px}
.narrative-editor textarea{min-height:132px;overflow-y:hidden;resize:vertical;line-height:1.5}
.narrative-editor .notice{margin:10px 0 0}
.document-collection-intro{margin:14px 0 8px;line-height:1.5;color:var(--text)}
'''
css = replace_once(css, css_marker, css_addition, 'estilos dos editores narrativos')
css = css.replace('@media(max-width:760px){.grid2,.grid3,.financial-grid,.signature-grid,.review-summary{grid-template-columns:1fr}.photo-gallery{grid-template-columns:1fr}.app-header,.app-footer{position:static}.header-main{flex-direction:column}.header-meta{justify-content:flex-start}.map-preview{height:250px}.report-preview{padding:5px}.report-page{transform-origin:top left}}', '@media(max-width:760px){.grid2,.grid3,.financial-grid,.signature-grid,.review-summary{grid-template-columns:1fr}.photo-gallery{grid-template-columns:1fr}.app-header,.app-footer{position:static}.header-main{flex-direction:column}.header-meta{justify-content:flex-start}.map-preview{height:250px}.report-preview{padding:5px}.report-page{transform-origin:top left}.narrative-editor-head{display:block}.narrative-editor-head .small-actions{margin-bottom:10px}}')
write(css_path, css)

# -----------------------------------------------------------------------------
# Relatório HTML/PDF — datas válidas gerais, textos efetivos e frase documental
# -----------------------------------------------------------------------------
report_path = 'fast_track/v06/direct-report.js'
report = read(report_path)

old_dates = r'''  const formatDate = \(iso\) => \{.*?  const inspectionText = \(inspectionDate\) => \{\n    const date = longDate\(inspectionDate\);\n    if \(!date\) return 'A data da vistoria deve ser informada\.';\n    return `Em vistoria presencial realizada no dia \$\{date\}, acompanhados do cooperado, foram evidenciados danos característicos da ação de tempos severos com passagem de ventos intensos\.`;\n  \};'''
new_dates = '''  const isValidIsoDate = (iso) => {
    if (!iso || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(iso))) return false;
    const [year,month,day] = String(iso).split('-').map(Number);
    const date = new Date(Date.UTC(year,month - 1,day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };

  const formatDate = (iso) => {
    if (!isValidIsoDate(iso)) return '';
    const [y,m,d] = String(iso).split('-');
    return `${d}/${m}/${y}`;
  };

  const longDate = (iso, upper = false) => {
    if (!isValidIsoDate(iso)) return '';
    const [y,m,d] = String(iso).split('-').map(Number);
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const value = `${String(d).padStart(2,'0')} de ${months[m - 1]} de ${y}`;
    return upper ? value.toUpperCase() : value;
  };

  const occurrenceText = (lossDate) => {
    const date = longDate(lossDate);
    const dateText = date || '[data do sinistro]';
    return `No dia ${dateText}, uma tempestade severa atingiu a região do extremo oeste de Santa Catarina e Norte do Rio Grande do Sul, causando danos às instalações de engorda da propriedade.`;
  };

  const inspectionText = (inspectionDate) => {
    const date = longDate(inspectionDate);
    const dateText = date || '[data da vistoria]';
    return `Em vistoria presencial realizada no dia ${dateText}, acompanhados do cooperado, foram evidenciados danos característicos da ação de tempos severos com passagem de ventos intensos.`;
  };

  const effectiveOccurrenceText = (state) => {
    const fields = state?.fields || {};
    return Object.prototype.hasOwnProperty.call(fields,'occurrenceNarrative')
      ? String(fields.occurrenceNarrative ?? '')
      : occurrenceText(fields.lossDate);
  };

  const effectiveInspectionText = (state) => {
    const fields = state?.fields || {};
    return Object.prototype.hasOwnProperty.call(fields,'inspectionNarrative')
      ? String(fields.inspectionNarrative ?? '')
      : inspectionText(fields.inspectionDate);
  };'''
report = regex_once(report, old_dates, new_dates, 'funções de data e narrativas', flags=re.S)

report = report.replace('${esc(occurrenceText(f.lossDate))}', '${esc(effectiveOccurrenceText(state))}')
report = report.replace('${esc(inspectionText(f.inspectionDate))}', '${esc(effectiveInspectionText(state))}')

old_doc_function = '''  function documentsContent(state, docs, continuation = false) {
    const f = state.fields || {};
    const list = docs.length ? `<ol class="document-list">${docs.map(doc => `<li><strong>${esc(doc.type || doc.name || 'Documento')}</strong>${doc.description ? ` — ${esc(doc.description)}` : ''}</li>`).join('')}</ol>` : '<p class="doc-text">Documentos não apresentados até o momento.</p>';
    return `
      <div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS${continuation ? ' — CONTINUAÇÃO' : ''}</div>
      ${list}
      ${continuation ? '' : `<div class="doc-section">5. PARECER DO REGULADOR</div><p class="doc-text">${esc(f.regulatorOpinion || '')}</p>`}`;
  }'''
new_doc_function = '''  function documentsContent(state, docs, continuation = false) {
    const f = state.fields || {};
    const introduction = docs.length && !continuation ? '<p class="doc-text">Em vistoria foram coletados os documentos abaixo relacionados</p>' : '';
    const list = docs.length
      ? `<ol class="document-list">${docs.map(doc => `<li><strong>${esc(doc.type || doc.name || 'Documento')}</strong>${doc.description ? ` — ${esc(doc.description)}` : ''}</li>`).join('')}</ol>`
      : `<p class="doc-text">${f.noDocuments ? 'Documentos não apresentados até o momento.' : 'Nenhum documento relacionado no momento.'}</p>`;
    return `
      <div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS${continuation ? ' — CONTINUAÇÃO' : ''}</div>
      ${introduction}${list}
      ${continuation ? '' : `<div class="doc-section">5. PARECER DO REGULADOR</div><p class="doc-text">${esc(f.regulatorOpinion || '')}</p>`}`;
  }'''
report = replace_once(report, old_doc_function, new_doc_function, 'função documental do relatório')

old_build_docs = '''      const documentPrefix = '<div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS</div>';
      const documentContinuation = '<div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS — CONTINUAÇÃO</div>';
      const documentRows = docs.map(doc => `<li><strong>${esc(doc.type || doc.name || 'Documento')}</strong>${doc.description ? ` — ${esc(doc.description)}` : ''}</li>`);
      paginator.addList({prefix:documentPrefix,continuationPrefix:documentContinuation,rows:documentRows});'''
new_build_docs = '''      const documentHeading = '<div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS</div>';
      const documentContinuation = '<div class="doc-subsection">4.2. LEVANTAMENTOS DOCUMENTAIS — CONTINUAÇÃO</div>';
      const documentRows = docs.map(doc => `<li><strong>${esc(doc.type || doc.name || 'Documento')}</strong>${doc.description ? ` — ${esc(doc.description)}` : ''}</li>`);
      if (f.noDocuments) {
        paginator.add(`${documentHeading}<p class="doc-text">Documentos não apresentados até o momento.</p>`);
      } else if (documentRows.length) {
        const documentPrefix = `${documentHeading}<p class="doc-text">Em vistoria foram coletados os documentos abaixo relacionados</p>`;
        paginator.addList({prefix:documentPrefix,continuationPrefix:documentContinuation,rows:documentRows});
      } else {
        paginator.add(`${documentHeading}<p class="doc-text">Nenhum documento relacionado no momento.</p>`);
      }'''
report = replace_once(report, old_build_docs, new_build_docs, 'montagem documental paginada')

report = replace_once(report,
  '    ASSETS, esc, attr, money, plainMoney, formatDate, longDate, occurrenceText, inspectionText,\n    calculate, paginateDamageItems, buildContents, buildHTML',
  '    ASSETS, esc, attr, money, plainMoney, isValidIsoDate, formatDate, longDate, occurrenceText, inspectionText,\n    effectiveOccurrenceText, effectiveInspectionText, calculate, paginateDamageItems, buildContents, buildHTML',
  'exportações do módulo de relatório')
write(report_path, report)

# -----------------------------------------------------------------------------
# Word — consumir textos persistidos, preservar parágrafos e frase documental
# -----------------------------------------------------------------------------
word_path = 'fast_track/v06/direct-word.js'
word = read(word_path)

para_marker = '''    const caption = (value) => new Paragraph({children:[run(value,{size:20,color:CAPTION_BLUE})],alignment:AlignmentType.CENTER,spacing:{line:240,after:120},keepLines:true});'''
para_add = '''    const narrativeParagraphs = (value) => {
      const lines = text(value).replace(/\\r\\n/g,'\\n').split('\\n');
      return lines.map((line) => para(line,{alignment:AlignmentType.JUSTIFIED,line:360,after:160}));
    };
    const caption = (value) => new Paragraph({children:[run(value,{size:20,color:CAPTION_BLUE})],alignment:AlignmentType.CENTER,spacing:{line:240,after:120},keepLines:true});'''
word = replace_once(word, para_marker, para_add, 'helper de parágrafos narrativos no Word')

word = replace_once(word,
  "    technical.push(heading('2. DESCRIÇÃO DA OCORRÊNCIA'),para(REPORT().occurrenceText(f.lossDate)),heading('3. COBERTURA RECLAMADA'));",
  "    technical.push(heading('2. DESCRIÇÃO DA OCORRÊNCIA'),...narrativeParagraphs(REPORT().effectiveOccurrenceText(state)),heading('3. COBERTURA RECLAMADA'));",
  'narrativa da ocorrência no Word')
word = replace_once(word,
  "    technical.push(heading('4. APURAÇÕES DA REGULAÇÃO'),subheading('4.1. LEVANTAMENTOS EM VISTORIA'),para(REPORT().inspectionText(f.inspectionDate)),subheading('RELAÇÃO DE DANOS:'));",
  "    technical.push(heading('4. APURAÇÕES DA REGULAÇÃO'),subheading('4.1. LEVANTAMENTOS EM VISTORIA'),...narrativeParagraphs(REPORT().effectiveInspectionText(state)),subheading('RELAÇÃO DE DANOS:'));",
  'narrativa da vistoria no Word')

old_word_docs = '''    const docs = f.noDocuments ? [] : (state.documents || []);
    const docChildren=[subheading('4.2. LEVANTAMENTOS DOCUMENTAIS')];
    if(docs.length) docs.forEach((doc,index)=>docChildren.push(para([run(`${index+1}. ${doc.type || doc.name || 'Documento'}`,{bold:true}),run(doc.description ? ` — ${doc.description}` : '')],{alignment:AlignmentType.LEFT})));
    else docChildren.push(para('Documentos não apresentados até o momento.'));
    docChildren.push(heading('5. PARECER DO REGULADOR'),para(f.regulatorOpinion || ''));'''
new_word_docs = '''    const docs = f.noDocuments ? [] : (state.documents || []);
    const docChildren=[subheading('4.2. LEVANTAMENTOS DOCUMENTAIS')];
    if(f.noDocuments) {
      docChildren.push(para('Documentos não apresentados até o momento.'));
    } else if(docs.length) {
      docChildren.push(para('Em vistoria foram coletados os documentos abaixo relacionados',{alignment:AlignmentType.LEFT}));
      docs.forEach((doc,index)=>docChildren.push(para([run(`${index+1}. ${doc.type || doc.name || 'Documento'}`,{bold:true}),run(doc.description ? ` — ${doc.description}` : '')],{alignment:AlignmentType.LEFT})));
    } else {
      docChildren.push(para('Nenhum documento relacionado no momento.'));
    }
    docChildren.push(heading('5. PARECER DO REGULADOR'),para(f.regulatorOpinion || ''));'''
word = replace_once(word, old_word_docs, new_word_docs, 'documentos no Word')
write(word_path, word)

# -----------------------------------------------------------------------------
# Aplicativo — persistência, sincronização e controles narrativos
# -----------------------------------------------------------------------------
app_path = 'fast_track/v06/direct-app.js'
app = read(app_path)
app = app.replace("const VERSION = '0.6.6';", "const VERSION = '0.6.8';")

app = replace_once(app,
'''    'policyNumber','productName','broker','lossDate','coverageName','inspectionDate',
    'mapFit','mapPosX','mapPosY','noDocuments','regulatorOpinion','otherInsurance',''',
'''    'policyNumber','productName','broker','lossDate','coverageName','inspectionDate',
    'occurrenceNarrative','inspectionNarrative','mapFit','mapPosX','mapPosY','noDocuments','regulatorOpinion','otherInsurance',''',
'simpleFields narrativos')
app = replace_once(app,
'''    'broker','lossDate','coverageName','inspectionDate','regulatorOpinion','otherInsurance',''',
'''    'broker','lossDate','coverageName','inspectionDate','occurrenceNarrative','inspectionNarrative','regulatorOpinion','otherInsurance',''',
'campos obrigatórios narrativos')

config_marker = '''  let state = createDefaultState();'''
config_block = '''  const narrativeConfigs = {
    occurrence:{text:'occurrenceNarrative',mode:'occurrenceNarrativeMode',baseline:'occurrenceNarrativeDate',official:'lossDate',textarea:'occurrenceNarrative',linkedDate:'occurrenceLossDate',warning:'occurrenceNarrativeWarning',updateButton:'updateOccurrenceDateButton',generator:'occurrenceText',datePattern:/(No dia\\s+)(\\d{1,2}\\s+de\\s+[A-Za-zÀ-ÿ]+\\s+de\\s+\\d{4})/i},
    inspection:{text:'inspectionNarrative',mode:'inspectionNarrativeMode',baseline:'inspectionNarrativeDate',official:'inspectionDate',textarea:'inspectionNarrative',linkedDate:null,warning:'inspectionNarrativeWarning',updateButton:'updateInspectionDateButton',generator:'inspectionText',datePattern:/(realizada no dia\\s+)(\\d{1,2}\\s+de\\s+[A-Za-zÀ-ÿ]+\\s+de\\s+\\d{4})/i}
  };

  let state = createDefaultState();'''
app = replace_once(app, config_marker, config_block, 'configuração das narrativas')

old_default_fields = '''        broker:'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',lossDate:'',
        coverageName:'Vendaval / Granizo',inspectionDate:'2026-11-10',
        mapFit:'contain',mapPosX:'50',mapPosY:'50',noDocuments:false,'''
new_default_fields = '''        broker:'ALPER CONSULTORIA E CORRETORA DE SEGUROS S/A',lossDate:'',
        coverageName:'Vendaval / Granizo',inspectionDate:'2026-11-10',
        occurrenceNarrative:REPORT().occurrenceText(''),occurrenceNarrativeMode:'default',occurrenceNarrativeDate:'',
        inspectionNarrative:REPORT().inspectionText('2026-11-10'),inspectionNarrativeMode:'default',inspectionNarrativeDate:'2026-11-10',
        mapFit:'contain',mapPosX:'50',mapPosY:'50',noDocuments:false,'''
app = replace_once(app, old_default_fields, new_default_fields, 'estado inicial das narrativas')

helper_marker = '''  function openDb() {'''
helper_block = '''  const hasOwn = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);

  function autoResizeTextarea(element) {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(132,element.scrollHeight)}px`;
  }

  function narrativeConfig(kind) {
    return narrativeConfigs[kind];
  }

  function narrativeHasOfficialDate(kind, value = null) {
    const config = narrativeConfig(kind);
    const official = state.fields[config.official];
    if (!REPORT().isValidIsoDate(official)) return false;
    const source = String(value == null ? state.fields[config.text] : value);
    const long = REPORT().longDate(official);
    if (long && source.toLocaleLowerCase('pt-BR').includes(long.toLocaleLowerCase('pt-BR'))) return true;
    const match = source.match(config.datePattern);
    return Boolean(match && match[2] && match[2].toLocaleLowerCase('pt-BR') === long.toLocaleLowerCase('pt-BR'));
  }

  function narrativeNeedsDateReview(kind) {
    const config = narrativeConfig(kind);
    const fields = state.fields;
    if (fields[config.mode] !== 'custom') return false;
    if (narrativeHasOfficialDate(kind)) return false;
    return String(fields[config.baseline] || '') !== String(fields[config.official] || '');
  }

  function syncNarrativeDefault(kind, force = false) {
    const config = narrativeConfig(kind);
    const fields = state.fields;
    if (!force && fields[config.mode] === 'custom') return;
    fields[config.mode] = 'default';
    fields[config.text] = REPORT()[config.generator](fields[config.official]);
    fields[config.baseline] = fields[config.official] || '';
  }

  function renderNarrativeControl(kind, forceValue = false) {
    const config = narrativeConfig(kind);
    const fields = state.fields;
    const textarea = $(config.textarea);
    if (textarea && (forceValue || document.activeElement !== textarea) && textarea.value !== String(fields[config.text] ?? '')) {
      textarea.value = String(fields[config.text] ?? '');
    }
    autoResizeTextarea(textarea);
    if (config.linkedDate) {
      const linked = $(config.linkedDate);
      if (linked && document.activeElement !== linked && linked.value !== String(fields[config.official] || '')) linked.value = fields[config.official] || '';
    }
    const needsReview = narrativeNeedsDateReview(kind);
    const warning = $(config.warning);
    if (warning) {
      warning.textContent = needsReview
        ? 'A data oficial foi alterada após a personalização do texto. Confira a data mencionada na narrativa ou use “Atualizar data no texto”.'
        : '';
      warning.classList.toggle('hidden',!needsReview);
    }
    const updateButton = $(config.updateButton);
    if (updateButton) updateButton.classList.toggle('hidden',!needsReview || !REPORT().isValidIsoDate(fields[config.official]));
  }

  function renderNarrativeControls(forceValue = false) {
    renderNarrativeControl('occurrence',forceValue);
    renderNarrativeControl('inspection',forceValue);
  }

  function handleOfficialDateChange(kind) {
    const config = narrativeConfig(kind);
    if (state.fields[config.mode] !== 'custom') syncNarrativeDefault(kind,true);
    renderNarrativeControl(kind,true);
  }

  function restoreNarrative(kind) {
    syncNarrativeDefault(kind,true);
    invalidateSignatures();
    renderNarrativeControl(kind,true);
    scheduleSave();
  }

  function updateNarrativeDate(kind) {
    const config = narrativeConfig(kind);
    const fields = state.fields;
    const official = fields[config.official];
    if (!REPORT().isValidIsoDate(official)) {
      alert('Informe uma data oficial válida antes de atualizar a narrativa.');
      return;
    }
    const current = String(fields[config.text] ?? '');
    const replacement = REPORT().longDate(official);
    let updated = current;
    const previous = REPORT().longDate(fields[config.baseline]);
    if (previous && current.toLocaleLowerCase('pt-BR').includes(previous.toLocaleLowerCase('pt-BR'))) {
      const index = current.toLocaleLowerCase('pt-BR').indexOf(previous.toLocaleLowerCase('pt-BR'));
      updated = current.slice(0,index) + replacement + current.slice(index + previous.length);
    } else {
      const match = current.match(config.datePattern);
      if (match) updated = current.replace(config.datePattern,`$1${replacement}`);
      else {
        alert('Não foi possível identificar com segurança a data mencionada no texto. Faça a correção manualmente.');
        return;
      }
    }
    fields[config.text] = updated;
    fields[config.mode] = 'custom';
    fields[config.baseline] = official;
    invalidateSignatures();
    renderNarrativeControl(kind,true);
    scheduleSave();
  }

  function normalizeNarrativeFields(fields,incoming,kind) {
    const config = narrativeConfig(kind);
    if (!hasOwn(incoming,config.text)) {
      fields[config.mode] = 'default';
      fields[config.text] = REPORT()[config.generator](fields[config.official]);
      fields[config.baseline] = fields[config.official] || '';
      return;
    }
    fields[config.text] = String(incoming[config.text] ?? '');
    fields[config.mode] = hasOwn(incoming,config.mode) && ['default','custom'].includes(incoming[config.mode]) ? incoming[config.mode] : 'custom';
    fields[config.baseline] = hasOwn(incoming,config.baseline) ? String(incoming[config.baseline] || '') : String(fields[config.official] || '');
    if (fields[config.mode] === 'default') {
      fields[config.text] = REPORT()[config.generator](fields[config.official]);
      fields[config.baseline] = fields[config.official] || '';
    }
  }

  function openDb() {'''
app = replace_once(app, helper_marker, helper_block, 'helpers narrativos')

old_update = r'''  function updateDerived\(\) \{.*?\n  \}\n\n  function go\(step\) \{'''
new_update = '''  function updateDerived() {
    updateCaseIdentity();
    const f = state.fields;
    renderNarrativeControls(false);

    const lossWarn = $('lossDateWarning');
    if (f.lossDate && !REPORT().isValidIsoDate(f.lossDate)) {
      lossWarn.textContent = 'Informe uma data de sinistro válida.';
      lossWarn.classList.remove('hidden');
    } else lossWarn.classList.add('hidden');

    $('otherInsuranceDetailsWrap').classList.toggle('hidden', f.otherInsurance !== 'sim');
    renderChronologyWarning();
    renderFinancialSummary();
  }

  function go(step) {'''
app = regex_once(app, old_update, new_update, 'updateDerived', flags=re.S)

old_render_docs = '''  function renderDocuments() {
    $('documentList').innerHTML = state.documents.length
      ? state.documents.map(documentCard).join('')
      : '<div class="notice info">Nenhum documento anexado.</div>';
  }'''
new_render_docs = '''  function renderDocuments() {
    $('documentList').innerHTML = state.documents.length
      ? state.documents.map(documentCard).join('')
      : '<div class="notice info">Nenhum documento anexado.</div>';
    const intro = $('documentCollectionIntro');
    if (intro) intro.classList.toggle('hidden',!state.documents.length || Boolean(state.fields.noDocuments));
  }'''
app = replace_once(app, old_render_docs, new_render_docs, 'renderDocuments')

old_chrono = r'''  function renderChronologyWarning\(\) \{.*?\n  \}\n\n  function validationErrors'''
new_chrono = '''  function renderChronologyWarning() {
    const f = state.fields;
    const ids = ['lossDate','noticeDate','scheduleDate','inspectionDate'];
    let warning = '';
    const invalid = ids.find((id) => f[id] && !REPORT().isValidIsoDate(f[id]));
    if (invalid) {
      warning = 'Há uma data inválida na cronologia. Verifique ocorrência, aviso, agendamento e vistoria.';
    } else if (ids.every((id) => f[id])) {
      const nums = ids.map((id) => new Date(`${f[id]}T00:00:00`).getTime());
      if (!(nums[0] <= nums[1] && nums[1] <= nums[2] && nums[2] <= nums[3])) {
        warning = 'As datas da cronologia não estão em ordem. Verifique ocorrência, aviso, agendamento e vistoria.';
      }
    }
    const box = $('chronologyWarning');
    box.textContent = warning;
    box.classList.toggle('hidden',!warning);
  }

  function validationErrors'''
app = regex_once(app, old_chrono, new_chrono, 'aviso cronológico', flags=re.S)

month_line = "    if (f.lossDate && !/^2026-11-\\d{2}$/.test(f.lossDate)) errors.push('A data do sinistro deve pertencer a novembro de 2026.');"
date_validation = "    for (const id of ['lossDate','noticeDate','scheduleDate','inspectionDate','reportDate']) { if (f[id] && !REPORT().isValidIsoDate(f[id])) errors.push(`Informe uma data válida em: ${document.querySelector(`label[for=\\\"${id}\\\"]`)?.textContent || id}.`); }"
if month_line not in app:
    raise SystemExit('restrição de novembro não localizada')
app = app.replace(month_line, date_validation)

old_normalize = '''  function normalizeState(data) {
    const base = createDefaultState();
    return {
      ...base,
      ...data,
      fields:{...base.fields,...(data.fields || {})},
      map:data.map || null,
      damages:Array.isArray(data.damages) ? data.damages.map(newDamage) : [],
      photos:Array.isArray(data.photos) ? data.photos : [],
      documents:Array.isArray(data.documents) ? data.documents : [],
      signatures:{...base.signatures,...(data.signatures || {})}
    };
  }'''
new_normalize = '''  function normalizeState(data) {
    const base = createDefaultState();
    const incomingFields = data.fields || {};
    const fields = {...base.fields,...incomingFields};
    normalizeNarrativeFields(fields,incomingFields,'occurrence');
    normalizeNarrativeFields(fields,incomingFields,'inspection');
    return {
      ...base,
      ...data,
      version:VERSION,
      fields,
      map:data.map || null,
      damages:Array.isArray(data.damages) ? data.damages.map(newDamage) : [],
      photos:Array.isArray(data.photos) ? data.photos : [],
      documents:Array.isArray(data.documents) ? data.documents : [],
      signatures:{...base.signatures,...(data.signatures || {})}
    };
  }'''
app = replace_once(app, old_normalize, new_normalize, 'normalização compatível de backups')

app = replace_once(app,
'''    f.lossDate=data.dataSinistro || f.lossDate;
    if (data.sinistro) {''',
'''    f.lossDate=data.dataSinistro || f.lossDate;
    handleOfficialDateChange('occurrence');
    if (data.sinistro) {''',
'importação da data do sinistro da Ata')
app = replace_once(app,
'''    f.inspectionDate=data.c5 || f.inspectionDate;
    f.noticeDate=data.c2 || f.noticeDate;''',
'''    f.inspectionDate=data.c5 || f.inspectionDate;
    handleOfficialDateChange('inspection');
    f.noticeDate=data.c2 || f.noticeDate;''',
'importação da data da vistoria da Ata')

app = replace_once(app,
'''    state=createDefaultState();
    state.fields=f;
    state.damages=[''',
'''    state=createDefaultState();
    state.fields=f;
    syncNarrativeDefault('occurrence',true);
    syncNarrativeDefault('inspection',true);
    state.damages=[''',
'exemplo com narrativas atualizadas')

click_anchor = "    if (action==='import-v75') importV75();"
click_replacement = "    if (action==='restore-occurrence-default') restoreNarrative('occurrence');\n    else if (action==='restore-inspection-default') restoreNarrative('inspection');\n    else if (action==='update-occurrence-date') updateNarrativeDate('occurrence');\n    else if (action==='update-inspection-date') updateNarrativeDate('inspection');\n    else if (action==='import-v75') importV75();"
app = replace_once(app, click_anchor, click_replacement, 'ações das narrativas')

old_input = r'''  document\.addEventListener\('input', \(event\) => \{.*?\n  \}\);\n\n  \$\('mapDrop'\)'''
new_input = '''  document.addEventListener('input', (event) => {
    const target=event.target;
    if (target.matches('[data-narrative]')) {
      const kind=target.dataset.narrative;
      const config=narrativeConfig(kind);
      const fields=state.fields;
      if (fields[config.mode] !== 'custom') fields[config.baseline]=fields[config.official] || '';
      fields[config.mode]='custom';
      fields[config.text]=target.value;
      if (narrativeHasOfficialDate(kind,target.value)) fields[config.baseline]=fields[config.official] || '';
      autoResizeTextarea(target);
      invalidateSignatures();
      renderNarrativeControl(kind,false);
      scheduleSave();
      return;
    }
    if (target.matches('[data-linked-date]')) {
      const official=target.dataset.linkedDate;
      const old=state.fields[official];
      state.fields[official]=target.value;
      const primary=$(official);
      if (primary && primary.value!==target.value) primary.value=target.value;
      if (old!==target.value) {
        handleOfficialDateChange(official==='lossDate'?'occurrence':'inspection');
        invalidateSignatures();
      }
      updateDerived();scheduleSave();
      return;
    }
    if (target.matches('[data-field]')) {
      const old=state.fields[target.id];
      state.fields[target.id]=target.type==='checkbox'?target.checked:target.value;
      if (target.id==='lossDate' && old!==state.fields[target.id]) handleOfficialDateChange('occurrence');
      if (target.id==='inspectionDate' && old!==state.fields[target.id]) handleOfficialDateChange('inspection');
      if (old!==state.fields[target.id] && target.id!=='mapPosX' && target.id!=='mapPosY') invalidateSignatures();
      if (['mapFit','mapPosX','mapPosY'].includes(target.id) && state.map) {
        state.map.fit=state.fields.mapFit;state.map.posX=state.fields.mapPosX;state.map.posY=state.fields.mapPosY;renderMap();
      }
      if (target.id==='noDocuments') renderDocuments();
      updateDerived();scheduleSave();
    }
    const damageCard=target.closest('.damage-card');
    if (damageCard && target.matches('[data-damage]')) {
      syncDamageCard(damageCard);invalidateSignatures();renderFinancialSummary();scheduleSave();
    }
    const photoCard=target.closest('.photo-card');
    if (photoCard && target.matches('[data-photo-caption]')) {
      const photo=state.photos.find(p=>p.id===photoCard.dataset.id);if(photo) photo.caption=target.value;invalidateSignatures();scheduleSave();
    }
    const documentCard=target.closest('.document-card');
    if (documentCard && target.matches('[data-document]')) {
      syncDocumentCard(documentCard);invalidateSignatures();scheduleSave();
    }
  });

  $('mapDrop')'''
app = regex_once(app, old_input, new_input, 'listener de entrada', flags=re.S)

# Após aplicar o estado, force os valores iniciais e o crescimento dos campos.
app = replace_once(app,
'''    renderSignatures();
    updateDerived();
  }''',
'''    renderSignatures();
    updateDerived();
    renderNarrativeControls(true);
  }''',
'aplicação inicial das narrativas')

# A remoção do último documento também precisa esconder a frase introdutória (renderDocuments já trata).
# O cache e a versão são atualizados sem limpar o IndexedDB/localStorage existente.
write(app_path, app)

print('Patch 0628 aplicado com sucesso.')
