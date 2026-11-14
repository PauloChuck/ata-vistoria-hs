# Seleção rápida de apólices e coberturas — V0.6.3.8

O fluxo do atendimento passa a ser **selecionar segurado/apólice → escolher cobertura → continuar o relatório**. Esta revisão substitui a exigência anterior de comprovar inclusão individual antes de transcrever os dados do contrato.

## Uso

1. Mantenha o cadastro em **Apólices e Coberturas**, com importação, edição e PDFs opcionais.
2. Em **Segurado / empresa**, escolha um segurado cadastrado. Se houver somente uma apólice ativa desse segurado, seus dados serão preenchidos imediatamente. Havendo mais de uma, escolha em **Apólice**, que mostra número, seguradora e vigência.
3. Para selecionar diretamente um contrato, deixe **Todos os segurados** e escolha a apólice. O segurado correspondente será selecionado junto.
4. Marque a **Cobertura reclamada**. A capa, a seção 3, a prévia, o Word e o PDF passam a usar seus nomes, limites, franquia e condições. As opções de sublimite permanecem associadas aos bens na relação de danos.
5. Continue o atendimento. A escolha funciona sem importar a base de cooperados, selecionar propriedade, informar inclusão individual ou preencher referência documental. A data do sinistro é um dado do relatório e não condiciona a seleção do contrato.

A escolha preenche empresa/grupo, cooperativa afiliada cadastrada, segurado, CNPJ, seguradora, apólice e produto disponível. Não substitui o cooperado/integrado. Trocar a apólice atualiza esses campos e retira a cobertura, a causa contratual, os sublimites associados e os parâmetros de cálculo anteriores. Conserva materiais, quantidades, valores, local/item, grupo do bem, fotos, textos e imagens de assinatura. As regras já existentes de conferência das assinaturas após alterar o relatório continuam válidas.

## Versões e compatibilidade

O cadastro continua separado do atendimento e da preferência de assinatura. Cada atendimento conserva a cópia contratual utilizada; atualizar o cadastro não substitui essa cópia. Alterar propriedade, data ou VR também não retira a apólice escolhida.

Atendimentos da V0.6.3.7 podem ser reabertos e restaurados. Conservam a versão, coberturas e dados históricos, sem depender do vínculo ou do contexto antigo. Os metadados históricos de inclusão não são usados como condição para aplicar ou emitir o relatório. Novas escolhas são registradas como escolhas do atendimento; não criam vínculos, datas de inclusão ou declarações de comprovação.

Use **Backup das apólices e PDFs** para transferir o cadastro e os documentos. Use **Backup completo** para transferir o atendimento, incluindo sua versão contratual. Tudo permanece somente no navegador/dispositivo, sem sincronização com servidor.

## Apuração

A seleção transcreve os dados disponíveis e não conclui amparo. Permanecem separados limites por evento, por unidade/local e agregados, bem como VR de benfeitorias e animais. Caixa d'água, vinilona e outros sublimites conservam sua classificação e valores próprios.

As regras de cálculo existentes continuam aplicáveis. Mudanças nos dados usados na apuração exigem nova conferência dos cálculos, sem retirar a escolha contratual. Se uma regra estiver incompleta ou divergente, o cálculo dependente permanece identificado como pendente e o relatório pode ser emitido. O regulador pode ajustar os prejuízos e registrar o tratamento manual nos textos e no parecer; o sistema não inventa líquido, saldo agregado, período indenitário ou rateio.

## Verificação

- `node --test tests/*.test.cjs`: 49 testes de cadastro, seleção, compatibilidade, franquias/limites, consulta de cooperados, Ficha de risco e assinaturas.
- `node tests/policies.browser.cjs`: importação, apólice única, seleção direta, dois contratos do mesmo segurado, troca sem perda de dados, atualização, recarga, backup/restauração, atendimento anterior, consulta de cooperados e telas de 1440, 768 e 390 pixels. O teste padrão usa somente dados fictícios.
- `node tests/signatures-browser.cjs`: regressão do cadastro e uso automático da assinatura, desenho, anexação, recorte, substituição, remoção, salvamento e restauração.

Para o teste de navegador, configure `FT_BROWSER`, `FT_OUT` fora do repositório e, opcionalmente, `FT_DOCX_LIB`. `FT_REFERENCE` e `FT_LEGACY` apontam para arquivos privados locais. `FT_EXPORTS=1` gera Word/PDF de um atendimento sem base de propriedades e de um atendimento da versão anterior. Nenhum desses arquivos privados acompanha o código público.

Validação desta revisão: fluxo padrão com dados fictícios e fluxo com referências privadas, restauração de três PDFs, atendimento da V0.6.3.7 e regressão de assinaturas aprovados. Dois relatórios foram exportados em Word e PDF, com correspondência dos dados contratuais e do parecer; foram conferidas 31 páginas entre PDFs do navegador e renderizações dos DOCX. Os DOCX foram renderizados no LibreOffice; não houve nova abertura no Microsoft Word nesta revisão.
