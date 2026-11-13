from pathlib import Path

p = Path('fast_track/v06/cooperators-0632.js')
s = p.read_text(encoding='utf-8')

def one(old, new, label):
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperada 1 ocorrência, encontradas {count}')
    return s.replace(old, new, 1)

anchor = """  function displayMoney(value) {
    const source = String(value == null ? '' : value).trim();
    if (!source) return 'Não informado';
    if (/R\\$/i.test(source)) return source;
    const parsed = parseLocaleNumber(source);
    if (parsed.value == null || parsed.ambiguous) return source;
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parsed.value);
  }

"""
addition = anchor + """  function valueWithUnit(value, unit) {
    const source = String(value == null ? '' : value).trim();
    const suffix = String(unit == null ? '' : unit).trim();
    if (!source) return 'Não informado';
    if (!suffix) return source;
    const normalizedSource = normalizeText(source);
    const normalizedSuffix = normalizeText(suffix);
    if (normalizedSuffix && (normalizedSource === normalizedSuffix || normalizedSource.endsWith(` ${normalizedSuffix}`))) return source;
    return `${source} ${suffix}`;
  }

"""
s = one(anchor, addition, 'valueWithUnit')

old = """    const area = [c.area,c.areaUnit].filter(Boolean).join(' ') || 'Não informado';
    const capacity = [c.capacity,c.capacityUnit].filter(Boolean).join(' ') || 'Não informado';
"""
new = """    const area = valueWithUnit(c.area,c.areaUnit);
    const capacity = valueWithUnit(c.capacity,c.capacityUnit);
"""
s = one(old, new, 'top-level values')

old = """      area:[item.area,item.areaUnit].filter(Boolean).join(' ') || 'Não informado',
      capacity:[item.capacity,item.capacityUnit].filter(Boolean).join(' ') || 'Não informado',
"""
new = """      area:valueWithUnit(item.area,item.areaUnit),
      capacity:valueWithUnit(item.capacity,item.capacityUnit),
"""
s = one(old, new, 'installation values')

p.write_text(s, encoding='utf-8')
