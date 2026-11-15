# Seleção do cooperado e do local

“Utilizar dados deste local” passa a substituir a seleção atual. Nome, CPF disponível, grupo, cooperativa afiliada informada, endereço, coordenadas e referências passam a vir do cartão escolhido, inclusive em atendimentos anteriores sem composição. Digitar na pesquisa não altera o atendimento.

Outra propriedade começa com somente o registro escolhido, sem instalações ou VRs da propriedade anterior. Área, capacidade e atividade conhecidas aparecem imediatamente na Ficha de risco; a consolidação dos VRs continua dependendo da identificação das instalações e da escolha expressa dos valores aplicáveis.

“Acrescentar instalação à mesma propriedade” é uma ação separada, com confirmação da associação. Ela preserva a pessoa e as instalações existentes, rejeita identidade conflitante e impede repetir um registro. Nome igual, por si só, não comprova identidade. O histórico e a proteção contra somar versões da mesma instalação permanecem.

Ao trocar de pessoa, CPF ausente fica vazio e a assinatura do cooperado anterior é desvinculada. A assinatura padrão do regulador, apólice, coberturas, fotos, mapa, danos, textos, datas e números do atendimento são preservados. Aurora identifica o grupo da base; não preenche uma cooperativa afiliada sem informação da fonte.

O índice local de bases anteriores é atualizado a partir do HTML original, quando disponível. Sem esse HTML, os dados são recuperados somente dos registros originais existentes. Os snapshots dos atendimentos salvos não são reescritos automaticamente.

Na exportação Word, a primeira linha de cobertura é mantida com a seguinte quando há várias seleções. Isso evita que leitores compatíveis deixem o cabeçalho isolado e cortem a primeira cobertura no limite da página.

## Verificação

- `node --test tests/*.test.cjs`: inclui primeira seleção, troca de pessoa com/sem CPF, homônimos, propriedades distintas, inclusão explícita, origem dos dados, base anterior e backup.
- `tests/cooperator-selection.browser.cjs`: verifica clique real, formulário, assinatura, prévia, salvamento/reabertura e gera Word/PDF fictícios após a troca.
- `tests/property.browser.cjs`, `tests/cooperators-browser.cjs`, `tests/aurora-report.browser.cjs` e `tests/settlement.browser.cjs`: verificam instalações, repetições históricas, totais consolidados, buscas, aparência Aurora, coberturas e franquia única.

Os testes de navegador usam Playwright e um navegador instalado (`FT_BROWSER`; o teste de busca utiliza `FAST_TRACK_BROWSER`). `FT_OUT` deve apontar para uma pasta fora do repositório; `FT_DOCX_LIB` pode indicar a cópia local da biblioteca de exportação. Nenhum cadastro, PDF ou assinatura pessoal é incorporado ao código público.
