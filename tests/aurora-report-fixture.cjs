// Approved institutional display profile; the case, source limits and documents are synthetic.
const fixture=require('./policies-fixture.cjs');
const contract=()=>{
 const d=fixture.contract();
 Object.assign(d.operacao,{id:'synthetic-aurora-profile',segurado_razao_social:'COOPERATIVA CENTRAL AURORA ALIMENTOS',seguradora_lider:'SOMPO SEGUROS S/A',numero_apolice:'9600131927',produto:'Produto original preservado'});
 d.coberturas=[
  {...d.coberturas[0],id:'vendaval_b',nome_contratual:'Vendaval Modalidade B - Incluindo Bens ao ar livre',nome_sugerido_seletor:'Vendaval / Granizo - Modalidade B'},
  {...d.coberturas[1],id:'danos_eletricos',nome_contratual:'Danos Elétricos'},
  {...d.coberturas[1],id:'alagamento',nome_contratual:'Alagamento'},
  {...d.coberturas[2],id:'other',nome_contratual:'Outra cobertura de teste',lmi_brl:12345.67}
 ];
 d.sublimites=[
  {...d.sublimites[0],id:'ruptura_caixa_agua',nome_contratual:'Sublimite para ruptura / explosão de caixa d’água'},
  {...d.sublimites[0],id:'vinilona_grupo_02',nome_contratual:'Sublimite para Grupo 02 para Vinilona - decorrente de todas as coberturas da apólice'}
 ];return d;
};
module.exports={...fixture,contract};
