# Quadro de consulta de cooperados — revisão 0639.5

A seleção atual aparece no modelo “Consulta de cooperados”, no aplicativo e no tópico 1 do relatório. O cabeçalho identifica grupo, atividade, cooperado, origem e quantidade de registros apresentados. Renovação/cadastro inicial e endossos por referência usam somente os campos aprovados. Os contadores representam registros, nunca instalações físicas.

O quadro usa os registros expressamente acrescentados à composição. Não percorre candidatos da mesma pessoa nem deduz a propriedade por nome, coordenadas ou valores. Versões de uma instalação selecionada aparecem individualmente, sem somas nem escolha automática da versão mais recente. Registros classificados como outra propriedade, somente histórico não aplicável à ficha ou total consolidado permanecem nos ajustes. Desmarcar uma instalação retira suas versões do quadro; marcar danos não altera a composição.

“Ajustar dados e instalações” começa recolhido e conserva edição, associação, histórico, seleção múltipla, identificação das instalações e os dois VRs separados. Totais e VR de animais permanecem no atendimento, no backup e nessa área de ajustes; não são apresentados no novo quadro. Trocar o local fecha os ajustes e substitui o conteúdo, preservando a correção de pessoa, CPF e assinatura do PR 24.

O Word recebe tabelas editáveis. Os valores e cabeçalhos vêm da mesma projeção usada no aplicativo e no PDF. As colunas reservam espaço para palavras, números e coordenadas completos; cada linha permanece junta. Históricos longos repetem os cabeçalhos por página. A paginação do Word é independente da impressão pelo navegador. Em telas estreitas, o quadro permite rolagem horizontal para manter a leitura.

## Validação

- 87 testes unitários: importação, projeção, repetições, atividades, ausência/zero/N/I, coordenadas, seleção, contratos, assinaturas e apuração.
- Fluxos reais no navegador: consulta, troca de pessoa/local, composição, preservação dos VRs, salvamento, reabertura e backup.
- Novo fluxo `tests/local-register.browser.cjs`: renovação isolada, oito registros com sete endossos, histórico de 48 registros e atividades diferentes; comparação de todas as células entre aplicativo e prévia, exportação Word/PDF e verificação de cortes.
- Regressões da capa Aurora, coberturas selecionadas, bordas das imagens e franquia única.
- Conferência visual de uma exportação no Microsoft Word 2010, em modo protegido. Renderização e conferência das exportações dos quatro cenários, incluindo cabeçalhos repetidos no histórico longo.

Execute `node --test tests/*.test.cjs`. Para o novo fluxo de navegador, configure Playwright, `FT_BROWSER`, `FT_DOCX_LIB` (docx 8.5.0) e `FT_OUT` fora do repositório, e execute `node tests/local-register.browser.cjs`.

Os testes usam dados fictícios. Nenhuma base real, imagem de referência com dados pessoais, assinatura ou exportação de atendimento deve ser versionada.
