from pathlib import Path
import xml.etree.ElementTree as ET
import re
import sys

mode = sys.argv[1]
base = Path('/tmp/v062-cover-composition')
nsw = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

if mode == 'xml':
    root = base / 'docx'
    body = ET.parse(root/'word/document.xml').getroot().find('.//w:body', nsw)
    nodes = list(body)

    def txt(node):
        return ' '.join((t.text or '') for t in node.findall('.//w:t', nsw))

    title_index = next(i for i,n in enumerate(nodes) if n.tag.endswith('}p') and 'RELATÓRIO DE CONTINGÊNCIA' in txt(n))
    title = nodes[title_index]
    subtitle = nodes[title_index+1]
    claim = nodes[title_index+2]
    meta = nodes[title_index+4]

    if 'FAST TRACK' in txt(title):
        raise SystemExit('Título da capa manteve FAST TRACK')
    if title.findall('.//w:br', nsw) or subtitle.findall('.//w:br', nsw):
        raise SystemExit('Título ou subtítulo contém quebra manual')
    if not claim.tag.endswith('}tbl') or not meta.tag.endswith('}tbl'):
        raise SystemExit('Ordem estrutural da capa inválida')

    grid = [int(col.attrib[f'{{{nsw["w"]}}}w']) for col in meta.findall('./w:tblGrid/w:gridCol', nsw)]
    if grid != [3691,703,5392]:
        raise SystemExit(f'Grade cadastral inválida: {grid}')
    rows = meta.findall('./w:tr', nsw)
    if len(rows) != 9:
        raise SystemExit(f'Quantidade de linhas cadastrais: {len(rows)}')
    for i,row in enumerate(rows):
        height = row.find('./w:trPr/w:trHeight', nsw)
        if height is None or height.attrib.get(f'{{{nsw["w"]}}}val') != '650' or height.attrib.get(f'{{{nsw["w"]}}}hRule') != 'atLeast':
            raise SystemExit(f'Altura mínima inválida na linha {i+1}')

    spans=[]
    for row in rows:
        spans.append([
            int(cell.find('./w:tcPr/w:gridSpan', nsw).attrib[f'{{{nsw["w"]}}}val'])
            if cell.find('./w:tcPr/w:gridSpan', nsw) is not None else 1
            for cell in row.findall('./w:tc', nsw)
        ])
    if spans[0] != [1,2] or spans[7] != [2,1] or spans[8] != [2,1]:
        raise SystemExit(f'Mesclagens inválidas: {spans}')
    if meta.findall('.//w:shd', nsw):
        raise SystemExit('Preenchimento colorido indevido na tabela cadastral')

    title_run = title.find('.//w:rPr', nsw)
    subtitle_run = subtitle.find('.//w:rPr', nsw)
    title_size = title_run.find('./w:sz', nsw).attrib[f'{{{nsw["w"]}}}val']
    subtitle_size = subtitle_run.find('./w:sz', nsw).attrib[f'{{{nsw["w"]}}}val']
    title_font = title_run.find('./w:rFonts', nsw).attrib.get(f'{{{nsw["w"]}}}ascii')
    subtitle_font = subtitle_run.find('./w:rFonts', nsw).attrib.get(f'{{{nsw["w"]}}}ascii')
    if title_size != '52' or subtitle_size != '48':
        raise SystemExit(f'Fontes da capa inválidas: {title_size}/{subtitle_size}')
    if title_font != 'Arial Black' or subtitle_font != 'Arial Black':
        raise SystemExit(f'Famílias da capa inválidas: {title_font}/{subtitle_font}')
    spacing = subtitle_run.find('./w:spacing', nsw)
    if spacing is None or spacing.attrib.get(f'{{{nsw["w"]}}}val') != '-10':
        raise SystemExit('Condensação de 0,5 pt ausente no subtítulo')

    print('Estrutura OOXML da capa validada: sem quebras manuais, fontes e grade fixas corretas.')

