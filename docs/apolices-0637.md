# Apólices e Coberturas — V0.6.3.7

Documento histórico. A seleção operacional foi substituída pelo [fluxo rápido da V0.6.3.8](apolices-0638.md), sem exigir confirmação de vínculo individual para aplicar a apólice.

O atendimento passa a usar uma versão contratual própria. A escolha da propriedade e a data do sinistro só preenchem o contrato automaticamente quando existe um único vínculo individual confirmado e temporalmente compatível. Grupo, cooperativa afiliada, contratante e cooperado são campos distintos.

## Uso

1. Na etapa 1, abra **Apólices e Coberturas**. Use **Importar cadastro de apólices** para um JSON no formato `cadastro_contratual_de_referencia`, versão 1, ou **Cadastrar apólice** para preencher os campos. A importação apresenta uma conferência antes de salvar.
2. Confira identificação, datas e horas escritas, coberturas e propostas de base/atividade. As regras condicionais, sublimites, fontes, endossos e pendências são preservados. O editor detalhado permite atualizar os campos não oferecidos nos controles simplificados.
3. Vincule cada PDF ao documento de origem correspondente. O aplicativo verifica o cabeçalho e o SHA-256 declarado, quando presente. Salve a versão. Um PDF isolado não substitui a estruturação de uma cobertura.
4. Selecione a propriedade, as instalações envolvidas e a data do sinistro. Na seleção assistida, escolha a apólice e confirme o vínculo individual com documento/página, período e cooperativa. Uma proposta de base não é prova de inclusão.
5. Escolha a **Cobertura reclamada** e informe a causa separadamente. Eventos da mesma cobertura não geram limites adicionais. Em cada dano, informe a cobertura, o código do item/local segurado, o grupo do bem e o sublimite pertinente.
6. Confira os prejuízos indenizáveis e suas referências. Quando necessário, confirme a unidade da franquia, a regra de múltiplas coberturas, as condições do sublimite, o VR específico e a suficiência dos saldos. A seleção contratual não altera o parecer do regulador.
7. Revise e exporte. Pendências acompanham o relatório e não impedem sua emissão. O líquido fica **A apurar** enquanto a automação depende de informação não conciliada; quando possível, a estimativa material aparece separadamente.

## Armazenamento e versões

O cadastro, os vínculos e os PDFs ficam somente no navegador/dispositivo. Não existe sincronização com servidor. O cadastro usa uma chave própria no armazenamento existente; o atendimento e a preferência de assinatura do regulador continuam separados, inclusive no armazenamento alternativo.

Cada salvamento gera uma versão, sem substituir as anteriores. O histórico permite consultar uma versão antiga e preparar outra versão ativa. O atendimento conserva sua cópia dos dados contratuais, vínculo, identificação dos PDFs e versão. Atualizar o cadastro não atualiza o atendimento silenciosamente; aplicar outra versão exige escolha expressa.

O **Backup das apólices e PDFs** inclui as versões, vínculos e bytes dos documentos. A restauração verifica a integridade dos PDFs e preserva versões ativas já existentes. O **Backup completo** do atendimento inclui a cópia contratual utilizada e as referências documentais, mas não duplica os PDFs da biblioteca. Faça os dois backups para transferir o conjunto a outro dispositivo.

Mudanças de local/atividade/instalações ou data invalidam a vinculação anterior e reavaliam candidatos. Mudanças de apuração ou VR exigem nova conferência. Ajustes manuais são preservados e identificados; valores de benfeitorias e animais não são somados. Recarregar a página passa a conservar também danos e fotografias.

## Regras e limites de automação

