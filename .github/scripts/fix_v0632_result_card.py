from pathlib import Path

p = Path('fast_track/v06/cooperators-0632.js')
s = p.read_text(encoding='utf-8')
old = '''      <div class="cooperator-result-grid">
        <div><span>Município</span><strong>${esc(record.municipality || 'Não informado')}</strong></div>
        <div><span>Coordenadas</span><strong>${esc(coordinates)}</strong></div>
        <div><span>Instalação</span><strong>${esc(record.installationCode || `${record.installations.length || 0} registro(s)`)}</strong></div>
        <div><span>Origem / referência</span><strong>${esc(source)}</strong></div>
      </div>${warning}
'''
new = '''      <div class="cooperator-result-grid">
        <div><span>Município</span><strong>${esc(record.municipality || 'Não informado')}</strong></div>
        <div><span>Local / propriedade</span><strong>${esc(record.localIdentification || 'Não informado')}</strong></div>
        <div><span>Coordenadas</span><strong>${esc(coordinates)}</strong></div>
        <div><span>Instalação</span><strong>${esc(record.installationCode || `${record.installations.length || 0} registro(s)`)}</strong></div>
        <div><span>Origem / referência</span><strong>${esc(source)}</strong></div>
      </div>${warning}
'''
count = s.count(old)
if count != 1:
    raise SystemExit(f'result card: esperada 1 ocorrência, encontradas {count}')
p.write_text(s.replace(old, new, 1), encoding='utf-8')
