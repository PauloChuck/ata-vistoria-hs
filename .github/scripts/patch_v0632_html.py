from pathlib import Path
p=Path('fast_track/v062.html'); s=p.read_text(encoding='utf-8')
def one(old,new,label):
 c=s.count(old)
 if c!=1: raise SystemExit(f'{label}: {c}')
 return s.replace(old,new,1)
s=s.replace('?v=0631','?v=0632').replace('direct-layout-0631.css?v=0632','direct-layout-0632.css?v=0632')
panel='''
        <div class="cooperator-lookup-panel top-gap">
          <div class="section-head cooperator-lookup-head"><div><span class="step-kicker">Base local de consulta</span><h3>Consulta de cooperados por nome</h3><p class="helper">Pesquise pelo nome completo ou parcial. A consulta não exige CPF e não seleciona automaticamente uma propriedade.</p></div><label class="btn secondary file-button">Atualizar base por HTML<input id="cooperatorBaseInput" type="file" accept=".html,.htm,text/html"></label></div>
          <div id="cooperatorBaseStatus"></div>
          <div class="grid3"><div><label class="field" for="cooperatorSearch">Nome do cooperado ou integrado</label><input id="cooperatorSearch" autocomplete="off" placeholder="Digite parte do nome"></div><div><label class="field" for="cooperatorCooperativeFilter">Cooperativa</label><select id="cooperatorCooperativeFilter"><option value="">Todas as cooperativas</option></select></div><div><label class="field" for="cooperatorActivityFilter">Atividade</label><select id="cooperatorActivityFilter"><option value="">Todas as atividades</option></select></div></div>
          <div class="inline-actions"><button class="btn primary" type="button" data-action="search-cooperators">Pesquisar</button><button class="btn secondary" type="button" data-action="clear-cooperator-search">Limpar pesquisa</button></div>
          <div id="cooperatorSearchNotice" class="notice info">Carregue a base HTML e digite o nome para consultar.</div><div id="cooperatorResults" class="cooperator-results"></div><div id="cooperatorSelectedPanel" class="cooperator-selected-host"></div>
        </div>
'''
a='        <div class="inline-actions"><button class="btn secondary" type="button" data-action="import-v75">Importar Ata V7.5</button><button class="btn secondary" type="button" data-action="load-example">Carregar exemplo</button></div>\n'
s=one(a,a+panel,'panel')
s=s.replace('<script src="v06/direct-layout-0631.js?v=0632"></script>','<script src="v06/cooperators-0632.js?v=0632"></script>\n<script src="v06/direct-layout-0632.js?v=0632"></script>')
s=s.replace('<script src="v06/direct-word-0631.js?v=0632"></script>','<script src="v06/direct-word-0632.js?v=0632"></script>')
s=s.replace('<script src="v06/direct-app-0631.js?v=0632"></script>','<script src="v06/direct-app-0632.js?v=0632"></script>')
p.write_text(s,encoding='utf-8')
r=Path('fast_track/v06.html'); r.write_text(r.read_text(encoding='utf-8').replace('v=0631','v=0632'),encoding='utf-8')
