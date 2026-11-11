from pathlib import Path
import sys
import xml.etree.ElementTree as ET

OUT = Path('/tmp/v062-cadastral-public')
EXPECTED = [
    'Nome completo: AMARILDO CESAR LOPES',
    'CPF: 092.004.030-07',
    'Dados Bancários: CRESOL – 133 — AG: 002508 / CC: 001.801-5',
]


def validate_docx() -> None:
    root = OUT / 'docx'
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    w_ns = ns['w']
    attr = lambda name: f'{{{w_ns}}}{name}'
    body = ET.parse(root / 'word/document.xml').getroot().find('.//w:body', ns)
    nodes = list(body)

    def text(node):
        return ''.join((item.text or '') for item in node.findall('.//w:t', ns))

    def is_bold(run):
        bold = run.find('./w:rPr/w:b', ns)
        if bold is None:
            return False
        value = bold.attrib.get(attr('val'))
        return value is None or value.lower() not in {'0', 'false', 'off', 'no'}

    index = next(i for i, node in enumerate(nodes) if node.tag.endswith('}p') and text(node) == '8. DADOS CADASTRAIS')
    paragraphs = nodes[index + 1:index + 4]
    if len(paragraphs) != 3 or not all(paragraph.tag.endswith('}p') for paragraph in paragraphs):
        raise SystemExit('O DOCX público não possui três parágrafos cadastrais reais.')
    if [text(paragraph) for paragraph in paragraphs] != EXPECTED:
        raise SystemExit(f'Conteúdo cadastral inesperado no DOCX: {[text(paragraph) for paragraph in paragraphs]}')
    if text(nodes[index + 4]) != '9. CRONOLOGIA':
        raise SystemExit('A cronologia não sucede imediatamente os três parágrafos cadastrais.')

    for number, paragraph in enumerate(paragraphs, 1):
        if paragraph.findall('.//w:br', ns) or paragraph.findall('.//w:tab', ns):
            raise SystemExit(f'Quebra manual ou tabulação no parágrafo {number}.')
        properties = paragraph.find('./w:pPr', ns)
        spacing = properties.find('./w:spacing', ns)
        alignment = properties.find('./w:jc', ns)
        if spacing.attrib.get(attr('line')) != '240' or spacing.attrib.get(attr('after')) != '160':
            raise SystemExit(f'Espaçamento inválido no parágrafo {number}.')
        if alignment.attrib.get(attr('val')) != 'left':
            raise SystemExit(f'Alinhamento inválido no parágrafo {number}.')

        runs = paragraph.findall('./w:r', ns)
        if len(runs) != 2 or not is_bold(runs[0]) or is_bold(runs[1]):
            raise SystemExit(f'Negrito/regular inválido no parágrafo {number}.')
        for run in runs:
            run_properties = run.find('./w:rPr', ns)
            fonts = run_properties.find('./w:rFonts', ns)
            size = run_properties.find('./w:sz', ns)
            if fonts.attrib.get(attr('ascii')) != 'Arial' or size.attrib.get(attr('val')) != '22':
                raise SystemExit(f'Fonte ou tamanho inválido no parágrafo {number}.')

    print('DOCX público validado: três parágrafos reais, Arial 11 pt, linha simples e 8 pt após.')


def validate_pdf() -> None:
    lines = [line.strip() for line in (OUT / 'pdf.txt').read_text(encoding='utf-8', errors='ignore').splitlines()]
    starts = [index for index, line in enumerate(lines) if line == '8. DADOS CADASTRAIS']
    ends = [index for index, line in enumerate(lines) if line == '9. CRONOLOGIA']
    if len(starts) != 1 or len(ends) != 1 or starts[0] >= ends[0]:
        raise SystemExit(f'Limites da seção cadastral inválidos no PDF: {starts}/{ends}')
    section = lines[starts[0] + 1:ends[0]]
    positions = []
    for value in EXPECTED:
        matches = [index for index, line in enumerate(section) if value in line]
        if len(matches) != 1:
            raise SystemExit(f'Campo não encontrado em linha própria no PDF: {value!r}; ocorrências={matches}')
        positions.append(matches[0])
    if not positions[0] < positions[1] < positions[2]:
        raise SystemExit(f'Ordem cadastral inválida no PDF: {positions}')
    print('PDF público validado: nome, CPF e dados bancários em linhas próprias e na ordem correta.')


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'docx':
        validate_docx()
    elif mode == 'pdf':
        validate_pdf()
    else:
        raise SystemExit('Modo esperado: docx ou pdf')
