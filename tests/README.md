# Validação da consulta de cooperados

Os testes versionados usam exclusivamente dados sintéticos. O HTML real, os backups de atendimentos e as exportações de validação devem ficar fora do repositório.

Execute as regressões de importação, ausência/zero, origens, referências, avisos, instalações, coordenadas e restauração:

```sh
node --test tests/cooperators.test.cjs tests/risk-card.test.cjs
```

Para executar o fluxo no navegador, disponibilize `playwright` no ambiente e seu Chromium, ou informe o executável de um navegador Chromium em `FAST_TRACK_BROWSER`:

```sh
node tests/cooperators-browser.cjs
```

Esse teste usa servidor local e perfil temporário. Confere pesquisa com mais de 150 registros, nenhuma seleção automática, confirmação da instalação, ajuste manual refletido na ficha, equivalência com a prévia, larguras de 320, 390, 768 e 1440 pixels, reimportação idêntica e alterada, recarga, backup e novo atendimento. Não depende do portal nem da biblioteca Word externa.

A revisão visual 0635 mantém o importador 0.6.3.4 e o esquema normalizado 3; a alteração da ficha não invalida a base já importada na revisão 0634. Bases anteriores ao esquema 3 exigem reimportação local. As seleções e os valores manuais existentes são preservados; a nova leitura exige confirmação do risco quando a origem não coincide inequivocamente com a versão já selecionada.

Os testes da ficha conferem os dois valores independentes, ausência, zero, classificação explícita, unidades e conceitos de capacidade/quantidade, instalações envolvidas, associação expressa, origem documental, ajustes e escape de conteúdo. A conferência visual das exportações deve usar amostras locais fora do repositório, incluindo nomes longos e uma ficha que ocupe várias páginas. O Word contém texto e tabelas editáveis sem grades; sua paginação automática pode diferir da impressão pelo navegador.
