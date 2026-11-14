# Validação da consulta de cooperados

Os testes versionados usam exclusivamente dados sintéticos. O HTML real, os backups de atendimentos e as exportações de validação devem ficar fora do repositório.

Execute as regressões de importação, ausência/zero, origens, referências, avisos, instalações, coordenadas e restauração:

```sh
node --test tests/cooperators.test.cjs
```

Para executar o fluxo no navegador, disponibilize `playwright` no ambiente e seu Chromium, ou informe o executável de um navegador Chromium em `FAST_TRACK_BROWSER`:

```sh
node tests/cooperators-browser.cjs
```

Esse teste usa servidor local e perfil temporário. Confere pesquisa com mais de 150 registros, nenhuma seleção automática, confirmação da instalação, ajuste manual, reimportação idêntica e alterada, recarga, backup e novo atendimento. Não depende do portal nem da biblioteca Word externa.

A revisão 0634 usa esquema normalizado 3. Bases persistidas por revisões anteriores exigem reimportação local. As seleções e os valores manuais existentes são preservados; a nova leitura exige confirmação do risco quando a origem não coincide inequivocamente com a versão já selecionada.
