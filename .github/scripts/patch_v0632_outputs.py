from pathlib import Path
def patch(path, pairs):
 p=Path(path); s=p.read_text(encoding='utf-8')
 for old,new,label in pairs:
  c=s.count(old)
  if c!=1: raise SystemExit(f'{label}: {c}')
  s=s.replace(old,new,1)
 p.write_text(s,encoding='utf-8')
patch('fast_track/v06/direct-layout-0632.js',[
("    const f = state.fields || {};\n    const map = state.map || {};\n    return `","    const f = state.fields || {};\n    const map = state.map || {};\n    const cooperatorBlock = window.FastTrackCooperators?.reportHtml?.(state,{esc}) || '';\n    return `",'layout data'),
("      <p class=\"doc-text\">Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.</p>\n      <div class=\"map-report\">","      <p class=\"doc-text\">Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.</p>\n      ${cooperatorBlock}\n      <div class=\"map-report\">",'layout block')])
tech="""    const technical = [heading('1. LOCAL DO SINISTRO'),para('Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.')];
    if (cooperatorData) {
      technical.push(subheading('DADOS CONFIRMADOS DO LOCAL'));
      for (const [label,value] of cooperatorData.rows) technical.push(para([run(`${label}: `,{bold:true}),run(value)],{alignment:AlignmentType.LEFT,line:300,after:100,keepLines:true}));
      if (cooperatorData.installations.length) {
        technical.push(para([run('Instalações relacionadas ao sinistro:',{bold:true})],{alignment:AlignmentType.LEFT,after:80,keepNext:true}));
        cooperatorData.installations.forEach((item) => { const id=item.type==='Não informado'?item.code:`${item.code} — ${item.type}`; technical.push(para(`${item.index}. ${id} | Área: ${item.area} | ${item.capacityConcept}: ${item.capacity}`,{alignment:AlignmentType.LEFT,line:280,after:80,keepLines:true})); });
      }
      if (cooperatorData.changes.length) technical.push(para([run('Ajustes registrados pelo regulador: ',{bold:true}),run(`${cooperatorData.changes.join(', ')}.`)],{alignment:AlignmentType.LEFT,line:300,after:120,keepLines:true}));
    }
    if (state.map?.dataUrl) {"""
patch('fast_track/v06/direct-word-0632.js',[
("    const f = state.fields || {};\n    const calc = REPORT().calculate(state);","    const f = state.fields || {};\n    const calc = REPORT().calculate(state);\n    const cooperatorData = window.FastTrackCooperators?.reportData?.(state) || null;",'word data'),
("    const technical = [heading('1. LOCAL DO SINISTRO'),para('Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.')];\n    if (state.map?.dataUrl) {",tech,'word block')])
