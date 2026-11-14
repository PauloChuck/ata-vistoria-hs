# Cobertura reclamada no relatório

A seção 3 usa somente as escolhas gerais do atendimento. Cada cobertura ou sublimite selecionado ocupa uma linha com nome de apresentação, limite e franquia. O cadastro completo, suas fontes, versões, condições e documentos permanecem preservados no navegador e nos backups.

Os sublimites podem ser marcados opcionalmente junto à seleção geral da apólice. Não há seleção por material ou serviço. Metadados antigos dos itens não selecionam coberturas nem sublimites no relatório. Ao trocar de apólice, as escolhas anteriores saem do atendimento e permanecem no histórico.

Limites por evento, por unidade/local e agregados conservam essa identificação na própria célula. O sublimite usa seu valor específico, sem herdar o limite principal. Dados ausentes aparecem como não informados; zero é preservado. Regras temporais e condicionadas conservam sua natureza, sem conversão automática para percentual comum.

A prévia, o Word e o PDF usam a mesma projeção de três colunas, com separadores horizontais. Cabeçalho e primeira linha ficam com o título; linhas não são divididas entre páginas. Seleções extensas na Ficha de risco podem continuar entre entradas, preservando instalações, histórico e os VRs separados.

A franquia exibida na seção 3 é a cadastrada na cobertura. Isso não altera o cálculo de contingência: uma única franquia de 15% do total apurado, com mínimo de R$ 3.000,00. O cálculo independe da quantidade de linhas, instalações, coberturas e sublimites.

## Verificação

- Testes de lógica: seleção, substituição, duplicidades, sublimite específico, escopos de limite, ausência/zero, franquias temporais/condicionadas e compatibilidade com backups.
- Navegador: cobertura única, troca, múltiplas escolhas, sublimite isolado, seleção extensa, paginação e telas de 320 a 1440 pixels; salvamento, reabertura e restauração.
- Regressão da Ficha de risco, histórico, instalações, VRs, apólices e apuração automática.
- Exportações sintéticas Word/PDF comparadas com a prévia e renderizadas para inspeção visual. O Microsoft Word nativo não foi aberto novamente; a validação do DOCX usa sua estrutura e renderização pelo LibreOffice.

Evidências, documentos de teste, cadastros reais, PDFs e assinaturas pessoais ficam fora do repositório público. Esta alteração sucede a V0.6.3.9, sem modificar a versão do formato de backup.
