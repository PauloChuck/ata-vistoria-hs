(() => {
  'use strict';

  const REPORT = () => window.FastTrackV06Report;
  const BLUE = '29A8E0';
  const CAPTION_BLUE = '1F497D';
  const BLACK = '111111';
  const LIGHT = 'EAF5FA';

  function requireDocx() {
    if (!window.docx) throw new Error('A biblioteca de geração do Word não foi carregada. Verifique a conexão e atualize a página.');
    return window.docx;
  }

  const text = (value) => String(value == null ? '' : value);
  const safeName = (value) => text(value || 'processo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'processo';

  async function loadImage(dataUrl) {
    return await new Promise((resolve,reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível processar uma imagem do relatório.'));
      image.src = dataUrl;
    });
  }

  async function canvasBytes(dataUrl, maxWidth, maxHeight, {background = null} = {}) {
    const image = await loadImage(dataUrl);
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0,0,width,height); }
    ctx.drawImage(image,0,0,width,height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve,'image/png'));
    if (!blob) throw new Error('Não foi possível converter uma imagem para o Word.');
    return {data:new Uint8Array(await blob.arrayBuffer()),width,height};
  }

  function download(blob,name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }

  function borders(style, color = '777777', size = 4) {
    return {top:{style,color,size},bottom:{style,color,size},left:{style,color,size},right:{style,color,size},insideHorizontal:{style,color,size},insideVertical:{style,color,size}};
  }

  async function exportDocx(state,{draft = false} = {}) {
    const d = requireDocx();
    const {
      Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,
      VerticalAlign,BorderStyle,Header,Footer,ImageRun,PageNumber,PageBreak,ShadingType,
      HorizontalPositionRelativeFrom,HorizontalPositionAlign,VerticalPositionRelativeFrom,
      VerticalPositionAlign,TextWrappingType
    } = d;

    const noBorder = borders(BorderStyle.NONE,'FFFFFF',0);
    const thinBorder = borders(BorderStyle.SINGLE,'666666',4);
    const f = state.fields || {};
    const calc = REPORT().calculate(state);

    const logo = await canvasBytes(REPORT().ASSETS.logo,620,240,{background:'#ffffff'});
    const watermark = await canvasBytes(REPORT().ASSETS.watermark,1000,750);
    const footerMark = await canvasBytes(REPORT().ASSETS.footer,260,190);

    const run = (value,opts={}) => new TextRun({text:text(value),font:opts.font || 'Arial',size:opts.size || 22,bold:!!opts.bold,color:opts.color || BLACK,italics:!!opts.italics,underline:opts.underline ? {} : undefined,break:opts.break});
    const para = (value,opts={}) => new Paragraph({
      children:Array.isArray(value) ? value : [run(value,opts)],
      alignment:opts.alignment || AlignmentType.JUSTIFIED,
      spacing:{line:opts.line || 360,after:opts.after == null ? 160 : opts.after,before:opts.before || 0},
      keepNext:!!opts.keepNext,keepLines:!!opts.keepLines,
      indent:opts.indent
    });
    const heading = (value) => new Paragraph({children:[run(value,{font:'Arial Black',size:28,bold:true})],spacing:{before:600,after:300,line:360},keepNext:true,keepLines:true});
    const subheading = (value) => new Paragraph({children:[run(value.toUpperCase(),{size:24,bold:true})],spacing:{before:500,after:200,line:360},keepNext:true,keepLines:true});
    const caption = (value) => new Paragraph({children:[run(value,{size:20,color:CAPTION_BLUE})],alignment:AlignmentType.CENTER,spacing:{line:240,after:120},keepLines:true});
    const pageBreak = () => new Paragraph({children:[new PageBreak()]});

    function tcell(content,{width,align=AlignmentType.CENTER,bold=false,shading,vertical=VerticalAlign.CENTER,border=thinBorder}={}) {
      const children = Array.isArray(content) && content.every(x => x && typeof x === 'object' && x.constructor?.name === 'Paragraph')
        ? content : [para(Array.isArray(content) ? content : text(content),{alignment:align,after:0,line:240})];
      if (bold && children[0]) children[0] = new Paragraph({children:[run(text(content),{size:20,bold:true})],alignment:align,spacing:{after:0,line:240}});
      return new TableCell({children,width:width ? {size:width,type:WidthType.PERCENTAGE}:undefined,verticalAlign:vertical,borders:border,shading:shading ? {type:ShadingType.CLEAR,fill:shading}:undefined,margins:{top:60,bottom:60,left:80,right:80}});
    }

    const logoRun = new ImageRun({data:logo.data,transformation:{width:314,height:120},type:'png'});
    let watermarkRun;
    try {
      watermarkRun = new ImageRun({
        data:watermark.data,type:'png',transformation:{width:604,height:450},
        floating:{
          horizontalPosition:{relative:HorizontalPositionRelativeFrom?.MARGIN || 'margin',align:HorizontalPositionAlign?.CENTER || 'center'},
          verticalPosition:{relative:VerticalPositionRelativeFrom?.MARGIN || 'margin',align:VerticalPositionAlign?.CENTER || 'center'},
          behindDocument:true,
          wrap:{type:TextWrappingType?.NONE || 'none'}
        }
      });
    } catch {
      watermarkRun = new ImageRun({data:watermark.data,type:'png',transformation:{width:604,height:450}});
    }
    const header = new Header({children:[new Paragraph({children:[logoRun],alignment:AlignmentType.RIGHT,spacing:{after:0}}),new Paragraph({children:[watermarkRun],spacing:{after:0}})]});
    const firstHeader = new Header({children:[new Paragraph({children:[new ImageRun({data:logo.data,type:'png',transformation:{width:314,height:151}})],alignment:AlignmentType.RIGHT,spacing:{after:0}}),new Paragraph({children:[watermarkRun],spacing:{after:0}})]});

    const footerTable = new Table({
      width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,
      rows:[new TableRow({children:[
        tcell([new Paragraph({children:[new ImageRun({data:footerMark.data,type:'png',transformation:{width:84,height:62}})],spacing:{after:0}})],{width:14,border:noBorder}),
        tcell([new Paragraph({children:[run('Matriz - Rua XV de novembro 1336, salas 34 e 35 – Blumenau – SC – CEP 89010-903',{font:'Calibri',size:20,color:BLUE}),run('www.horizonservitas.com +55 47 3326-1844',{font:'Calibri',size:20,color:BLUE,break:1})],spacing:{line:240,after:0}})],{width:70,align:AlignmentType.LEFT,border:noBorder}),
        tcell([new Paragraph({children:[run('',{size:20,italics:true}),new TextRun({children:[PageNumber.CURRENT,' de ',PageNumber.TOTAL_PAGES],font:'Arial',size:20,italics:true})],alignment:AlignmentType.RIGHT,spacing:{after:0}})],{width:16,border:noBorder})
      ]})]
    });
    const footer = new Footer({children:[footerTable]});

    const pages = [];
    const addPage = (children) => pages.push(children);

    // Capa
    const claimTable = new Table({width:{size:55,type:WidthType.PERCENTAGE},alignment:AlignmentType.RIGHT,borders:noBorder,rows:[
      new TableRow({children:[tcell('Sinistro Seguradora:',{width:60,align:AlignmentType.LEFT,border:noBorder}),tcell(f.insurerClaim || 'A INFORMAR',{width:40,align:AlignmentType.LEFT,border:noBorder})]}),
      new TableRow({children:[tcell('Sinistro Horizon Servitas:',{width:60,align:AlignmentType.LEFT,border:noBorder}),tcell(f.hsClaim || 'A INFORMAR',{width:40,align:AlignmentType.LEFT,border:noBorder})]})
    ]});
    const metaRows = [
      ['COMPANHIA SEGURADORA:',f.insurer],['SEGURADO:',f.insured],['COOPERADO:',f.claimantName],['LOCAL DO SINISTRO:',f.riskAddress],
      ['APÓLICE DE SEGUROS:',f.policyNumber],['PRODUTO:',f.productName],['CORRETOR:',f.broker],['DATA DO SINISTRO:',REPORT().longDate(f.lossDate,true)],['COBERTURA:',f.coverageName]
    ].map(([label,value]) => new TableRow({children:[tcell(label,{width:40,align:AlignmentType.LEFT,bold:true,border:noBorder}),tcell(value || 'A INFORMAR',{width:60,align:AlignmentType.LEFT,border:noBorder})]}));
    addPage([
      new Paragraph({children:[run('RELATÓRIO FAST TRACK DE CONTINGÊNCIA',{font:'Arial Black',size:56,bold:true})],alignment:AlignmentType.LEFT,spacing:{before:900,after:0,line:240}}),
      new Paragraph({children:[run('RISCOS NOMEADOS EMPRESARIAL',{font:'Arial Black',size:48,bold:true,color:BLUE})],alignment:AlignmentType.LEFT,spacing:{after:700,line:240}}),
      claimTable,new Paragraph({spacing:{after:180}}),
      new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:metaRows})
    ]);

    // Página técnica inicial
    const technical = [heading('1. LOCAL DO SINISTRO'),para('Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.')];
    if (state.map?.dataUrl) {
      const mapImg = await canvasBytes(state.map.dataUrl,1050,720,{background:'#ffffff'});
      const scale=Math.min(490/mapImg.width,340/mapImg.height,1);
      technical.push(new Paragraph({children:[new ImageRun({data:mapImg.data,type:'png',transformation:{width:Math.max(1,Math.round(mapImg.width*scale)),height:Math.max(1,Math.round(mapImg.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:80}}),caption('Localização da propriedade sinistrada.'));
    } else technical.push(para('Imagem de localização não informada.',{alignment:AlignmentType.CENTER}));
    technical.push(heading('2. DESCRIÇÃO DA OCORRÊNCIA'),para(REPORT().occurrenceText(f.lossDate)),heading('3. COBERTURA RECLAMADA'));
    technical.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
      new TableRow({children:[tcell('Cobertura',{width:44,bold:true,align:AlignmentType.LEFT}),tcell('Limite de Indenização',{width:28,bold:true}),tcell('Franquia',{width:28,bold:true})]}),
      new TableRow({children:[tcell(f.coverageName || 'Vendaval / Granizo',{width:44,align:AlignmentType.LEFT}),tcell(REPORT().money(35000000),{width:28}),tcell('15% com mínimo\nde R$ 3.000,00',{width:28})]})
    ]}));
    technical.push(heading('4. APURAÇÕES DA REGULAÇÃO'),subheading('4.1. LEVANTAMENTOS EM VISTORIA'),para(REPORT().inspectionText(f.inspectionDate)),subheading('RELAÇÃO DE DANOS:'));
    const damageItems=state.damages||[];
    if(damageItems.length){
      const damageHeader=new TableRow({tableHeader:true,cantSplit:true,children:[tcell('Item',{width:7,bold:true}),tcell('Material danificado',{width:36,bold:true,align:AlignmentType.LEFT}),tcell('Quantidade',{width:12,bold:true}),tcell('Unidade',{width:10,bold:true}),tcell('Idade',{width:15,bold:true}),tcell('Valor reclamado',{width:20,bold:true})]});
      const damageDataRows=damageItems.map((item,index)=>new TableRow({cantSplit:true,children:[tcell(String(index+1),{width:7}),tcell(item.description,{width:36,align:AlignmentType.LEFT}),tcell(item.quantity,{width:12}),tcell(item.unit,{width:10}),tcell(`${item.age || ''} ${item.ageUnit || ''}`,{width:15}),tcell(REPORT().money(item.claimedTotal),{width:20})]}));
      technical.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[damageHeader,...damageDataRows]}));
    } else {
      technical.push(para('Nenhum item cadastrado.',{alignment:AlignmentType.LEFT}));
    }
    addPage(technical);

    // Fotografias — quatro por página
    const photos=(state.photos||[]).filter(p=>p.dataUrl);
    for(let start=0;start<photos.length;start+=4){
      const slice=photos.slice(start,start+4);
      const rows=[];
      for(let r=0;r<2;r++){
        const cells=[];
        for(let c=0;c<2;c++){
          const photo=slice[r*2+c];
          if(!photo){cells.push(tcell('',{width:50,border:noBorder}));continue;}
          const image=await canvasBytes(photo.dataUrl,1000,850,{background:'#ffffff'});
          const scale=Math.min(260/image.width,220/image.height,1);
          cells.push(new TableCell({width:{size:50,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.TOP,borders:noBorder,margins:{top:80,bottom:80,left:80,right:80},children:[
            new Paragraph({children:[new ImageRun({data:image.data,type:'png',transformation:{width:Math.max(1,Math.round(image.width*scale)),height:Math.max(1,Math.round(image.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:80}}),
            caption(`Figura ${start+r*2+c+1} — ${photo.caption || ''}`)
          ]}));
        }
        rows.push(new TableRow({children:cells}));
      }
      addPage([heading(start ? 'REGISTRO FOTOGRÁFICO — CONTINUAÇÃO' : 'REGISTRO FOTOGRÁFICO'),new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows})]);
    }

    // Documentos e parecer
    const docs = f.noDocuments ? [] : (state.documents || []);
    const docChildren=[subheading('4.2. LEVANTAMENTOS DOCUMENTAIS')];
    if(docs.length) docs.forEach((doc,index)=>docChildren.push(para([run(`${index+1}. ${doc.type || doc.name || 'Documento'}`,{bold:true}),run(doc.description ? ` — ${doc.description}` : '')],{alignment:AlignmentType.LEFT})));
    else docChildren.push(para('Documentos não apresentados até o momento.'));
    docChildren.push(heading('5. PARECER DO REGULADOR'),para(f.regulatorOpinion || ''));
    addPage(docChildren);

    // Demonstrativo
    const rowsPerPage=8;
    const damages=state.damages || [];
    const chunks=damages.length ? Array.from({length:Math.ceil(damages.length/rowsPerPage)},(_,i)=>damages.slice(i*rowsPerPage,(i+1)*rowsPerPage)) : [[]];
    chunks.forEach((slice,pageIndex)=>{
      const start=pageIndex*rowsPerPage;
      const children=[heading(pageIndex ? '6. DEMONSTRATIVO DE INDENIZAÇÃO — CONTINUAÇÃO' : '6. DEMONSTRATIVO DE INDENIZAÇÃO')];
      if(!pageIndex) children.push(para('Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.'));
      children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
        new TableRow({children:[tcell('Item',{width:7,bold:true}),tcell('Descrição',{width:34,bold:true,align:AlignmentType.LEFT}),tcell('Quantidade / unidade',{width:17,bold:true}),tcell('Idade',{width:12,bold:true}),tcell('Valor reclamado',{width:15,bold:true}),tcell('Valor apurado',{width:15,bold:true})]}),
        ...slice.map((item,i)=>new TableRow({children:[tcell(String(start+i+1),{width:7}),tcell(item.description,{width:34,align:AlignmentType.LEFT}),tcell(`${item.quantity || ''} ${item.unit || ''}`,{width:17}),tcell(`${item.age || ''} ${item.ageUnit || ''}`,{width:12}),tcell(REPORT().money(item.claimedTotal),{width:15}),tcell(item.assessedTotal===''||item.assessedTotal==null?'A INFORMAR':REPORT().money(item.assessedTotal),{width:15})]}))
      ]}));
      if(pageIndex===chunks.length-1) children.push(new Table({width:{size:62,type:WidthType.PERCENTAGE},alignment:AlignmentType.RIGHT,rows:[
        new TableRow({children:[tcell('Total reclamado',{width:65,align:AlignmentType.LEFT,bold:true,shading:LIGHT}),tcell(REPORT().money(calc.totalClaimed),{width:35,shading:LIGHT})]}),
        new TableRow({children:[tcell('Total dos prejuízos apurados',{width:65,align:AlignmentType.LEFT,bold:true}),tcell(REPORT().money(calc.totalAssessed),{width:35})]}),
        new TableRow({children:[tcell('Franquia contratual',{width:65,align:AlignmentType.LEFT,bold:true}),tcell(REPORT().money(calc.deductible),{width:35})]}),
        new TableRow({children:[tcell('Valor líquido apurado para indenização',{width:65,align:AlignmentType.LEFT,bold:true,shading:LIGHT}),tcell(REPORT().money(calc.net),{width:35,shading:LIGHT})]})
      ]}));
      addPage(children);
    });

    // Encerramento
    const other = f.otherInsurance==='nao' ? 'O cooperado declara não possuir outros seguros contratados para os bens sinistrados.' : f.otherInsurance==='sim' ? `O cooperado declarou a existência de outro(s) seguro(s): ${f.otherInsuranceDetails || ''}` : 'Declaração sobre outros seguros não informada.';
    const closing=[heading('7. DECLARAÇÃO DE OUTROS SEGUROS'),para(other),heading('8. DADOS CADASTRAIS'),para([run('Nome completo: ',{bold:true}),run(f.claimantName || ''),run('\nCPF: ',{bold:true}),run(f.claimantCpf || ''),run('\nDados Bancários: ',{bold:true}),run(`${f.bankName || ''} — AG: ${f.bankAgency || ''} / CC: ${f.bankAccount || ''}`)]),heading('9. CRONOLOGIA')];
    closing.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
      ['Data da ocorrência',REPORT().formatDate(f.lossDate)],['Data do aviso',REPORT().formatDate(f.noticeDate)],['Data do agendamento da vistoria',REPORT().formatDate(f.scheduleDate)],['Data da realização da vistoria',REPORT().formatDate(f.inspectionDate)]
    ].map(([label,date])=>new TableRow({children:[tcell(label,{width:72,align:AlignmentType.LEFT}),tcell(date,{width:28})]}))}));
    closing.push(heading('10. INFORMAÇÕES COMPLEMENTARES'),para('As orientações não representam o reconhecimento prévio de cobertura do sinistro ora reclamado ou de eventual valor a indenizar, os quais dependem da análise das Condições do Seguro contratado, e da devida análise e manifestação da Companhia Seguradora.'),para(`${f.reportCity || ''}, ${REPORT().longDate(f.reportDate)}.`,{alignment:AlignmentType.RIGHT,before:400}));

    const signatureCells=[];
    for(const role of ['regulator','claimant']){
      const dataUrl=state.signatures?.[role];
      const children=[];
      if(dataUrl){const sig=await canvasBytes(dataUrl,900,320,{background:'#ffffff'});const scale=Math.min(170/sig.width,65/sig.height,1);children.push(new Paragraph({children:[new ImageRun({data:sig.data,type:'png',transformation:{width:Math.round(sig.width*scale),height:Math.round(sig.height*scale)}})],alignment:AlignmentType.CENTER,spacing:{after:0}}));}
      else children.push(new Paragraph({children:[run('')],spacing:{before:700,after:0}}));
      const label=role==='regulator'?'Regulador':'Cooperado / Representante';
      const name=role==='regulator'?f.regulatorName:f.claimantName;
      const cpf=role==='regulator'?f.regulatorCpf:f.claimantCpf;
      children.push(new Paragraph({children:[run(label)],border:{top:{style:BorderStyle.SINGLE,size:4,color:'555555'}},alignment:AlignmentType.CENTER,spacing:{after:80}}),para(name || '',{alignment:AlignmentType.CENTER,after:40,line:240}),para(`CPF: ${cpf || ''}`,{alignment:AlignmentType.CENTER,after:0,line:240}));
      signatureCells.push(new TableCell({children,width:{size:50,type:WidthType.PERCENTAGE},borders:noBorder,margins:{left:300,right:300}}));
    }
    closing.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:[new TableRow({children:signatureCells})]}));
    if(draft) closing.unshift(new Paragraph({children:[run('RASCUNHO',{size:36,bold:true,color:'AA7777'})],alignment:AlignmentType.CENTER,spacing:{after:200}}));
    addPage(closing);

    const children=[];
    pages.forEach((page,index)=>{if(index)children.push(pageBreak());children.push(...page);});

    const doc = new Document({
      creator:'Horizon Servitas',title:'Relatório Fast Track de Contingência',description:'Relatório gerado pelo aplicativo Fast Track',
      styles:{default:{document:{run:{font:'Arial',size:22,color:BLACK},paragraph:{spacing:{line:360,after:160}}}}},
      sections:[{
        properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:284,right:1134,bottom:284,left:1701,header:57,footer:0,gutter:0}}},
        headers:{default:header,first:firstHeader},footers:{default:footer,first:footer},children
      }]
    });
    const blob = await Packer.toBlob(doc);
    download(blob,`Relatorio_Fast_Track_${safeName(f.insurerClaim || f.hsClaim || f.claimantName)}.docx`);
  }

  window.FastTrackV06Word = {exportDocx};
})();
