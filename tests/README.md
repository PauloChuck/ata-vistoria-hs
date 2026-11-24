# Validação da consulta de cooperados

## Revisão 0639.6 — preenchimento e relatórios

Execute `node --test tests/*.test.cjs` para todas as regressões unitárias. O fluxo `node tests/report-refinements.browser.cjs` usa Playwright, `FT_BROWSER` (Chromium/Edge), `FT_DOCX_LIB` (docx 8.5.0) e `FT_OUT` obrigatoriamente fora do repositório. Ele valida limpeza exclusiva da pesquisa, filtros e atendimento preservados, data da vistoria em narrativa personalizada e cronologia, migração do parecer sem alterar conclusão, backups e exportações com 1/4/6/7/12/13 fotos, incluindo verticais e legendas longas. Confere bordas, proporções, agrupamento e ausência de transbordamento na prévia.

Execute também `node tests/report-flow.browser.cjs` com as mesmas variáveis. O fluxo confere as quatro combinações de mapa/quadro, 48 registros/endossos, 1/4/6/7/12/13 fotos, início em página parcialmente ocupada, seis fotos em páginas completas, legendas extensas e tópico documental com/sem narrativa. Exporta os casos e verifica salvamento/reabertura sem perda dos dados.

Conferir também os arquivos no Word: até três pares por página, continuação sem título, foto junto da legenda, início da galeria e do tópico 4.2 no espaço disponível, ausência de páginas vazias e assinaturas sem contorno. Conferir o título exato “4.2 LEVANTAMENTOS DOCUMENTAIS”, o mapa antes do quadro completo e os totais juntos. Word e PDF podem distribuir os pares e as seções por páginas diferentes. Detalhes em `docs/relatorio-refinamentos-0639.md`.

Os testes versionados usam exclusivamente dados sintéticos. O HTML real, os backups de atendimentos e as exportações de validação devem ficar fora do repositório.

Execute as regressões de importação, ausência/zero, origens, referências, avisos, instalações, coordenadas e restauração:

```sh
node --test tests/cooperators.test.cjs tests/risk-card.test.cjs tests/signatures.test.cjs
```

Para executar o fluxo no navegador, disponibilize `playwright` no ambiente e seu Chromium, ou informe o executável de um navegador Chromium em `FAST_TRACK_BROWSER`:

```sh
node tests/cooperators-browser.cjs
node tests/signatures-browser.cjs
```

Esse teste usa servidor local e perfil temporário. Confere pesquisa com mais de 150 registros, nenhuma seleção automática, confirmação da instalação, ajuste manual refletido na ficha, equivalência com a prévia, larguras de 320, 390, 768 e 1440 pixels, reimportação idêntica e alterada, recarga, backup e novo atendimento. Não depende do portal nem da biblioteca Word externa.

A revisão visual 0635 mantém o importador 0.6.3.4 e o esquema normalizado 3; a alteração da ficha não invalida a base já importada na revisão 0634. Bases anteriores ao esquema 3 exigem reimportação local. As seleções e os valores manuais existentes são preservados; a nova leitura exige confirmação do risco quando a origem não coincide inequivocamente com a versão já selecionada.

Os testes da ficha conferem os dois valores independentes, ausência, zero, classificação explícita, unidades e conceitos de capacidade/quantidade, instalações envolvidas, associação expressa, origem documental, ajustes e escape de conteúdo. A conferência visual das exportações deve usar amostras locais fora do repositório, incluindo nomes longos e uma ficha que ocupe várias páginas. O Word contém texto e tabelas editáveis sem grades; sua paginação automática pode diferir da impressão pelo navegador.

As assinaturas 0636 preservam a imagem original e vinculam cada cópia à pessoa, ao papel e ao atendimento. A preferência do regulador fica em uma chave local separada, sem sincronização: salvar ou substituir o perfil não altera atendimentos existentes. Alterações no conteúdo conservam as imagens, retiram a conclusão e exigem nova conferência das assinaturas não automáticas; alteração da identidade remove a assinatura correspondente. Novo atendimento nunca reutiliza a assinatura do cooperado. A ausência visual de “RASCUNHO” não conclui o relatório.

O fluxo de assinaturas verifica JPEG e PNG transparente, proporções horizontal e vertical, substituição, remoção, desenho, enquadramento reversível, arquivos inválidos, uso automático/desativação do perfil, recarga, backup, identificação e validações de conclusão. Confere também as duas linhas da capa, alinhamento, fonte, preservação dos identificadores e ausência de “RASCUNHO” e “Dados Cadastrais”. Para exportar os cinco cenários, informe `FAST_TRACK_DOCX_PATH` apontando para a biblioteca docx 8.5.0 e `FAST_TRACK_OUTPUT_DIR` para uma pasta privada fora do repositório. Essa opção grava backups, prévias e Word/PDF para inspeção; arquivos pessoais nunca devem ser versionados.
