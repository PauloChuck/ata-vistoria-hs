# Relatório e preenchimento — revisão 0639.7

Base: V0.6.3.9, após o PR 25. A entrada continua em `fast_track/v062.html`.

## Comportamento

- Abrir, recarregar ou retornar à página pelo histórico limpa exclusivamente a consulta de cooperados. A base, os filtros da sessão e o atendimento permanecem preservados.
- A data de vistoria começa vazia em novos atendimentos. Ela alimenta a narrativa e a cronologia, sem usar a data atual ou a data do sinistro como substitutas. Em narrativa personalizada, somente referências reconhecíveis à realização da vistoria são atualizadas; datas de aviso, agendamento e sinistro permanecem intactas. Texto livre cuja data não possa ser identificada com segurança é preservado para edição manual.
- O parecer inicial passa a ser: “Mediante exposto e documentado pelas mídias locais, o evento encontra amparo técnico pela cobertura de Vendaval/Granizo contratada na apólice vigente.” A migração preenche campos vazios e substitui exclusivamente padrões antigos conhecidos, sem alterar parecer personalizado, contrato, apuração ou conclusão.
- No tópico 1, a imagem de localização e sua legenda antecedem o quadro completo, incluindo títulos, renovação e endossos selecionados. Sem imagem, não há legenda nem reserva de espaço. Sem quadro, mapa e legenda permanecem. Dimensões e enquadramento do mapa, campos e fluxo de consulta não mudam.
- O registro fotográfico usa duas colunas e até três linhas, com título somente no início da seção. Aproveita o espaço restante após a relação de danos e permite o início do tópico 4.2 após a última linha quando houver espaço. Não há quebra obrigatória antes ou depois da galeria, nem título ou espaço de continuação.
- Legendas permanecem em 10 pt. Pares usam áreas de apresentação consistentes, com altura mínima de 70 mm incluindo imagens, legendas e espaçamento. Legendas extensas reservam mais espaço e podem reduzir o número de pares na página. Imagens mantêm a proporção e pelo menos 32 mm de área vertical; não há recorte adicional. Mapa, evidências e assinaturas não participam do agrupamento de seis.
- O título é “4.2 LEVANTAMENTOS DOCUMENTAIS” na interface e em todos os geradores ativos, inclusive ao restaurar atendimentos antigos. Texto e anexos são preservados; um título sem narrativa permanece junto da primeira evidência.
- Somente imagens de assinatura perdem o contorno preto. A imagem original, o enquadramento, a identificação e as linhas de assinatura permanecem preservados.
- No Word, a tabela de fotografias flui por linhas indivisíveis, sem quebras explícitas e sem repetir o título. As imagens usam espaçamento simples, sem herdar a entrelinha do texto. Os quatro totais da apuração ficam juntos, sem repetir o cabeçalho dos itens acima deles.

## Verificações

- 92 testes unitários aprovados, incluindo migração do parecer, formatos de data, texto personalizado e separação de agendamento/sinistro.
- Fluxos de navegador: consulta, troca de pessoa/local, composição de instalações, quadro cadastral, apólices simplificadas, coberturas selecionadas, apuração automática, perfil Aurora e assinaturas; fluxos de refinamentos e paginação com salvar, reabrir e restaurar backup.
- Tópico 1 com as quatro combinações de presença/ausência de mapa e quadro, oito registros e histórico com 48 registros. Preservação das linhas selecionadas e repetição dos cabeçalhos em quadros extensos.
- Exportações Word/PDF de casos com 1, 4, 6, 7, 12 e 13 fotos, orientações alternadas e legendas curtas/extensas. Conferência de conteúdo, sequência, limite de seis por página, datas, parecer, franquia e indenização; fotos e legendas juntas, evidências separadas e ausência de quadros vazios.
- Conferência nativa no Microsoft Word 2010, em modo protegido, dos casos com uma e treze fotos. A galeria começa na página parcialmente ocupada; uma página subsequente comporta seis fotografias, sem título de continuação. Com uma foto, o tópico 4.2 e o início da narrativa seguem na mesma página. Mapa antes do quadro, assinaturas sem contorno e totais juntos confirmados.

Word e navegador têm motores de paginação distintos: os pares podem mudar de página e o total de páginas pode diferir, mantendo ordem, conteúdo e limite de seis. A conferência nativa foi feita no Word 2010; não representa teste de todas as versões do Office. Todos os casos são sintéticos. Bases, contratos reais, PDFs pessoais, assinaturas e artefatos de validação ficam fora do repositório.

Esta revisão continua no PR 26, preparado para integração. A retirada do título de continuação não aparecia no endereço público porque a revisão anterior desse PR ainda não havia sido integrada à versão principal. Os geradores ativos em `v062.html` são `direct-layout-0639.js` (prévia/PDF) e `direct-word-0639.js` (Word), com geometria compartilhada em `report-refinements-0639.js`; os três recebem a referência de cache `0639.7`. Publicação é uma etapa separada da preparação do PR.
