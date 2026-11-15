// Entirely synthetic people, properties and amounts.
const local=(id,city,extra={})=>({aviario:id,propriedade:'Local '+id,municipio:city,uf:'SC',latitude:-20,longitude:-50,areaM2:1200,quantidadeAves:10000,vrTotalEstruturas:100000,vrTotalAves:50000,...extra});
const source=()=>({lar:{
 A:{nome:'Pessoa Alfa Sintética',cpf:'529.982.247-25',cooperativa:'Afiliada Alfa',inicial:[local('A1','Cidade Alfa'),local('A2','Cidade Alfa',{propriedade:'Local A1',vrTotalEstruturas:200000,vrTotalAves:80000}),local('A3','Cidade Outra',{latitude:-21,longitude:-51,vrTotalEstruturas:70000})]},
 B:{nome:'Pessoa Beta Sintética',inicial:[local('B1','Cidade Beta',{uf:'',latitude:-22,longitude:-52,areaM2:800,quantidadeAves:6000,vrTotalEstruturas:50000,vrTotalAves:20000})]},
 C:{nome:'Pessoa Gama Sintética',cpf:'111.444.777-35',inicial:[local('C1','Cidade Gama')]},
 D:{nome:'Pessoa Alfa Sintética',inicial:[local('D1','Cidade Homônima')]}
}});
const html=data=>`<script>const DATA=${JSON.stringify(data)};</script>`;
module.exports={source,html};
