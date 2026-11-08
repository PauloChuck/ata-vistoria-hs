# Fast Track de Contingência V0.6

Nova versão independente do relatório Fast Track, implementada sem substituir a Ata V7.5 nem as versões anteriores.

## Escopo

- reutiliza o fluxo e os mecanismos existentes do aplicativo;
- trabalha somente com dados do processo atual ou importados da Ata V7.5;
- não contém nomes, valores, fotografias, assinaturas ou conclusões do relatório usado como referência visual;
- identifica campos obrigatórios e permite rascunhos incompletos;
- sincroniza dados repetidos e textos automáticos;
- persiste mapa, fotografias, documentos e assinaturas no navegador;
- calcula franquia como o maior valor entre 15% dos prejuízos apurados e R$ 3.000,00;
- organiza até quatro fotografias por página;
- gera DOCX nativo a partir de modelo institucional sanitizado e PDF A4;
- oferece backup completo em JSON.

## Entrada

`/fast_track/v06.html`

## Pacote

A carga utiliza 3 partes de payload, contendo o modelo Word sanitizado e o gerador V0.6.