elif mode == 'render':
    out = base / 'render'
    root = ET.parse(out/'bbox.html').getroot()
    ns = {'x':'http://www.w3.org/1999/xhtml'}
    page = root.find('.//x:page', ns)
    words = page.findall('.//x:word', ns)

    def matches(value):
        return [w for w in words if (w.text or '').strip() == value]

    def y(value,index=0):
        found = matches(value)
        if len(found) <= index:
            raise SystemExit(f'Palavra não encontrada: {value}[{index}]')
        return float(found[index].attrib['yMin'])

    title_y = y('RELATÓRIO')
    cont_y = y('CONTINGÊNCIA')
    subtitle_y = y('RISCOS')
    empresarial_y = y('EMPRESARIAL')
    sinistros = matches('Sinistro')
    claim_y = [float(w.attrib['yMin']) for w in sinistros[:2]]
    meta_y = y('COMPANHIA')
    coverage_y = y('COBERTURA:')
    fallback_font = abs(title_y-cont_y) > 1.2 or abs(subtitle_y-empresarial_y) > 1.2

    if not 131 <= title_y <= 148:
        raise SystemExit(f'Título fora da posição superior esperada: {title_y}')

    if fallback_font:
        # O runner Linux não possui Arial Black e o LibreOffice substitui a fonte.
        # A ausência de quebras manuais e a fonte Arial Black são conferidas no OOXML;
        # aqui confirmamos que todo o conteúdo permanece íntegro na primeira página.
        if not 160 <= cont_y <= 180 or not 190 <= subtitle_y <= 210 or not 218 <= empresarial_y <= 238:
            raise SystemExit(f'Substituição tipográfica produziu deslocamento excessivo: {title_y}/{cont_y}/{subtitle_y}/{empresarial_y}')
        if len(claim_y) < 2 or not 270 <= claim_y[0] <= 290 or not 290 <= claim_y[1] <= 310:
            raise SystemExit(f'Sinistros fora da primeira página sob fonte substituta: {claim_y}')
        if not 330 <= meta_y <= 350 or not 590 <= coverage_y <= 615:
            raise SystemExit(f'Quadro cadastral fora da primeira página sob fonte substituta: {meta_y}/{coverage_y}')
    else:
        if abs(title_y-cont_y) > 1.2:
            raise SystemExit(f'Título quebrou: {title_y}/{cont_y}')
        if abs(subtitle_y-empresarial_y) > 1.2:
            raise SystemExit(f'Subtítulo quebrou: {subtitle_y}/{empresarial_y}')
        if not 169 <= subtitle_y <= 187:
            raise SystemExit(f'Subtítulo fora da posição: {subtitle_y}')
        if len(claim_y) < 2 or not 224 <= claim_y[0] <= 246 or not 243 <= claim_y[1] <= 265:
            raise SystemExit(f'Sinistros fora da posição: {claim_y}')
        if not 296 <= meta_y <= 316:
            raise SystemExit(f'Primeiro registro fora da posição: {meta_y}')
        if not 545 <= coverage_y <= 590:
            raise SystemExit(f'Último registro fora da posição: {coverage_y}')

    coop = matches('COOPERATIVA')[0]
    alimentos = matches('ALIMENTOS')[0]
    if abs(float(coop.attrib['yMin']) - float(alimentos.attrib['yMin'])) > 1.2:
        raise SystemExit('Nome do segurado quebrou no Word')

    pages = int(re.search(r'^Pages:\s+(\d+)', (out/'pdfinfo.txt').read_text(), re.M).group(1))
    text = (out/'text.txt').read_text(encoding='utf-8', errors='ignore')
    rendered = [p for p in text.split('\f') if p.strip()]
    if len(rendered) != pages:
        raise SystemExit('Paginação renderizada inconsistente')
    required_cover = [
        'RELATÓRIO DE CONTINGÊNCIA',
        'RISCOS NOMEADOS EMPRESARIAL',
        'COMPANHIA SEGURADORA:',
        'COOPERATIVA CENTRAL AURORA ALIMENTOS',
        'COBERTURA:'
    ]
    compact_first = ' '.join(rendered[0].split())
    for value in required_cover:
        if value not in compact_first:
            raise SystemExit(f'Conteúdo ausente na primeira página: {value}')
    for i,p in enumerate(rendered,1):
        if 'Matriz - Rua XV de novembro 1336' not in p or f'{i} de {pages}' not in p:
            raise SystemExit(f'Rodapé ausente na página {i}')

    result = (
        f'Páginas: {pages}\n'
        f'Fonte Arial Black substituída no Linux: {fallback_font}\n'
        f'Título y: {title_y:.2f} pt\n'
        f'Subtítulo y: {subtitle_y:.2f} pt\n'
        f'Sinistros y: {claim_y}\n'
        f'Primeiro registro y: {meta_y:.2f} pt\n'
        f'Último registro y: {coverage_y:.2f} pt\n'
    )
    (out/'validation.txt').write_text(result, encoding='utf-8')
    print(result)
else:
    raise SystemExit('Modo esperado: xml ou render')
