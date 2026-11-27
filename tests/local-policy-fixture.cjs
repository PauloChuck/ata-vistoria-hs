// Synthetic people and properties; source keys exercise the existing six-base importer.
const basic=require('./policies-fixture.cjs'),broker=require('./policy-broker-fixture.cjs');
const copy=v=>JSON.parse(JSON.stringify(v));
function contracts(){
 const a=basic.contract();Object.assign(a.operacao,{id:'local-policy-a',empresa_grupo_exibicao:'Grupo Sintético A',cooperativa_afiliada:'Afiliada Sintética A',segurado_razao_social:'Contratante Sintético A',corretora_relatorio:'Corretora Sintética A'});
 a.vinculos_propostos_consulta=[['aurora','Aves de Corte'],['suinos','Suínos'],['matrizes','Aves Matrizes']].map(([chave_base,atividade])=>({chave_base,atividade}));
 const b=broker.contract();b.vinculos_propostos_consulta=[['lar','Aves de Corte'],['larPostura','Postura'],['larPostura','Recria']].map(([chave_base,atividade])=>({chave_base,atividade}));return [a,b];
}
const row=(id,extra={})=>({aviario:id,propriedade:'Propriedade sintética '+id,municipio:'Cidade sintética',uf:'SC',latitude:-20,longitude:-50,vrBenfeitoria:100000,vrAnimais:50000,capAloja:10000,...extra});
const person=rows=>({nome:'Pessoa de Teste',cpf:'529.982.247-25',...rows});
const source=()=>({
 lar:{A:person({inicial:[row('L1'),row('L2',{propriedade:'Propriedade sintética L1',vrBenfeitoria:200000,vrAnimais:80000})]})},
 aurora:{A:person({renovacao:[row('A1')]})},
 larPostura:{A:person({iniciais:[row('P1',{tipo:'Postura'}),row('R1',{tipo:'Recria'})]})},
 jagua:{A:person({inicial:[row('J1')]})},suinos:{A:person({renovacao:[row('S1')]})},matrizes:{A:person({renovacao:[row('M1')]})}
});
module.exports={...basic,contracts,source,copy,html:data=>'<script>const DATA='+JSON.stringify(data)+';</script>'};
