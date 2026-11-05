# Fast Track — Contingência

Protótipo funcional do produto de regulação simplificada para eventos de contingência, separado da Ata de Vistoria V7.5.

## Fluxo implementado

1. Evento de contingência reutilizável.
2. Processo individual do cooperado.
3. Conferência dos dados do risco.
4. Relato, constatações, relação de danos e fotografias.
5. Cobertura, limites, franquia, causa, análise contratual e parecer.
6. Apuração simplificada dos prejuízos.
7. Salvados, ressarcimento, pagamento, cronologia e encerramento.
8. Revisão, PDF, Word editável e backup JSON.

## Regras principais

- Prioridade de identificação: sinistro da seguradora, sinistro Horizon Servitas e, na ausência de ambos, nome do cooperado.
- O segurado é a cooperativa; o cooperado é o beneficiário. Integradoras não fazem parte do relatório.
- LMIs e sublimites são transcritos da apólice e somente o limite escolhido pelo regulador é aplicado ao cálculo.
- Dados recebidos sobre instalações são tratados como referência e precisam ser confirmados, ajustados ou marcados como não aplicáveis.
- A apuração calcula valor reclamado, valor acatado, descontos, glosas, depreciação, salvados, franquia, limitação e indenização indicada.
- Fotografias permanecem na sessão atual. O backup JSON pode incluir as imagens comprimidas.

## Armazenamento

O protótipo utiliza `localStorage` do navegador para o rascunho e para eventos-base. Nenhum documento de sinistro ou dado pessoal é gravado no repositório público.

## Testes realizados

O fluxo foi testado em navegador automatizado, incluindo:

- carregamento do exemplo;
- navegação pelas oito etapas;
- inclusão e remoção de itens;
- cálculo do caso-exemplo;
- criação do relatório em cinco páginas;
- exportação Word;
- backup JSON;
- preparação para impressão/PDF;
- verificação de erros de JavaScript;
- conferência de overflow no layout A4 do exemplo.
