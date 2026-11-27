# Revisão 0639.9 — apólice pelo local confirmado

Ao usar **Utilizar dados deste local**, a seleção principal consulta os vínculos `vinculos_propostos_consulta` dos cadastros locais. A associação usa a chave da base de origem e a atividade do registro. A base distingue a empresa/cooperativa; nomes de pessoas, seguradora e vínculos individuais antigos não são critérios de associação.

Com uma única opção compatível, o contrato preenche os campos e os seletores existentes. Coberturas e sublimites continuam sendo escolhas expressas do regulador. Na troca efetiva de contrato, as escolhas anteriores são retiradas. A corretora de outro contrato não é reaproveitada na associação automática se o novo cadastro não informar esse campo; a seleção manual mantém sua compatibilidade anterior.

Se a versão já escolhida continuar compatível, permanecem a versão, os ajustes e as coberturas do atendimento. Isso também vale quando existe uma versão mais recente no catálogo. Havendo outras opções, elas aparecem no seletor existente. Sem opção compatível, os campos do contrato anterior são limpos, a identificação do local permanece e a interface orienta importar ou escolher a apólice. Nenhuma exigência de vínculo individual ou comprovante foi acrescentada.

A data do sinistro filtra a vigência. As horas escritas são respeitadas: 24:00 é o fim daquela data. Sem hora do sinistro, uma opção só é aplicada automaticamente quando cobre todo o dia; sobreposição parcial exige escolha manual, sem novo campo obrigatório. A edição da data não troca contratos: a interface sinaliza incompatibilidades, mantendo a decisão manual disponível.

Pesquisar nomes, acrescentar instalações, ajustar a ficha, abrir/restaurar um atendimento ou importar/atualizar o catálogo não executa a associação. O catálogo atualizado pode atualizar a lista de opções, mas não escolhe outra apólice. Nenhum formato de backup, layout ou regra de apuração foi alterado.

## Verificação

`node --test tests/*.test.cjs` inclui os testes de associação, limites de vigência, duplicidade de opções, versões salvas, escolha manual e limpeza dos campos anteriores.

`node tests/local-policy.browser.cjs` usa `FT_BROWSER`, `FT_DOCX_LIB` e `FT_OUT` fora do checkout. Valida Lar/Aurora/Lar, Postura/Recria, pesquisa sem efeitos, cadastro ausente, múltiplos contratos, escolha manual, atualização do catálogo, reabertura, backups, duas instalações com VRs separados e quatro cenários de prévia/Word/PDF. Os dados padrão são fictícios. `FT_REFERENCE` e `FT_REFERENCE_A` permitem conferir cadastros privados sem incorporá-los ao repositório.

Regressões complementares: `cooperator-selection.browser.cjs`, `property.browser.cjs`, `policies-quick.browser.cjs` e `policy-broker.browser.cjs`. As expectativas antigas de manter contrato incompatível após trocar o local foram atualizadas para a nova regra. A escolha manual e a preservação de contratos compatíveis continuam verificadas.

Documentos e resultados privados ficam fora do checkout. Renderização de DOCX por LibreOffice não substitui a conferência nativa no Microsoft Word; a paginação pode variar.
