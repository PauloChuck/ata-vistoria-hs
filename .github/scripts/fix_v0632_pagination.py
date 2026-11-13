from pathlib import Path

p = Path('fast_track/v06/direct-layout-0632.js')
s = p.read_text(encoding='utf-8')
old = '''  function technicalStartContent(state) {
    const f = state.fields || {};
    const map = state.map || {};
    const cooperatorBlock = window.FastTrackCooperators?.reportHtml?.(state,{esc}) || '';
    return `
      <div class="doc-section">1. LOCAL DO SINISTRO</div>
      <p class="doc-text">Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.</p>
      ${cooperatorBlock}
      <div class="map-report">${map.dataUrl ? `<img src="${attr(map.dataUrl)}" style="object-fit:${map.fit || 'contain'};object-position:${Number(map.posX ?? 50)}% ${Number(map.posY ?? 50)}%">` : '<span>Imagem de localização não informada.</span>'}</div>
      <p class="doc-caption">Localização da propriedade sinistrada.</p>

      <div class="doc-section">2. DESCRIÇÃO DA OCORRÊNCIA</div>
      <p class="doc-text">${esc(effectiveOccurrenceText(state))}</p>

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
  }
'''
new = '''  function technicalStartBlocks(state) {
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
'''
count = s.count(old)
if count != 1:
    raise SystemExit(f'technical block: esperada 1 ocorrência, encontradas {count}')
s = s.replace(old,new,1)
old_call = '      paginator.add(technicalStartContent(state));\n'
new_call = '''      for (const block of technicalStartBlocks(state)) {
        paginator.add(block);
      }
'''
count = s.count(old_call)
if count != 1:
    raise SystemExit(f'technical call: esperada 1 ocorrência, encontradas {count}')
p.write_text(s.replace(old_call,new_call,1),encoding='utf-8')
