from pathlib import Path
import subprocess


def cadastral_html(indent: str) -> str:
    return (
        f'{indent}<div class="doc-section">8. DADOS CADASTRAIS</div>\n'
        f'{indent}<div class="cadastral-data">\n'
        f'{indent}  <p class="cadastral-line"><strong>Nome completo:</strong> ${{esc(f.claimantName || \'\')}}</p>\n'
        f'{indent}  <p class="cadastral-line"><strong>CPF:</strong> ${{esc(f.claimantCpf || \'\')}}</p>\n'
        f'{indent}  <p class="cadastral-line"><strong>Dados Bancários:</strong> ${{esc(f.bankName || \'\')}} — AG: ${{esc(f.bankAgency || \'\')}} / CC: ${{esc(f.bankAccount || \'\')}}</p>\n'
        f'{indent}</div>'
    )


def patch_report() -> None:
    path = Path('fast_track/v06/direct-report.js')
    text = path.read_text(encoding='utf-8')
    marker = '<div class="doc-section">8. DADOS CADASTRAIS</div>'
    if text.count(marker) != 2:
        raise SystemExit(f'Marcadores cadastrais inesperados no relatório: {text.count(marker)}')

    # Bloco legado closingContent, mantido por compatibilidade.
    function_start = text.index('  function closingContent(state) {')
    function_end = text.index('\n  function createFlowPaginator()', function_start)
    segment = text[function_start:function_end]
    start = segment.index(marker)
    absolute_start = function_start + start
    line_start = text.rfind('\n', 0, absolute_start) + 1
    indent = text[line_start:absolute_start]
    next_marker = f'\n\n{indent}<div class="doc-section">9. CRONOLOGIA</div>'
    end = text.index(next_marker, absolute_start)
    old_block = text[line_start:end]
    for required in ('<br>', 'Nome completo:', 'CPF:', 'Dados Bancários:'):
        if required not in old_block:
            raise SystemExit(f'Bloco closingContent anterior não reconhecido: {required}')
    text = text[:line_start] + cadastral_html(indent) + text[end:]

    # Bloco efetivamente usado pelo paginador da pré-visualização e do PDF.
    old_inline = """      paginator.add(`<div class=\"doc-section\">8. DADOS CADASTRAIS</div><p class=\"doc-text doc-data\"><strong>Nome completo:</strong> ${esc(f.claimantName || '')}<br><strong>CPF:</strong> ${esc(f.claimantCpf || '')}<br><strong>Dados Bancários:</strong> ${esc(f.bankName || '')} — AG: ${esc(f.bankAgency || '')} / CC: ${esc(f.bankAccount || '')}</p>`);"""
    new_inline = """      paginator.add(`<div class=\"doc-section\">8. DADOS CADASTRAIS</div><div class=\"cadastral-data\"><p class=\"cadastral-line\"><strong>Nome completo:</strong> ${esc(f.claimantName || '')}</p><p class=\"cadastral-line\"><strong>CPF:</strong> ${esc(f.claimantCpf || '')}</p><p class=\"cadastral-line\"><strong>Dados Bancários:</strong> ${esc(f.bankName || '')} — AG: ${esc(f.bankAgency || '')} / CC: ${esc(f.bankAccount || '')}</p></div>`);"""
    if text.count(old_inline) != 1:
        raise SystemExit(f'Bloco paginado cadastral anterior não reconhecido: {text.count(old_inline)}')
    text = text.replace(old_inline, new_inline, 1)
    path.write_text(text, encoding='utf-8')


def patch_word() -> None:
    path = Path('fast_track/v06/direct-word.js')
    text = path.read_text(encoding='utf-8')
    start_marker = "    const closing=[heading('7. DECLARAÇÃO DE OUTROS SEGUROS')"
    if text.count(start_marker) != 1:
        raise SystemExit(f'Declaração closing inválida no Word: {text.count(start_marker)}')

    start = text.index(start_marker)
    end_marker = '\n    closing.push(new Table('
    end = text.index(end_marker, start)
    old_block = text[start:end]
    for required in ("run('\\nCPF: '", "run('\\nDados Bancários: '", "heading('9. CRONOLOGIA')"):
        if required not in old_block:
            raise SystemExit(f'Bloco Word anterior não reconhecido: {required}')

    replacement = """    const cadastralParagraph = (label,value) => new Paragraph({
      children:[
        run(label,{font:'Arial',size:22,bold:true}),
        run(value,{font:'Arial',size:22})
      ],
      alignment:AlignmentType.LEFT,
      spacing:{before:0,after:160,line:240},
      keepLines:true
    });
    const closing=[
      heading('7. DECLARAÇÃO DE OUTROS SEGUROS'),
      para(other),
      heading('8. DADOS CADASTRAIS'),
      cadastralParagraph('Nome completo: ',f.claimantName || ''),
      cadastralParagraph('CPF: ',f.claimantCpf || ''),
      cadastralParagraph('Dados Bancários: ',`${f.bankName || ''} — AG: ${f.bankAgency || ''} / CC: ${f.bankAccount || ''}`),
      heading('9. CRONOLOGIA')
    ];"""
    path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')


def patch_css() -> None:
    path = Path('fast_track/v06/direct.css')
    text = path.read_text(encoding='utf-8')
    needle = '.doc-data{line-height:1}\n'
    if text.count(needle) != 1 or '.cadastral-line{' in text:
        raise SystemExit('Ponto de inserção do CSS cadastral inválido.')
    addition = (
        '.cadastral-data{font-family:Arial,sans-serif;font-size:11pt}\n'
        '.cadastral-line{margin:0 0 8pt;text-align:left;line-height:1;white-space:normal;word-break:normal;overflow-wrap:break-word;orphans:2;widows:2;break-inside:avoid;page-break-inside:avoid}\n'
    )
    path.write_text(text.replace(needle, needle + addition, 1), encoding='utf-8')


def bump_cache() -> None:
    for file_name in ('fast_track/v062.html', 'fast_track/v06.html'):
        path = Path(file_name)
        text = path.read_text(encoding='utf-8')
        count = text.count('?v=0626')
        if count < 3:
            raise SystemExit(f'Cache-buster 0626 não encontrado em {file_name}: {count}')
        path.write_text(text.replace('?v=0626', '?v=0627'), encoding='utf-8')


def validate_changed_files() -> None:
    allowed = {
        'fast_track/v06/direct-report.js',
        'fast_track/v06/direct-word.js',
        'fast_track/v06/direct.css',
        'fast_track/v062.html',
        'fast_track/v06.html',
    }
    changed = set(subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines())
    if changed != allowed:
        raise SystemExit(f'Arquivos produtivos inesperados: {sorted(changed)}')


if __name__ == '__main__':
    patch_report()
    patch_word()
    patch_css()
    bump_cache()
    validate_changed_files()
