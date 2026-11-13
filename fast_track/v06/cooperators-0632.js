(() => {
  'use strict';

  const DB_NAME = 'HSFastTrackCooperators';
  const STORE = 'base';
  const KEY = 'current';
  const FALLBACK_KEY = 'hsFastTrackCooperatorBaseV1';
  const MAX_RESULTS = 100;

  const BASE_DEFINITIONS = {
    aurora: {
      label: 'Aurora — Aves de Corte',
      cooperative: 'Aurora',
      activity: 'Aves de Corte',
      aliases: {
        name: ['nome', 'nome produtor', 'produtor', 'cooperado', 'integrado', 'nome integrado'],
        installationCode: ['codigo aviario', 'código aviário', 'cod aviario', 'aviario', 'aviário', 'numero aviario', 'número aviário'],
        capacity: ['capacidade alojamento', 'capacidade de alojamento', 'alojamento', 'capacidade aves', 'quantidade aves'],
        vrBuildings: ['vr benfeitorias', 'valor em risco benfeitorias', 'valor benfeitorias', 'vr estrutura', 'valor estrutura'],
        vrAnimals: ['vr animais', 'valor em risco animais', 'valor animais', 'vr aves', 'valor aves']
      }
    },
    lar: {
      label: 'Lar — Aves de Corte',
      cooperative: 'Lar',
      activity: 'Aves de Corte',
      aliases: {
        name: ['nome', 'nome produtor', 'produtor', 'cooperado', 'integrado', 'nome integrado'],
        installationCode: ['codigo aviario', 'código aviário', 'cod aviario', 'aviario', 'aviário', 'numero aviario', 'número aviário'],
        capacity: ['capacidade alojamento', 'capacidade de alojamento', 'alojamento', 'capacidade aves', 'quantidade aves'],
        vrBuildings: ['vr benfeitorias', 'valor em risco benfeitorias', 'valor benfeitorias', 'vr estrutura', 'valor estrutura'],
        vrAnimals: ['vr animais', 'valor em risco animais', 'valor animais', 'vr aves', 'valor aves']
      }
    },
    suinos: {
      label: 'Aurora — Suínos',
      cooperative: 'Aurora',
      activity: 'Suínos',
      aliases: {
        name: ['nome', 'nome produtor', 'produtor', 'cooperado', 'integrado', 'nome integrado'],
        installationCode: ['codigo instalacao', 'código instalação', 'cod pocilga', 'pocilga', 'instalacao', 'instalação', 'unidade produtiva'],
        capacity: ['capacidade alojamento', 'capacidade de alojamento', 'alojamento', 'capacidade suinos', 'capacidade suínos', 'quantidade suinos', 'quantidade suínos'],
        vrBuildings: ['vr benfeitorias', 'valor em risco benfeitorias', 'valor benfeitorias', 'vr estrutura', 'valor estrutura'],
        vrAnimals: ['vr animais', 'valor em risco animais', 'valor animais', 'vr suinos', 'vr suínos', 'valor suinos', 'valor suínos']
      }
    },
    jagua: {
      label: 'Jaguafrangos',
      cooperative: 'Jaguafrangos',
      activity: 'Aves de Corte',
      aliases: {
        name: ['nome', 'nome produtor', 'produtor', 'integrado', 'nome integrado'],
        installationCode: ['codigo aviario', 'código aviário', 'cod aviario', 'aviario', 'aviário', 'galpao', 'galpão'],
        capacity: ['capacidade alojamento', 'alojamento', 'capacidade aves', 'quantidade aves'],
        vrBuildings: ['vr benfeitorias', 'valor benfeitorias', 'valor estrutura', 'vr estrutura'],
        vrAnimals: ['vr animais', 'valor animais', 'vr aves', 'valor aves']
      }
    },
    matrizes: {
      label: 'Aurora — Aves Matrizes',
      cooperative: 'Aurora',
      activity: 'Aves Matrizes',
      aliases: {
        name: ['nome', 'nome produtor', 'produtor', 'cooperado', 'integrado', 'nome integrado'],
        installationCode: ['codigo aviario', 'código aviário', 'cod aviario', 'aviario', 'aviário', 'nucleo', 'núcleo', 'galpao', 'galpão'],
        capacity: ['capacidade alojamento', 'alojamento', 'capacidade matrizes', 'quantidade matrizes', 'quantidade aves'],
        vrBuildings: ['vr benfeitorias', 'valor benfeitorias', 'valor estrutura', 'vr estrutura'],
        vrAnimals: ['vr animais', 'valor animais', 'vr matrizes', 'valor matrizes']
      }
    },
    larPostura: {
      label: 'Lar — Postura e Recria',
      cooperative: 'Lar',
      activity: 'Postura e Recria',
      aliases: {
        name: ['nome', 'nome produtor', 'produtor', 'cooperado', 'integrado', 'nome integrado'],
        installationCode: ['codigo aviario', 'código aviário', 'cod aviario', 'aviario', 'aviário', 'galpao', 'galpão', 'nucleo', 'núcleo'],
        capacity: ['capacidade alojamento', 'alojamento', 'capacidade aves', 'quantidade aves', 'plantel'],
        vrBuildings: ['vr benfeitorias', 'valor benfeitorias', 'valor estrutura', 'vr estrutura'],
        vrAnimals: ['vr animais', 'valor animais', 'vr aves', 'valor aves', 'valor plantel']
      }
    }
  };

  const COMMON_ALIASES = {
    name: ['nome', 'nome completo', 'razao social', 'razão social', 'produtor', 'cooperado', 'integrado'],
    municipality: ['municipio', 'município', 'cidade', 'municipio uf', 'município uf'],
    state: ['uf', 'estado'],
    local: ['local', 'localidade', 'linha', 'endereco', 'endereço', 'propriedade', 'identificacao local', 'identificação local', 'local de risco'],
    latitude: ['latitude', 'lat', 'coord latitude', 'coordenada latitude'],
    longitude: ['longitude', 'long', 'lng', 'lon', 'coord longitude', 'coordenada longitude'],
    coordinates: ['coordenadas', 'coordenada', 'coord', 'latitude longitude', 'lat long', 'lat lng'],
    installationCode: ['codigo', 'código', 'codigo instalacao', 'código instalação', 'instalacao', 'instalação'],
    installationType: ['tipo instalacao', 'tipo instalação', 'tipo', 'estrutura'],
    area: ['area', 'área', 'metragem', 'm2', 'm²', 'area m2', 'área m²', 'dimensoes', 'dimensões'],
    capacity: ['capacidade', 'alojamento', 'capacidade de alojamento', 'quantidade animais', 'quantidade de animais', 'quantidade aves', 'quantidade suinos', 'quantidade suínos'],
    vrBuildings: ['vr benfeitorias', 'valor benfeitorias', 'valor em risco benfeitorias', 'valor estrutura', 'vr estrutura'],
    vrAnimals: ['vr animais', 'valor animais', 'valor em risco animais', 'valor do plantel', 'vr plantel'],
    category: ['categoria', 'categoria registro', 'tipo registro', 'origem', 'movimento', 'tipo movimento', 'operacao', 'operação'],
    reference: ['referencia', 'referência', 'referencia planilha', 'referência planilha', 'planilha', 'arquivo origem', 'mes referencia', 'mês referência', 'competencia', 'competência', 'endosso'],
    situation: ['situacao', 'situação', 'status', 'observacao', 'observação', 'pendencia', 'pendência']
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const attr = (value) => esc(value).replace(/`/g, '&#96;');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const hasOwn = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
  const notInformed = (value) => String(value == null ? '' : value).trim() || 'Não informado';

  let controller = null;
  let loadedBase = null;
  let searchResults = [];
  let initialized = false;
  let dbPromise = null;

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .trim()
      .replace(/\s+/g,' ');
  }

  function normalizeKey(value) {
    return normalizeText(value).replace(/\s+/g,' ');
  }

  function stableId(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash,16777619);
    }
    return `coop_${(hash >>> 0).toString(16).padStart(8,'0')}`;
  }

  function displayDateTime(value) {
    if (!value) return 'Não informado';
    try { return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); }
    catch { return String(value); }
  }

  function displayMoney(value) {
    const source = String(value == null ? '' : value).trim();
    if (!source) return 'Não informado';
    if (/R\$/i.test(source)) return source;
    const parsed = parseLocaleNumber(source);
    if (parsed.value == null || parsed.ambiguous) return source;
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parsed.value);
  }

  function parseLocaleNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return {value,ambiguous:false,raw:String(value)};
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return {value:null,ambiguous:false,raw};
    const cleaned = raw.replace(/[^0-9,.-]/g,'');
    if (!cleaned || !/[0-9]/.test(cleaned)) return {value:null,ambiguous:true,raw};
    const comma = cleaned.lastIndexOf(',');
    const dot = cleaned.lastIndexOf('.');
    let normalized = cleaned;
    let ambiguous = false;
    if (comma >= 0 && dot >= 0) {
      if (comma > dot) normalized = cleaned.replace(/\./g,'').replace(',','.');
      else normalized = cleaned.replace(/,/g,'');
    } else if (comma >= 0) {
      const decimals = cleaned.length - comma - 1;
      if (decimals === 1 || decimals === 2) normalized = cleaned.replace(/\./g,'').replace(',','.');
      else if (decimals === 3 && cleaned.slice(0,comma).replace(/-/g,'').length <= 3) { normalized = cleaned.replace(/,/g,''); ambiguous = true; }
      else normalized = cleaned.replace(/,/g,'');
    } else if (dot >= 0) {
      const decimals = cleaned.length - dot - 1;
      if (decimals === 3 && cleaned.slice(0,dot).replace(/-/g,'').length <= 3) { normalized = cleaned.replace(/\./g,''); ambiguous = true; }
    }
    const number = Number(normalized);
    return {value:Number.isFinite(number) ? number : null,ambiguous,raw};
  }

  function parseCoordinateNumber(value, kind) {
    if (typeof value === 'number') {
      const valid = kind === 'lat' ? value >= -90 && value <= 90 : value >= -180 && value <= 180;
      return {value:valid ? value : null,raw:String(value),valid};
    }
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return {value:null,raw,valid:false};
    const decimal = Number(raw.replace(',','.').replace(/[^0-9+\-.]/g,''));
    if (Number.isFinite(decimal) && !/[°'"NSEW]/i.test(raw)) {
      const valid = kind === 'lat' ? decimal >= -90 && decimal <= 90 : decimal >= -180 && decimal <= 180;
      return {value:valid ? decimal : null,raw,valid};
    }
    const match = raw.match(/(\d{1,3})(?:[°\s]+)(\d{1,2})?(?:['’\s]+)?(\d{1,2}(?:[.,]\d+)?)?(?:["”\s]+)?([NSEW])/i);
    if (!match) return {value:null,raw,valid:false};
    const degrees = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const seconds = Number(String(match[3] || 0).replace(',','.'));
    let result = degrees + minutes / 60 + seconds / 3600;
    if (/[SW]/i.test(match[4])) result *= -1;
    const valid = kind === 'lat' ? result >= -90 && result <= 90 : result >= -180 && result <= 180;
    return {value:valid ? result : null,raw,valid};
  }

  function parseCombinedCoordinates(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return {latitude:'',longitude:'',valid:false,raw};
    const dms = [...raw.matchAll(/(\d{1,3})(?:[°\s]+)(\d{1,2})?(?:['’\s]+)?(\d{1,2}(?:[.,]\d+)?)?(?:["”\s]+)?([NSEW])/gi)];
    if (dms.length >= 2) {
      const latitude = parseCoordinateNumber(dms[0][0],'lat');
      const longitude = parseCoordinateNumber(dms[1][0],'lng');
      return {latitude:latitude.raw,longitude:longitude.raw,valid:latitude.valid && longitude.valid,raw};
    }
    const decimals = raw.match(/[+-]?\d{1,3}(?:[.,]\d+)/g) || [];
    if (decimals.length >= 2) {
      const latitude = parseCoordinateNumber(decimals[0],'lat');
      const longitude = parseCoordinateNumber(decimals[1],'lng');
      return {latitude:latitude.raw,longitude:longitude.raw,valid:latitude.valid && longitude.valid,raw};
    }
    return {latitude:'',longitude:'',valid:false,raw};
  }

  class LiteralParser {
    constructor(source,index=0) { this.source=source; this.index=index; }
    error(message) { throw new Error(`${message} (posição ${this.index})`); }
    peek(offset=0) { return this.source[this.index + offset]; }
    skip() {
      while (this.index < this.source.length) {
        const char = this.peek();
        if (/\s/.test(char)) { this.index += 1; continue; }
        if (char === '/' && this.peek(1) === '/') {
          this.index += 2;
          while (this.index < this.source.length && !/[\r\n]/.test(this.peek())) this.index += 1;
          continue;
        }
        if (char === '/' && this.peek(1) === '*') {
          const end = this.source.indexOf('*/',this.index + 2);
          if (end < 0) this.error('Comentário não finalizado');
          this.index = end + 2;
          continue;
        }
        break;
      }
    }
    parse() { this.skip(); return this.parseValue(); }
    parseValue() {
      this.skip();
      const char = this.peek();
      if (char === '{') return this.parseObject();
      if (char === '[') return this.parseArray();
      if (char === '"' || char === "'") return this.parseString(char);
      if (char === '`') return this.parseTemplate();
      if (char === '-' || char === '+' || /[0-9]/.test(char)) return this.parseNumber();
      if (/[A-Za-z_$]/.test(char || '')) return this.parseIdentifierValue();
      this.error(`Valor não suportado: ${char || 'fim do arquivo'}`);
    }
    parseObject() {
      const object = {};
      this.index += 1;
      this.skip();
      if (this.peek() === '}') { this.index += 1; return object; }
      while (this.index < this.source.length) {
        this.skip();
        if (this.peek() === '.' && this.source.slice(this.index,this.index+3) === '...') this.error('Operador spread não é aceito');
        let key;
        const char = this.peek();
        if (char === '"' || char === "'") key = this.parseString(char);
        else if (char === '`') key = this.parseTemplate();
        else if (/[A-Za-z_$]/.test(char || '')) key = this.parseIdentifier();
        else if (/[0-9+-]/.test(char || '')) key = String(this.parseNumber());
        else this.error('Chave de objeto inválida');
        this.skip();
        if (this.peek() !== ':') this.error('Era esperado dois-pontos após a chave');
        this.index += 1;
        object[key] = this.parseValue();
        this.skip();
        if (this.peek() === ',') {
          this.index += 1;
          this.skip();
          if (this.peek() === '}') { this.index += 1; return object; }
          continue;
        }
        if (this.peek() === '}') { this.index += 1; return object; }
        this.error('Era esperada vírgula ou fechamento do objeto');
      }
      this.error('Objeto não finalizado');
    }
    parseArray() {
      const array = [];
      this.index += 1;
      this.skip();
      if (this.peek() === ']') { this.index += 1; return array; }
      while (this.index < this.source.length) {
        array.push(this.parseValue());
        this.skip();
        if (this.peek() === ',') {
          this.index += 1;
          this.skip();
          if (this.peek() === ']') { this.index += 1; return array; }
          continue;
        }
        if (this.peek() === ']') { this.index += 1; return array; }
        this.error('Era esperada vírgula ou fechamento do array');
      }
      this.error('Array não finalizado');
    }
    parseString(quote) {
      this.index += 1;
      let result = '';
      while (this.index < this.source.length) {
        const char = this.peek();
        this.index += 1;
        if (char === quote) return result;
        if (char !== '\\') { result += char; continue; }
        const escaped = this.peek();
        this.index += 1;
        const simple = {n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
        if (hasOwn(simple,escaped)) { result += simple[escaped]; continue; }
        if (escaped === 'x') {
          const hex = this.source.slice(this.index,this.index+2);
          if (!/^[0-9a-f]{2}$/i.test(hex)) this.error('Escape hexadecimal inválido');
          result += String.fromCharCode(parseInt(hex,16)); this.index += 2; continue;
        }
        if (escaped === 'u') {
          if (this.peek() === '{') {
            const end = this.source.indexOf('}',this.index+1);
            if (end < 0) this.error('Escape Unicode inválido');
            const hex = this.source.slice(this.index+1,end);
            result += String.fromCodePoint(parseInt(hex,16)); this.index = end + 1; continue;
          }
          const hex = this.source.slice(this.index,this.index+4);
          if (!/^[0-9a-f]{4}$/i.test(hex)) this.error('Escape Unicode inválido');
          result += String.fromCharCode(parseInt(hex,16)); this.index += 4; continue;
        }
        if (escaped === '\n' || escaped === '\r') continue;
        result += escaped;
      }
      this.error('Texto não finalizado');
    }
    parseTemplate() {
      this.index += 1;
      let result = '';
      while (this.index < this.source.length) {
        const char = this.peek();
        this.index += 1;
        if (char === '`') return result;
        if (char === '$' && this.peek() === '{') this.error('Interpolação em template não é aceita');
        if (char === '\\') {
          const escaped = this.peek(); this.index += 1;
          result += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
        } else result += char;
      }
      this.error('Template não finalizado');
    }
    parseNumber() {
      const rest = this.source.slice(this.index);
      const match = rest.match(/^[+-]?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
      if (!match) this.error('Número inválido');
      this.index += match[0].length;
      const value = Number(match[0]);
      if (!Number.isFinite(value)) this.error('Número não finito');
      return value;
    }
    parseIdentifier() {
      const match = this.source.slice(this.index).match(/^[A-Za-z_$][\w$]*/);
      if (!match) this.error('Identificador inválido');
      this.index += match[0].length;
      return match[0];
    }
    parseIdentifierValue() {
      const identifier = this.parseIdentifier();
      if (identifier === 'true') return true;
      if (identifier === 'false') return false;
      if (identifier === 'null' || identifier === 'undefined') return null;
      this.error(`Referência externa não aceita no objeto DATA: ${identifier}`);
    }
  }

  function locateDataSource(html) {
    const documentNode = new DOMParser().parseFromString(String(html || ''),'text/html');
    const scripts = Array.from(documentNode.querySelectorAll('script')).map((node) => node.textContent || '');
    if (!scripts.length) throw new Error('O HTML não contém blocos de script para localizar a estrutura DATA.');
    for (const source of scripts) {
      const patterns = [/(?:const|let|var)\s+DATA\s*=/g,/window\s*\.\s*DATA\s*=/g,/(?:^|[;\n])\s*DATA\s*=/g];
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(source))) {
          let index = pattern.lastIndex;
          while (/\s/.test(source[index] || '')) index += 1;
          if (source.slice(index,index+13).startsWith('Object.freeze')) {
            index = source.indexOf('(',index);
            if (index >= 0) index += 1;
            while (/\s/.test(source[index] || '')) index += 1;
          }
          if (source[index] !== '{') continue;
          return {source,index};
        }
      }
    }
    throw new Error('Não foi encontrada uma atribuição direta para DATA no HTML.');
  }

  function parseDataFromHtml(html) {
    const located = locateDataSource(html);
    const parser = new LiteralParser(located.source,located.index);
    const data = parser.parse();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('A estrutura DATA não é um objeto válido.');
    return data;
  }

  function schemaFor(baseKey) {
    const definition = BASE_DEFINITIONS[baseKey] || {};
    const result = {};
    for (const key of Object.keys(COMMON_ALIASES)) {
      result[key] = [...(definition.aliases?.[key] || []),...(COMMON_ALIASES[key] || [])];
    }
    return result;
  }

  function primitiveEntries(record) {
    return Object.entries(record || {}).filter(([,value]) => value == null || ['string','number','boolean'].includes(typeof value));
  }

  function keyMap(record) {
    const map = new Map();
    for (const key of Object.keys(record || {})) {
      const normalized = normalizeKey(key);
      if (!map.has(normalized)) map.set(normalized,[]);
      map.get(normalized).push(key);
    }
    return map;
  }

  function fieldByAliases(record,aliases,{predicate=null}={}) {
    const map = keyMap(record);
    const exact = [];
    for (const alias of aliases || []) {
      const keys = map.get(normalizeKey(alias)) || [];
      for (const key of keys) exact.push(key);
    }
    const uniqueExact = [...new Set(exact)].filter((key) => record[key] != null && String(record[key]).trim() !== '');
    if (uniqueExact.length === 1) return {key:uniqueExact[0],value:record[uniqueExact[0]],ambiguous:false};
    if (uniqueExact.length > 1) {
      const values = [...new Set(uniqueExact.map((key) => String(record[key]).trim()))];
      if (values.length === 1) return {key:uniqueExact[0],value:record[uniqueExact[0]],ambiguous:false};
      return {key:null,value:'',ambiguous:true,candidates:uniqueExact};
    }
    if (!predicate) return {key:null,value:'',ambiguous:false};
    const candidates = Object.keys(record || {}).filter((key) => predicate(normalizeKey(key),record[key]) && record[key] != null && String(record[key]).trim() !== '');
    if (candidates.length === 1) return {key:candidates[0],value:record[candidates[0]],ambiguous:false};
    if (candidates.length > 1) return {key:null,value:'',ambiguous:true,candidates};
    return {key:null,value:'',ambiguous:false};
  }

  function findMappedField(record,schema,name) {
    const predicates = {
      name:(key) => /(^| )(nome|produtor|cooperado|integrado)( |$)/.test(key) && !/municip|cidade/.test(key),
      municipality:(key) => /municip|cidade/.test(key),
      state:(key) => key === 'uf' || key === 'estado',
      local:(key) => /localidade|endereco|linha|propriedade|local de risco/.test(key),
      latitude:(key) => /latitude|(^| )lat( |$)/.test(key),
      longitude:(key) => /longitude|(^| )(long|lng|lon)( |$)/.test(key),
      coordinates:(key) => /coordenad|(^| )coord( |$)/.test(key),
      installationCode:(key) => /(codigo|numero|cod).*(aviario|instal|galpao|pocilga|nucleo)|^(aviario|instalacao|galpao|pocilga|nucleo)$/.test(key),
      installationType:(key) => /tipo.*(instal|estrutura)|classificacao/.test(key),
      area:(key) => /(^| )(area|metragem|dimens)( |$)|m2/.test(key),
      capacity:(key) => /(capacidade|alojamento|quantidade|plantel).*(aves|animais|suinos|matrizes)?/.test(key) && !/(valor|vr|risco)/.test(key),
      vrBuildings:(key) => /(vr|valor).*(benfeitor|estrutura)|benfeitor.*(vr|valor)/.test(key),
      vrAnimals:(key) => /(vr|valor).*(animais|aves|suinos|matrizes|plantel)|(?:animais|aves|suinos|matrizes|plantel).*(vr|valor)/.test(key),
      category:(key) => /categoria|tipo registro|origem|movimento|operacao/.test(key),
      reference:(key) => /referencia|planilha|competencia|mes referencia|arquivo origem|endosso/.test(key),
      situation:(key) => /situacao|status|observacao|pendencia/.test(key)
    };
    return fieldByAliases(record,schema[name] || [],{predicate:predicates[name]});
  }

  function looksLikeRecord(value,baseKey) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const schema = schemaFor(baseKey);
    const mappedName = findMappedField(value,schema,'name');
    if (mappedName.value) return true;
    const primitives = primitiveEntries(value);
    return primitives.length >= 3 && primitives.some(([key]) => /produtor|cooperado|integrado|nome/i.test(key));
  }

  function collectRecords(value,baseKey,path=[],out=[]) {
    if (Array.isArray(value)) {
      value.forEach((item,index) => collectRecords(item,baseKey,[...path,String(index)],out));
      return out;
    }
    if (!value || typeof value !== 'object') return out;
    if (looksLikeRecord(value,baseKey)) {
      out.push({raw:value,path});
      return out;
    }
    for (const [key,nested] of Object.entries(value)) collectRecords(nested,baseKey,[...path,key],out);
    return out;
  }

  function detectCategory(explicit,path,raw) {
    const combined = normalizeText([explicit,...path,...Object.values(raw || {}).filter((value) => typeof value === 'string')].join(' '));
    const categories = [
      ['troca de titularidade',/troca.*titular|titularidade/],
      ['exclusão',/exclus/],
      ['inclusão',/inclus/],
      ['alteração',/alter/],
      ['renovação',/renov/],
      ['base inicial',/base inicial|inicial/],
      ['endosso',/endosso/]
    ];
    for (const [label,pattern] of categories) if (pattern.test(combined)) return label;
    return String(explicit || path.filter((part) => !/^\d+$/.test(part)).join(' › ') || 'Não informado');
  }

  function extractNestedInstallations(raw,baseKey,schema,warnings) {
    const entries = Object.entries(raw || {}).filter(([key,value]) => Array.isArray(value) && /(instal|aviario|galpao|pocilga|nucleo|estrutura)/.test(normalizeKey(key)));
    const result = [];
    for (const [containerKey,items] of entries) {
      for (const [index,item] of items.entries()) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const code = findMappedField(item,schema,'installationCode');
        const type = findMappedField(item,schema,'installationType');
        const area = findMappedField(item,schema,'area');
        const capacity = findMappedField(item,schema,'capacity');
        if ([code,type,area,capacity].some((field) => field.ambiguous)) warnings.push(`Há campos ambíguos na instalação ${index + 1} de “${containerKey}”.`);
        result.push({
          id:stableId(`${containerKey}:${index}:${JSON.stringify(item)}`),
          involved:false,
          code:String(code.value || index + 1),
          type:String(type.value || containerKey),
          area:String(area.value || ''),
          areaUnit:inferAreaUnit(area.value,area.key),
          capacity:String(capacity.value || ''),
          capacityUnit:inferCapacityUnit(capacity.value,capacity.key,baseKey),
          capacityConcept:inferCapacityConcept(capacity.key,baseKey),
          raw:clone(item)
        });
      }
    }
    return result;
  }

  function inferAreaUnit(value,key) {
    const text = normalizeText(`${key || ''} ${value || ''}`);
    if (/hectare|(^| )ha( |$)/.test(text)) return 'ha';
    if (/m2|m²|metro quadrado/.test(String(`${key || ''} ${value || ''}`).toLowerCase())) return 'm²';
    if (/metro/.test(text)) return 'm';
    return '';
  }

  function inferCapacityUnit(value,key,baseKey) {
    const text = normalizeText(`${key || ''} ${value || ''}`);
    if (/suino/.test(text) || baseKey === 'suinos') return 'suínos';
    if (/matriz/.test(text) || baseKey === 'matrizes') return 'matrizes';
    if (/ave|frango|plantel/.test(text) || ['aurora','lar','jagua','larPostura'].includes(baseKey)) return 'aves';
    return 'animais';
  }

  function inferCapacityConcept(key,baseKey) {
    const text = normalizeText(key || '');
    if (/aloj|capacidade/.test(text)) return 'Capacidade de alojamento';
    if (/quantidade|plantel/.test(text)) return 'Quantidade de animais';
    return baseKey === 'suinos' ? 'Capacidade/quantidade de suínos' : 'Capacidade/quantidade informada';
  }

  function mapRecord(baseKey,item,index) {
    const definition = BASE_DEFINITIONS[baseKey];
    const schema = schemaFor(baseKey);
    const raw = item.raw;
    const warnings = [];
    const mapped = {};
    for (const field of Object.keys(COMMON_ALIASES)) mapped[field] = findMappedField(raw,schema,field);
    for (const [name,field] of Object.entries(mapped)) {
      if (field.ambiguous) warnings.push(`Campo “${name}” ambíguo: ${field.candidates.join(', ')}.`);
    }
    const combined = mapped.coordinates.value ? parseCombinedCoordinates(mapped.coordinates.value) : null;
    const latitude = String(mapped.latitude.value || combined?.latitude || '');
    const longitude = String(mapped.longitude.value || combined?.longitude || '');
    if ((latitude || longitude) && !(parseCoordinateNumber(latitude,'lat').valid && parseCoordinateNumber(longitude,'lng').valid)) {
      warnings.push('Coordenadas incompletas ou incompatíveis; confira o conteúdo original.');
    }
    for (const [label,field] of [['Área/metragem',mapped.area],['Capacidade/quantidade',mapped.capacity],['VR de benfeitorias',mapped.vrBuildings],['VR de animais',mapped.vrAnimals]]) {
      if (field.value !== '' && field.value != null) {
        const parsed = parseLocaleNumber(field.value);
        if (parsed.ambiguous) warnings.push(`${label} possui representação numérica ambígua: “${field.value}”.`);
      }
    }
    if (Object.values(raw).some((value) => typeof value === 'string' && /verificar\s+endosso/i.test(value))) warnings.push('VERIFICAR ENDOSSO: a base não informa o conteúdo necessário para conclusão automática.');
    const category = detectCategory(mapped.category.value,item.path,raw);
    let installations = extractNestedInstallations(raw,baseKey,schema,warnings);
    if (!installations.length && (mapped.installationCode.value || mapped.installationType.value || mapped.area.value || mapped.capacity.value)) {
      installations = [{
        id:stableId(`${baseKey}:${index}:installation`),
        involved:true,
        code:String(mapped.installationCode.value || ''),
        type:String(mapped.installationType.value || ''),
        area:String(mapped.area.value || ''),
        areaUnit:inferAreaUnit(mapped.area.value,mapped.area.key),
        capacity:String(mapped.capacity.value || ''),
        capacityUnit:inferCapacityUnit(mapped.capacity.value,mapped.capacity.key,baseKey),
        capacityConcept:inferCapacityConcept(mapped.capacity.key,baseKey),
        raw:null
      }];
    }
    if (installations.length > 1) installations.forEach((installation) => { installation.involved = false; });
    const record = {
      id:stableId(`${baseKey}:${item.path.join('/')}:${index}:${JSON.stringify(raw)}`),
      baseKey,
      baseLabel:definition.label,
      cooperative:definition.cooperative,
      activity:definition.activity,
      path:item.path,
      recordIndex:index,
      name:String(mapped.name.value || ''),
      municipality:String(mapped.municipality.value || ''),
      state:String(mapped.state.value || ''),
      localIdentification:String(mapped.local.value || ''),
      latitude,
      longitude,
      installationCode:String(mapped.installationCode.value || ''),
      area:String(mapped.area.value || ''),
      areaUnit:inferAreaUnit(mapped.area.value,mapped.area.key),
      capacity:String(mapped.capacity.value || ''),
      capacityUnit:inferCapacityUnit(mapped.capacity.value,mapped.capacity.key,baseKey),
      capacityConcept:inferCapacityConcept(mapped.capacity.key,baseKey),
      vrBuildings:String(mapped.vrBuildings.value || ''),
      vrAnimals:String(mapped.vrAnimals.value || ''),
      category,
      reference:String(mapped.reference.value || item.path.filter((part) => !/^\d+$/.test(part)).join(' › ') || ''),
      situation:String(mapped.situation.value || ''),
      warnings,
      installations,
      raw:clone(raw),
      fieldOrigins:Object.fromEntries(Object.entries(mapped).map(([key,value]) => [key,value.key || null]))
    };
    record.searchName = normalizeText(record.name);
    return record;
  }

  async function sha256(text) {
    if (crypto?.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2,'0')).join('');
    }
    return stableId(text).replace('coop_','').padEnd(64,'0');
  }

  async function buildBase(html,fileMeta={}) {
    const data = parseDataFromHtml(html);
    const digest = await sha256(html);
    const records = [];
    const counts = {};
    const warnings = [];
    for (const [baseKey,definition] of Object.entries(BASE_DEFINITIONS)) {
      let sourceKey = Object.keys(data).find((key) => normalizeKey(key) === normalizeKey(baseKey));
      if (!sourceKey) {
        counts[baseKey] = 0;
        warnings.push(`Base “${baseKey}” não encontrada no objeto DATA.`);
        continue;
      }
      const collected = collectRecords(data[sourceKey],baseKey);
      counts[baseKey] = collected.length;
      collected.forEach((item,index) => records.push(mapRecord(baseKey,item,index)));
      if (!collected.length) warnings.push(`Base “${definition.label}” localizada, mas sem registros reconhecidos.`);
    }
    return {
      schemaVersion:1,
      loadedAt:new Date().toISOString(),
      fileName:fileMeta.name || 'CONSULTA DE COOPERADOS.html',
      fileLastModified:fileMeta.lastModified ? new Date(fileMeta.lastModified).toISOString() : null,
      sizeBytes:fileMeta.size || new Blob([html]).size,
      sha256:digest,
      versionLabel:`${fileMeta.name || 'Base HTML'} · SHA-256 ${digest.slice(0,12)}`,
      counts,
      totalRecords:records.length,
      warnings,
      records
    };
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject) => {
      const request = indexedDB.open(DB_NAME,1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function saveBase(base) {
    try {
      const db = await openDb();
      await new Promise((resolve,reject) => {
        const transaction = db.transaction(STORE,'readwrite');
        transaction.objectStore(STORE).put(base,KEY);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      return;
    } catch (error) {
      try { localStorage.setItem(FALLBACK_KEY,JSON.stringify(base)); }
      catch { throw new Error(`Não foi possível armazenar a base localmente: ${error?.message || error}`); }
    }
  }

  async function loadBase() {
    try {
      const db = await openDb();
      return await new Promise((resolve,reject) => {
        const transaction = db.transaction(STORE,'readonly');
        const request = transaction.objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null'); }
      catch { return null; }
    }
  }

  function formatRiskAddress(confirmed) {
    const local = String(confirmed?.localIdentification || '').trim();
    const municipality = String(confirmed?.municipality || '').trim();
    const state = String(confirmed?.state || '').trim();
    const municipalityState = [municipality,state].filter(Boolean).join(' - ');
    return [local,municipalityState].filter(Boolean).join(', ');
  }

  function selectionFromRecord(record) {
    const confirmed = {
      name:record.name,
      cooperative:record.cooperative,
      activity:record.activity,
      municipality:record.municipality,
      state:record.state,
      localIdentification:record.localIdentification,
      latitude:record.latitude,
      longitude:record.longitude,
      area:record.area,
      areaUnit:record.areaUnit,
      capacity:record.capacity,
      capacityUnit:record.capacityUnit,
      capacityConcept:record.capacityConcept,
      vrBuildings:record.vrBuildings,
      vrAnimals:record.vrAnimals,
      sourceCategory:record.category,
      sourceReference:record.reference,
      situation:record.situation,
      installations:clone(record.installations || [])
    };
    return {
      schemaVersion:1,
      selectedAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      sourceRecordId:record.id,
      baseVersion:loadedBase ? {
        versionLabel:loadedBase.versionLabel,
        fileName:loadedBase.fileName,
        sha256:loadedBase.sha256,
        loadedAt:loadedBase.loadedAt
      } : null,
      source:{
        baseKey:record.baseKey,
        baseLabel:record.baseLabel,
        cooperative:record.cooperative,
        activity:record.activity,
        path:clone(record.path),
        recordIndex:record.recordIndex,
        category:record.category,
        reference:record.reference,
        situation:record.situation,
        fieldOrigins:clone(record.fieldOrigins),
        rawRecord:clone(record.raw)
      },
      original:clone(confirmed),
      confirmed,
      warnings:clone(record.warnings || [])
    };
  }

  function normalizeInstallation(item,index=0) {
    return {
      id:String(item?.id || stableId(`installation:${index}:${JSON.stringify(item || {})}`)),
      involved:item?.involved !== false,
      code:String(item?.code || ''),
      type:String(item?.type || ''),
      area:String(item?.area || ''),
      areaUnit:String(item?.areaUnit || ''),
      capacity:String(item?.capacity || ''),
      capacityUnit:String(item?.capacityUnit || ''),
      capacityConcept:String(item?.capacityConcept || 'Capacidade/quantidade informada'),
      raw:item?.raw ? clone(item.raw) : null
    };
  }

  function normalizeSelection(selection) {
    if (!selection || typeof selection !== 'object') return null;
    const confirmed = selection.confirmed || {};
    const normalizedConfirmed = {
      name:String(confirmed.name || ''),
      cooperative:String(confirmed.cooperative || selection.source?.cooperative || ''),
      activity:String(confirmed.activity || selection.source?.activity || ''),
      municipality:String(confirmed.municipality || ''),
      state:String(confirmed.state || ''),
      localIdentification:String(confirmed.localIdentification || ''),
      latitude:String(confirmed.latitude || ''),
      longitude:String(confirmed.longitude || ''),
      area:String(confirmed.area || ''),
      areaUnit:String(confirmed.areaUnit || ''),
      capacity:String(confirmed.capacity || ''),
      capacityUnit:String(confirmed.capacityUnit || ''),
      capacityConcept:String(confirmed.capacityConcept || 'Capacidade/quantidade informada'),
      vrBuildings:String(confirmed.vrBuildings || ''),
      vrAnimals:String(confirmed.vrAnimals || ''),
      sourceCategory:String(confirmed.sourceCategory || selection.source?.category || ''),
      sourceReference:String(confirmed.sourceReference || selection.source?.reference || ''),
      situation:String(confirmed.situation || selection.source?.situation || ''),
      installations:Array.isArray(confirmed.installations) ? confirmed.installations.map(normalizeInstallation) : []
    };
    return {
      schemaVersion:1,
      selectedAt:selection.selectedAt || new Date().toISOString(),
      updatedAt:selection.updatedAt || selection.selectedAt || new Date().toISOString(),
      sourceRecordId:String(selection.sourceRecordId || ''),
      baseVersion:selection.baseVersion ? clone(selection.baseVersion) : null,
      source:selection.source ? clone(selection.source) : {},
      original:selection.original ? clone(selection.original) : clone(normalizedConfirmed),
      confirmed:normalizedConfirmed,
      warnings:Array.isArray(selection.warnings) ? selection.warnings.map(String) : []
    };
  }

  function compareSelection(selection) {
    if (!selection) return [];
    const original = selection.original || {};
    const confirmed = selection.confirmed || {};
    const labels = {
      name:'Nome',cooperative:'Cooperativa',activity:'Atividade',municipality:'Município',state:'UF',localIdentification:'Identificação do local',latitude:'Latitude',longitude:'Longitude',area:'Área/metragem',capacity:'Capacidade/quantidade',vrBuildings:'VR de benfeitorias',vrAnimals:'VR de animais',sourceCategory:'Origem',sourceReference:'Referência',situation:'Situação'
    };
    const changes = [];
    for (const [key,label] of Object.entries(labels)) {
      if (String(original[key] || '').trim() !== String(confirmed[key] || '').trim()) changes.push(label);
    }
    const originalInstallations = JSON.stringify(original.installations || []);
    const confirmedInstallations = JSON.stringify(confirmed.installations || []);
    if (originalInstallations !== confirmedInstallations) changes.push('Instalações envolvidas');
    return changes;
  }

  function validateSelection(selection) {
    const errors = [];
    const warnings = [];
    if (!selection) return {errors,warnings};
    const confirmed = selection.confirmed || {};
    if (!String(confirmed.name || '').trim()) errors.push('A seleção de cooperado não possui nome confirmado.');
    const installations = Array.isArray(confirmed.installations) ? confirmed.installations : [];
    if (installations.length > 1 && !installations.some((item) => item.involved)) errors.push('Selecione ao menos uma instalação relacionada ao sinistro.');
    const latitude = String(confirmed.latitude || '').trim();
    const longitude = String(confirmed.longitude || '').trim();
    if ((latitude || longitude) && !(parseCoordinateNumber(latitude,'lat').valid && parseCoordinateNumber(longitude,'lng').valid)) warnings.push('Confira as coordenadas do local selecionado.');
    for (const value of [confirmed.vrBuildings,confirmed.vrAnimals]) {
      if (String(value || '').trim() && parseLocaleNumber(value).ambiguous) warnings.push(`Valor numérico ambíguo preservado: “${value}”.`);
    }
    warnings.push(...(selection.warnings || []));
    return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
  }

  function reportData(state) {
    const selection = normalizeSelection(state?.cooperatorSelection);
    if (!selection) return null;
    const c = selection.confirmed;
    const coordinates = [c.latitude,c.longitude].filter((value) => String(value || '').trim()).join(' / ') || 'Não informado';
    const area = [c.area,c.areaUnit].filter(Boolean).join(' ') || 'Não informado';
    const capacity = [c.capacity,c.capacityUnit].filter(Boolean).join(' ') || 'Não informado';
    const sourceParts = [selection.source?.baseLabel || [c.cooperative,c.activity].filter(Boolean).join(' — '),c.sourceCategory && `Origem: ${c.sourceCategory}`,c.sourceReference && `Referência: ${c.sourceReference}`,c.situation && `Situação: ${c.situation}`].filter(Boolean);
    const version = selection.baseVersion?.versionLabel || selection.baseVersion?.fileName || 'Não informado';
    const installations = (c.installations || []).filter((item) => item.involved).map((item,index) => ({
      index:index + 1,
      code:notInformed(item.code),
      type:notInformed(item.type),
      area:[item.area,item.areaUnit].filter(Boolean).join(' ') || 'Não informado',
      capacity:[item.capacity,item.capacityUnit].filter(Boolean).join(' ') || 'Não informado',
      capacityConcept:notInformed(item.capacityConcept)
    }));
    return {
      rows:[
        ['Cooperado',notInformed(c.name)],
        ['Cooperativa e atividade',[c.cooperative,c.activity].filter(Boolean).join(' — ') || 'Não informado'],
        ['Município e identificação do local',[c.localIdentification,[c.municipality,c.state].filter(Boolean).join(' - ')].filter(Boolean).join(', ') || 'Não informado'],
        ['Coordenadas',coordinates],
        ['Área ou metragem',area],
        [c.capacityConcept || 'Capacidade/quantidade',capacity],
        ['VR de benfeitorias',displayMoney(c.vrBuildings)],
        ['VR de animais',displayMoney(c.vrAnimals)],
        ['Fonte do registro',sourceParts.join(' · ') || 'Não informado'],
        ['Versão da base utilizada',version]
      ],
      installations,
      changes:compareSelection(selection),
      warnings:validateSelection(selection).warnings
    };
  }

  function reportHtml(state,{esc:escapeHtml=esc}={}) {
    const data = reportData(state);
    if (!data) return '';
    const rows = data.rows.map(([label,value]) => `<div class="location-data-row"><strong>${escapeHtml(label)}:</strong><span>${escapeHtml(value)}</span></div>`).join('');
    const installations = data.installations.length
      ? `<div class="location-installations"><strong>Instalações relacionadas ao sinistro:</strong>${data.installations.map((item) => `<div class="location-installation-item"><span>${item.index}.</span><div><b>${escapeHtml(item.code)}</b>${item.type !== 'Não informado' ? ` — ${escapeHtml(item.type)}` : ''}<br><small>Área: ${escapeHtml(item.area)} · ${escapeHtml(item.capacityConcept)}: ${escapeHtml(item.capacity)}</small></div></div>`).join('')}</div>`
      : '<div class="location-installations"><strong>Instalações relacionadas ao sinistro:</strong><span> Não informado</span></div>';
    const changes = data.changes.length ? `<p class="location-source-note"><strong>Ajustes registrados pelo regulador:</strong> ${escapeHtml(data.changes.join(', '))}.</p>` : '';
    return `<div class="location-data-block"><div class="doc-subsection">DADOS CONFIRMADOS DO LOCAL</div>${rows}${installations}${changes}</div>`;
  }

  function baseStatusHtml() {
    if (!loadedBase) return '<div class="notice info">Nenhuma base de cooperados foi carregada neste navegador. Atualize a base utilizando o arquivo HTML de consulta.</div>';
    const countItems = Object.entries(loadedBase.counts || {}).map(([key,count]) => `${BASE_DEFINITIONS[key]?.label || key}: ${count}`).join(' · ');
    const warnings = loadedBase.warnings?.length ? `<details class="cooperator-base-warnings"><summary>${loadedBase.warnings.length} aviso(s) de importação</summary><ul>${loadedBase.warnings.map((warning) => `<li>${esc(warning)}</li>`).join('')}</ul></details>` : '';
    return `<div class="cooperator-base-status"><strong>Base em uso:</strong> ${esc(loadedBase.versionLabel)}<br><span>${loadedBase.totalRecords} registros reconhecidos · carregada em ${esc(displayDateTime(loadedBase.loadedAt))}</span><small>${esc(countItems)}</small>${warnings}<p>Base local importada manualmente. Não há sincronização automática com o portal.</p></div>`;
  }

  function renderBaseStatus() {
    const host = $('cooperatorBaseStatus');
    if (host) host.innerHTML = baseStatusHtml();
  }

  function renderFilters() {
    const cooperative = $('cooperatorCooperativeFilter');
    const activity = $('cooperatorActivityFilter');
    if (!cooperative || !activity) return;
    const previousCooperative = cooperative.value;
    const previousActivity = activity.value;
    const cooperatives = [...new Set((loadedBase?.records || []).map((record) => record.cooperative).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
    const activities = [...new Set((loadedBase?.records || []).map((record) => record.activity).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
    cooperative.innerHTML = '<option value="">Todas as cooperativas</option>' + cooperatives.map((value) => `<option value="${attr(value)}">${esc(value)}</option>`).join('');
    activity.innerHTML = '<option value="">Todas as atividades</option>' + activities.map((value) => `<option value="${attr(value)}">${esc(value)}</option>`).join('');
    cooperative.value = cooperatives.includes(previousCooperative) ? previousCooperative : '';
    activity.value = activities.includes(previousActivity) ? previousActivity : '';
  }

  function resultCard(record) {
    const coordinates = [record.latitude,record.longitude].filter(Boolean).join(' / ') || 'Não informado';
    const source = [record.category,record.reference].filter(Boolean).join(' · ') || 'Não informado';
    const badges = [record.baseLabel,record.situation].filter(Boolean).map((value) => `<span class="cooperator-badge">${esc(value)}</span>`).join('');
    const warning = record.warnings.length ? `<div class="cooperator-result-warning">${esc(record.warnings[0])}${record.warnings.length > 1 ? ` (+${record.warnings.length - 1})` : ''}</div>` : '';
    return `<article class="cooperator-result-card" data-record-id="${attr(record.id)}">
      <div class="cooperator-result-head"><div><h4>${esc(record.name || 'Nome não informado')}</h4><div class="cooperator-badges">${badges}</div></div><button class="btn primary" type="button" data-action="use-cooperator-record" data-record-id="${attr(record.id)}">Utilizar dados deste local</button></div>
      <div class="cooperator-result-grid">
        <div><span>Município</span><strong>${esc(record.municipality || 'Não informado')}</strong></div>
        <div><span>Coordenadas</span><strong>${esc(coordinates)}</strong></div>
        <div><span>Instalação</span><strong>${esc(record.installationCode || `${record.installations.length || 0} registro(s)`)}</strong></div>
        <div><span>Origem / referência</span><strong>${esc(source)}</strong></div>
      </div>${warning}
    </article>`;
  }

  function renderResults() {
    const host = $('cooperatorResults');
    const notice = $('cooperatorSearchNotice');
    if (!host || !notice) return;
    const query = normalizeText($('cooperatorSearch')?.value || '');
    if (!loadedBase) {
      notice.className = 'notice info';
      notice.textContent = 'Carregue a base HTML antes de pesquisar.';
      host.innerHTML = '';
      return;
    }
    if (!query) {
      notice.className = 'notice info';
      notice.textContent = 'Digite parte do nome do cooperado ou integrado.';
      host.innerHTML = '';
      return;
    }
    const cooperative = $('cooperatorCooperativeFilter')?.value || '';
    const activity = $('cooperatorActivityFilter')?.value || '';
    searchResults = loadedBase.records.filter((record) => record.searchName.includes(query) && (!cooperative || record.cooperative === cooperative) && (!activity || record.activity === activity));
    const visible = searchResults.slice(0,MAX_RESULTS);
    notice.className = searchResults.length ? 'notice ok' : 'notice warn';
    notice.textContent = searchResults.length
      ? `${searchResults.length} registro(s) encontrado(s). Cada cartão representa uma opção independente; confira o local antes de utilizar.`
      : 'Nenhum registro correspondente foi encontrado.';
    if (searchResults.length > MAX_RESULTS) notice.textContent += ` Exibindo os primeiros ${MAX_RESULTS}. Refine a pesquisa.`;
    host.innerHTML = visible.map(resultCard).join('');
  }

  function fieldInput(label,key,value,{textarea=false,placeholder=''}={}) {
    const element = textarea
      ? `<textarea data-coop-field="${attr(key)}" rows="2" placeholder="${attr(placeholder)}">${esc(value || '')}</textarea>`
      : `<input data-coop-field="${attr(key)}" value="${attr(value || '')}" placeholder="${attr(placeholder)}">`;
    return `<div><label class="field">${esc(label)}</label>${element}</div>`;
  }

  function installationFieldInput(label,key,value) {
    return `<div><label class="field">${esc(label)}</label><input data-installation-field="${attr(key)}" value="${attr(value || '')}"></div>`;
  }

  function installationCard(item,index,total) {
    return `<div class="cooperator-installation-card" data-installation-id="${attr(item.id)}">
      <div class="dynamic-head"><label class="cooperator-installation-check"><input type="checkbox" data-installation-field="involved" ${item.involved ? 'checked' : ''}> Relacionada ao sinistro</label><button class="small-btn danger" type="button" data-action="remove-cooperator-installation" data-installation-id="${attr(item.id)}">Remover</button></div>
      <div class="grid2">${installationFieldInput('Código ou identificação','code',item.code)}${installationFieldInput('Tipo de instalação','type',item.type)}</div>
      <div class="grid2">${installationFieldInput('Área ou metragem','area',item.area)}${installationFieldInput('Unidade da área','areaUnit',item.areaUnit)}</div>
      <div class="grid2">${installationFieldInput(item.capacityConcept || 'Capacidade/quantidade','capacity',item.capacity)}${installationFieldInput('Unidade / conceito','capacityUnit',item.capacityUnit)}</div>
      ${total > 1 && !item.involved ? '<p class="helper">Marque somente as instalações relacionadas ao evento.</p>' : ''}
    </div>`;
  }

  function renderSelection() {
    const host = $('cooperatorSelectedPanel');
    if (!host || !controller) return;
    const state = controller.getState();
    const selection = normalizeSelection(state.cooperatorSelection);
    if (!selection) {
      host.innerHTML = '<div class="notice info">Nenhum local foi confirmado pela consulta. O preenchimento manual continua disponível abaixo.</div>';
      return;
    }
    state.cooperatorSelection = selection;
    const c = selection.confirmed;
    const validation = validateSelection(selection);
    const changes = compareSelection(selection);
    const warnings = validation.warnings.length ? `<div class="notice warn"><strong>Conferência necessária:</strong><ul>${validation.warnings.map((warning) => `<li>${esc(warning)}</li>`).join('')}</ul></div>` : '';
    const errors = validation.errors.length ? `<div class="notice error"><strong>Pendências da seleção:</strong><ul>${validation.errors.map((error) => `<li>${esc(error)}</li>`).join('')}</ul></div>` : '';
    const original = `<details class="cooperator-original"><summary>Dados originalmente importados e origem</summary><div class="cooperator-original-meta"><strong>${esc(selection.source?.baseLabel || '')}</strong><span>${esc(selection.baseVersion?.versionLabel || '')}</span></div><pre>${esc(JSON.stringify(selection.source?.rawRecord || {},null,2))}</pre></details>`;
    host.innerHTML = `<div class="cooperator-selected">
      <div class="section-head"><div><span class="step-kicker">Local confirmado pela consulta</span><h3>${esc(c.name || 'Cooperado não informado')}</h3><p class="helper">Os campos podem ser ajustados pelo regulador. A cópia original permanece preservada no relatório.</p></div><button class="btn danger-lite" type="button" data-action="clear-cooperator-selection">Remover seleção</button></div>
      ${errors}${warnings}
      <div class="grid2">${fieldInput('Nome do cooperado','name',c.name)}${fieldInput('Cooperativa','cooperative',c.cooperative)}</div>
      <div class="grid2">${fieldInput('Atividade','activity',c.activity)}${fieldInput('Município','municipality',c.municipality)}</div>
      <div class="grid2">${fieldInput('UF','state',c.state)}${fieldInput('Identificação do local','localIdentification',c.localIdentification,{textarea:true})}</div>
      <div class="grid2">${fieldInput('Latitude','latitude',c.latitude)}${fieldInput('Longitude','longitude',c.longitude)}</div>
      <div class="grid2">${fieldInput('Área ou metragem','area',c.area)}${fieldInput('Unidade da área','areaUnit',c.areaUnit)}</div>
      <div class="grid2">${fieldInput(c.capacityConcept || 'Capacidade/quantidade','capacity',c.capacity)}${fieldInput('Unidade da capacidade/quantidade','capacityUnit',c.capacityUnit)}</div>
      <div class="grid2">${fieldInput('VR de benfeitorias','vrBuildings',c.vrBuildings)}${fieldInput('VR de animais','vrAnimals',c.vrAnimals)}</div>
      <div class="grid3">${fieldInput('Origem do registro','sourceCategory',c.sourceCategory)}${fieldInput('Referência da planilha/endosso','sourceReference',c.sourceReference)}${fieldInput('Situação registrada','situation',c.situation)}</div>
      <div class="cooperator-installations-head"><div><h4>Instalações relacionadas ao sinistro</h4><p class="helper">Registros não são unidos automaticamente. Se houver várias instalações, marque apenas as envolvidas.</p></div><button class="btn secondary" type="button" data-action="add-cooperator-installation">+ Adicionar instalação</button></div>
      <div id="cooperatorInstallationList">${c.installations.length ? c.installations.map((item,index) => installationCard(item,index,c.installations.length)).join('') : '<div class="notice info">Nenhuma instalação estruturada foi identificada. Adicione manualmente quando necessário.</div>'}</div>
      ${changes.length ? `<div class="notice info">Ajustes registrados em relação à importação: ${esc(changes.join(', '))}.</div>` : ''}
      ${original}
    </div>`;
  }

  function selectionChanged({autofill=true,renderNow=false}={}) {
    const state = controller.getState();
    if (state.cooperatorSelection) state.cooperatorSelection.updatedAt = new Date().toISOString();
    controller.onSelectionChanged(state.cooperatorSelection,{autofill});
    if (renderNow) renderSelection();
  }

  async function importHtmlFile(file) {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && !/html/i.test(file.type || '')) {
      throw new Error('Selecione um arquivo HTML contendo a estrutura DATA.');
    }
    const html = await file.text();
    const base = await buildBase(html,{name:file.name,size:file.size,lastModified:file.lastModified});
    if (!base.totalRecords) throw new Error('A estrutura DATA foi encontrada, mas nenhum registro de cooperado foi reconhecido.');
    await saveBase(base);
    loadedBase = base;
    searchResults = [];
    renderBaseStatus();
    renderFilters();
    renderResults();
    controller.status(`Base de cooperados atualizada: ${base.totalRecords} registros reconhecidos.`,'ok');
  }

  function selectRecord(id) {
    const record = loadedBase?.records?.find((entry) => entry.id === id);
    if (!record) return;
    const state = controller.getState();
    state.cooperatorSelection = selectionFromRecord(record);
    controller.onSelectionChanged(state.cooperatorSelection,{autofill:true});
    renderSelection();
    $('cooperatorSelectedPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function bindEvents() {
    $('cooperatorBaseInput')?.addEventListener('change',async(event) => {
      const input = event.currentTarget;
      try { await importHtmlFile(input.files?.[0]); }
      catch (error) { controller.status(error.message || String(error),'error'); alert(`Não foi possível atualizar a base:\n${error.message || error}`); }
      finally { input.value = ''; }
    });
    $('cooperatorSearch')?.addEventListener('input',() => renderResults());
    $('cooperatorSearch')?.addEventListener('keydown',(event) => { if (event.key === 'Enter') { event.preventDefault(); renderResults(); } });
    $('cooperatorCooperativeFilter')?.addEventListener('change',() => renderResults());
    $('cooperatorActivityFilter')?.addEventListener('change',() => renderResults());

    document.addEventListener('click',(event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'search-cooperators') renderResults();
      else if (action === 'clear-cooperator-search') {
        if ($('cooperatorSearch')) $('cooperatorSearch').value = '';
        if ($('cooperatorCooperativeFilter')) $('cooperatorCooperativeFilter').value = '';
        if ($('cooperatorActivityFilter')) $('cooperatorActivityFilter').value = '';
        searchResults = [];
        renderResults();
      } else if (action === 'use-cooperator-record') selectRecord(button.dataset.recordId || button.closest('[data-record-id]')?.dataset.recordId);
      else if (action === 'clear-cooperator-selection') {
        controller.getState().cooperatorSelection = null;
        controller.onSelectionChanged(null,{autofill:false});
        renderSelection();
      } else if (action === 'add-cooperator-installation') {
        const selection = controller.getState().cooperatorSelection;
        if (!selection) return;
        selection.confirmed.installations.push(normalizeInstallation({id:stableId(`manual:${Date.now()}`),involved:true},selection.confirmed.installations.length));
        selectionChanged({autofill:false,renderNow:true});
      } else if (action === 'remove-cooperator-installation') {
        const selection = controller.getState().cooperatorSelection;
        if (!selection) return;
        selection.confirmed.installations = selection.confirmed.installations.filter((item) => item.id !== button.dataset.installationId);
        selectionChanged({autofill:false,renderNow:true});
      }
    });

    document.addEventListener('input',(event) => {
      const field = event.target.closest('[data-coop-field]');
      if (field) {
        const selection = controller.getState().cooperatorSelection;
        if (!selection) return;
        selection.confirmed[field.dataset.coopField] = field.value;
        selectionChanged({autofill:['name','municipality','state','localIdentification'].includes(field.dataset.coopField)});
        return;
      }
      const installationField = event.target.closest('[data-installation-field]');
      if (installationField) {
        const selection = controller.getState().cooperatorSelection;
        const card = installationField.closest('[data-installation-id]');
        const item = selection?.confirmed?.installations?.find((entry) => entry.id === card?.dataset.installationId);
        if (!item) return;
        item[installationField.dataset.installationField] = installationField.type === 'checkbox' ? installationField.checked : installationField.value;
        selectionChanged({autofill:false});
      }
    });
  }

  async function init(nextController) {
    if (initialized) { controller = nextController || controller; render(); return; }
    controller = nextController;
    loadedBase = await loadBase();
    bindEvents();
    initialized = true;
    render();
  }

  function render() {
    renderBaseStatus();
    renderFilters();
    renderResults();
    renderSelection();
  }

  window.FastTrackCooperators = {
    init,
    render,
    buildBase,
    parseDataFromHtml,
    normalizeText,
    normalizeSelection,
    validateSelection,
    reportData,
    reportHtml,
    formatRiskAddress,
    getBase:() => loadedBase,
    definitions:clone(BASE_DEFINITIONS)
  };
})();