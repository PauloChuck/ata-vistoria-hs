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
      VerticalPositionAlign,TextWrappingType,TableLayoutType,HeightRule
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

    function tcell(content,{width,align=AlignmentType.CENTER,bold=false,shading,vertical=VerticalAlign.CENTER,border=thinBorder,size=20,font='Arial',line=240,margins={top:60,bottom:60,left:80,right:80}}={}) {
      const children = Array.isArray(content) && content.every(x => x && typeof x === 'object' && x.constructor?.name === 'Paragraph')
        ? content : [para(Array.isArray(content) ? content : text(content),{alignment:align,after:0,line,size,font})];
      if (bold && children[0]) children[0] = new Paragraph({children:[run(text(content),{size,bold:true,font})],alignment:align,spacing:{after:0,line}});
      return new TableCell({children,width:width ? {size:width,type:WidthType.PERCENTAGE}:undefined,verticalAlign:vertical,borders:border,shading:shading ? {type:ShadingType.CLEAR,fill:shading}:undefined,margins});
    }

    const CM_TO_PX = 96 / 2.54;
    const LOGO_WIDTH_PX = 6.85 * CM_TO_PX;
    const LOGO_HEIGHT_PX = 3.30 * CM_TO_PX;
    const WATERMARK_WIDTH_PX = 16.00 * CM_TO_PX;
    const WATERMARK_HEIGHT_PX = 11.925 * CM_TO_PX;

    const createLogoRun = () => new ImageRun({
      data:logo.data,
      type:'png',
      transformation:{width:LOGO_WIDTH_PX,height:LOGO_HEIGHT_PX}
    });

    const createWatermarkRun = () => new ImageRun({
      data:watermark.data,
      type:'png',
      transformation:{width:WATERMARK_WIDTH_PX,height:WATERMARK_HEIGHT_PX},
      floating:{
        horizontalPosition:{relative:HorizontalPositionRelativeFrom?.MARGIN || 'margin',align:HorizontalPositionAlign?.CENTER || 'center'},
        verticalPosition:{relative:VerticalPositionRelativeFrom?.MARGIN || 'margin',align:VerticalPositionAlign?.CENTER || 'center'},
        behindDocument:true,
        wrap:{type:TextWrappingType?.NONE || 'none'}
      }
    });

    const createInstitutionalHeader = () => new Header({children:[
      new Paragraph({children:[createLogoRun()],alignment:AlignmentType.RIGHT,spacing:{after:0}}),
      new Paragraph({children:[createWatermarkRun()],spacing:{after:0}})
    ]});
    const header = createInstitutionalHeader();
    const firstHeader = createInstitutionalHeader();

    const FOOTER_MARK_WIDTH_PX = 2.22 * CM_TO_PX;
    const FOOTER_MARK_HEIGHT_PX = 1.65 * CM_TO_PX;
    const footerInfoTable = new Table({
      width:{size:11907,type:WidthType.DXA},
      indent:{size:-1701,type:WidthType.DXA},
      layout:TableLayoutType.FIXED,
      columnWidths:[1559,10348],
      borders:noBorder,
      rows:[new TableRow({cantSplit:true,children:[
        new TableCell({
width:{size:1559,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,borders:noBorder,
margins:{top:0,bottom:0,left:0,right:0},
children:[new Paragraph({children:[new ImageRun({data:footerMark.data,type:'png',transformation:{width:FOOTER_MARK_WIDTH_PX,height:FOOTER_MARK_HEIGHT_PX}})],alignment:AlignmentType.LEFT,spacing:{after:0,line:240}})]
        }),
        new TableCell({
width:{size:10348,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,borders:noBorder,
margins:{top:0,bottom:0,left:0,right:0},
children:[
  new Paragraph({children:[run('Matriz - Rua XV de novembro 1336, salas 34 e 35 – Blumenau – SC – CEP 89010-903',{font:'Calibri',size:20,color:BLUE})],alignment:AlignmentType.LEFT,spacing:{line:360,after:0}}),
  new Paragraph({children:[run('www.horizonservitas.com +55 47 3326-1844',{font:'Calibri',size:20,color:BLUE})],alignment:AlignmentType.LEFT,spacing:{line:360,after:0}})
]
        })
      ]})]
    });
    const footerPageNumber = new Paragraph({
      children:[new TextRun({children:[PageNumber.CURRENT,' de ',PageNumber.TOTAL_PAGES],font:'Arial',size:20,italics:true,color:'000000'})],
      alignment:AlignmentType.RIGHT,indent:{right:-994},spacing:{after:0,line:240}
    });
    const footer = new Footer({children:[footerInfoTable,footerPageNumber]});

    const children = [];

    // Capa — estrutura isolada do restante do relatório
    const COVER_TABLE_WIDTH = 9786;
    const COVER_COLUMNS = [3691,703,5392];
    const COVER_ROW_HEIGHT = 650;
    const compactCoverText = (value, fallback = '') => {
      const normalized = text(value).replace(/\s+/g, ' ').trim();
      return normalized || fallback;
    };
    const coverParagraph = (value,{bold=false,size=24}={}) => new Paragraph({
      children:[new TextRun({text:compactCoverText(value,''),font:'Arial',size,bold,color:BLACK})],
      alignment:AlignmentType.LEFT,
      spacing:{before:0,after:0,line:240},
      indent:{left:0,right:0},
      keepLines:true
    });
    const coverCell = (value,{width,columnSpan=1,bold=false,size=24,left=0,right=0}={}) => new TableCell({
      children:[coverParagraph(value,{bold,size})],
      width:{size:width,type:WidthType.DXA},
      columnSpan,
      verticalAlign:VerticalAlign.CENTER,
      borders:noBorder,
      margins:{top:0,bottom:0,left,right}
    });
    const coverRow = (label,value,{shifted=false}={}) => new TableRow({
      cantSplit:true,
      height:{value:COVER_ROW_HEIGHT,rule:HeightRule.ATLEAST},
      children:shifted
        ? [coverCell(label,{width:COVER_COLUMNS[0]+COVER_COLUMNS[1],columnSpan:2,bold:true,right:40}),coverCell(compactCoverText(value),{width:COVER_COLUMNS[2],left:0})]
        : [coverCell(label,{width:COVER_COLUMNS[0],bold:true,right:40}),coverCell(compactCoverText(value),{width:COVER_COLUMNS[1]+COVER_COLUMNS[2],columnSpan:2,left:0})]
    });
    const claimCell = (value,width) => new TableCell({
      children:[new Paragraph({children:[new TextRun({text:compactCoverText(value),font:'Arial',size:22,color:BLACK})],alignment:AlignmentType.LEFT,spacing:{before:0,after:0,line:240},keepLines:true})],
      width:{size:width,type:WidthType.DXA},
      verticalAlign:VerticalAlign.CENTER,
      borders:noBorder,
      margins:{top:60,bottom:60,left:0,right:0}
    });
    const claimTable = new Table({
      width:{size:4989,type:WidthType.DXA},
      alignment:AlignmentType.RIGHT,
      layout:TableLayoutType.FIXED,
      columnWidths:[3288,1701],
      borders:noBorder,
      rows:[
        new TableRow({cantSplit:true,children:[claimCell('Sinistro Seguradora:',3288),claimCell(f.insurerClaim || 'A INFORMAR',1701)]}),
        new TableRow({cantSplit:true,children:[claimCell('Sinistro Horizon Servitas:',3288),claimCell(f.hsClaim || '',1701)]})
      ]
    });
    const metaTable = new Table({
      width:{size:COVER_TABLE_WIDTH,type:WidthType.DXA},
      layout:TableLayoutType.FIXED,
      columnWidths:COVER_COLUMNS,
      borders:noBorder,
      rows:[
        coverRow('COMPANHIA SEGURADORA:',f.insurer),
        coverRow('SEGURADO:',f.insured),
        coverRow('COOPERADO:',f.claimantName),
        coverRow('LOCAL DO SINISTRO:',f.riskAddress),
        coverRow('APÓLICE DE SEGUROS:',f.policyNumber),
        coverRow('PRODUTO:',f.productName),
        coverRow('CORRETOR:',f.broker),
        coverRow('DATA DO SINISTRO:',REPORT().longDate(f.lossDate,true),{shifted:true}),
        coverRow('COBERTURA:',f.coverageName,{shifted:true})
      ]
    });
    children.push(
      new Paragraph({children:[new TextRun({text:'RELATÓRIO DE CONTINGÊNCIA',font:'Arial Black',size:52,bold:true,color:BLACK})],alignment:AlignmentType.LEFT,spacing:{before:340,after:0,line:240},keepLines:true}),
      new Paragraph({children:[new TextRun({text:'RISCOS NOMEADOS EMPRESARIAL',font:'Arial Black',size:48,bold:true,color:BLUE,characterSpacing:-10})],alignment:AlignmentType.LEFT,spacing:{before:0,after:420,line:240},keepLines:true}),
      claimTable,
      new Paragraph({spacing:{after:180,line:20}}),
      metaTable,
      pageBreak()
    );

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
      technical.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[635,3266,1089,907,1361,1814],rows:[damageHeader,...damageDataRows]}));
    } else {
      technical.push(para('Nenhum item cadastrado.',{alignment:AlignmentType.LEFT}));
    }
    children.push(...technical);

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
        rows.push(new TableRow({cantSplit:true,children:cells}));
      }
      if(start) children.push(pageBreak());
      children.push(heading(start ? 'REGISTRO FOTOGRÁFICO — CONTINUAÇÃO' : 'REGISTRO FOTOGRÁFICO'),new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows}));
    }

    // Documentos e parecer
    const docs = f.noDocuments ? [] : (state.documents || []);
    const docChildren=[subheading('4.2. LEVANTAMENTOS DOCUMENTAIS')];
    if(docs.length) docs.forEach((doc,index)=>docChildren.push(para([run(`${index+1}. ${doc.type || doc.name || 'Documento'}`,{bold:true}),run(doc.description ? ` — ${doc.description}` : '')],{alignment:AlignmentType.LEFT})));
    else docChildren.push(para('Documentos não apresentados até o momento.'));
    docChildren.push(heading('5. PARECER DO REGULADOR'),para(f.regulatorOpinion || ''));
    children.push(...docChildren);

    // Demonstrativo contínuo, com cabeçalho repetido e linhas indivisíveis
    const damages=state.damages || [];
    const indemnityHeader = new TableRow({tableHeader:true,cantSplit:true,children:[
      tcell('Item',{width:7,bold:true}),tcell('Descrição',{width:34,bold:true,align:AlignmentType.LEFT}),
      tcell('Quantidade / unidade',{width:17,bold:true}),tcell('Idade',{width:12,bold:true}),
      tcell('Valor reclamado',{width:15,bold:true}),tcell('Valor apurado',{width:15,bold:true})
    ]});
    const indemnityDataRows = damages.map((item,index)=>new TableRow({cantSplit:true,children:[
      tcell(String(index+1),{width:7}),tcell(item.description,{width:34,align:AlignmentType.LEFT}),
      tcell(`${item.quantity || ''} ${item.unit || ''}`,{width:17}),tcell(`${item.age || ''} ${item.ageUnit || ''}`,{width:12}),
      tcell(REPORT().money(item.claimedTotal),{width:15}),tcell(item.assessedTotal===''||item.assessedTotal==null?'A INFORMAR':REPORT().money(item.assessedTotal),{width:15})
    ]}));
    children.push(
      heading('6. DEMONSTRATIVO DE INDENIZAÇÃO'),
      para('Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.'),
      new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[635,3084,1542,1089,1361,1361],rows:[indemnityHeader,...indemnityDataRows]}),
      new Paragraph({spacing:{after:0,line:20}}),
      new Table({width:{size:62,type:WidthType.PERCENTAGE},alignment:AlignmentType.RIGHT,rows:[
        new TableRow({cantSplit:true,children:[tcell('Total reclamado',{width:65,align:AlignmentType.LEFT,bold:true,shading:LIGHT}),tcell(REPORT().money(calc.totalClaimed),{width:35,shading:LIGHT})]}),
        new TableRow({cantSplit:true,children:[tcell('Total dos prejuízos apurados',{width:65,align:AlignmentType.LEFT,bold:true}),tcell(REPORT().money(calc.totalAssessed),{width:35})]}),
        new TableRow({cantSplit:true,children:[tcell('Franquia contratual',{width:65,align:AlignmentType.LEFT,bold:true}),tcell(REPORT().money(calc.deductible),{width:35})]}),
        new TableRow({cantSplit:true,children:[tcell('Valor líquido apurado para indenização',{width:65,align:AlignmentType.LEFT,bold:true,shading:LIGHT}),tcell(REPORT().money(calc.net),{width:35,shading:LIGHT})]})
      ]})
    );

    // Encerramento
    const other = f.otherInsurance==='nao' ? 'O cooperado declara não possuir outros seguros contratados para os bens sinistrados.' : f.otherInsurance==='sim' ? `O cooperado declarou a existência de outro(s) seguro(s): ${f.otherInsuranceDetails || ''}` : 'Declaração sobre outros seguros não informada.';
    const cadastralParagraph = (label,value) => new Paragraph({
      children:[
        run(label,{font:'Arial',size:22,bold:true}),
        run(value,{font:'Arial',size:22})
      ],
      alignment:AlignmentType.LEFT,
      spacing:{before:0,after:160,line:240},
      keepLines:true
    });
    const closing=[
      heading('7. DECLARAÇÃO DE OUTROS SEGUROS'),
      para(other),
      heading('8. DADOS CADASTRAIS'),
      cadastralParagraph('Nome completo: ',f.claimantName || ''),
      cadastralParagraph('CPF: ',f.claimantCpf || ''),
      cadastralParagraph('Dados Bancários: ',`${f.bankName || ''} — AG: ${f.bankAgency || ''} / CC: ${f.bankAccount || ''}`),
      heading('9. CRONOLOGIA')
    ];
    closing.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
      ['Data da ocorrência',REPORT().formatDate(f.lossDate)],['Data do aviso',REPORT().formatDate(f.noticeDate)],['Data do agendamento da vistoria',REPORT().formatDate(f.scheduleDate)],['Data da realização da vistoria',REPORT().formatDate(f.inspectionDate)]
    ].map(([label,date])=>new TableRow({cantSplit:true,children:[tcell(label,{width:72,align:AlignmentType.LEFT}),tcell(date,{width:28})]}))}));
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
    closing.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:[new TableRow({cantSplit:true,children:signatureCells})]}));
    if(draft) closing.unshift(new Paragraph({children:[run('RASCUNHO',{size:36,bold:true,color:'AA7777'})],alignment:AlignmentType.CENTER,spacing:{after:200}}));
    children.push(...closing);

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
