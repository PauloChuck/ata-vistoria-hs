# Apuração simplificada — V0.6.3.9

A relação de danos conserva descrição, quantidade, unidade, idade, unidade da idade, valor reclamado total e valor apurado. Adicionar, remover, ordenar e **Acatar valor reclamado** mantêm o funcionamento anterior. Apólice e coberturas continuam na seleção geral do atendimento.

O cálculo de contingência usa os totais informados nas linhas, sem multiplicá-los pela quantidade. A franquia é aplicada uma única vez: o maior valor entre 15% do total apurado e R$ 3.000,00. O prejuízo indenizável é o total apurado menos a franquia, limitado inferiormente a zero. O valor reclamado, os VRs, as instalações, as coberturas e os sublimites não multiplicam nem alteram essa franquia.

Valores são convertidos e somados em centavos, com arredondamento decimal de meio centavo para cima. Zero apurado é conservado; valor vazio ou inválido identifica o item pendente e não gera resultado definitivo. Se faltar apenas o reclamado, o total reclamado permanece pendente, sem alterar a franquia calculada sobre os apurados completos. Sem itens, os quatro resultados são zero; com itens apurados em zero, a franquia mínima é exibida e o prejuízo indenizável é zero.

A conferência contratual da apuração e os quatro controles contratuais por item foram retirados da interface ativa e do cálculo. Os dados antigos desses controles continuam no atendimento e no backup, sem bloquear navegação, salvamento, cálculo ou emissão. A seleção geral de apólices e coberturas e seus dados de referência permanecem disponíveis. A regra fixa deste fluxo não modifica o cadastro contratual original.

A Ficha de risco da V0.6.3.9 permanece integral: instalações físicas selecionadas, histórico e versões, associação expressa, proteção contra duplicidade, totais consolidados e VR de benfeitorias e animais separados. A marcação de instalações atingidas continua independente do VR da propriedade. Fotos, textos e imagens de assinatura são preservados. Alterações efetivas no conteúdo conservam a verificação já existente das assinaturas.

Tela, revisão, Word e PDF usam a mesma função de cálculo e os mesmos quatro rótulos. A relação de danos em vistoria mantém quantidade, descrição e idade; os valores monetários aparecem na apuração de prejuízos. Os módulos históricos versionados permanecem para compatibilidade; o endereço atual carrega os módulos 0639 simplificados.

## Verificação

- `node --test tests/*.test.cjs`: inclui casos de aceite, centavos, vazio/zero, valores inválidos, independência de conferências antigas e restauração, além das regressões existentes.
- `tests/settlement.browser.cjs`: ações da interface, três resultados de aceite, pendência por item, reabertura, backup, preservação da composição e larguras de 320 a 1440 pixels.
- `tests/property.browser.cjs`, `tests/policies-quick.browser.cjs`, `tests/cooperators-browser.cjs` e `tests/signatures-browser.cjs`: regressões de instalações, seleção contratual, pesquisa e assinaturas.
- `FT_EXPORTS=1` no teste de apuração gera Word/PDF com R$ 12.430,00, R$ 40.000,00, R$ 2.500,00 e apurado ausente. `FT_OUT` deve apontar para pasta privada fora do repositório.

Somente dados fictícios são usados nos testes públicos. Relatórios de validação, bases reais e configurações pessoais permanecem fora do repositório.
