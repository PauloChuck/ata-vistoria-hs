from pathlib import Path
p=Path('fast_track/v06/cooperators-0632.js')
s=p.read_text(encoding='utf-8')
def one(old,new,label):
 c=s.count(old)
 if c!=1: raise SystemExit(f'{label}: {c}')
 return s.replace(old,new,1)
old='''  function installationCard(item,index,total) {
    return `<div class="cooperator-installation-card" data-installation-id="${attr(item.id)}">
      <div class="dynamic-head"><label class="cooperator-installation-check"><input type="checkbox" data-installation-field="involved" ${item.involved ? 'checked' : ''}> Relacionada ao sinistro</label><button class="small-btn danger" type="button" data-action="remove-cooperator-installation" data-installation-id="${attr(item.id)}">Remover</button></div>
      <div class="grid2">${fieldInput('Código ou identificação','code',item.code)}${fieldInput('Tipo de instalação','type',item.type)}</div>
      <div class="grid2">${fieldInput('Área ou metragem','area',item.area)}${fieldInput('Unidade da área','areaUnit',item.areaUnit)}</div>
      <div class="grid2">${fieldInput(item.capacityConcept || 'Capacidade/quantidade','capacity',item.capacity)}${fieldInput('Unidade / conceito','capacityUnit',item.capacityUnit)}</div>
      ${total > 1 && !item.involved ? '<p class="helper">Marque somente as instalações relacionadas ao evento.</p>' : ''}
    </div>`;
  }
'''
new='''  function installationFieldInput(label,key,value) {
    return `<div><label class="field">${esc(label)}</label><input data-installation-field="${attr(key)}" value="${attr(value || '')}"></div>`;
  }

  function installationCard(item,index,total) {
    return `<div class="cooperator-installation-card" data-installation-id="${attr(item.id)}">
      <div class="dynamic-head"><label class="cooperator-installation-check"><input type="checkbox" data-installation-field="involved" ${item.involved ? 'checked' : ''}> Relacionada ao sinistro</label><button class="small-btn danger" type="button" data-action="remove-cooperator-installation" data-installation-id="${attr(item.id)}">Remover</button></div>
      <div class="grid2">${installationFieldInput('Código ou identificação','code',item.code)}${installationFieldInput('Tipo de instalação','type',item.type)}</div>
      <div class="grid2">${installationFieldInput('Área ou metragem','area',item.area)}${installationFieldInput('Unidade da área','areaUnit',item.areaUnit)}</div>
      <div class="grid2">${installationFieldInput(item.capacityConcept || 'Capacidade/quantidade','capacity',item.capacity)}${installationFieldInput('Unidade / conceito','capacityUnit',item.capacityUnit)}</div>
      ${total > 1 && !item.involved ? '<p class="helper">Marque somente as instalações relacionadas ao evento.</p>' : ''}
    </div>`;
  }
'''
s=one(old,new,'installation inputs')
s=one('''  function selectionChanged({autofill=true}={}) {
    const state = controller.getState();
    if (state.cooperatorSelection) state.cooperatorSelection.updatedAt = new Date().toISOString();
    controller.onSelectionChanged(state.cooperatorSelection,{autofill});
    renderSelection();
  }
''','''  function selectionChanged({autofill=true,renderNow=false}={}) {
    const state = controller.getState();
    if (state.cooperatorSelection) state.cooperatorSelection.updatedAt = new Date().toISOString();
    controller.onSelectionChanged(state.cooperatorSelection,{autofill});
    if (renderNow) renderSelection();
  }
''','cursor')
s=one("selectionChanged({autofill:false});\n      } else if (action === 'remove-cooperator-installation')","selectionChanged({autofill:false,renderNow:true});\n      } else if (action === 'remove-cooperator-installation')",'add render')
s=one("selectionChanged({autofill:false});\n      }\n    });\n\n    document.addEventListener('input'","selectionChanged({autofill:false,renderNow:true});\n      }\n    });\n\n    document.addEventListener('input'",'remove render')
p.write_text(s,encoding='utf-8')
