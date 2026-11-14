const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const script=fs.readFileSync(path.join(__dirname,'../fast_track/v06/cooperators-0634.js'),'utf8');
function api(){
 class DOMParser {parseFromString(html){return {querySelectorAll:()=>[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>({textContent:m[1]}))};}}
 const ctx=vm.createContext({window:{},document:{getElementById:()=>null},DOMParser,crypto:crypto.webcrypto,TextEncoder,Blob},{codeGeneration:{strings:false,wasm:false}});
 vm.runInContext(script,ctx);return ctx.window.FastTrackCooperators;
}
const html=data=>`<script>const DATA=${JSON.stringify(data)};throw new Error('Scripts da base nunca devem executar');</script>`;
const clone=v=>JSON.parse(JSON.stringify(v));
test('as seis bases mantêm campos, zeros, ausências e atividades sem agrupar locais',async()=>{
 const a=api(),base=await a.buildBase(html({
  aurora:{A:{nome:'Pessoa Sintética',renovacao:[{cidade:'Cidade A',capAloja:0,vrBenfeitoria:0,vrAnimais:null}],endossos:['Planilha X'],registrosEndosso:[{cidade:'Cidade B',planilha:'Planilha X',situacao:'SAÍDA',vrAnimais:400}]}},
  lar:{B:{nome:'Pessoa Sintética',inicial:[{aviario:'A1',areaM2:1200,quantidadeAves:100,vrTotalEstruturas:1000,vrTotalAves:200}],trocas:['Troca informada']}},
  suinos:{C:{nome:'Pessoa Sintética',renovacao:[{municipio:'Cidade C',qtdeLotacao:300,valorBenfeitoria:5000}]}},
  jagua:{D:{nome:'Pessoa Sintética',inicial:[{municipio:'Cidade D',maximoAves:200,valorBenfeitoria:500,valorAves:80}]}},
  matrizes:{E:{nome:'Pessoa Sintética',renovacao:[{municipio:'Cidade E',totalAves:90,danosAviarios:1200,vrTotalAnimais:200}]}},
  larPostura:{F:{nome:'Pessoa Sintética',iniciais:[{tipo:'Postura',qtAves:20,vrEstruturas:80},{tipo:'Recria',qtAves:30,vrEstruturas:90}]}}
 }));
 assert.equal(base.totalDetailedRecords,8);assert.equal(new Set(base.records.map(r=>r.id)).size,base.records.length);
 const first=base.records.find(r=>r.baseKey==='aurora'&&r.category==='Renovação');
 assert.equal(first.capacity,'0');assert.equal(first.vrBuildings,'0');assert.equal(first.vrAnimals,'');assert.equal(first.state,'');
 assert.deepEqual(clone(base.records.filter(r=>r.baseKey==='larPostura').map(r=>r.activity)),['Postura','Recria']);
 const m=base.records.find(r=>r.baseKey==='matrizes');assert.equal(m.vrBuildings,'');assert.equal(m.extraFields[0].label,'Total Danos Materiais Aviários');
 assert(base.records.find(r=>r.baseKey==='lar').warnings.includes('Troca: Troca informada'));
 assert(base.records.every(r=>r.category!==r.name&&r.reference!==r.name));
 assert(base.records.flatMap(r=>r.installations).every(i=>i.involved===false),'instalações exigem confirmação');
 const exit=base.records.find(r=>r.situation==='SAÍDA');assert.equal(exit.vrAnimals,'');assert.equal(exit.extraFields[0].value,'400');
});
test('cadastros somente com avisos continuam pesquisáveis sem virar locais',async()=>{
 const base=await api().buildBase(html({lar:{A:{nome:'Cadastro Sintético',inicial:[],endossos:[],trocas:[{planilha:'Arquivo Y',observacao:'Titularidade a conferir'}]}}}));
 assert.equal(base.countDetails.lar.cadastros,1);assert.equal(base.countDetails.lar.avisos,1);
 assert.equal(base.records.length,1);assert.equal(base.records[0].recordType,'notice');
 assert(base.records[0].warnings.join(' ').includes('Titularidade a conferir'));
});
test('cabeçalho Jaguafrangos exige valores marcadores, não somente nomes das chaves',async()=>{
 const base=await api().buildBase(html({jagua:{
  NOME:{nome:'NOME',inicial:[{municipio:'MUNICIPIO',latitude:'LATITUDE',longitude:'LONGITUDE'}]},
  valido:{nome:'NOME',inicial:[{municipio:'Cidade válida',latitude:-20,longitude:-50,valorAves:0}]}
 }}));
 assert.equal(base.countDetails.jagua.cabecalhosIgnorados,1);assert.equal(base.countDetails.jagua.itensIgnorados,1);
 assert.equal(base.countDetails.jagua.detalhados,1);assert.equal(base.records[0].vrAnimals,'0');
});
test('números e coordenadas incompatíveis não recebem conversão presumida',()=>{
 const t=api()._test;
 for(const s of ['abc','valor 25','1..2','10/20','1e3'])assert.equal(t.parseLocaleNumber(s).ambiguous,true,s);
 assert.equal(t.parseLocaleNumber('1.234,56').value,1234.56);assert.equal(t.parseLocaleNumber('0').value,0);
 for(const s of ['abc','erro 27','10/20',"27°70\'00S",'90.5','-27N'])assert.equal(t.parseCoordinateNumber(s,'lat').valid,false,s);
 assert.equal(t.parseCoordinateNumber('-27,123456','lat').value,-27.123456);
});
test('endossos de diferença não viram VR total e avisam sobre vigência',async()=>{
 const base=await api().buildBase(html({jagua:{A:{nome:'Exemplo',endossos:[{planilha:'Mês sem data exata',resultado:'AUMENTO VR',valorAves:30}]}}}));
 const r=base.records[0];assert.equal(r.vrAnimals,'');assert.equal(r.extraFields[0].value,'30');assert(r.warnings.some(w=>/vigência/.test(w)));
});
test('referências parecidas não são descartadas como duplicatas',async()=>{
 const base=await api().buildBase(html({aurora:{A:{nome:'Exemplo',renovacao:[],registrosEndosso:[{cidade:'Cidade',planilha:'1'}],endossos:['10']}}}));
 assert.equal(base.totalReferences,1);assert.equal(base.countDetails.aurora.referenciasVinculadas,0);
});
test('restaurar backup mantém campos explicitamente limpos e zero manual',()=>{
 const a=api();const saved={schemaVersion:3,source:{category:'Endosso',reference:'Planilha anterior',situation:'ENTRADA'},original:{vrAnimals:'15'},confirmed:{sourceCategory:'',sourceReference:'',situation:'',vrAnimals:0,installations:[]}};
 const restored=a.normalizeSelection(JSON.parse(JSON.stringify(saved)));
 assert.equal(restored.confirmed.sourceCategory,'');assert.equal(restored.confirmed.sourceReference,'');assert.equal(restored.confirmed.situation,'');assert.equal(restored.confirmed.vrAnimals,'0');assert.equal(restored.original.vrAnimals,'15');
});
test('scripts e expressões não literais não são executados',()=>{
 assert.throws(()=>api().parseDataFromHtml('<script>const DATA={aurora: (()=>{throw new Error("executado")})()};</script>'));
 assert.throws(()=>api().parseDataFromHtml('<script>const DATA={aurora: new Date()};</script>'));
});
test('valores associados preservam sua origem ao restaurar backup',()=>{
 const a=api(),source={recordId:'registro-complementar',baseSha256:'hash-de-teste',path:['renovacao','1'],rawRecord:{vrAnimais:25}};
 const saved={schemaVersion:3,sourceRecordId:'principal',confirmed:{name:'Exemplo',activity:'Aves',vrAnimals:'25',extraFields:[{label:'Total Danos Materiais Aviários',value:'15',source}]},fieldSources:{vrAnimals:{type:'associated',recordId:'registro-complementar',source}}};
 const restored=a.normalizeSelection(JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(clone(restored.fieldSources.vrAnimals.source),source);assert.deepEqual(clone(restored.confirmed.extraFields[0].source),source);
});
test('pesquisa de nomes ignora caixa inclusive nas transições entre número e letra',()=>{
 const a=api();for(const name of ['Cooperativa 1ABC','Pessoa comSobrenome','JOÃO 123FAZENDA'])assert.equal(a.normalizeText(name),a.normalizeText(name.toLowerCase()));
 assert.equal(a._test.mappedFields({vrBenfeitoria:15}).vrBuildings.value,15,'camelCase permanece reconhecido nas chaves de campos');
});
test('normalizar informação adicional importada não cria um falso ajuste manual',()=>{
 const a=api(),fields={name:'Pessoa Sintética',activity:'Aves Matrizes',extraFields:[{key:'materialDamageAviaries',label:'Total Danos Materiais Aviários',value:'100',sourceField:'danosAviarios',canUseAs:'vrBuildings',requiresEquivalenceConfirmation:true}]};
 const selection={schemaVersion:3,original:fields,confirmed:clone(fields)};
 assert.deepEqual(clone(a.reportData({cooperatorSelection:selection}).changes),[]);
 selection.confirmed.extraFields[0].value='200';assert(a.reportData({cooperatorSelection:selection}).changes.includes('Informações adicionais'));
});
