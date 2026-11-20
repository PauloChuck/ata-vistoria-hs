const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={};const context=vm.createContext({window,Date,console});
for(const file of ['direct-report.js','report-refinements-0639.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../fast_track/v06',file),'utf8'),context);
const R=window.FastTrackReportRefinements;
test('inspection date changes only the identified inspection, preserving other dates and custom text',()=>{
 for(const old of ['10 de novembro de 2026','10/11/2026','10-11-2026','2026-11-10']){
  const fields={inspectionDate:'2026-12-01',inspectionNarrativeMode:'custom',inspectionNarrative:`Sinistro em ${old}. Em vistoria presencial realizada no dia ${old}, constatamos danos específicos. Aviso em ${old}.`};
  R.syncInspection(fields);
  const date=old.includes(' de ')?'01 de dezembro de 2026':old==='2026-11-10'?'2026-12-01':old.includes('/')?'01/12/2026':'01-12-2026';
  assert.equal(fields.inspectionNarrative,`Sinistro em ${old}. Em vistoria presencial realizada no dia ${date}, constatamos danos específicos. Aviso em ${old}.`);
  assert.equal(fields.inspectionNarrativeDate,'2026-12-01');
 }
});
test('inspection references are synchronized on report rendering, without a fallback date',()=>{
 assert.match(R.inspectionText({inspectionDate:'',inspectionNarrativeMode:'default'}),/\[data da vistoria\]/);
 const fields={inspectionDate:'2026-12-01',inspectionNarrative:'Vistoria realizada em 10/11/2026. Texto próprio.',inspectionNarrativeMode:'custom'};
 assert.equal(window.FastTrackV06Report.effectiveInspectionText({fields}),'Vistoria realizada em 01/12/2026. Texto próprio.');
 fields.inspectionDate='';R.syncInspection(fields);assert.equal(fields.inspectionNarrative,'Vistoria realizada em [data da vistoria]. Texto próprio.');
 fields.inspectionDate='2027-01-01';R.syncInspection(fields);assert.match(fields.inspectionNarrative,/01 de janeiro de 2027/);
});
test('appointment dates and narratives without an identifiable inspection date are preserved',()=>{
 for(const text of ['Agendamento da vistoria em 10/11/2026. Texto próprio.','Vistoria programada para 10/11/2026.','O sinistro ocorreu em 10 de novembro de 2026. Foram constatados danos.'])assert.equal(R.inspectionText({inspectionDate:'2026-12-01',inspectionNarrative:text}),text);
});
test('other explicit inspection-date phrasings preserve the surrounding sentence',()=>{
 for(const text of ['Vistoria: 10/11/2026. Texto próprio.','A vistoria ocorreu em 10/11/2026. Texto próprio.','Em 10/11/2026, realizamos a vistoria. Texto próprio.','No dia 10/11/2026 foi realizada uma vistoria. Texto próprio.'])assert.equal(R.inspectionText({inspectionDate:'2026-12-01',inspectionNarrative:text}),text.replace('10/11/2026','01/12/2026'));
});
test('opinion migration changes empty and exact old defaults only',()=>{
 for(const value of [null,'','  ','Análise de cobertura pendente de conclusão pelo regulador.','Diante do exposto, o sinistro está amparado pela cobertura de Vendaval/Granizo da apólice vigente'])assert.equal(R.normalizeOpinion(value),R.opinion);
 for(const value of ['Parecer redigido pelo regulador.','Análise de cobertura pendente de conclusão pelo regulador. Texto adicional.','Diante do exposto, o sinistro não está amparado.'])assert.equal(R.normalizeOpinion(value),value);
});
