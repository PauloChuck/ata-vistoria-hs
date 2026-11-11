from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

OUT = Path('/tmp/v0628-validation')


def fail(message):
    raise SystemExit(message)


def validate_docx():
    root = OUT / 'docx'
    document = root / 'word/document.xml'
    if not document.exists():
        fail('word/document.xml não localizado')
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    tree=ET.parse(document)
    paragraphs=[]
    for p in tree.findall('.//w:p',ns):
        text=''.join((t.text or '') for t in p.findall('.//w:t',ns))
        paragraphs.append(text)
    full='\n'.join(paragraphs)
    required=[
        'No dia 03 de fevereiro de 2027, uma tempestade severa atingiu a propriedade, conforme relato conferido pelo regulador.',
        'A narrativa personalizada permaneceu íntegra após a alteração da data oficial.',
        'Em vistoria presencial realizada no dia 15 de dezembro de 2026, acompanhados do cooperado, foram conferidos os vestígios e os remanescentes.',
        'As constatações adicionais foram registradas neste segundo parágrafo.',
        'Em vistoria foram coletados os documentos abaixo relacionados',
        'Orçamento detalhado',
        'Composição dos reparos'
    ]
    missing=[value for value in required if value not in full]
    if missing:
        fail(f'Textos ausentes no Word: {missing}')
    if full.count('Em vistoria foram coletados os documentos abaixo relacionados') != 1:
        fail('A frase introdutória documental não aparece exatamente uma vez no Word.')
    if 'Documentos não apresentados até o momento.' in full:
        fail('O Word contém declaração de ausência apesar de haver documento relacionado.')
    for value in required[:4]:
        if value not in paragraphs:
            fail(f'A narrativa não foi preservada como parágrafo real no Word: {value}')
    xml=document.read_text(encoding='utf-8')
    if 'w:tab' in xml and any(value in full for value in required[:4]):
        # Tabs em outras seções são permitidas; os quatro parágrafos precisam apenas existir separadamente.
        pass
    print('DOCX validado: narrativas persistidas em parágrafos reais e frase documental única.')


def validate_pdf():
    text=(OUT/'pdf.txt').read_text(encoding='utf-8',errors='ignore')
    required=[
        '03 de fevereiro de 2027',
        'A narrativa personalizada permaneceu íntegra',
        '15 de dezembro de 2026',
        'As constatações adicionais foram registradas',
        'Em vistoria foram coletados os documentos abaixo relacionados',
        'Orçamento detalhado',
        'Composição dos reparos'
    ]
    missing=[value for value in required if value not in text]
    if missing:
        fail(f'Textos ausentes no PDF: {missing}')
    if text.count('Em vistoria foram coletados os documentos abaixo relacionados') != 1:
        fail('A frase introdutória documental não aparece exatamente uma vez no PDF.')
    if 'Documentos não apresentados até o momento.' in text:
        fail('O PDF contém declaração de ausência apesar de haver documento relacionado.')
    print('PDF validado: narrativas personalizadas e frase documental preservadas.')


if __name__ == '__main__':
    mode=sys.argv[1] if len(sys.argv)>1 else ''
    if mode=='docx': validate_docx()
    elif mode=='pdf': validate_pdf()
    else: fail('Modo esperado: docx ou pdf')
