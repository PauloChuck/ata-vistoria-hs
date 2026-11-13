from pathlib import Path
p=Path('fast_track/v06/direct-app-0632.js'); s=p.read_text(encoding='utf-8')
def one(old,new,label):
 c=s.count(old)
 if c!=1: raise SystemExit(f'{label}: {c}')
 return s.replace(old,new,1)
s=one("  const REPORT = () => window.FastTrackV06Report;\n","  const REPORT = () => window.FastTrackV06Report;\n  const COOPERATORS = () => window.FastTrackCooperators;\n",'module')
s=one("  const VERSION = '0.6.11';","  const VERSION = '0.6.12';",'version')
s=one("      map:null,\n      damages:[],","      map:null,\n      cooperatorSelection:null,\n      damages:[],",'state')
s=one("    updateDerived();\n    renderNarrativeControls(true);\n  }","    updateDerived();\n    renderNarrativeControls(true);\n    COOPERATORS()?.render?.();\n  }",'render')
handler='''  function handleCooperatorSelectionChanged(selection,{autofill = false} = {}) {
    state.cooperatorSelection = COOPERATORS()?.normalizeSelection?.(selection) || null;
    if (autofill && state.cooperatorSelection?.confirmed) {
      const confirmed = state.cooperatorSelection.confirmed;
      if (String(confirmed.name || '').trim()) state.fields.claimantName = confirmed.name;
      const address = COOPERATORS()?.formatRiskAddress?.(confirmed) || '';
      if (address) state.fields.riskAddress = address;
      if ($('claimantName')) $('claimantName').value = state.fields.claimantName || '';
      if ($('riskAddress')) $('riskAddress').value = state.fields.riskAddress || '';
    }
    invalidateSignatures(); updateDerived(); scheduleSave();
  }

'''
s=one('  function renderChronologyWarning() {\n',handler+'  function renderChronologyWarning() {\n','handler')
old='''    if (signed) {
      if (!state.signatures.regulator) errors.push('Registre a assinatura do regulador.');
      if (!state.signatures.claimant) errors.push('Registre a assinatura do cooperado.');
    }
    return [...new Set(errors)];
'''
new='''    const cooperatorValidation = COOPERATORS()?.validateSelection?.(state.cooperatorSelection);
    if (cooperatorValidation?.errors?.length) errors.push(...cooperatorValidation.errors);
    if (signed) {
      if (!state.signatures.regulator) errors.push('Registre a assinatura do regulador.');
      if (!state.signatures.claimant) errors.push('Registre a assinatura do cooperado.');
    }
    return [...new Set(errors)];
'''
s=one(old,new,'validation')
s=one('      <div class="summary-tile"><span>Anexos da seção 4.2</span><strong>${state.causeEvidence.length}</strong></div>\n','      <div class="summary-tile"><span>Anexos da seção 4.2</span><strong>${state.causeEvidence.length}</strong></div>\n      <div class="summary-tile"><span>Local consultado</span><strong>${state.cooperatorSelection ? \'Sim\' : \'Não\'}</strong></div>\n','summary')
s=one('      map:data.map || null,\n      damages:Array.isArray(data.damages)','      map:data.map || null,\n      cooperatorSelection:COOPERATORS()?.normalizeSelection?.(data.cooperatorSelection) || null,\n      damages:Array.isArray(data.damages)','normalize')
s=one('''    state.updatedAt = new Date().toISOString();
    await dbSet(cloneForSave());

    applyStateToDom();
''','''    state.updatedAt = new Date().toISOString();
    await dbSet(cloneForSave());

    await COOPERATORS()?.init?.({getState:() => state,onSelectionChanged:handleCooperatorSelectionChanged,status});
    applyStateToDom();
''','init')
p.write_text(s,encoding='utf-8')
