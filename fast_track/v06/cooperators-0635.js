(() => {
  'use strict';

  const IMPORTER_VERSION = '0.6.3.4';
  const NORMALIZED_SCHEMA_VERSION = 3;
  const SELECTION_SCHEMA_VERSION = 3;
  const DB_NAME = 'HSFastTrackCooperators';
  const STORE = 'base';
  const KEY = 'current-v2';
  const LEGACY_KEY = 'current';
  const FALLBACK_KEY = 'hsFastTrackCooperatorBaseV2';
  const LEGACY_FALLBACK_KEY = 'hsFastTrackCooperatorBaseV1';
  const MAX_RESULTS = 150;

  const BASE_DEFINITIONS = {
    aurora: {
      label:'Aurora — Aves de Corte', cooperative:'Aurora', activity:'Aves de Corte',
      detailLists:[['renovacao','Renovação'],['registrosEndosso','Endosso']],
      referenceLists:[['endossos','Endosso']], noticeLists:[]
    },
    lar: {
      label:'Lar — Aves de Corte', cooperative:'Lar', activity:'Aves de Corte',
      detailLists:[['inicial','Base inicial'],['endossos','Endosso']],
      referenceLists:[], noticeLists:['trocas']
    },
    suinos: {
      label:'Aurora — Suínos', cooperative:'Aurora', activity:'Suínos',
      detailLists:[['renovacao','Renovação'],['registrosEndosso','Endosso']],
      referenceLists:[['endossos','Endosso']], noticeLists:[]
    },
    jagua: {
      label:'Jaguafrangos', cooperative:'Jaguafrangos', activity:'Aves de Corte',
      detailLists:[['inicial','Base inicial'],['endossos','Endosso']],
      referenceLists:[], noticeLists:['titularidades']
    },
    matrizes: {
      label:'Aurora — Aves Matrizes', cooperative:'Aurora', activity:'Aves Matrizes',
      detailLists:[['renovacao','Renovação']],
      referenceLists:[['endossos','Endosso']], noticeLists:[]
    },
    larPostura: {
      label:'Lar — Postura e Recria', cooperative:'Lar', activity:'Postura e Recria',
      detailLists:[['iniciais','Base inicial']],
      referenceLists:[['endossos','Endosso']], noticeLists:[], activityField:'tipo'
    }
  };

  const FIELD_ALIASES = {
    name:['nome','nome completo','razao social','razão social','produtor','cooperado','integrado','nome produtor','nome integrado'],
    municipality:['cidade','municipio','município','municipio uf','município uf'],
    state:['uf','estado'],
    local:['local','localidade','linha','endereco','endereço','propriedade','identificacao local','identificação local','local de risco'],
    latitude:['latitude','lat','coord latitude','coordenada latitude'],
    longitude:['longitude','long','lng','lon','coord longitude','coordenada longitude'],
    coordinates:['coordenadas','coordenada','coord','latitude longitude','lat long','lat lng'],
    installationCode:['aviario','aviário','codigo aviario','código aviário','cod aviario','numero aviario','número aviário','galpao','galpão','nucleo','núcleo','pocilga','codigo instalacao','código instalação'],
    installationType:['tipo instalacao','tipo instalação','estrutura','classificacao','classificação'],
    activityType:['tipo'],
    area:['metragem','areaM2','area m2','área m²','area','área','m2','m²','dimensoes','dimensões'],
    capacity:['capAloja','qtdeLotacao','quantidadeAves','maximoAves','totalAves','qtAves','capacidade','alojamento','capacidade de alojamento','quantidade animais','quantidade de animais','quantidade aves','quantidade suinos','quantidade suínos','plantel'],
    vrBuildings:['vrBenfeitoria','valorBenfeitoria','vrTotalEstruturas','vrEstruturas','vr benfeitorias','valor benfeitorias','valor em risco benfeitorias','valor estrutura','vr estrutura'],
    vrAnimals:['vrAnimais','valorAves','vrTotalAves','vrTotalAnimais','vr animais','valor animais','valor em risco animais','valor do plantel','vr plantel','vr aves','valor aves'],
    materialDamageAviaries:['danosAviarios'],
    reference:['planilha','referencia','referência','referencia planilha','referência planilha','arquivo origem','mes referencia','mês referência','competencia','competência','endosso'],
    situation:['situacao','situação','resultado','status','observacao','observação','pendencia','pendência'],
    movement:['movimento','tipo movimento','operacao','operação','alteracao','alteração']
  };

  const LOCATION_FIELDS = ['municipality','state','local','latitude','longitude','coordinates','installationCode','installationType','area','capacity'];
  const VALUE_FIELDS = ['vrBuildings','vrAnimals','materialDamageAviaries'];
  const STRUCTURAL_NAMES = new Set(['cooperados','cadastros','produtores','integrados','dados','registros','base','lista','items','itens']);
  const HEADER_MARKERS = new Set(['nome','municipio','cidade','latitude','longitude','aviario','metragem','area m2','planilha','situacao','resultado','valor benfeitoria','valor aves']);

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const attr = (value) => esc(value).replace(/`/g,'&#96;');
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const hasOwn = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
  const isPlainObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const isPrimitive = (value) => value == null || ['string','number','boolean'].includes(typeof value);
  const hasPrimitiveValue = (value) => isPrimitive(value) && value != null && (typeof value !== 'string' || value.trim() !== '');
  const primitiveText = (value) => hasPrimitiveValue(value) ? String(value).trim() : '';
  const notInformed = (value) => primitiveText(value) || 'Não informado';

  let controller = null;
  let loadedBase = null;
  let searchResults = [];
  let resultLimit = MAX_RESULTS;
  let lastSearchKey = '';
  let initialized = false;
  let dbPromise = null;
  let staleBaseDetected = false;

  function splitCamel(value) {
    return String(value == null ? '' : value)
      .replace(/([a-zà-ÿ0-9])([A-ZÀ-Ý])/g,'$1 $2')
      .replace(/([A-ZÀ-Ý]+)([A-ZÀ-Ý][a-zà-ÿ])/g,'$1 $2');
  }

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,' ')
      .trim()
      .replace(/\s+/g,' ');
  }

  function normalizeKey(value) { return normalizeText(splitCamel(value)); }

  function stableId(value) {
    let hash = 2166136261;
    const text = String(value == null ? '' : value);
    for (let index=0; index<text.length; index+=1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash,16777619); }
    return `coop_${(hash >>> 0).toString(16).padStart(8,'0')}`;
  }

  function displayDateTime(value) {
    if (!value) return 'Não informado';
    try { return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); }
    catch { return String(value); }
  }

  function displayMoney(value) {
    if (!hasPrimitiveValue(value)) return 'Não informado';
    const source = String(value).trim();
    if (/R\$/i.test(source)) return source;
    const parsed = parseLocaleNumber(value);
    if (parsed.value == null || parsed.ambiguous) return source;
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parsed.value);
  }

  function valueWithUnit(value,unit) {
    if (!hasPrimitiveValue(value)) return 'Não informado';
    const source = String(value).trim();
    const suffix = primitiveText(unit);
    if (!suffix) return source;
    const normalizedSource = normalizeText(source);
    const normalizedSuffix = normalizeText(suffix);
    if (normalizedSuffix && (normalizedSource === normalizedSuffix || normalizedSource.endsWith(` ${normalizedSuffix}`))) return source;
    return `${source} ${suffix}`;
  }

  function parseLocaleNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return {value,ambiguous:false,raw:String(value)};
    const raw = primitiveText(value);
    if (!raw) return {value:null,ambiguous:false,raw};
    const cleaned = raw.replace(/^R\$\s*/i,'').replace(/\s*(?:m²|m2|ha|m|aves|suínos|suinos|animais|matrizes)\s*$/i,'').trim();
    if (!/^[+-]?\d+(?:[.,]\d+)*$/.test(cleaned)) return {value:null,ambiguous:true,raw};
    const comma = cleaned.lastIndexOf(',');
    const dot = cleaned.lastIndexOf('.');
    let normalized = cleaned;
    if (comma >= 0 && dot >= 0 && !/^[+-]?(?:\d{1,3}(?:\.\d{3})+,\d+|\d{1,3}(?:,\d{3})+\.\d+)$/.test(cleaned)) return {value:null,ambiguous:true,raw};
    if ((cleaned.match(/,/g)||[]).length > 1 || (cleaned.match(/\./g)||[]).length > 1) {
      if (/^[+-]?\d{1,3}(?:[.]\d{3})+$/.test(cleaned) || /^[+-]?\d{1,3}(?:[,]\d{3})+$/.test(cleaned)) return {value:Number(cleaned.replace(/[.,]/g,'')),ambiguous:false,raw};
      if (!(comma >= 0 && dot >= 0)) return {value:null,ambiguous:true,raw};
    }
    let ambiguous = false;
    if (comma >= 0 && dot >= 0) {
      if (comma > dot) normalized = cleaned.replace(/\./g,'').replace(',','.');
      else normalized = cleaned.replace(/,/g,'');
    } else if (comma >= 0) {
      const decimals = cleaned.length - comma - 1;
      if (decimals === 1 || decimals === 2 || decimals > 3) normalized = cleaned.replace(/\./g,'').replace(',','.');
      else if (decimals === 3 && cleaned.slice(0,comma).replace(/-/g,'').length <= 3) { normalized = cleaned.replace(/,/g,''); ambiguous = true; }
      else normalized = cleaned.replace(/,/g,'');
    } else if (dot >= 0) {
      const decimals = cleaned.length - dot - 1;
      if (decimals === 3 && cleaned.slice(0,dot).replace(/-/g,'').length <= 3) { normalized = cleaned.replace(/\./g,''); ambiguous = true; }
    }
    const number = Number(normalized);
    return {value:Number.isFinite(number) ? number : null,ambiguous:ambiguous || !Number.isFinite(number),raw};
  }

  function parseCoordinateNumber(value,kind) {
    if (typeof value === 'number') {
      const valid = kind === 'lat' ? value >= -90 && value <= 90 : value >= -180 && value <= 180;
      return {value:valid ? value : null,raw:String(value),valid};
    }
    const raw = primitiveText(value);
    if (!raw) return {value:null,raw,valid:false};
    const decimal = Number(raw.replace(',','.'));
    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(raw) && Number.isFinite(decimal)) {
      const valid = kind === 'lat' ? decimal >= -90 && decimal <= 90 : decimal >= -180 && decimal <= 180;
      return {value:valid ? decimal : null,raw,valid};
    }
    const match = raw.match(/^(\d{1,3})(?:[°\s]+)(\d{1,2})?(?:['’\s]+)?(\d{1,2}(?:[.,]\d+)?)?(?:["”\s]+)?([NSEW])$/i);
    if (!match) return {value:null,raw,valid:false};
    const degrees = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const seconds = Number(String(match[3] || 0).replace(',','.'));
    let result = degrees + minutes/60 + seconds/3600;
    if (/[SW]/i.test(match[4])) result *= -1;
    const valid = minutes < 60 && seconds < 60 && (kind === 'lat' ? /[NS]/i.test(match[4]) && result >= -90 && result <= 90 : /[EW]/i.test(match[4]) && result >= -180 && result <= 180);
    return {value:valid ? result : null,raw,valid};
  }

  function parseCombinedCoordinates(value) {
    const raw = primitiveText(value);
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

  function schemaFor() { return FIELD_ALIASES; }

  function primitiveEntries(record) {
    return Object.entries(record || {}).filter(([,value]) => isPrimitive(value));
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

  function primitiveCandidate(record,key) {
    return hasOwn(record,key) && hasPrimitiveValue(record[key]);
  }

  function fieldByAliases(record,aliases,{predicate=null}={}) {
    if (!isPlainObject(record)) return {key:null,value:'',ambiguous:false};
    const map = keyMap(record);
    const exact = [];
    for (const alias of aliases || []) {
      for (const key of map.get(normalizeKey(alias)) || []) if (primitiveCandidate(record,key)) exact.push(key);
    }
    const uniqueExact = [...new Set(exact)];
    if (uniqueExact.length === 1) return {key:uniqueExact[0],value:record[uniqueExact[0]],ambiguous:false};
    if (uniqueExact.length > 1) {
      const values = [...new Set(uniqueExact.map((key)=>primitiveText(record[key])))];
      if (values.length === 1) return {key:uniqueExact[0],value:record[uniqueExact[0]],ambiguous:false};
      return {key:null,value:'',ambiguous:true,candidates:uniqueExact};
    }
    if (!predicate) return {key:null,value:'',ambiguous:false};
    const candidates = Object.keys(record).filter((key)=>primitiveCandidate(record,key) && predicate(normalizeKey(key),record[key]));
    if (candidates.length === 1) return {key:candidates[0],value:record[candidates[0]],ambiguous:false};
    if (candidates.length > 1) {
      const values = [...new Set(candidates.map((key)=>primitiveText(record[key])))];
      if (values.length === 1) return {key:candidates[0],value:record[candidates[0]],ambiguous:false};
      return {key:null,value:'',ambiguous:true,candidates};
    }
    return {key:null,value:'',ambiguous:false};
  }

  function findMappedField(record,name) {
    const predicates = {
      name:(key)=>/(^| )(nome|produtor|cooperado|integrado)( |$)/.test(key) && !/municip|cidade/.test(key),
      municipality:(key)=>/(^| )(municipio|cidade)( |$)/.test(key),
      state:(key)=>key === 'uf' || key === 'estado',
      local:(key)=>/localidade|endereco|linha|propriedade|local de risco/.test(key),
      latitude:(key)=>/latitude|(^| )lat( |$)/.test(key),
      longitude:(key)=>/longitude|(^| )(long|lng|lon)( |$)/.test(key),
      coordinates:(key)=>/coordenad|(^| )coord( |$)/.test(key),
      installationCode:(key)=>/(codigo|numero|cod).*(aviario|instal|galpao|pocilga|nucleo)|^(aviario|galpao|pocilga|nucleo)$/.test(key),
      installationType:(key)=>/tipo.*(instal|estrutura)|classificacao/.test(key),
      activityType:(key)=>key === 'tipo',
      area:(key)=>/(^| )(area|metragem|dimens)( |$)|m2/.test(key),
      capacity:(key)=>/(capacidade|alojamento|lotacao|quantidade|plantel|total aves|maximo aves|qt aves)/.test(key) && !/(valor|vr|risco)/.test(key),
      vrBuildings:(key)=>/(vr|valor).*(benfeitor|estrutura)|(?:benfeitor|estrutura).*(vr|valor)/.test(key),
      vrAnimals:(key)=>/(vr|valor).*(animais|aves|suinos|matrizes|plantel)|(?:animais|aves|suinos|matrizes|plantel).*(vr|valor)/.test(key),
      materialDamageAviaries:(key)=>/danos.*aviario|total.*danos.*materiais.*aviario/.test(key),
      reference:(key)=>/planilha|referencia|competencia|mes referencia|arquivo origem|endosso/.test(key),
      situation:(key)=>/situacao|resultado|status|observacao|pendencia/.test(key),
      movement:(key)=>/movimento|tipo movimento|operacao|alteracao/.test(key)
    };
    return fieldByAliases(record,FIELD_ALIASES[name] || [],{predicate:predicates[name]});
  }

  function mappedFields(record) {
    return Object.fromEntries(Object.keys(FIELD_ALIASES).map((name)=>[name,findMappedField(record,name)]));
  }

  function findStructuralEntry(record,target) {
    const wanted = normalizeKey(target);
    return Object.entries(record || {}).find(([key])=>normalizeKey(key) === wanted) || null;
  }

  function structuralNames(baseKey) {
    const def = BASE_DEFINITIONS[baseKey];
    return new Set([
      ...(def?.detailLists || []).map(([name])=>normalizeKey(name)),
      ...(def?.referenceLists || []).map(([name])=>normalizeKey(name)),
      ...(def?.noticeLists || []).map((name)=>normalizeKey(name))
    ]);
  }

  function hasStructuralData(record,baseKey) {
    const names = structuralNames(baseKey);
    return Object.keys(record || {}).some((key)=>names.has(normalizeKey(key)));
  }

  function hasNestedCollection(record) {
    return Object.values(record || {}).some((value)=>Array.isArray(value) || isPlainObject(value));
  }

  function recognizedSignalCount(record) {
    if (!isPlainObject(record)) return 0;
    const mapped = mappedFields(record);
    return [...LOCATION_FIELDS,...VALUE_FIELDS,'reference','situation','movement'].filter((name)=>hasPrimitiveValue(mapped[name]?.value)).length;
  }

  function plausibleNameHint(value) {
    const text = primitiveText(value);
    if (!text || /^\d+$/.test(text)) return '';
    const normalized = normalizeKey(text);
    if (STRUCTURAL_NAMES.has(normalized)) return '';
    if (Object.values(BASE_DEFINITIONS).some((def)=>normalizeKey(def.label) === normalized)) return '';
    return text;
  }

  function cooperatorName(record,hint='') {
    const mapped = findMappedField(record,'name');
    return primitiveText(mapped.value) || plausibleNameHint(hint);
  }

  function collectHeaderTokens(value,depth=0,out=[]) {
    if (depth > 4 || value == null) return out;
    if (Array.isArray(value)) {
      value.slice(0,5).forEach((item)=>collectHeaderTokens(item,depth+1,out));
      return out;
    }
    if (!isPlainObject(value)) {
      if (hasPrimitiveValue(value)) out.push(normalizeKey(value));
      return out;
    }
    for (const [key,nested] of Object.entries(value)) {
      if (isPrimitive(nested)) {
        if (hasPrimitiveValue(nested)) out.push(normalizeKey(nested));
      } else collectHeaderTokens(nested,depth+1,out);
    }
    return out;
  }

  function isJaguaHeader(record,hint='') {
    if (!isPlainObject(record)) return false;
    const name = normalizeKey(cooperatorName(record,hint));
    const tokens = collectHeaderTokens(record).filter(Boolean);
    const markers = new Set(tokens.filter((value)=>HEADER_MARKERS.has(value)));
    const nameMarker = ['nome','produtor','integrado'].includes(name) || normalizeKey(hint) === 'nome';
    const locationMarkers = markers.has('municipio') || markers.has('cidade');
    const coordinateMarkers = markers.has('latitude') && markers.has('longitude');
    const installationMarkers = markers.has('aviario') || markers.has('metragem') || markers.has('area m2');
    return nameMarker && markers.size >= 4 && locationMarkers && (coordinateMarkers || installationMarkers);
  }

  function discoverCooperators(source,baseKey) {
    const result = [];
    const visited = new WeakSet();
    function visit(value,path=[],hint='') {
      if (Array.isArray(value)) {
        value.forEach((item,index)=>visit(item,[...path,String(index)],String(index)));
        return;
      }
      if (!isPlainObject(value) || visited.has(value)) return;
      visited.add(value);
      if (baseKey === 'jagua' && isJaguaHeader(value,hint)) {
        result.push({header:true,raw:value,path,key:hint || path.at(-1) || 'NOME'});
        return;
      }
      const name = cooperatorName(value,hint);
      const structural = hasStructuralData(value,baseKey);
      const flat = recognizedSignalCount(value) > 0;
      if (name && (structural || flat || !hasNestedCollection(value))) {
        result.push({header:false,raw:value,path,key:plausibleNameHint(hint) || path.at(-1) || String(result.length),name});
        return;
      }
      for (const [key,nested] of Object.entries(value)) {
        if (Array.isArray(nested) || isPlainObject(nested)) visit(nested,[...path,key],key);
      }
    }
    visit(source,[],baseKey);
    if (!result.some((entry)=>!entry.header) && isPlainObject(source) && recognizedSignalCount(source)>0) {
      result.push({header:false,raw:source,path:[],key:baseKey,name:cooperatorName(source,baseKey)});
    }
    return result;
  }

  function referencePrimitiveEntries(record) {
    const ignored = /(^| )(nome|produtor|cooperado|integrado|municipio|cidade|latitude|longitude|aviario|galpao|pocilga|nucleo|metragem|area|capacidade|alojamento|lotacao|quantidade|vr|valor)( |$)/;
    return primitiveEntries(record).filter(([key,value])=>hasPrimitiveValue(value) && !ignored.test(normalizeKey(key)));
  }

  function flattenReferenceValues(value,path=[],out=[]) {
    if (Array.isArray(value)) {
      value.forEach((item,index)=>flattenReferenceValues(item,[...path,String(index)],out));
      return out;
    }
    if (isPlainObject(value)) {
      const reference = findMappedField(value,'reference');
      const situation = findMappedField(value,'situation');
      const candidates = referencePrimitiveEntries(value);
      const text = primitiveText(reference.value) || candidates.map(([,entry])=>primitiveText(entry)).filter(Boolean).join(' · ');
      if (text) out.push({text,situation:primitiveText(situation.value),raw:value,path});
      for (const [key,nested] of Object.entries(value)) {
        if (Array.isArray(nested) || isPlainObject(nested)) flattenReferenceValues(nested,[...path,key],out);
      }
      return out;
    }
    if (hasPrimitiveValue(value)) out.push({text:primitiveText(value),situation:'',raw:value,path});
    return out;
  }

  function flattenDetailedValues(value,baseKey,path=[],out=[]) {
    if (Array.isArray(value)) {
      value.forEach((item,index)=>flattenDetailedValues(item,baseKey,[...path,String(index)],out));
      return out;
    }
    if (isPlainObject(value)) {
      if (baseKey === 'jagua' && isJaguaHeader(value,path.at(-1) || '')) {
        out.push({header:true,raw:value,path});
        return out;
      }
      const signalCount = recognizedSignalCount(value);
      const primitives = primitiveEntries(value).filter(([,entry])=>hasPrimitiveValue(entry));
      if (signalCount > 0 || (primitives.length >= 2 && !hasNestedCollection(value))) {
        out.push({header:false,raw:value,path});
        return out;
      }
      for (const [key,nested] of Object.entries(value)) flattenDetailedValues(nested,baseKey,[...path,key],out);
      return out;
    }
    if (hasPrimitiveValue(value)) out.push({referenceOnly:true,text:primitiveText(value),raw:value,path});
    return out;
  }

  function noticeTexts(cooperator,baseKey) {
    const def = BASE_DEFINITIONS[baseKey];
    const result = [];
    for (const listName of def.noticeLists || []) {
      const entry = findStructuralEntry(cooperator,listName);
      if (!entry) continue;
      flattenReferenceValues(entry[1]).forEach((item)=>{
        const details = isPlainObject(item.raw) ? primitiveEntries(item.raw).filter(([,value])=>hasPrimitiveValue(value)).map(([key,value])=>`${key}: ${primitiveText(value)}`).join(' · ') : '';
        result.push(`${listName === 'trocas' ? 'Troca' : 'Titularidade'}: ${details || item.text}`);
      });
    }
    return result;
  }

  function inferAreaUnit(value,key) {
    const source = `${key || ''} ${primitiveText(value)}`;
    const text = normalizeText(source);
    if (/hectare|(^| )ha( |$)/.test(text)) return 'ha';
    if (/m2|m²|metro quadrado/.test(source.toLowerCase())) return 'm²';
    if (/metro/.test(text)) return 'm';
    return '';
  }

  function capacityMetadata(key,baseKey,value) {
    const normalized = normalizeKey(key || '');
    if (normalized === 'cap aloja' || /capacidade.*aloj/.test(normalized)) return {concept:'Capacidade de alojamento',unit:'aves'};
    if (normalized === 'qtde lotacao' || /lotacao/.test(normalized)) return {concept:'Lotação máxima da pocilga',unit:'suínos'};
    if (normalized === 'quantidade aves' || normalized === 'qt aves') return {concept:'Quantidade de aves',unit:'aves'};
    if (normalized === 'maximo aves') return {concept:'Máximo de aves',unit:'aves'};
    if (normalized === 'total aves') return {concept:'Total de aves do núcleo',unit:'aves'};
    if (/plantel/.test(normalized)) return {concept:'Quantidade de animais',unit:baseKey === 'suinos' ? 'suínos' : 'aves'};
    const text = normalizeText(`${key || ''} ${primitiveText(value)}`);
    if (baseKey === 'suinos' || /suino/.test(text)) return {concept:'Capacidade/quantidade de suínos',unit:'suínos'};
    if (baseKey === 'matrizes' || /matriz/.test(text)) return {concept:'Capacidade/quantidade de matrizes',unit:'matrizes'};
    return {concept:/aloj|capacidade/.test(text) ? 'Capacidade de alojamento' : 'Quantidade de animais',unit:'aves'};
  }

  function activityFor(baseKey,raw,cooperatorRaw) {
    const def = BASE_DEFINITIONS[baseKey];
    if (baseKey !== 'larPostura') return def.activity;
    const direct = findMappedField(raw,'activityType');
    const parent = findMappedField(cooperatorRaw,'activityType');
    const value = primitiveText(direct.value) || primitiveText(parent.value);
    const normalized = normalizeText(value);
    if (/recria/.test(normalized)) return 'Recria';
    if (/postura/.test(normalized)) return 'Postura';
    return value || def.activity;
  }

  function mapInstallation(raw,baseKey,mapped,recordId) {
    const code = primitiveText(mapped.installationCode.value);
    const type = primitiveText(mapped.installationType.value);
    const area = primitiveText(mapped.area.value);
    const capacity = primitiveText(mapped.capacity.value);
    if (!code && !type && !area) return [];
    const capacityMeta = capacityMetadata(mapped.capacity.key,baseKey,mapped.capacity.value);
    return [{
      id:stableId(`${recordId}:installation`),involved:false,code,type:type || (!code ? 'Registro do local' : ''),
      area,areaUnit:inferAreaUnit(mapped.area.value,mapped.area.key),capacity,
      capacityUnit:capacityMeta.unit,capacityConcept:capacityMeta.concept,raw:null
    }];
  }

  function isVrMovementDifference(origin,situation) {
    if (normalizeText(origin) !== 'endosso') return false;
    return /(aumento|reducao|diminuicao|acrescimo|decremento|diferenca|variacao|alteracao)(?: de)? vr|vr (?:aumentado|reduzido|alterado)|reduz|aument/.test(normalizeText(situation));
  }

  function referenceAlreadyDetailed(text,references) {
    const normalized = normalizeText(text);
    if (!normalized) return false;
    return references.some((reference)=>{
      const candidate=normalizeText(reference);
      return candidate && normalized === candidate;
    });
  }

  function mapDetailedRecord(baseKey,descriptor,index,digest) {
    const def = BASE_DEFINITIONS[baseKey];
    const raw = descriptor.raw;
    const mapped = mappedFields(raw);
    const warnings = [...(descriptor.warnings || [])];
    for (const [name,field] of Object.entries(mapped)) if (field.ambiguous) warnings.push(`Campo “${name}” ambíguo: ${(field.candidates || []).join(', ')}.`);
    const combined = hasPrimitiveValue(mapped.coordinates.value) ? parseCombinedCoordinates(mapped.coordinates.value) : null;
    const latitude = primitiveText(mapped.latitude.value) || primitiveText(combined?.latitude);
    const longitude = primitiveText(mapped.longitude.value) || primitiveText(combined?.longitude);
    if ((latitude || longitude) && !(parseCoordinateNumber(latitude,'lat').valid && parseCoordinateNumber(longitude,'lng').valid)) warnings.push('Coordenadas incompletas ou incompatíveis; o conteúdo original foi preservado para revisão.');
    for (const [label,field] of [['Área/metragem',mapped.area],['Capacidade/quantidade',mapped.capacity],['VR de benfeitorias',mapped.vrBuildings],['VR de animais',mapped.vrAnimals],['Total Danos Materiais Aviários',mapped.materialDamageAviaries]]) {
      if (hasPrimitiveValue(field.value) && parseLocaleNumber(field.value).ambiguous) warnings.push(`${label} possui representação numérica ambígua: “${primitiveText(field.value)}”.`);
    }
    if (primitiveEntries(raw).some(([,value])=>typeof value === 'string' && /verificar\s+endosso/i.test(value))) warnings.push('VERIFICAR ENDOSSO: a base não informa o conteúdo necessário para conclusão automática.');
    const recordPath = descriptor.path || [];
    const recordId = stableId(`${digest}:${baseKey}:${descriptor.cooperatorKey}:${descriptor.listName}:${recordPath.join('/')}:${index}`);
    const capacityMeta = capacityMetadata(mapped.capacity.key,baseKey,mapped.capacity.value);
    const situation = primitiveText(mapped.situation.value) || primitiveText(mapped.movement.value);
    const historicalExit = normalizeText(descriptor.origin) === 'endosso' && /\b(saida|exclusao|exclusoes)\b/.test(normalizeText(situation));
    const vrDifference = historicalExit || isVrMovementDifference(descriptor.origin,situation);
    if (normalizeText(descriptor.origin) === 'endosso') warnings.push('Registro histórico de endosso: a referência não comprova a vigência na data do sinistro. Confira a aplicabilidade e o significado dos valores antes de utilizá-los.');
    const extraFields = [];
    if (hasPrimitiveValue(mapped.materialDamageAviaries.value)) extraFields.push({
      key:'materialDamageAviaries',label:'Total Danos Materiais Aviários',value:primitiveText(mapped.materialDamageAviaries.value),
      sourceField:mapped.materialDamageAviaries.key || 'danosAviarios',canUseAs:'vrBuildings',requiresEquivalenceConfirmation:true
    });
    if (vrDifference && hasPrimitiveValue(mapped.vrBuildings.value)) extraFields.push({
      key:'vrBuildingsMovement',label:'Movimentação de VR de benfeitorias',value:primitiveText(mapped.vrBuildings.value),
      sourceField:mapped.vrBuildings.key || '',canUseAs:'',requiresEquivalenceConfirmation:false
    });
    if (vrDifference && hasPrimitiveValue(mapped.vrAnimals.value)) extraFields.push({
      key:'vrAnimalsMovement',label:'Movimentação de VR de animais',value:primitiveText(mapped.vrAnimals.value),
      sourceField:mapped.vrAnimals.key || '',canUseAs:'',requiresEquivalenceConfirmation:false
    });
    if (vrDifference) warnings.push(historicalExit ? 'Valores de saída/exclusão preservados como movimentação histórica, sem preencher o VR atual.' : 'O valor deste endosso representa movimentação de VR e não foi tratado como valor total atual.');
    const record = {
      id:recordId,recordType:'detail',baseKey,baseLabel:def.label,cooperative:def.cooperative,
      activity:activityFor(baseKey,raw,descriptor.cooperatorRaw),cooperatorKey:String(descriptor.cooperatorKey),
      cooperatorPath:clone(descriptor.cooperatorPath || []),listName:descriptor.listName,listIndex:descriptor.listIndex,
      path:recordPath,recordIndex:index,name:primitiveText(mapped.name.value) || descriptor.cooperatorName,
      municipality:primitiveText(mapped.municipality.value),state:primitiveText(mapped.state.value),
      localIdentification:primitiveText(mapped.local.value),latitude,longitude,
      installationCode:primitiveText(mapped.installationCode.value),area:primitiveText(mapped.area.value),
      areaUnit:inferAreaUnit(mapped.area.value,mapped.area.key),capacity:primitiveText(mapped.capacity.value),
      capacityUnit:capacityMeta.unit,capacityConcept:capacityMeta.concept,
      vrBuildings:vrDifference ? '' : primitiveText(mapped.vrBuildings.value),
      vrAnimals:vrDifference ? '' : primitiveText(mapped.vrAnimals.value),
      category:descriptor.origin,reference:primitiveText(mapped.reference.value),
      situation,
      warnings:[...new Set(warnings)],installations:[],extraFields,raw:clone(raw),
      fieldOrigins:Object.fromEntries(Object.entries(mapped).map(([key,value])=>[key,value.key || null]))
    };
    record.installations = mapInstallation(raw,baseKey,mapped,recordId);
    record.searchName = normalizeText(record.name);
    record.hasLocationIdentity = Boolean(record.municipality || record.localIdentification || record.latitude || record.longitude || record.installationCode);
    record.relatedGroupKey = `${digest}:${baseKey}:${record.cooperatorKey}`;
    return record;
  }

  function mapReferenceRecord(baseKey,descriptor,index,digest) {
    const def = BASE_DEFINITIONS[baseKey];
    const id = stableId(`${digest}:${baseKey}:${descriptor.cooperatorKey}:${descriptor.listName}:reference:${descriptor.path.join('/')}:${index}:${descriptor.text}`);
    const record = {
      id,recordType:'reference',baseKey,baseLabel:def.label,cooperative:def.cooperative,
      activity:activityFor(baseKey,{},descriptor.cooperatorRaw),cooperatorKey:String(descriptor.cooperatorKey),
      cooperatorPath:clone(descriptor.cooperatorPath || []),listName:descriptor.listName,listIndex:descriptor.listIndex,
      path:clone(descriptor.path),recordIndex:index,name:descriptor.cooperatorName,
      municipality:'',state:'',localIdentification:'',latitude:'',longitude:'',installationCode:'',
      area:'',areaUnit:'',capacity:'',capacityUnit:'',capacityConcept:'Capacidade/quantidade informada',
      vrBuildings:'',vrAnimals:'',category:descriptor.origin,reference:descriptor.text || '',
      situation:descriptor.situation || '',warnings:[...(descriptor.warnings || []),'Referência de endosso sem detalhamento de local, instalação ou valores.'],
      installations:[],extraFields:[],raw:isPlainObject(descriptor.raw) ? clone(descriptor.raw) : descriptor.raw,
      fieldOrigins:{},searchName:normalizeText(descriptor.cooperatorName),hasLocationIdentity:false,
      relatedGroupKey:`${digest}:${baseKey}:${descriptor.cooperatorKey}`
    };
    return record;
  }

  function adaptBase(baseKey,source,digest) {
    const def = BASE_DEFINITIONS[baseKey];
    const warnings = [];
    const records = [];
    const counts = {cadastros:0,detalhados:0,referencias:0,referenciasVinculadas:0,avisos:0,cabecalhosIgnorados:0,itensIgnorados:0,cadastrosSemDetalhe:0};
    const discovered = discoverCooperators(source,baseKey);
    const cooperators = discovered.filter((entry)=>!entry.header);
    counts.cabecalhosIgnorados += discovered.filter((entry)=>entry.header).length;
    for (const entry of discovered.filter((entry)=>entry.header)) for (const [list] of def.detailLists) {
      const value=findStructuralEntry(entry.raw,list)?.[1];
      counts.itensIgnorados += Array.isArray(value) ? value.length : value ? 1 : 0;
    }
    if (counts.cabecalhosIgnorados) warnings.push(`${counts.cabecalhosIgnorados} cabeçalho(s) de planilha foram identificados e excluídos dos resultados pesquisáveis.`);
    counts.cadastros = cooperators.length;
    let recordIndex = 0;
    for (const [cooperatorPosition,cooperator] of cooperators.entries()) {
      const name = cooperator.name || cooperatorName(cooperator.raw,cooperator.key);
      const cooperatorKey = `${cooperator.key || cooperatorPosition}`;
      const commonWarnings = noticeTexts(cooperator.raw,baseKey);
      counts.avisos += commonWarnings.length;
      const firstRecordIndex=records.length;
      const detailedReferences = [];
      let detailedForCooperator = 0;
      for (const [listName,origin] of def.detailLists || []) {
        const entry = findStructuralEntry(cooperator.raw,listName);
        if (!entry) continue;
        const flattened = flattenDetailedValues(entry[1],baseKey);
        for (const [listIndex,item] of flattened.entries()) {
          if (item.header) {
            counts.cabecalhosIgnorados += 1;
            counts.itensIgnorados += 1;
            warnings.push(`Cabeçalho da base ${def.label} ignorado em ${listName}${name ? ` para ${name}` : ''}.`);
            continue;
          }
          const descriptor = {
            raw:item.raw,path:[listName,...item.path],cooperatorRaw:cooperator.raw,cooperatorPath:cooperator.path,
            cooperatorKey,cooperatorName:name,listName,listIndex,origin,warnings:commonWarnings
          };
          if (item.referenceOnly) {
            descriptor.text = item.text; descriptor.situation = '';
            records.push(mapReferenceRecord(baseKey,descriptor,recordIndex++,digest));
            counts.referencias += 1;
          } else {
            const detailed = mapDetailedRecord(baseKey,descriptor,recordIndex++,digest);
            records.push(detailed);
            if (primitiveText(detailed.reference)) detailedReferences.push(detailed.reference);
            counts.detalhados += 1; detailedForCooperator += 1;
          }
        }
      }
      for (const [listName,origin] of def.referenceLists || []) {
        const entry = findStructuralEntry(cooperator.raw,listName);
        if (!entry) continue;
        const refs = flattenReferenceValues(entry[1]);
        for (const [listIndex,item] of refs.entries()) {
          if (referenceAlreadyDetailed(item.text,detailedReferences)) {
            counts.referenciasVinculadas += 1;
            continue;
          }
          records.push(mapReferenceRecord(baseKey,{
            raw:item.raw,path:[listName,...item.path],cooperatorRaw:cooperator.raw,cooperatorPath:cooperator.path,
            cooperatorKey,cooperatorName:name,listName,listIndex,origin,text:item.text,situation:item.situation,warnings:commonWarnings
          },recordIndex++,digest));
          counts.referencias += 1;
        }
      }
      if (!detailedForCooperator && recognizedSignalCount(cooperator.raw)>0 && !hasStructuralData(cooperator.raw,baseKey)) {
        records.push(mapDetailedRecord(baseKey,{
          raw:cooperator.raw,path:['registroDireto'],cooperatorRaw:cooperator.raw,cooperatorPath:cooperator.path,
          cooperatorKey,cooperatorName:name,listName:'registroDireto',listIndex:0,origin:'Não informado',warnings:commonWarnings
        },recordIndex++,digest));
        counts.detalhados += 1; detailedForCooperator += 1;
      }
      if (!detailedForCooperator) counts.cadastrosSemDetalhe += 1;
      if (records.length === firstRecordIndex) {
        const notice=mapReferenceRecord(baseKey,{
          raw:cooperator.raw,path:[],cooperatorRaw:cooperator.raw,cooperatorPath:cooperator.path,
          cooperatorKey,cooperatorName:name,listName:'cadastro',listIndex:0,origin:'Cadastro sem detalhamento',text:'',situation:'',warnings:commonWarnings
        },recordIndex++,digest);
        notice.recordType='notice';
        notice.warnings=[...commonWarnings,'Cadastro sem registros detalhados de local. Confira os avisos e a documentação de origem.'];
        records.push(notice);
      }
    }
    if (counts.referenciasVinculadas) warnings.push(`${counts.referenciasVinculadas} referência(s) textual(is) já representada(s) por movimentações detalhadas foram vinculadas sem duplicação.`);
    return {records,counts,warnings};
  }

  async function sha256(text) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes)).map((byte)=>byte.toString(16).padStart(2,'0')).join('');
    }
    throw new Error('SHA-256 indisponível. Abra o aplicativo por HTTPS ou localhost para importar a base com rastreabilidade.');
  }

  async function buildBase(html,fileMeta={}) {
    const data = parseDataFromHtml(html);
    const digest = await sha256(html);
    const records = [];
    const counts = {};
    const countDetails = {};
    const warnings = [];
    for (const [baseKey,definition] of Object.entries(BASE_DEFINITIONS)) {
      const sourceKey = Object.keys(data).find((key)=>normalizeKey(key) === normalizeKey(baseKey));
      if (!sourceKey) {
        counts[baseKey] = 0;
        countDetails[baseKey] = {cadastros:0,detalhados:0,referencias:0,referenciasVinculadas:0,avisos:0,cabecalhosIgnorados:0,itensIgnorados:0,cadastrosSemDetalhe:0};
        warnings.push(`Base “${baseKey}” não encontrada no objeto DATA.`);
        continue;
      }
      const adapted = adaptBase(baseKey,data[sourceKey],digest);
      records.push(...adapted.records);
      counts[baseKey] = adapted.counts.detalhados;
      countDetails[baseKey] = adapted.counts;
      warnings.push(...adapted.warnings);
      if (!adapted.counts.cadastros) warnings.push(`Base “${definition.label}” localizada, mas nenhum cadastro de cooperado foi reconhecido.`);
      else if (!adapted.counts.detalhados) warnings.push(`Base “${definition.label}” possui cadastros, porém nenhum registro detalhado de local ou movimentação foi reconhecido.`);
    }
    const totalDetailedRecords = records.filter((record)=>record.recordType === 'detail').length;
    const totalReferences = records.filter((record)=>record.recordType === 'reference').length;
    const totalNotices = records.filter((record)=>record.recordType === 'notice').length;
    if (new Set(records.map(record=>record.id)).size !== records.length) throw new Error('Identificadores duplicados detectados na base. A importação foi interrompida para preservar a identificação dos riscos.');
    return {
      schemaVersion:NORMALIZED_SCHEMA_VERSION,importerVersion:IMPORTER_VERSION,loadedAt:new Date().toISOString(),
      fileName:fileMeta.name || 'CONSULTA DE COOPERADOS.html',fileLastModified:fileMeta.lastModified ? new Date(fileMeta.lastModified).toISOString() : null,
      sizeBytes:fileMeta.size || new Blob([html]).size,sha256:digest,
      versionLabel:`${fileMeta.name || 'Base HTML'} · importador ${IMPORTER_VERSION} · SHA-256 ${digest.slice(0,12)}`,
      counts,countDetails,totalRecords:records.length,totalDetailedRecords,totalReferences,totalNotices,warnings:[...new Set(warnings)],records,
      sourceHtml:html
    };
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject)=>{
      const request = indexedDB.open(DB_NAME,1);
      request.onupgradeneeded = ()=>{ const db=request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
      request.onsuccess = ()=>resolve(request.result);
      request.onerror = ()=>reject(request.error);
    });
    return dbPromise;
  }

  async function dbGet(key) {
    const db = await openDb();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction(STORE,'readonly');
      const request=transaction.objectStore(STORE).get(key);
      request.onsuccess=()=>resolve(request.result || null);
      request.onerror=()=>reject(request.error);
    });
  }

  async function saveBase(base) {
    try {
      const db = await openDb();
      await new Promise((resolve,reject)=>{
        const transaction=db.transaction(STORE,'readwrite');
        transaction.objectStore(STORE).put(base,KEY);
        transaction.oncomplete=resolve;
        transaction.onerror=()=>reject(transaction.error);
      });
      try { localStorage.removeItem(LEGACY_FALLBACK_KEY); } catch {}
      return;
    } catch (error) {
      try {
        const fallback = clone(base);
        delete fallback.sourceHtml;
        localStorage.setItem(FALLBACK_KEY,JSON.stringify(fallback));
      } catch { throw new Error(`Não foi possível armazenar a base localmente: ${error?.message || error}`); }
    }
  }

  function validBase(base) {
    return Boolean(base && base.schemaVersion >= NORMALIZED_SCHEMA_VERSION && base.importerVersion === IMPORTER_VERSION && Array.isArray(base.records));
  }

  async function loadBase() {
    staleBaseDetected = false;
    try {
      const current = await dbGet(KEY);
      if (validBase(current)) return current;
      if (current) staleBaseDetected = true;
      const legacy = await dbGet(LEGACY_KEY);
      if (legacy) staleBaseDetected = true;
    } catch {}
    try {
      const current = JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null');
      if (validBase(current)) return current;
      if (current) staleBaseDetected = true;
      if (localStorage.getItem(LEGACY_FALLBACK_KEY)) staleBaseDetected = true;
    } catch {}
    return null;
  }

  function formatRiskAddress(confirmed) {
    const local = primitiveText(confirmed?.localIdentification);
    const municipality = primitiveText(confirmed?.municipality);
    const state = primitiveText(confirmed?.state);
    const municipalityState = [municipality,state].filter(Boolean).join(' - ');
    return [local,municipalityState].filter(Boolean).join(', ');
  }

  function sourceDescriptor(record) {
    return {
      recordId:record.id,baseKey:record.baseKey,baseLabel:record.baseLabel,cooperative:record.cooperative,
      activity:record.activity,cooperatorKey:record.cooperatorKey,listName:record.listName,
      cooperatorPath:clone(record.cooperatorPath || []),path:clone(record.path || []),listIndex:record.listIndex,
      baseSha256:loadedBase?.sha256 || '',
      category:record.category,reference:record.reference,situation:record.situation,
      municipality:record.municipality,localIdentification:record.localIdentification,
      installationCode:record.installationCode,fieldOrigins:clone(record.fieldOrigins || {}),rawRecord:clone(record.raw)
    };
  }

  function valueSource(record,field) {
    return {
      type:'imported',field,recordId:record.id,baseKey:record.baseKey,baseLabel:record.baseLabel,
      activity:record.activity,cooperatorKey:record.cooperatorKey,listName:record.listName,
      origin:record.category,reference:record.reference || '',sourceField:record.fieldOrigins?.[field] || null,
      source:sourceDescriptor(record)
    };
  }

  function relatedSnapshot(record) {
    return {
      id:record.id,recordType:record.recordType,baseKey:record.baseKey,baseLabel:record.baseLabel,
      cooperative:record.cooperative,activity:record.activity,cooperatorKey:record.cooperatorKey,
      name:record.name,municipality:record.municipality,state:record.state,localIdentification:record.localIdentification,
      latitude:record.latitude,longitude:record.longitude,installationCode:record.installationCode,
      category:record.category,reference:record.reference,situation:record.situation,
      source:sourceDescriptor(record),
      vrBuildings:record.vrBuildings,vrAnimals:record.vrAnimals,extraFields:clone(record.extraFields || []),
      fieldOrigins:clone(record.fieldOrigins || {}),raw:clone(record.raw)
    };
  }

  function relatedRecordsFor(record) {
    if (!loadedBase) return [];
    return loadedBase.records
      .filter((candidate)=>candidate.id !== record.id && candidate.recordType === 'detail' && candidate.baseKey === record.baseKey && candidate.cooperatorKey === record.cooperatorKey)
      .map(relatedSnapshot);
  }

  function selectionFromRecord(record) {
    const confirmed = {
      name:record.name,cooperative:record.cooperative,activity:record.activity,
      municipality:record.municipality,state:record.state,localIdentification:record.localIdentification,
      latitude:record.latitude,longitude:record.longitude,area:record.area,areaUnit:record.areaUnit,
      capacity:record.capacity,capacityUnit:record.capacityUnit,capacityConcept:record.capacityConcept,
      vrBuildings:record.vrBuildings,vrAnimals:record.vrAnimals,sourceCategory:record.category,
      sourceReference:record.reference,situation:record.situation,installations:clone(record.installations || []),
      extraFields:clone(record.extraFields || [])
    };
    const fieldSources = {};
    if (hasPrimitiveValue(record.vrBuildings)) fieldSources.vrBuildings = valueSource(record,'vrBuildings');
    if (hasPrimitiveValue(record.vrAnimals)) fieldSources.vrAnimals = valueSource(record,'vrAnimals');
    return {
      schemaVersion:SELECTION_SCHEMA_VERSION,selectedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
      sourceRecordId:record.id,baseVersion:loadedBase ? {
        schemaVersion:loadedBase.schemaVersion,importerVersion:loadedBase.importerVersion,versionLabel:loadedBase.versionLabel,
        fileName:loadedBase.fileName,sha256:loadedBase.sha256,loadedAt:loadedBase.loadedAt
      } : null,
      source:sourceDescriptor(record),original:clone(confirmed),confirmed,fieldSources,
      associatedRecordIds:[],relatedCandidates:relatedRecordsFor(record),recoverySuggestions:[],
      reimportReview:null,requiresReselection:false,warnings:clone(record.warnings || [])
    };
  }

  function normalizeInstallation(item,index=0) {
    return {
      id:String(item?.id || stableId(`installation:${index}:${JSON.stringify(item || {})}`)),
      involved:item?.involved !== false,code:primitiveText(item?.code),type:primitiveText(item?.type),
      area:primitiveText(item?.area),areaUnit:primitiveText(item?.areaUnit),capacity:primitiveText(item?.capacity),
      capacityUnit:primitiveText(item?.capacityUnit),capacityConcept:primitiveText(item?.capacityConcept) || 'Capacidade/quantidade informada',
      raw:item?.raw ? clone(item.raw) : null
    };
  }

  function normalizeExtraField(item,index=0) {
    return {
      key:primitiveText(item?.key) || `extra_${index}`,label:primitiveText(item?.label) || 'Informação adicional',
      value:primitiveText(item?.value),sourceField:primitiveText(item?.sourceField),canUseAs:primitiveText(item?.canUseAs),
      requiresEquivalenceConfirmation:item?.requiresEquivalenceConfirmation === true,
      source:item?.source ? clone(item.source) : null
    };
  }

  function normalizeSelection(selection) {
    if (!selection || typeof selection !== 'object') return null;
    const confirmed = selection.confirmed || {};
    const normalizedConfirmed = {
      name:primitiveText(confirmed.name),cooperative:primitiveText(confirmed.cooperative || selection.source?.cooperative),
      activity:primitiveText(confirmed.activity || selection.source?.activity),municipality:primitiveText(confirmed.municipality),
      state:primitiveText(confirmed.state),localIdentification:primitiveText(confirmed.localIdentification),
      latitude:primitiveText(confirmed.latitude),longitude:primitiveText(confirmed.longitude),area:primitiveText(confirmed.area),
      areaUnit:primitiveText(confirmed.areaUnit),capacity:primitiveText(confirmed.capacity),capacityUnit:primitiveText(confirmed.capacityUnit),
      capacityConcept:primitiveText(confirmed.capacityConcept) || 'Capacidade/quantidade informada',
      vrBuildings:primitiveText(confirmed.vrBuildings),vrAnimals:primitiveText(confirmed.vrAnimals),
      sourceCategory:primitiveText(hasOwn(confirmed,'sourceCategory') ? confirmed.sourceCategory : selection.source?.category),
      sourceReference:primitiveText(hasOwn(confirmed,'sourceReference') ? confirmed.sourceReference : selection.source?.reference),
      situation:primitiveText(hasOwn(confirmed,'situation') ? confirmed.situation : selection.source?.situation),
      installations:Array.isArray(confirmed.installations) ? confirmed.installations.map(normalizeInstallation) : [],
      extraFields:Array.isArray(confirmed.extraFields) ? confirmed.extraFields.map(normalizeExtraField) : []
    };
    const warnings = Array.isArray(selection.warnings) ? selection.warnings.map(String) : [];
    if ((selection.schemaVersion || 1) < SELECTION_SCHEMA_VERSION) warnings.push('Seleção criada por uma versão anterior do importador. Reimporte a base e confira novamente o local e a atividade antes de reutilizar o relatório.');
    return {
      schemaVersion:SELECTION_SCHEMA_VERSION,selectedAt:selection.selectedAt || new Date().toISOString(),
      updatedAt:selection.updatedAt || selection.selectedAt || new Date().toISOString(),
      sourceRecordId:primitiveText(selection.sourceRecordId),baseVersion:selection.baseVersion ? clone(selection.baseVersion) : null,
      source:selection.source ? clone(selection.source) : {},original:selection.original ? clone(selection.original) : clone(normalizedConfirmed),
      confirmed:normalizedConfirmed,fieldSources:selection.fieldSources ? clone(selection.fieldSources) : {},
      associatedRecordIds:Array.isArray(selection.associatedRecordIds) ? selection.associatedRecordIds.map(String) : [],
      relatedCandidates:Array.isArray(selection.relatedCandidates) ? clone(selection.relatedCandidates) : [],
      recoverySuggestions:Array.isArray(selection.recoverySuggestions) ? clone(selection.recoverySuggestions) : [],
      reimportReview:selection.reimportReview ? clone(selection.reimportReview) : null,
      requiresReselection:selection.requiresReselection === true,warnings:[...new Set(warnings)]
    };
  }

  function compareSelection(selection) {
    if (!selection) return [];
    const original=selection.original || {}, confirmed=selection.confirmed || {};
    const labels={name:'Nome',cooperative:'Cooperativa',activity:'Atividade',municipality:'Município',state:'UF',localIdentification:'Identificação do local',latitude:'Latitude',longitude:'Longitude',area:'Área/metragem',capacity:'Capacidade/quantidade',vrBuildings:'VR de benfeitorias',vrAnimals:'VR de animais',sourceCategory:'Origem',sourceReference:'Referência',situation:'Situação'};
    const changes=[];
    for (const [key,label] of Object.entries(labels)) if (primitiveText(original[key]) !== primitiveText(confirmed[key])) changes.push(label);
    if (JSON.stringify(original.installations || []) !== JSON.stringify(confirmed.installations || [])) changes.push('Instalações envolvidas');
    if (JSON.stringify((original.extraFields || []).map(normalizeExtraField)) !== JSON.stringify((confirmed.extraFields || []).map(normalizeExtraField))) changes.push('Informações adicionais');
    return changes;
  }

  function validateSelection(selection) {
    const errors=[], warnings=[];
    if (!selection) return {errors,warnings};
    const confirmed=selection.confirmed || {};
    if (!primitiveText(confirmed.name)) errors.push('A seleção de cooperado não possui nome confirmado.');
    if (!primitiveText(confirmed.activity)) errors.push('Confirme a atividade correspondente ao local selecionado.');
    if (selection.requiresReselection) errors.push('A nova base exige conferência do local e da atividade. Faça uma nova seleção explícita antes de concluir.');
    const installations=Array.isArray(confirmed.installations) ? confirmed.installations : [];
    if (installations.length && !installations.some((item)=>item.involved)) errors.push('Selecione ao menos uma instalação relacionada ao sinistro.');
    const latitude=primitiveText(confirmed.latitude), longitude=primitiveText(confirmed.longitude);
    if ((latitude || longitude) && !(parseCoordinateNumber(latitude,'lat').valid && parseCoordinateNumber(longitude,'lng').valid)) warnings.push('Confira as coordenadas do local selecionado.');
    for (const value of [confirmed.vrBuildings,confirmed.vrAnimals]) if (primitiveText(value) && parseLocaleNumber(value).ambiguous) warnings.push(`Valor numérico ambíguo preservado: “${primitiveText(value)}”.`);
    warnings.push(...(selection.warnings || []));
    return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
  }

  function sourceLabel(source) {
    if (!source) return 'Não informado';
    const parts=[source.baseLabel || source.baseKey,source.activity,source.origin && `Origem: ${source.origin}`,source.reference && `Referência: ${source.reference}`].filter(Boolean);
    return parts.join(' · ') || 'Não informado';
  }

  function reportData(state) {
    const selection=normalizeSelection(state?.cooperatorSelection);
    if (!selection) return null;
    const c=selection.confirmed;
    const coordinates=[c.latitude,c.longitude].filter((value)=>primitiveText(value)).join(' / ') || 'Não informado';
    const sourceParts=[selection.source?.baseLabel || [c.cooperative,c.activity].filter(Boolean).join(' — ')].filter(Boolean);
    const version=selection.baseVersion?.versionLabel || selection.baseVersion?.fileName || 'Não informado';
    const installations=(c.installations || []).filter((item)=>item.involved).map((item,index)=>({
      index:index+1,code:notInformed(item.code),type:notInformed(item.type),area:valueWithUnit(item.area,item.areaUnit),
      capacity:valueWithUnit(item.capacity,item.capacityUnit),capacityConcept:notInformed(item.capacityConcept)
    }));
    const rows=[
      ['Cooperado',notInformed(c.name)],
      ['Cooperativa e atividade',[c.cooperative,c.activity].filter(Boolean).join(' — ') || 'Não informado'],
      ['Município',notInformed(c.municipality)],
      ['UF',notInformed(c.state)],
      ['Identificação do local / propriedade',notInformed(c.localIdentification)],
      ['Coordenadas',coordinates],
      ['Área ou metragem',valueWithUnit(c.area,c.areaUnit)],
      [c.capacityConcept || 'Capacidade/quantidade',valueWithUnit(c.capacity,c.capacityUnit)],
      ['VR de benfeitorias',displayMoney(c.vrBuildings)],
      ['VR de animais',displayMoney(c.vrAnimals)]
    ];
    for (const extra of c.extraFields || []) {
      rows.push([extra.label,displayMoney(extra.value)]);
      if (extra.source) rows.push([`Origem de ${extra.label}`,sourceLabel({...extra.source,origin:extra.source.category})]);
    }
    if (selection.fieldSources?.vrBuildings && selection.fieldSources.vrBuildings.recordId !== selection.sourceRecordId) rows.push(['Origem do VR de benfeitorias',sourceLabel(selection.fieldSources.vrBuildings)]);
    if (selection.fieldSources?.vrAnimals && selection.fieldSources.vrAnimals.recordId !== selection.sourceRecordId) rows.push(['Origem do VR de animais',sourceLabel(selection.fieldSources.vrAnimals)]);
    rows.push(
      ['Base de origem',sourceParts.join(' · ') || 'Não informado'],
      ['Origem do registro',notInformed(c.sourceCategory)],
      ['Referência da planilha / endosso',notInformed(c.sourceReference)],
      ['Situação / movimentação registrada',notInformed(c.situation)],
      ['Versão da base utilizada',version]
    );
    return {rows,installations,changes:compareSelection(selection),warnings:validateSelection(selection).warnings};
  }

  function reportHtml(state,{esc:escapeHtml=esc}={}) {
    if (window.FastTrackRiskCard) return window.FastTrackRiskCard.html(state);
    const data=reportData(state);
    if (!data) return '';
    const rows=data.rows.map(([label,value])=>`<div class="location-data-row"><strong>${escapeHtml(label)}:</strong><span>${escapeHtml(value)}</span></div>`).join('');
    const installations=data.installations.length
      ? `<div class="location-installations"><strong>Instalações relacionadas ao sinistro:</strong>${data.installations.map((item)=>`<div class="location-installation-item"><span>${item.index}.</span><div><b>${escapeHtml(item.code)}</b>${item.type !== 'Não informado' ? ` — ${escapeHtml(item.type)}` : ''}<br><small>Área: ${escapeHtml(item.area)} · ${escapeHtml(item.capacityConcept)}: ${escapeHtml(item.capacity)}</small></div></div>`).join('')}</div>`
      : '<div class="location-installations"><strong>Instalações relacionadas ao sinistro:</strong><span> Não informado</span></div>';
    const changes=data.changes.length ? `<p class="location-source-note"><strong>Ajustes registrados pelo regulador:</strong> ${escapeHtml(data.changes.join(', '))}.</p>` : '';
    return `<div class="location-data-block"><div class="doc-subsection">DADOS CONFIRMADOS DO LOCAL</div>${rows}${installations}${changes}</div>`;
  }

  function baseStatusHtml() {
    if (!loadedBase) {
      if (staleBaseDetected) return '<div class="notice warn"><strong>Reimportação necessária.</strong> A base armazenada foi criada pelo importador anterior e não será reutilizada, pois pode conter registros incompletos. Selecione novamente o arquivo CONSULTA DE COOPERADOS.html.</div>';
      return '<div class="notice info">Nenhuma base de cooperados foi carregada neste navegador. Atualize a base utilizando o arquivo HTML de consulta.</div>';
    }
    const countItems=Object.entries(BASE_DEFINITIONS).map(([key,definition])=>{
      const detail=loadedBase.countDetails?.[key] || {};
      return `${definition.label}: ${detail.cadastros || 0} cadastro(s), ${detail.detalhados || 0} detalhado(s), ${detail.referencias || 0} referência(s) sem detalhamento, ${detail.avisos || 0} aviso(s) de titularidade${detail.referenciasVinculadas ? `, ${detail.referenciasVinculadas} referência(s) vinculada(s)` : ''}${detail.cabecalhosIgnorados ? `, ${detail.cabecalhosIgnorados} cabeçalho(s) e ${detail.itensIgnorados || 0} item(ns) de cabeçalho ignorado(s)` : ''}${detail.cadastrosSemDetalhe ? `, ${detail.cadastrosSemDetalhe} cadastro(s) sem detalhe de local` : ''}`;
    }).join(' · ');
    const warnings=loadedBase.warnings?.length ? `<details class="cooperator-base-warnings"><summary>${loadedBase.warnings.length} aviso(s) de importação</summary><ul>${loadedBase.warnings.map((warning)=>`<li>${esc(warning)}</li>`).join('')}</ul></details>` : '';
    return `<div class="cooperator-base-status"><strong>Base em uso:</strong> ${esc(loadedBase.versionLabel)}<br><span>${loadedBase.totalDetailedRecords} registros detalhados e ${loadedBase.totalReferences} referências sem detalhamento · carregada em ${esc(displayDateTime(loadedBase.loadedAt))}</span><small>${esc(countItems)}</small>${warnings}<p>Base local importada manualmente. Não há sincronização automática com o portal. O HTML é interpretado sem executar seus scripts.</p></div>`;
  }

  function renderBaseStatus() { const host=$('cooperatorBaseStatus'); if (host) host.innerHTML=baseStatusHtml(); }

  function renderFilters() {
    const cooperative=$('cooperatorCooperativeFilter'), activity=$('cooperatorActivityFilter');
    if (!cooperative || !activity) return;
    const previousCooperative=cooperative.value, previousActivity=activity.value;
    const cooperatives=[...new Set((loadedBase?.records || []).map((record)=>record.cooperative).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const activities=[...new Set((loadedBase?.records || []).map((record)=>record.activity).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    cooperative.innerHTML='<option value="">Todas as cooperativas</option>'+cooperatives.map((value)=>`<option value="${attr(value)}">${esc(value)}</option>`).join('');
    activity.innerHTML='<option value="">Todas as atividades</option>'+activities.map((value)=>`<option value="${attr(value)}">${esc(value)}</option>`).join('');
    cooperative.value=cooperatives.includes(previousCooperative) ? previousCooperative : '';
    activity.value=activities.includes(previousActivity) ? previousActivity : '';
  }

  function resultCard(record) {
    const coordinates=[record.latitude,record.longitude].filter(Boolean).join(' / ') || 'Não informado';
    const badges=[record.baseLabel,record.activity,record.recordType === 'reference' ? 'Referência sem detalhamento' : record.recordType === 'notice' ? 'Cadastro sem detalhe de local' : '',record.situation].filter(Boolean).map((value)=>`<span class="cooperator-badge">${esc(value)}</span>`).join('');
    const warning=record.warnings.length ? `<div class="cooperator-result-warning">${esc(record.warnings[0])}${record.warnings.length > 1 ? `<details><summary>Mais ${record.warnings.length - 1} aviso(s)</summary><ul>${record.warnings.slice(1).map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}</div>` : '';
    const button=record.recordType === 'detail'
      ? `<button class="btn primary" type="button" data-action="use-cooperator-record" data-record-id="${attr(record.id)}">Utilizar dados deste local</button>`
      : '<button class="btn secondary" type="button" disabled title="Este cadastro não contém dados suficientes para selecionar um local">Sem detalhe de local</button>';
    const localLabel=record.localIdentification || (record.recordType === 'detail' ? 'Registro do local' : 'Não informado');
    return `<article class="cooperator-result-card ${record.recordType === 'reference' ? 'cooperator-reference-card' : ''}" data-record-id="${attr(record.id)}">
      <div class="cooperator-result-head"><div><h4>${esc(record.name || 'Nome não informado')}</h4><div class="cooperator-badges">${badges}</div></div>${button}</div>
      <div class="cooperator-result-grid">
        <div><span>Cooperativa</span><strong>${esc(record.cooperative || 'Não informado')}</strong></div>
        <div><span>Atividade</span><strong>${esc(record.activity || 'Não informado')}</strong></div>
        <div><span>Município</span><strong>${esc(record.municipality || 'Não informado')}</strong></div>
        <div><span>Local / propriedade</span><strong>${esc(localLabel)}</strong></div>
        <div><span>Coordenadas</span><strong>${esc(coordinates)}</strong></div>
        <div><span>Código da instalação</span><strong>${esc(record.installationCode || 'Não informado')}</strong></div>
        <div><span>Origem</span><strong>${esc(record.category || 'Não informado')}</strong></div>
        <div><span>Referência</span><strong>${esc(record.reference || 'Não informado')}</strong></div>
        <div><span>Situação / movimentação</span><strong>${esc(record.situation || 'Não informado')}</strong></div>
        <div><span>${esc(record.capacityConcept || 'Capacidade/quantidade')}</span><strong>${esc(valueWithUnit(record.capacity,record.capacityUnit))}</strong></div>
        <div><span>VR de benfeitorias</span><strong>${esc(displayMoney(record.vrBuildings))}</strong></div>
        <div><span>VR de animais</span><strong>${esc(displayMoney(record.vrAnimals))}</strong></div>
        ${(record.extraFields || []).map((extra)=>`<div><span>${esc(extra.label)}</span><strong>${esc(displayMoney(extra.value))}</strong></div>`).join('')}
      </div>${warning}
    </article>`;
  }

  function renderResults() {
    const host=$('cooperatorResults'), notice=$('cooperatorSearchNotice');
    if (!host || !notice) return;
    const query=normalizeText($('cooperatorSearch')?.value || '');
    if (!loadedBase) { notice.className=staleBaseDetected ? 'notice warn' : 'notice info'; notice.textContent=staleBaseDetected ? 'Reimporte o HTML: a base anterior foi invalidada por conter leitura incompleta.' : 'Carregue a base HTML antes de pesquisar.'; host.innerHTML=''; return; }
    if (!query) { notice.className='notice info'; notice.textContent='Digite parte do nome do cooperado ou integrado.'; host.innerHTML=''; return; }
    const cooperative=$('cooperatorCooperativeFilter')?.value || '', activity=$('cooperatorActivityFilter')?.value || '';
    const searchKey=JSON.stringify([query,cooperative,activity]);
    if (searchKey !== lastSearchKey) { resultLimit=MAX_RESULTS; lastSearchKey=searchKey; }
    searchResults=loadedBase.records.filter((record)=>record.searchName.includes(query) && (!cooperative || record.cooperative === cooperative) && (!activity || record.activity === activity));
    searchResults.sort((a,b)=>{
      if (a.recordType !== b.recordType) return a.recordType === 'detail' ? -1 : 1;
      return [a.baseLabel,a.activity,a.municipality,a.installationCode,a.reference].join('|').localeCompare([b.baseLabel,b.activity,b.municipality,b.installationCode,b.reference].join('|'),'pt-BR');
    });
    const visible=searchResults.slice(0,resultLimit);
    const detailed=searchResults.filter((record)=>record.recordType === 'detail').length;
    const references=searchResults.filter((record)=>record.recordType === 'reference').length;
    const notices=searchResults.length-detailed-references;
    notice.className=searchResults.length ? 'notice ok' : 'notice warn';
    notice.textContent=searchResults.length ? `${detailed} opção(ões) detalhada(s), ${references} referência(s) e ${notices} cadastro(s) sem detalhe de local. Cada cartão permanece independente; confirme explicitamente o local e a atividade.` : 'Nenhum registro correspondente foi encontrado.';
    if (searchResults.length > resultLimit) notice.textContent += ` Exibindo ${visible.length} de ${searchResults.length}; use “Mostrar mais registros” ou refine a pesquisa.`;
    host.innerHTML=visible.map(resultCard).join('')+(searchResults.length > resultLimit ? '<button class="btn secondary" type="button" data-action="show-more-cooperators">Mostrar mais registros</button>' : '');
  }

  function fieldInput(label,key,value,{textarea=false,placeholder='',readonly=false}={}) {
    const safe=primitiveText(value);
    const element=textarea
      ? `<textarea data-coop-field="${attr(key)}" rows="2" placeholder="${attr(placeholder)}" ${readonly ? 'readonly' : ''}>${esc(safe)}</textarea>`
      : `<input data-coop-field="${attr(key)}" value="${attr(safe)}" placeholder="${attr(placeholder)}" ${readonly ? 'readonly' : ''}>`;
    return `<div><label class="field">${esc(label)}</label>${element}</div>`;
  }

  function extraFieldInput(extra,index) {
    return `<div class="cooperator-extra-field" data-extra-index="${index}"><label class="field">${esc(extra.label)}</label><div class="cooperator-extra-action"><input data-extra-field="value" value="${attr(extra.value)}">${extra.canUseAs === 'vrBuildings' ? '<button class="small-btn" type="button" data-action="use-extra-as-vr" data-extra-index="'+index+'">Validar e usar como VR de benfeitorias</button>' : ''}</div>${extra.requiresEquivalenceConfirmation ? '<p class="helper">Este valor não é tratado como prejuízo apurado. A equivalência com o VR de benfeitorias exige confirmação expressa do regulador.</p>' : ''}</div>`;
  }

  function installationFieldInput(label,key,value) { return `<div><label class="field">${esc(label)}</label><input data-installation-field="${attr(key)}" value="${attr(primitiveText(value))}"></div>`; }

  function installationCard(item,index,total) {
    return `<div class="cooperator-installation-card" data-installation-id="${attr(item.id)}">
      <div class="dynamic-head"><label class="cooperator-installation-check"><input type="checkbox" data-installation-field="involved" ${item.involved ? 'checked' : ''}> Relacionada ao sinistro</label><button class="small-btn danger" type="button" data-action="remove-cooperator-installation" data-installation-id="${attr(item.id)}">Remover</button></div>
      <div class="grid2">${installationFieldInput('Código ou identificação','code',item.code)}${installationFieldInput('Tipo de instalação','type',item.type)}</div>
      <div class="grid2">${installationFieldInput('Área ou metragem','area',item.area)}${installationFieldInput('Unidade da área','areaUnit',item.areaUnit)}</div>
      <div class="grid2">${installationFieldInput(item.capacityConcept || 'Capacidade/quantidade','capacity',item.capacity)}${installationFieldInput('Unidade da capacidade/quantidade','capacityUnit',item.capacityUnit)}</div>
      ${total > 1 && !item.involved ? '<p class="helper">Marque somente as instalações relacionadas ao evento.</p>' : ''}
    </div>`;
  }

  function relatedValueButtons(candidate) {
    const buttons=[];
    if (candidate.vrBuildings !== '') buttons.push(`<button class="small-btn" type="button" data-action="apply-related-value" data-related-id="${attr(candidate.id)}" data-related-field="vrBuildings">Usar VR de benfeitorias: ${esc(displayMoney(candidate.vrBuildings))}</button>`);
    if (candidate.vrAnimals !== '') buttons.push(`<button class="small-btn" type="button" data-action="apply-related-value" data-related-id="${attr(candidate.id)}" data-related-field="vrAnimals">Usar VR de animais: ${esc(displayMoney(candidate.vrAnimals))}</button>`);
    for (const [index,extra] of (candidate.extraFields || []).entries()) buttons.push(`<button class="small-btn" type="button" data-action="apply-related-extra" data-related-id="${attr(candidate.id)}" data-extra-index="${index}">Associar ${esc(extra.label)}: ${esc(displayMoney(extra.value))}</button>`);
    return buttons.join('');
  }

  function relatedCandidatesHtml(selection) {
    const candidates=(selection.relatedCandidates || []).filter((candidate)=>candidate.vrBuildings !== '' || candidate.vrAnimals !== '' || (candidate.extraFields || []).some((extra)=>extra.value !== ''));
    if (!candidates.length) return '';
    return `<div class="cooperator-related"><div class="cooperator-installations-head"><div><h4>Registros complementares disponíveis</h4><p class="helper">Os valores abaixo não são somados nem vinculados automaticamente. Use apenas o campo correspondente ao mesmo local após conferência.</p></div></div>${candidates.map((candidate)=>`<div class="cooperator-related-card"><div><strong>${esc(candidate.activity || candidate.baseLabel)}</strong><span>${esc([candidate.category,candidate.reference,candidate.situation].filter(Boolean).join(' · ') || 'Origem não informada')}</span><small>${esc([candidate.municipality,candidate.localIdentification,candidate.installationCode].filter(Boolean).join(' · ') || 'Registro sem identificação inequívoca de propriedade')}</small><small>Coordenadas: ${esc([candidate.latitude,candidate.longitude].filter(Boolean).join(' / ') || 'Não informado')}</small></div><div class="small-actions">${relatedValueButtons(candidate)}</div></div>`).join('')}</div>`;
  }

  function recoverySuggestionsHtml(selection) {
    const suggestions=selection.recoverySuggestions || [];
    if (!suggestions.length) return '';
    return `<div class="notice info"><strong>Informações recuperadas na nova leitura:</strong><p>Nenhum dado confirmado foi substituído. Aplique somente o que corresponder ao local selecionado.</p><div class="small-actions">${suggestions.map((item,index)=>`<button class="small-btn" type="button" data-action="apply-recovery-value" data-recovery-index="${index}">${esc(item.label)}: ${esc(item.displayValue)}</button>`).join('')}</div></div>`;
  }

  function reselectionHtml(selection) {
    if (!selection.requiresReselection) return '';
    const candidates=selection.reimportReview?.candidates || [];
    return `<div class="notice error"><strong>Nova seleção obrigatória.</strong><p>O registro anterior não foi reconhecido de forma inequívoca na base atual (${candidates.length} opção/ões para conferência). Os dados e ajustes confirmados foram preservados. Pesquise e confirme novamente o local e a atividade.</p>${candidates.length ? `<ul>${candidates.map((candidate)=>`<li>${esc([candidate.activity,candidate.municipality,candidate.installationCode,candidate.reference].filter(Boolean).join(' · ') || 'Registro do local')}</li>`).join('')}</ul>` : ''}</div>`;
  }

  function renderSelection() {
    const host=$('cooperatorSelectedPanel');
    if (!host || !controller) return;
    const state=controller.getState();
    const selection=normalizeSelection(state.cooperatorSelection);
    if (!selection) { host.innerHTML='<div class="notice info">Nenhum local foi confirmado pela consulta. O preenchimento manual continua disponível abaixo.</div>'; return; }
    state.cooperatorSelection=selection;
    const c=selection.confirmed, validation=validateSelection(selection), changes=compareSelection(selection);
    const warnings=validation.warnings.length ? `<div class="notice warn"><strong>Conferência necessária:</strong><ul>${validation.warnings.map((warning)=>`<li>${esc(warning)}</li>`).join('')}</ul></div>` : '';
    const errors=validation.errors.filter((error)=>!selection.requiresReselection || !/nova base apresenta/.test(error)).length ? `<div class="notice error"><strong>Pendências da seleção:</strong><ul>${validation.errors.filter((error)=>!selection.requiresReselection || !/nova base apresenta/.test(error)).map((error)=>`<li>${esc(error)}</li>`).join('')}</ul></div>` : '';
    const adjustmentsOpen=host.querySelector('.cooperator-adjustments')?.open;
    const original=`<details class="cooperator-original"><summary>Dados originalmente importados e origem</summary><div class="cooperator-original-meta"><strong>${esc(selection.source?.baseLabel || '')}</strong><span>${esc(selection.baseVersion?.versionLabel || '')}</span></div><pre>${esc(JSON.stringify({original:selection.original,source:selection.source,fieldSources:selection.fieldSources,baseVersion:selection.baseVersion,associatedRecordIds:selection.associatedRecordIds},null,2))}</pre></details>`;
    host.innerHTML=`<div class="cooperator-selected">
      <div class="cooperator-selection-actions"><span class="step-kicker">Local e atividade confirmados pela consulta</span><button class="btn danger-lite" type="button" data-action="clear-cooperator-selection">Remover seleção</button></div>
      <div data-selected-risk-card>${window.FastTrackRiskCard?.html(state) || ''}</div>
      ${reselectionHtml(selection)}${errors}${warnings}${recoverySuggestionsHtml(selection)}
      <details class="cooperator-adjustments" ${adjustmentsOpen ? 'open' : ''}><summary>Ajustar dados e confirmar instalações</summary>
      <p class="helper">A ficha utiliza os dados confirmados abaixo. A importação original permanece disponível para conferência.</p>
      <div class="grid2">${fieldInput('Nome do cooperado','name',c.name)}${fieldInput('Cooperativa','cooperative',c.cooperative)}</div>
      <div class="grid2">${fieldInput('Atividade confirmada','activity',c.activity)}${fieldInput('Município','municipality',c.municipality)}</div>
      <div class="grid2">${fieldInput('UF','state',c.state)}${fieldInput('Identificação do local','localIdentification',c.localIdentification,{textarea:true,placeholder:'Não informado na base'})}</div>
      <div class="grid2">${fieldInput('Latitude','latitude',c.latitude)}${fieldInput('Longitude','longitude',c.longitude)}</div>
      <div class="grid2">${fieldInput('Área ou metragem','area',c.area)}${fieldInput('Unidade da área','areaUnit',c.areaUnit)}</div>
      <div class="grid2">${fieldInput(c.capacityConcept || 'Capacidade/quantidade','capacity',c.capacity)}${fieldInput('Unidade da capacidade/quantidade','capacityUnit',c.capacityUnit)}</div>
      <div class="grid2">${fieldInput('VR de benfeitorias','vrBuildings',c.vrBuildings)}${fieldInput('VR de animais','vrAnimals',c.vrAnimals)}</div>
      ${(c.extraFields || []).length ? `<div class="grid2">${c.extraFields.map(extraFieldInput).join('')}</div>` : ''}
      <div class="grid3">${fieldInput('Origem do registro','sourceCategory',c.sourceCategory)}${fieldInput('Referência da planilha/endosso','sourceReference',c.sourceReference,{placeholder:'Não informado'})}${fieldInput('Situação / movimentação registrada','situation',c.situation)}</div>
      ${relatedCandidatesHtml(selection)}
      <div class="cooperator-installations-head"><div><h4>Instalações relacionadas ao sinistro</h4><p class="helper">Quando houver várias opções, marque somente as efetivamente envolvidas. Capacidade ou quantidade de animais não é usada como quantidade de instalações.</p></div><button class="btn secondary" type="button" data-action="add-cooperator-installation">+ Adicionar instalação</button></div>
      <div id="cooperatorInstallationList">${c.installations.length ? c.installations.map((item,index)=>installationCard(item,index,c.installations.length)).join('') : '<div class="notice info">Nenhuma instalação estruturada foi identificada. Adicione manualmente somente quando houver identificação segura.</div>'}</div>
      ${changes.length ? `<div class="notice info">Ajustes registrados em relação à importação: ${esc(changes.join(', '))}.</div>` : ''}
      </details>
      ${original}
    </div>`;
  }

  function selectionChanged({autofill=true,renderNow=false}={}) {
    const state=controller.getState();
    if (state.cooperatorSelection) state.cooperatorSelection.updatedAt=new Date().toISOString();
    controller.onSelectionChanged(state.cooperatorSelection,{autofill});
    if (renderNow) renderSelection();
    else {
      const card=$('cooperatorSelectedPanel')?.querySelector('[data-selected-risk-card]');
      if (card) card.innerHTML=window.FastTrackRiskCard?.html(state) || '';
    }
  }

  function candidateSummary(record) {
    return {id:record.id,activity:record.activity,municipality:record.municipality,localIdentification:record.localIdentification,installationCode:record.installationCode,reference:record.reference,origin:record.category};
  }

  function reviewExistingSelectionAfterImport(base) {
    if (!controller) return;
    const state=controller.getState();
    const selection=normalizeSelection(state.cooperatorSelection);
    if (!selection) return;
    const name=normalizeText(selection.confirmed.name);
    const baseKey=selection.source?.baseKey || '';
    const exact=selection.baseVersion?.sha256 === base.sha256 && selection.baseVersion?.schemaVersion === NORMALIZED_SCHEMA_VERSION
      ? base.records.find(record=>record.id === selection.sourceRecordId && record.recordType === 'detail') : null;
    if (exact) return;
    let candidates=base.records.filter((record)=>record.recordType === 'detail' && record.searchName === name && (!baseKey || record.baseKey === baseKey));
    if (selection.confirmed.activity) {
      const exactActivity=candidates.filter((record)=>normalizeText(record.activity) === normalizeText(selection.confirmed.activity));
      if (exactActivity.length) candidates=exactActivity;
    }
    selection.recoverySuggestions=[];
    selection.requiresReselection=true;
    selection.reimportReview={reviewedAt:new Date().toISOString(),baseSha256:base.sha256,candidateCount:candidates.length,candidates:candidates.map(candidateSummary)};
    selection.warnings=(selection.warnings || []).filter((warning)=>!/reimporta|nova leitura|nova base/i.test(warning));
    if (candidates.length > 1) {
      selection.warnings.push(`A nova leitura encontrou ${candidates.length} registros possíveis para o mesmo cooperado. O local e a atividade anteriores foram preservados, mas uma nova seleção explícita é necessária.`);
    } else if (candidates.length === 1) {
      const candidate=candidates[0];
      const fields=[
        ['municipality','Município',(value)=>value],['state','UF',(value)=>value],['localIdentification','Identificação do local',(value)=>value],
        ['latitude','Latitude',(value)=>value],['longitude','Longitude',(value)=>value],['area','Área/metragem',(value)=>value],
        ['capacity',candidate.capacityConcept || 'Capacidade/quantidade',(value)=>valueWithUnit(value,candidate.capacityUnit)],
        ['vrBuildings','VR de benfeitorias',displayMoney],['vrAnimals','VR de animais',displayMoney],
        ['sourceReference','Referência',(value)=>value],['situation','Situação/movimentação',(value)=>value]
      ];
      for (const [field,label,formatter] of fields) {
        const sourceField=field === 'sourceReference' ? 'reference' : field;
        if (!primitiveText(selection.confirmed[field]) && primitiveText(candidate[sourceField])) selection.recoverySuggestions.push({field,label,value:candidate[sourceField],displayValue:formatter(candidate[sourceField]),source:sourceDescriptor(candidate)});
      }
      if (selection.recoverySuggestions.length) selection.warnings.push(`${selection.recoverySuggestions.length} informação(ões) foram recuperadas pela nova leitura e aguardam aplicação expressa do regulador.`);
      selection.relatedCandidates=relatedRecordsFor(candidate);
    } else {
      selection.warnings.push('O registro anteriormente selecionado não foi localizado de forma inequívoca na nova base. Os dados confirmados foram mantidos sem alteração.');
    }
    state.cooperatorSelection=selection;
    controller.onSelectionChanged(selection,{autofill:false,metadataOnly:true});
  }

  async function importHtmlFile(file) {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && !/html/i.test(file.type || '')) throw new Error('Selecione um arquivo HTML contendo a estrutura DATA.');
    const html=await file.text();
    const base=await buildBase(html,{name:file.name,size:file.size,lastModified:file.lastModified});
    if (!base.totalDetailedRecords) throw new Error('A estrutura DATA foi encontrada, mas nenhum registro detalhado de cooperado/local foi reconhecido.');
    await saveBase(base);
    loadedBase=base; staleBaseDetected=false; searchResults=[];
    reviewExistingSelectionAfterImport(base);
    renderBaseStatus(); renderFilters(); renderResults(); renderSelection();
    controller.status(`Base atualizada pelo importador ${IMPORTER_VERSION}: ${base.totalDetailedRecords} registros detalhados e ${base.totalReferences} referências reconhecidos.`,'ok');
  }

  function selectRecord(id) {
    const record=loadedBase?.records?.find((entry)=>entry.id === id && entry.recordType === 'detail');
    if (!record) return;
    const state=controller.getState();
    state.cooperatorSelection=selectionFromRecord(record);
    controller.onSelectionChanged(state.cooperatorSelection,{autofill:true});
    renderSelection();
    $('cooperatorSelectedPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function relatedRecord(selection,id) {
    return (selection.relatedCandidates || []).find((candidate)=>candidate.id === id) || loadedBase?.records?.find((candidate)=>candidate.id === id) || null;
  }

  function applyRelatedValue(id,field) {
    const selection=controller.getState().cooperatorSelection;
    if (!selection || !['vrBuildings','vrAnimals'].includes(field)) return;
    const candidate=relatedRecord(selection,id);
    if (!candidate || !hasPrimitiveValue(candidate[field])) return;
    selection.confirmed[field]=primitiveText(candidate[field]);
    selection.fieldSources[field]={type:'associated',field,recordId:candidate.id,baseKey:candidate.baseKey,baseLabel:candidate.baseLabel,activity:candidate.activity,origin:candidate.category,reference:candidate.reference || '',sourceField:candidate.fieldOrigins?.[field] || null,source:clone(candidate.source || sourceDescriptor(candidate))};
    selection.associatedRecordIds=[...new Set([...(selection.associatedRecordIds || []),candidate.id])];
    selectionChanged({autofill:false,renderNow:true});
  }

  function applyRelatedExtra(id,index) {
    const selection=controller.getState().cooperatorSelection;
    if (!selection) return;
    const candidate=relatedRecord(selection,id), extra=candidate?.extraFields?.[Number(index)];
    if (!extra) return;
    const existing=selection.confirmed.extraFields.find((item)=>item.key === extra.key && item.value === extra.value);
    if (!existing) selection.confirmed.extraFields.push(normalizeExtraField({...extra,source:candidate.source || sourceDescriptor(candidate)},selection.confirmed.extraFields.length));
    selection.associatedRecordIds=[...new Set([...(selection.associatedRecordIds || []),candidate.id])];
    selectionChanged({autofill:false,renderNow:true});
  }

  function useExtraAsVr(index) {
    const selection=controller.getState().cooperatorSelection;
    const extra=selection?.confirmed?.extraFields?.[Number(index)];
    if (!selection || !extra || !hasPrimitiveValue(extra.value)) return;
    if (!confirm('Confirma que “Total Danos Materiais Aviários” é equivalente ao VR de benfeitorias neste registro? O valor não será tratado como prejuízo apurado da vistoria.')) return;
    selection.confirmed.vrBuildings=extra.value;
    const provenance=extra.source || selection.source;
    selection.fieldSources.vrBuildings={type:'validated-extra',field:'vrBuildings',recordId:provenance.recordId,baseKey:provenance.baseKey,baseLabel:provenance.baseLabel,activity:provenance.activity,origin:provenance.category,reference:provenance.reference,sourceField:extra.sourceField || 'danosAviarios',source:clone(provenance)};
    selectionChanged({autofill:false,renderNow:true});
  }

  function applyRecoveryValue(index) {
    const selection=controller.getState().cooperatorSelection;
    const suggestion=selection?.recoverySuggestions?.[Number(index)];
    if (!selection || !suggestion) return;
    selection.confirmed[suggestion.field]=primitiveText(suggestion.value);
    if (['vrBuildings','vrAnimals'].includes(suggestion.field)) selection.fieldSources[suggestion.field]={type:'recovered',field:suggestion.field,...suggestion.source,origin:suggestion.source?.category,reference:suggestion.source?.reference};
    selection.recoverySuggestions.splice(Number(index),1);
    selectionChanged({autofill:['municipality','state','localIdentification'].includes(suggestion.field),renderNow:true});
  }

  function bindEvents() {
    $('cooperatorBaseInput')?.addEventListener('change',async(event)=>{
      const input=event.currentTarget;
      try { await importHtmlFile(input.files?.[0]); }
      catch (error) { controller.status(error.message || String(error),'error'); alert(`Não foi possível atualizar a base:\n${error.message || error}`); }
      finally { input.value=''; }
    });
    $('cooperatorSearch')?.addEventListener('input',()=>renderResults());
    $('cooperatorSearch')?.addEventListener('keydown',(event)=>{ if (event.key === 'Enter') { event.preventDefault(); renderResults(); } });
    $('cooperatorCooperativeFilter')?.addEventListener('change',()=>renderResults());
    $('cooperatorActivityFilter')?.addEventListener('change',()=>renderResults());

    document.addEventListener('click',(event)=>{
      const button=event.target.closest('[data-action]');
      if (!button) return;
      const action=button.dataset.action;
      if (action === 'search-cooperators') renderResults();
      else if (action === 'show-more-cooperators') { resultLimit+=MAX_RESULTS; renderResults(); }
      else if (action === 'clear-cooperator-search') {
        if ($('cooperatorSearch')) $('cooperatorSearch').value='';
        if ($('cooperatorCooperativeFilter')) $('cooperatorCooperativeFilter').value='';
        if ($('cooperatorActivityFilter')) $('cooperatorActivityFilter').value='';
        searchResults=[]; renderResults();
      } else if (action === 'use-cooperator-record') selectRecord(button.dataset.recordId || button.closest('[data-record-id]')?.dataset.recordId);
      else if (action === 'clear-cooperator-selection') {
        controller.getState().cooperatorSelection=null;
        controller.onSelectionChanged(null,{autofill:false});
        renderSelection();
      } else if (action === 'add-cooperator-installation') {
        const selection=controller.getState().cooperatorSelection;
        if (!selection) return;
        selection.confirmed.installations.push(normalizeInstallation({id:stableId(`manual:${Date.now()}`),involved:true},selection.confirmed.installations.length));
        selectionChanged({autofill:false,renderNow:true});
      } else if (action === 'remove-cooperator-installation') {
        const selection=controller.getState().cooperatorSelection;
        if (!selection) return;
        selection.confirmed.installations=selection.confirmed.installations.filter((item)=>item.id !== button.dataset.installationId);
        selectionChanged({autofill:false,renderNow:true});
      } else if (action === 'apply-related-value') applyRelatedValue(button.dataset.relatedId,button.dataset.relatedField);
      else if (action === 'apply-related-extra') applyRelatedExtra(button.dataset.relatedId,button.dataset.extraIndex);
      else if (action === 'use-extra-as-vr') useExtraAsVr(button.dataset.extraIndex);
      else if (action === 'apply-recovery-value') applyRecoveryValue(button.dataset.recoveryIndex);
    });

    document.addEventListener('input',(event)=>{
      const field=event.target.closest('[data-coop-field]');
      if (field) {
        const selection=controller.getState().cooperatorSelection;
        if (!selection) return;
        selection.confirmed[field.dataset.coopField]=field.value;
        if (['vrBuildings','vrAnimals'].includes(field.dataset.coopField)) selection.fieldSources[field.dataset.coopField]={type:'manual',field:field.dataset.coopField,recordId:null,baseKey:selection.source?.baseKey,baseLabel:selection.source?.baseLabel,activity:selection.confirmed.activity,origin:'Ajuste manual do regulador',reference:''};
        selectionChanged({autofill:['name','municipality','state','localIdentification'].includes(field.dataset.coopField)});
        return;
      }
      const extraField=event.target.closest('[data-extra-field]');
      if (extraField) {
        const selection=controller.getState().cooperatorSelection;
        const container=extraField.closest('[data-extra-index]');
        const extra=selection?.confirmed?.extraFields?.[Number(container?.dataset.extraIndex)];
        if (!extra) return;
        extra[extraField.dataset.extraField]=extraField.value;
        selectionChanged({autofill:false});
        return;
      }
      const installationField=event.target.closest('[data-installation-field]');
      if (installationField) {
        const selection=controller.getState().cooperatorSelection;
        const card=installationField.closest('[data-installation-id]');
        const item=selection?.confirmed?.installations?.find((entry)=>entry.id === card?.dataset.installationId);
        if (!item) return;
        item[installationField.dataset.installationField]=installationField.type === 'checkbox' ? installationField.checked : installationField.value;
        selectionChanged({autofill:false});
      }
    });
  }

  async function init(nextController) {
    if (initialized) { controller=nextController || controller; render(); return; }
    controller=nextController;
    loadedBase=await loadBase();
    bindEvents(); initialized=true; render();
  }

  function render() { renderBaseStatus(); renderFilters(); renderResults(); renderSelection(); }

  window.FastTrackCooperators = {
    init,render,buildBase,parseDataFromHtml,normalizeText,normalizeSelection,validateSelection,
    reportData,reportHtml,formatRiskAddress,getBase:()=>loadedBase,definitions:clone(BASE_DEFINITIONS),
    importerVersion:IMPORTER_VERSION,schemaVersion:NORMALIZED_SCHEMA_VERSION,
    formatters:{number:parseLocaleNumber,coordinate:parseCoordinateNumber,quantity:valueWithUnit},
    _test:{adaptBase,discoverCooperators,flattenDetailedValues,flattenReferenceValues,isJaguaHeader,mappedFields,parseLocaleNumber,parseCoordinateNumber}
  };
})();