- Datas às 24:00 significam o fim da data escrita. Nos dias com início/fim parcial de vigência, exige-se a hora do sinistro para confirmar compatibilidade.
- A franquia percentual é aplicada à soma dos prejuízos indenizáveis do item/local, com percentual e mínimo cadastrados. Nunca se transforma cada material em uma unidade de franquia.
- Base e unidade não reconhecidas ficam pendentes. Para múltiplas coberturas no mesmo evento, a maior franquia por local só é usada após confirmação da disposição contratual. Não se presume essa regra para outra empresa.
- Limites de evento, local, LMI e agregado são apresentados separadamente. Agregado não é saldo. Sublimites não são somados ao LMI nem geram outra franquia automaticamente.
- Um sublimite simples confirmado pode limitar a estimativa. Sublimites compartilhados entre coberturas/locais, diferentes sublimites no mesmo grupo ou interações com limites que exigem alocação ficam para apuração específica, sem rateio proporcional inventado.
- VR é conferido por tipo de bem e local. Interações com múltiplos locais ou tipos de bens que exigem alocação não são resolvidas por soma de VR.
- Lucros Cessantes não recebem a fórmula dos danos materiais. Seu período indenitário permanece pendente quando a documentação diverge. A apuração material paralela pode continuar como estimativa.
- Divergências de LMG/cosseguro preservam a estimativa material e impedem o líquido final automático e o rateio entre seguradoras. Emissão, eficácia e competência dos endossos permanecem distintas; não há aplicação de “último arquivo vence”.
- Uma marca, o nome do cooperado, a seguradora ou a falta de ajustamentos de determinado ano não comprovam inclusão individual.

## Relatórios

Formulário, seção 3, Ficha de risco, demonstrativo, Word e PDF usam a mesma cópia contratual e as mesmas regras. Os campos da capa ajustados manualmente permanecem identificados como divergências para conferência. O desenho mantém espaços e linhas horizontais, sem grades verticais.

Word e navegador podem paginar de maneira diferente. No Word, o rodapé usa somente a página atual: o total de páginas apresentou valor incorreto no Word 2010 em modo protegido. O PDF do navegador conserva “página de total”. A cronologia do Word permanece unida para evitar sua divisão entre páginas.

## Validação reproduzível

Testes de unidade, sem dependências externas:

```sh
node --test tests/*.test.cjs
```

O teste `tests/policies.browser.cjs` usa Playwright e um navegador Chromium indicado por `FT_BROWSER`. Defina `FT_OUT` para uma pasta privada **fora do repositório**. `FT_DOCX_LIB` pode indicar a biblioteca docx 8.5.0 local; sem isso, utiliza o endereço já empregado pelo aplicativo. `FT_REFERENCE` é opcional e aponta para um cadastro privado; quando fornecido, os PDFs são lidos dos caminhos declarados nesse arquivo. `FT_EXPORTS=1` gera seis casos Word/PDF. Os dados fictícios padrão estão em `tests/policies-fixture.cjs`.

Foram aprovados 47 testes de unidade e executados testes de navegador de importação/conferência, PDFs e hashes, vínculo individual, outra empresa, data incompatível, ambiguidade entre contratos, atualização sem mutar atendimento, recarga, backup/restauração em contexto novo e telas de 1440, 768 e 390 pixels. A referência privada foi validada com os três PDFs de origem. As seis exportações verificam cobertura de vento/granizo, danos elétricos, desmoronamento, LC, sublimite e múltiplas coberturas. Os dados de cooperados usados nos testes são fictícios.

Também foi executado `tests/signatures-browser.cjs`: cadastro e salvamento do perfil, aplicação automática em novo atendimento, atualização sem modificar assinatura de atendimento anterior, recarga, backup, substituição, recorte reversível, desenho, remoção independente e conferência antes de concluir. O teste foi atualizado para exigir preservação das fotos e danos na recarga.

Os seis DOCX foram renderizados com LibreOffice e comparados aos seis PDFs do navegador, totalizando 96 páginas verificadas quanto à presença dos dados contratuais. A aparência foi conferida nas páginas renderizadas. A validação nativa no Microsoft Word 2010 foi feita por amostra, em modo protegido, com aviso de ativação do produto; não equivale a uma certificação de todas as versões do Word.

Contratos, PDFs, assinaturas, preferências pessoais, backups e evidências privadas de teste não integram o código público. A preparação desta versão não constitui publicação em produção.
