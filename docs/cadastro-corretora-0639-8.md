# Revisão 0639.8 — corretora do contrato e limites percentuais

A escolha de segurado/apólice passa a preencher a corretora do atendimento quando o cadastro privado contém `operacao.corretora_relatorio`. O valor configurado substitui a corretora anterior. Cadastros sem esse campo conservam o comportamento anterior; o campo é opcional no editor. A atualização do catálogo não modifica a versão contratual nem a corretora dos atendimentos já salvos.

O tópico 3 continua usando somente as coberturas e os sublimites expressamente selecionados. Quando a cobertura possui `limite_percentual_lmi_cobertura`, sua célula de limite informa o percentual do LMI e o teto monetário, sem apresentar esse teto como verba independente. Valores por evento, unidade/local e agregado continuam separados. Franquias condicionadas e ausência de franquia são conservadas. A apresentação é compartilhada pela tela, prévia, Word e PDF.

A apuração operacional continua aplicando uma única franquia de 15% sobre o total apurado, com mínimo de R$ 3.000,00. Os termos documentais das apólices permanecem no cadastro. Não há novos controles obrigatórios na relação de danos.

## Importação privada

Na etapa 1, abrir **Apólices e Coberturas → Importar cadastro de apólices**, escolher o JSON privado e conferir os dados. Para vincular os arquivos, selecionar cada **Documento de origem**, usar **Anexar PDF** e, ao final, **Salvar versão do cadastro**. O PDF é comparado com o SHA-256 do cadastro. Depois, selecionar o segurado/apólice e as coberturas do atendimento.

Um backup privado já preparado pode ser carregado por **Restaurar backup de apólices**. Essa ação acrescenta os contratos ausentes e mantém as versões ativas existentes. Não usar a restauração do atendimento para carregar esse arquivo. O catálogo e seus PDFs permanecem somente no navegador; para outro dispositivo, usar **Backup das apólices e PDFs**.

Nenhum cadastro real, PDF, assinatura ou relatório privado integra esta revisão. A implementação não instala contratos automaticamente no navegador de uso diário.

## Validação

`node --test tests/*.test.cjs` verifica os casos monetários, seleção das seis bases, instalações, histórico, VRs, assinaturas e contratos. `tests/policy-broker.browser.cjs` verifica dois contratos, troca B/A/B, corretora anterior, coberturas, quatro sublimites, exceções documentais, versão imutável, salvamento/reabertura e backups. Os dados padrão são fictícios.

O teste de navegador exporta quatro cenários em Word/PDF: cobertura única, cobertura com sublimite, franquias condicionadas/limite percentual e quatro sublimites. Informe `FT_BROWSER`, `FT_DOCX_LIB` e `FT_OUT` fora do checkout. Referências privadas opcionais usam `FT_REFERENCE`, `FT_REFERENCE_A` e `FT_PDF_DIR`; nunca versionar essas entradas ou saídas. O backup de teste chamado `private-registry.json` contém uma alteração deliberada de corretora; somente `cadastro-privado-validado.json` contém a versão original conferida para importação.

O Word deve ser conferido visualmente além das verificações de conteúdo. A renderização por LibreOffice não equivale à conferência nativa no Microsoft Word; a paginação pode variar entre os programas e o PDF do navegador.
