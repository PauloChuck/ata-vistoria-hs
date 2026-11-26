// Synthetic policies only. Real contract JSON/PDF files stay outside this repository.
const base=require('./policies-fixture.cjs');
function contract(){
 const d=base.contract();
 Object.assign(d.operacao,{id:'second-synthetic-contract',empresa_grupo_exibicao:'Grupo Sintético B',cooperativa_afiliada:'Cooperativa Sintética B',segurado_razao_social:'Segurado Sintético B',segurado_cnpj:'00.000.000/0000-01',seguradora_lider:'Seguradora Sintética B',numero_apolice:'POLICY-B-TEST',produto:'Produto Sintético B',corretora_relatorio:'CORRETORA SINTÉTICA DE SEGUROS E CONSULTORIA PARA RELATÓRIOS S/A',corretoras_documentais:[{nome:'Corretora Documental Um'},{nome:'Corretora Documental Dois'}]});
 const names=['Básica sintética','Vendaval / Granizo sintético','Elétricos sintético','Alagamento sintético','Desmoronamento sintético','Impacto sintético','Energia sintética','Queimadas sintético','Contenção e salvamento sintético'];
 d.coberturas=names.map((name,i)=>({id:['basic','vendaval_b','electric','flood','collapse','impact','energy','fire','rescue'][i],tipo:'cobertura',nome_contratual:name,lmi_brl:(i+1)*123000,franquia:{tipo:'percentual_com_minimo',percentual:12,minimo_brl:2400,base_de_calculo:'Prejuízos indenizáveis',unidade_de_aplicacao:'por cobertura/local'}}));
 d.coberturas[0].sublimite_por_evento_brl=23000;d.coberturas[0].franquia={aplicacao_condicionada:{tipo:'percentual_com_minimo',evento:'Queda de raio',percentual:12,minimo_brl:2400},demais_eventos:'Sem franquia'};
 d.coberturas[8].franquia={tipo:'sem_franquia'};d.coberturas[8].limite_percentual_lmi_cobertura=2;
 d.sublimites=['Reservatório sintético','Galpão sintético','Deslizamento — Piscicultura sintética','Energia — Piscicultura sintética'].map((name,i)=>({id:'sub-'+i,tipo:'sublimite_por_bem',nome_contratual:name,limite_evento_ou_teto_unidade_brl:(i+1)*17000,agregado_brl:(i+1)*89000,atividade_exclusiva:i>1?'Piscicultura':null,franquia:{tipo:'percentual_com_minimo',percentual:12,minimo_brl:2400,unidade_de_aplicacao:'por cobertura/local'}}));
 d.clausulas_administrativas=[{id:'administrative',nome:'Inclusão e exclusão de bens e locais',limite_brl:54321}];
 return d;
}
module.exports={...base,contract};
