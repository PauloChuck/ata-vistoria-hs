# Ficha com várias instalações — V0.6.3.9

A Ficha de risco passa a representar uma propriedade com instalações selecionadas individualmente. A seleção de segurado, apólice e cobertura continua imediata e independente desta composição; não há exigência de vínculo individual, datas de inclusão ou referência documental.

## Uso

1. Pesquise o cooperado e adicione um registro à ficha. Informe a identificação da propriedade.
2. No **Histórico do cadastro**, identifique cada lançamento como nova instalação física, versão de uma instalação já identificada, total consolidado, histórico não aplicável ou outra propriedade. Nenhuma instalação é inferida apenas pelo nome, pelas coordenadas ou pelos valores.
3. Ao identificar uma instalação, marque **Usar expressamente os valores deste registro** ou escolha depois o **Registro com valores aplicáveis**. A data mais recente nunca é escolhida automaticamente. Repetições podem receber a mesma associação em uma única ação, mediante confirmação expressa, mantendo todos os registros originais.
4. Marque as instalações que compõem a ficha. **Selecionar todas desta propriedade**, **Limpar seleção** e a contagem operam somente sobre as instalações físicas identificadas. Adicionar outra instalação não retira as anteriores. Registros de outra atividade entram apenas no histórico até a associação expressa à mesma propriedade.
5. Marque separadamente **Atingida pelo sinistro**. Essa marcação não altera o VR da propriedade.
6. Confirme a completude da lista somente quando ela contiver todas as instalações da propriedade. Se houver apenas parte selecionada, os valores são identificados como **VR das instalações selecionadas**.

## Valores e histórico

Benfeitorias e animais são calculados separadamente. Somam-se somente os valores dos registros escolhidos para instalações distintas. Registros anteriores e repetições não se acumulam. Zero informado é conservado; ausência, texto numérico ambíguo e versão sem escolha não viram zero. Informação incompleta gera subtotal; identificação ou valores aplicáveis pendentes impedem apresentar um total definitivo.

Um lançamento identificado como total consolidado pode ser escolhido separadamente para cada VR. Ele substitui a soma das instalações e só é aplicado com composição completa, todas as instalações selecionadas e histórico identificado. Uma seleção parcial não recebe o total da propriedade inteira.

Identificações físicas exigem decisão do regulador quando a base não as fornece. O sistema não resolve identidade por semelhança nem decide a aplicabilidade temporal de endossos. As associações, os registros originais e as escolhas de valores ficam no atendimento e no backup privado.

## Compatibilidade e preservação

A mesma representação alimenta a ficha no aplicativo, a prévia, o Word e o PDF. Fichas antigas são preservadas no formato anterior até o uso expresso de **Compor instalações desta propriedade**; os dados confirmados anteriores também são conservados. Atualizar a base mantém a composição salva e solicita sua conferência, sem escolher substitutos automaticamente.

A composição da ficha preserva danos, fotos, textos, cadastro contratual e imagens de assinatura. A relação de danos e o cálculo automático seguem o [fluxo simplificado de apuração](apuracao-0639.md), sem alterar os VRs da ficha. As verificações existentes de assinatura após mudanças no relatório permanecem. Contratos, PDFs, bases reais, configurações e assinaturas pessoais não fazem parte do repositório público.

## Verificação

- Testes unitários: `node --test tests/*.test.cjs`.
- Aceitação no navegador: `tests/property.browser.cjs`, `tests/cooperators-browser.cjs`, `tests/policies-quick.browser.cjs` e `tests/signatures-browser.cjs`.
- `FT_BROWSER` indica o navegador e `FT_OUT` a pasta privada de evidências; `FT_DOCX_LIB` permite usar a biblioteca Word local e `FT_EXPORTS=1` gera os três casos de relatório.
- Casos: instalações distintas, repetições e versões, propriedades diferentes, atividades diferentes, valores ausentes/zero/ambíguos, total consolidado, seleção parcial, danos independentes, restauração e fichas anteriores.

Os testes públicos utilizam exclusivamente dados fictícios. A conferência da base real e os relatórios de teste ficam fora do repositório.
