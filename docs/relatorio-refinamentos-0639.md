# Relatório e preenchimento — revisão 0639.6

Base: V0.6.3.9, após o PR 25. A entrada continua em `fast_track/v062.html`.

## Comportamento

- Abrir, recarregar ou retornar à página pelo histórico limpa exclusivamente a consulta de cooperados. A base, os filtros da sessão e o atendimento permanecem preservados.
- A data de vistoria começa vazia em novos atendimentos. Ela alimenta a narrativa e a cronologia, sem usar a data atual ou a data do sinistro como substitutas. Em narrativa personalizada, somente referências reconhecíveis à realização da vistoria são atualizadas; datas de aviso, agendamento e sinistro permanecem intactas. Texto livre cuja data não possa ser identificada com segurança é preservado para edição manual.
- O parecer inicial passa a ser: “Mediante exposto e documentado pelas mídias locais, o evento encontra amparo técnico pela cobertura de Vendaval/Granizo contratada na apólice vigente.” A migração preenche campos vazios e substitui exclusivamente padrões antigos conhecidos, sem alterar parecer personalizado, contrato, apuração ou conclusão.
- O registro fotográfico usa duas colunas e três linhas, com título somente na primeira página. Legendas permanecem em 10 pt e reservam espaço antes do dimensionamento proporcional das imagens. Legendas excepcionalmente extensas podem exigir menos pares na página para preservar a legibilidade. Mapa e evidências documentais não participam desse agrupamento.
- Somente imagens de assinatura perdem o contorno preto. A imagem original, o enquadramento, a identificação e as linhas de assinatura permanecem preservados.
- O Word inicia as páginas fotográficas com `pageBreakBefore`, evitando as páginas vazias que o Word 2010 produz quando uma quebra explícita sucede a tabela.

## Verificações

- 92 testes unitários aprovados, incluindo migração do parecer, formatos de data, texto personalizado e separação de agendamento/sinistro.
- Fluxos de navegador: consulta, troca de pessoa/local, composição de instalações, quadro cadastral, apuração automática, perfil Aurora e assinaturas; novo fluxo de refinamentos com salvar, reabrir e restaurar backup.
- Exportações Word/PDF de casos com 1, 6, 7, 12 e 13 fotos, imagens verticais e legendas extensas. Conferência dos textos, sequência de figuras, grupos por página, datas, parecer, franquia e indenização. Verificação de contornos no DOCX para assinaturas anexadas, desenhadas e padrão do regulador.
- Renderização e inspeção visual dos documentos. Conferência da exportação com 13 fotos no Microsoft Word 2010, em modo protegido: grupos 6/6/1, sem páginas vazias entre eles, título só na primeira página e assinatura sem contorno.

O Word tem paginação própria: as demais seções podem ocupar quantidade diferente de páginas em relação ao PDF do navegador. A conferência nativa foi feita no Word 2010; não representa teste de todas as versões do Office. Todos os casos são sintéticos. Bases, contratos reais, PDFs pessoais, assinaturas e artefatos de validação ficam fora do repositório.

Esta revisão é preparada para integração; a publicação depende da integração à versão principal.
