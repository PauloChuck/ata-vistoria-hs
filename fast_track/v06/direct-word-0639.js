(() => {
  'use strict';

  const REPORT = () => window.FastTrackV06Report;
  const BLUE = '29A8E0';
  const CAPTION_BLUE = '1F497D';
  const BLACK = '111111';
  const MUTED = '555555';

  function requireDocx() {
    if (!window.docx) throw new Error('A biblioteca de geração do Word não foi carregada. Verifique sua conexão e atualize a página.');
    return window.docx;
  }

  const text = (value) => String(value == null ? '' : value);
  const safeName = (value) => text(value || 'processo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'processo';
  const compact = (value) => text(value).replace(/\s+/g,' ').trim();
  const quantityUnit = (item) => [compact(item?.quantity),compact(item?.unit)].filter(Boolean).join(' ');
  const ageValue = (item) => [compact(item?.age),compact(item?.ageUnit)].filter(Boolean).join(' ');
  const isImageEvidence = (item) => String(item?.mime || '').toLowerCase().startsWith('image/') || /\.(jpe?g|png)$/i.test(String(item?.name || ''));

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
    const width = Math.max(1,Math.round(image.naturalWidth * ratio));
    const height = Math.max(1,Math.round(image.naturalHeight * ratio));
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
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }

  async function exportDocx(state,{draft = false} = {}) {
    const d = requireDocx();
    const {
      Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,AlignmentType,
      VerticalAlign,BorderStyle,Header,Footer,ImageRun,PageNumber,PageBreak,
      HorizontalPositionRelativeFrom,HorizontalPositionAlign,VerticalPositionRelativeFrom,
      VerticalPositionAlign,TextWrappingType,TableLayoutType,HeightRule
    } = d;

    const none = {style:BorderStyle.NONE,color:'FFFFFF',size:0};
    const thin = {style:BorderStyle.SINGLE,color:'666666',size:4};
    const attachmentOutline={type:'solidFill',solidFillType:'rgb',value:'000000',width:9525,cap:'flat',compoundLine:'sng',align:'in'};
    const noBorder = {top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none};
    const horizontalBorder = ({top=false,bottom=false}={}) => ({
      top:top ? thin : none,
      bottom:bottom ? thin : none,
      left:none,
      right:none,
      insideHorizontal:none,
      insideVertical:none
    });

    const f = state.fields || {};
    const aurora=window.FastTrackAuroraReport?.matches(state);
    const calc = REPORT().calculate(state);
    const riskCard = window.FastTrackRiskCard?.data(state) || null;
    const logo = await canvasBytes(REPORT().ASSETS.logo,620,240,{background:'#ffffff'});
    const watermark = await canvasBytes(REPORT().ASSETS.watermark,1000,750);
    const footerMark = await canvasBytes(REPORT().ASSETS.footer,260,190);

    const run = (value,opts={}) => new TextRun({
      text:text(value),
      font:opts.font || 'Arial',
      size:opts.size || 22,
      bold:!!opts.bold,
      color:opts.color || BLACK,
      italics:!!opts.italics,
      underline:opts.underline ? {} : undefined,
      break:opts.break
    });
    const para = (value,opts={}) => new Paragraph({
      children:Array.isArray(value) ? value : [run(value,opts)],
      alignment:opts.alignment || AlignmentType.JUSTIFIED,
      spacing:{line:opts.line || 360,after:opts.after == null ? 160 : opts.after,before:opts.before || 0},
      keepNext:!!opts.keepNext,
      keepLines:!!opts.keepLines,
      indent:opts.indent,
      border:opts.border
    });
    const heading = (value) => new Paragraph({
      children:[run(value,{font:'Arial Black',size:28,bold:true})],
      spacing:{before:600,after:300,line:360},
      keepNext:true,
      keepLines:true
    });
    const subheading = (value) => new Paragraph({
      children:[run(value.toUpperCase(),{size:24,bold:true})],
      spacing:{before:500,after:200,line:360},
      keepNext:true,
      keepLines:true
    });
    const narrativeParagraphs = (value) => text(value).replace(/\r\n/g,'\n').split('\n').map((line) => para(line,{alignment:AlignmentType.JUSTIFIED,line:360,after:160}));
    const caption = (value) => new Paragraph({children:[run(value,{size:20,color:CAPTION_BLUE})],alignment:AlignmentType.CENTER,spacing:{line:240,after:120},keepLines:true});
    const pageBreak = () => new Paragraph({children:[new PageBreak()]});

    function cellFromParagraphs(paragraphs,{width,align=AlignmentType.CENTER,vertical=VerticalAlign.CENTER,border=noBorder,margins={top:60,bottom:60,left:80,right:80}}={}) {
      return new TableCell({
        children:paragraphs,
        width:width ? {size:width,type:WidthType.PERCENTAGE} : undefined,
        verticalAlign:vertical,
        borders:border,
        margins
      });
    }

    function tcell(value,{width,keepNext=false,align=AlignmentType.CENTER,bold=false,vertical=VerticalAlign.CENTER,border=noBorder,size=20,font='Arial',color=BLACK,line=240,margins={top:60,bottom:60,left:80,right:80}}={}) {
      const values = Array.isArray(value) ? value : [value];
      const paragraphs = values.map((entry) => entry instanceof Paragraph
        ? entry
        : new Paragraph({children:[run(entry,{size,bold,font,color})],alignment:align,spacing:{after:0,line},keepLines:true,keepNext}));
      return cellFromParagraphs(paragraphs,{width,align,vertical,border,margins});
    }

    function riskCardTable(model) {
      const red='BB000B',edge={style:BorderStyle.SINGLE,color:BLACK,size:4},rule={style:BorderStyle.SINGLE,color:'BBBBBB',size:4};
      const p=(v,o={})=>para(v,{size:18,line:240,after:0,alignment:AlignmentType.LEFT,keepLines:true,...o});
      const gap=(keepNext=false)=>p('',{size:2,line:20,keepNext});
      const output=[];
      for (const card of model.cards) {
        output.push(p('CONSULTA DE COOPERADOS',{size:20,bold:true,color:red,after:70,keepNext:true}),
          p([run(card.group,{size:32,bold:true,color:red}),run((card.group && card.activity?' — ':'')+card.activity,{size:32,bold:true})],{after:160,keepNext:true}));
        const identity=[p(card.name,{size:28,bold:true,after:40,keepNext:true}),p(card.counts,{size:20,keepNext:true})];
        const headCell=(children,width,shade)=>new TableCell({children,width:{size:width,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,borders:{...noBorder,top:{style:BorderStyle.SINGLE,color:red,size:20},left:shade?none:edge,right:shade || !card.origin?edge:none},margins:{top:150,bottom:150,left:150,right:150},shading:{fill:shade?'FFECDD':'FFFFFF'}});
        output.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:card.origin?[6804,2268]:[9072],borders:noBorder,rows:[new TableRow({cantSplit:true,children:[headCell(identity,card.origin?6804:9072,false),...(card.origin?[headCell([p(card.origin,{size:18,bold:true,color:'932D0A',alignment:AlignmentType.CENTER,keepNext:true})],2268,true)]:[])]})]}),gap(true));
        for (const block of card.blocks) {
          const widths=block.widths.map(w=>Math.round(w*9072/100));
          widths[widths.length-1]+=9072-widths.reduce((a,b)=>a+b,0);
          const cell=(v,i,{header=false,span=1,title=false,keepNext=false}={})=>new TableCell({
            children:[p(v,{size:header?17:title?25:18,bold:header||title,color:title?'930C0C':BLACK,alignment:title || block.columns[i]==='NOME'||i===0?AlignmentType.LEFT:AlignmentType.CENTER,keepNext})],
            columnSpan:span,width:{size:span>1?9072:widths[i],type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,
            margins:{top:title?130:90,bottom:title?130:90,left:i===0?150:55,right:55},
            shading:{fill:header?'EAEAEA':title?'FFF9F6':'FFFFFF'},
            borders:{...noBorder,left:i===0?edge:none,right:i+span===widths.length?edge:none,bottom:rule}
          });
          const rows=[];
          if(block.title)rows.push(new TableRow({cantSplit:true,tableHeader:true,children:[cell(block.title,0,{span:widths.length,title:true,keepNext:true})]}));
          rows.push(new TableRow({cantSplit:true,tableHeader:true,children:block.columns.map((v,i)=>cell(v,i,{header:true,keepNext:true}))}));
          rows.push(...block.rows.map(row=>new TableRow({cantSplit:true,children:row.values.map((v,i)=>cell(v,i))})));
          output.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:widths,borders:noBorder,rows}),gap());
        }
      }
      return output;
    }


    const CM_TO_PX = 96 / 2.54;
    const LOGO_WIDTH_PX = 6.85 * CM_TO_PX;
    const LOGO_HEIGHT_PX = 3.30 * CM_TO_PX;
    const WATERMARK_WIDTH_PX = 16.00 * CM_TO_PX;
    const WATERMARK_HEIGHT_PX = 11.925 * CM_TO_PX;
    const FOOTER_MARK_WIDTH_PX = 2.22 * CM_TO_PX;
    const FOOTER_MARK_HEIGHT_PX = 1.65 * CM_TO_PX;

    const createLogoRun = () => new ImageRun({data:logo.data,type:'png',transformation:{width:LOGO_WIDTH_PX,height:LOGO_HEIGHT_PX}});
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
      children:[new TextRun({children:['Página ',PageNumber.CURRENT],font:'Arial',size:20,italics:true,color:'000000'})],
      alignment:AlignmentType.RIGHT,
      indent:{right:-994},
      spacing:{after:0,line:240}
    });
    const footer = new Footer({children:[footerInfoTable,footerPageNumber]});

    const children = [];

    // Capa institucional preservada
    const COVER_TABLE_WIDTH = 9786;
    const COVER_COLUMNS = [3691,703,5392];
    const COVER_ROW_HEIGHT = 650;
    const compactCoverText = (value, fallback = '') => (compact(value) || fallback).toUpperCase();
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
    const claimState=aurora?{...state,fields:window.FastTrackAuroraReport.coverFields(state)}:state;
    const claim=window.FastTrackPresentation.claimData(claimState);
    if (!claim.fits) throw new Error(window.FastTrackPresentation.claimError(state));
    const claimWidth=Math.round(claim.widthMm*1440/25.4),labelWidth=Math.round(claim.labelMm*1440/25.4);
    const claimCell = (value,width) => new TableCell({
      children:[new Paragraph({children:[new TextRun({text:value,font:'Arial',size:claim.size*2,color:BLACK,bold:false})],alignment:AlignmentType.LEFT,spacing:{before:0,after:0,line:240},keepLines:true})],
      width:{size:width,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,borders:noBorder,margins:{top:0,bottom:0,left:0,right:0}
    });
    const claimTable = new Table({
      width:{size:claimWidth,type:WidthType.DXA},alignment:AlignmentType.LEFT,indent:{size:COVER_TABLE_WIDTH-claimWidth,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[labelWidth,claimWidth-labelWidth],borders:noBorder,
      rows:claim.rows.map(row=>new TableRow({cantSplit:true,children:[claimCell(row[0],labelWidth),claimCell(row[1],claimWidth-labelWidth)]}))
    });
    const metaTable = aurora ? new Table({
      width:{size:COVER_TABLE_WIDTH,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[3691,6095],borders:noBorder,
      rows:window.FastTrackAuroraReport.coverRows(state).map(([label,value])=>new TableRow({cantSplit:true,height:{value:COVER_ROW_HEIGHT,rule:HeightRule.ATLEAST},children:[coverCell(label,{width:3691,bold:true,right:57}),coverCell(value,{width:6095})]}))
    }) : new Table({
      width:{size:COVER_TABLE_WIDTH,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:COVER_COLUMNS,borders:noBorder,
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

    // Conteúdo técnico inicial
    const technical = [heading('1. LOCAL DO SINISTRO'),para('Trata-se de propriedade rural destinada a engorda de animais (matérias-primas) do segurado.')];
    if (riskCard) technical.push(...riskCardTable(riskCard));
    if (state.map?.dataUrl) {
      const mapImg = await canvasBytes(state.map.dataUrl,1050,720,{background:'#ffffff'});
      const scale = Math.min(490/mapImg.width,340/mapImg.height,1);
      technical.push(
        new Paragraph({children:[new ImageRun({data:mapImg.data,type:'png',outline:attachmentOutline,transformation:{width:Math.max(1,Math.round(mapImg.width*scale)),height:Math.max(1,Math.round(mapImg.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:80},keepNext:true,keepLines:true}),
        caption('Localização da propriedade sinistrada.')
      );
    } else technical.push(para('Imagem de localização não informada.',{alignment:AlignmentType.CENTER}));
    technical.push(heading('2. DESCRIÇÃO DA OCORRÊNCIA'),...narrativeParagraphs(REPORT().effectiveOccurrenceText(state)),heading('3. COBERTURA RECLAMADA'));

    const coverageRows=window.FastTrackPolicies.reportRows(state);
    const coverageBorder=aurora?{...horizontalBorder({bottom:true}),bottom:{style:BorderStyle.SINGLE,color:'000000',size:4}}:horizontalBorder({bottom:true});
    const coverageCells=(values,header=false,keepNext=header && coverageRows.length>0)=>values.map((value,index)=>tcell(String(value).split('\n'),{
      width:[40,30,30][index],align:index===0?AlignmentType.LEFT:AlignmentType.CENTER,
      bold:header,keepNext,border:coverageBorder,
      size:aurora?24:22,line:270,margins:{top:100,bottom:100,left:80,right:80}
    }));
    technical.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,
      columnWidths:[3628,2722,2722],borders:noBorder,rows:[
        new TableRow({tableHeader:true,cantSplit:true,children:coverageCells(['Cobertura','Limite de Indenização','Franquia'],true)}),
        // Anchor the first two entries together as well: some Word-compatible readers
        // otherwise strand the repeated header and clip the first entry at a page boundary.
        ...coverageRows.map((row,index)=>new TableRow({cantSplit:true,children:coverageCells(row,false,index===0 && coverageRows.length>1)}))
      ]}));

    technical.push(heading('4. APURAÇÕES DA REGULAÇÃO'),subheading('4.1. LEVANTAMENTOS EM VISTORIA'),...narrativeParagraphs(REPORT().effectiveInspectionText(state)),subheading('RELAÇÃO DE DANOS:'));
    const damageItems = state.damages || [];
    if (damageItems.length) {
      const damageRows = damageItems.map((item) => new TableRow({cantSplit:true,children:[
        tcell(quantityUnit(item) || '—',{width:20,bold:true,border:noBorder,size:22,margins:{top:75,bottom:75,left:40,right:120}}),
        tcell(item.description || '',{width:57,align:AlignmentType.LEFT,border:noBorder,size:22,margins:{top:75,bottom:75,left:40,right:120}}),
        tcell(ageValue(item) ? `Idade: ${ageValue(item)}` : 'Idade: não informada',{width:23,align:AlignmentType.RIGHT,border:noBorder,size:20,color:MUTED,margins:{top:75,bottom:75,left:40,right:40}})
      ]}));
      technical.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[1814,5171,2087],borders:noBorder,rows:damageRows}));
    } else technical.push(para('Nenhum item cadastrado.',{alignment:AlignmentType.LEFT}));
    children.push(...technical);

    // Fotografias — até quatro por página, mantendo imagem e legenda juntas
    const photos = (state.photos || []).filter((photo) => photo.dataUrl);
    for (let start = 0; start < photos.length; start += 4) {
      const slice = photos.slice(start,start + 4);
      const rows = [];
      for (let r = 0; r < 2; r += 1) {
        const cells = [];
        for (let c = 0; c < 2; c += 1) {
          const photo = slice[r * 2 + c];
          if (!photo) { cells.push(tcell('',{width:50,border:noBorder})); continue; }
          const image = await canvasBytes(photo.dataUrl,1000,850,{background:'#ffffff'});
          const scale = Math.min(260/image.width,220/image.height,1);
          cells.push(new TableCell({
            width:{size:50,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.TOP,borders:noBorder,margins:{top:80,bottom:80,left:80,right:80},
            children:[
              new Paragraph({children:[new ImageRun({data:image.data,type:'png',outline:attachmentOutline,transformation:{width:Math.max(1,Math.round(image.width*scale)),height:Math.max(1,Math.round(image.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:80}}),
              caption(`Figura ${start + r * 2 + c + 1} — ${photo.caption || ''}`)
            ]
          }));
        }
        rows.push(new TableRow({cantSplit:true,children:cells}));
      }
      if (start) children.push(pageBreak());
      children.push(heading(start ? 'REGISTRO FOTOGRÁFICO — CONTINUAÇÃO' : 'REGISTRO FOTOGRÁFICO'),new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows}));
    }

    // Levantamentos documentais e anexos — seção 4.2
    const documentaryChildren = [subheading('4.2. LAVANTAMENTOS DOCUMENTAIS'),...narrativeParagraphs(f.documentaryNarrative || '')];
    const evidence = Array.isArray(state.causeEvidence) ? state.causeEvidence : [];
    if (!evidence.length) {
      documentaryChildren.push(para('Nenhuma imagem ou arquivo anexado.',{alignment:AlignmentType.LEFT}));
    } else {
      for (let index = 0; index < evidence.length; index += 1) {
        const item = evidence[index] || {};
        const captionText = item.caption || item.name || 'Anexo';
        if (isImageEvidence(item) && item.dataUrl) {
          const image = await canvasBytes(item.dataUrl,1200,900,{background:'#ffffff'});
          const scale = Math.min(460/image.width,260/image.height,1);
          const imageCell = new TableCell({
            width:{size:100,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.TOP,borders:noBorder,margins:{top:80,bottom:100,left:80,right:80},
            children:[
              new Paragraph({children:[new ImageRun({data:image.data,type:'png',outline:attachmentOutline,transformation:{width:Math.max(1,Math.round(image.width*scale)),height:Math.max(1,Math.round(image.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:80}}),
              caption(`Evidência ${index + 1} — ${captionText}`)
            ]
          });
          documentaryChildren.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:[new TableRow({cantSplit:true,children:[imageCell]})]}));
        } else {
          const details = item.caption ? ` — ${item.caption}` : '';
          documentaryChildren.push(para([run(`Evidência ${index + 1}: ${item.name || 'Arquivo'}`,{bold:true}),run(` (${item.mime || 'arquivo'})${details}`)],{alignment:AlignmentType.LEFT,keepLines:true}));
        }
      }
    }
    children.push(...documentaryChildren);
    children.push(heading('5. PARECER DO REGULADOR'),...narrativeParagraphs(f.regulatorOpinion || ''));

    // Demonstrativo sem grades: descrição, quantidade, reclamado e apurado
    const damages = state.damages || [];
    const indemnityHeaderBorder = horizontalBorder({bottom:true});
    const indemnityHeader = new TableRow({tableHeader:true,cantSplit:true,children:[
      tcell('Descrição',{width:49,bold:true,align:AlignmentType.LEFT,border:indemnityHeaderBorder,size:20,margins:{top:60,bottom:100,left:40,right:100}}),
      tcell('Quantidade / unidade',{width:17,bold:true,border:indemnityHeaderBorder,size:20,margins:{top:60,bottom:100,left:40,right:40}}),
      tcell('Valor reclamado',{width:17,bold:true,align:AlignmentType.RIGHT,border:indemnityHeaderBorder,size:20,margins:{top:60,bottom:100,left:40,right:40}}),
      tcell('Valor apurado',{width:17,bold:true,align:AlignmentType.RIGHT,border:indemnityHeaderBorder,size:20,margins:{top:60,bottom:100,left:40,right:40}})
    ]});
    const indemnityDataRows = damages.map((item) => {
      const descriptionParagraphs = [
        new Paragraph({children:[run(item.description,{size:21})],alignment:AlignmentType.LEFT,spacing:{after:35,line:280},keepLines:true}),
        new Paragraph({children:[run(ageValue(item) ? `Idade: ${ageValue(item)}` : 'Idade: não informada',{size:18,color:MUTED})],alignment:AlignmentType.LEFT,spacing:{after:0,line:220},keepLines:true})
      ];
      return new TableRow({cantSplit:true,children:[
        cellFromParagraphs(descriptionParagraphs,{width:49,border:noBorder,margins:{top:95,bottom:95,left:40,right:100}}),
        tcell(quantityUnit(item) || '—',{width:17,border:noBorder,size:20,margins:{top:95,bottom:95,left:40,right:40}}),
        tcell(window.FastTrackSettlement.itemMoney(item.claimedTotal),{width:17,align:AlignmentType.RIGHT,border:noBorder,size:20,margins:{top:95,bottom:95,left:40,right:40}}),
        tcell(window.FastTrackSettlement.itemMoney(item.assessedTotal),{width:17,align:AlignmentType.RIGHT,border:noBorder,size:20,margins:{top:95,bottom:95,left:40,right:40}})
      ]});
    });
    children.push(
      heading('6. DEMONSTRATIVO DE INDENIZAÇÃO'),
      para('Conforme alinhado com a seguradora, fixamos os prejuízos juntamente com o cooperado durante a vistoria de acordo com preços médios de mercado e/ou orçamentos apresentados.'),
      damages.length
        ? new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[4445,1542,1542,1543],borders:noBorder,rows:[indemnityHeader,...indemnityDataRows]})
        : para('Nenhum item cadastrado.',{alignment:AlignmentType.LEFT})
    );

    for (const note of calc.pending || []) children.push(...narrativeParagraphs(`Pendência da apuração: ${note}`));
    const summaryTopBorder = horizontalBorder({top:true});
    const summaryRows = [
      ['Total de Prejuízos Reclamados',window.FastTrackSettlement.money(calc.totalClaimed),false,true],
      ['Total de Prejuízos Apurados',window.FastTrackSettlement.money(calc.totalAssessed),false,false],
      ['Franquia contratual',window.FastTrackPolicies.money(calc.deductible),false,false],
      ['Prejuízo Indenizável',window.FastTrackPolicies.money(calc.net),true,false]
    ].map(([label,value,highlight,first]) => new TableRow({cantSplit:true,children:[
      tcell(label,{width:72,align:AlignmentType.LEFT,bold:highlight,border:first ? summaryTopBorder : noBorder,size:22,color:highlight ? BLUE : BLACK,margins:{top:first ? 115 : 70,bottom:70,left:0,right:80}}),
      tcell(value,{width:28,align:AlignmentType.RIGHT,bold:true,border:first ? summaryTopBorder : noBorder,size:22,color:highlight ? BLUE : BLACK,margins:{top:first ? 115 : 70,bottom:70,left:80,right:0}})
    ]}));
    children.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[6532,2540],borders:noBorder,rows:summaryRows}));

    // Encerramento
    const other = f.otherInsurance === 'nao'
      ? 'O cooperado declara não possuir outros seguros contratados para os bens sinistrados.'
      : f.otherInsurance === 'sim'
        ? `O cooperado declarou a existência de outro(s) seguro(s): ${f.otherInsuranceDetails || ''}`
        : 'Declaração sobre outros seguros não informada.';
    const closing = [
      heading('7. DECLARAÇÃO DE OUTROS SEGUROS'),
      para(other),
      heading('8. CRONOLOGIA')
    ];

    const chronologyRows = [
      ['Data da ocorrência',REPORT().formatDate(f.lossDate)],
      ['Data do aviso',REPORT().formatDate(f.noticeDate)],
      ['Data do agendamento da vistoria',REPORT().formatDate(f.scheduleDate)],
      ['Data da realização da vistoria',REPORT().formatDate(f.inspectionDate)]
    ].map(([label,date],index) => new TableRow({cantSplit:true,children:[
      tcell(label,{width:72,keepNext:index<3,align:AlignmentType.LEFT,border:horizontalBorder({top:index === 0,bottom:true}),size:22,margins:{top:90,bottom:90,left:0,right:80}}),
      tcell(date,{width:28,keepNext:index<3,align:AlignmentType.RIGHT,border:horizontalBorder({top:index === 0,bottom:true}),size:22,margins:{top:90,bottom:90,left:80,right:0}})
    ]}));
    closing.push(new Table({width:{size:9072,type:WidthType.DXA},layout:TableLayoutType.FIXED,columnWidths:[6532,2540],borders:noBorder,rows:chronologyRows}));
    closing.push(
      heading('9. INFORMAÇÕES COMPLEMENTARES'),
      para('As orientações não representam o reconhecimento prévio de cobertura do sinistro ora reclamado ou de eventual valor a indenizar, os quais dependem da análise das Condições do Seguro contratado, e da devida análise e manifestação da Companhia Seguradora.'),
      para(`${f.reportCity || ''}, ${REPORT().longDate(f.reportDate)}.`,{alignment:AlignmentType.RIGHT,before:400,keepNext:true,keepLines:true})
    );

    const signatureCells = [];
    for (const role of ['regulator','claimant']) {
      const dataUrl=window.FastTrackSignatures.get(state,role);
      const imageChildren=[];
      if(dataUrl){
        const sig=await canvasBytes(dataUrl,1800,1400);
        const scale=Math.min(245.67/sig.width,136.06/sig.height,1);
        imageChildren.push(new Paragraph({children:[new ImageRun({data:sig.data,type:'png',outline:attachmentOutline,transformation:{width:Math.max(1,Math.round(sig.width*scale)),height:Math.max(1,Math.round(sig.height*scale))}})],alignment:AlignmentType.CENTER,spacing:{after:0},keepNext:true,keepLines:true}));
      }else imageChildren.push(new Paragraph({children:[run('')],spacing:{after:0},keepNext:true}));
      const frame=new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:[new TableRow({height:{value:2041,rule:HeightRule.ATLEAST},cantSplit:true,children:[new TableCell({children:imageChildren,verticalAlign:VerticalAlign.CENTER,borders:noBorder,margins:{top:0,bottom:0,left:0,right:0}})]})]});
      const person=window.FastTrackSignatures.identity(state,role);
      const label=role==='regulator'?'Assinatura do regulador':'Assinatura do cooperado/segurado';
      const cellChildren=[frame,
        new Paragraph({children:[run(label,{size:20})],border:{top:thin},alignment:AlignmentType.CENTER,spacing:{before:80,after:80},keepNext:true,keepLines:true}),
        para(person.name,{alignment:AlignmentType.CENTER,after:40,line:240,keepNext:true,keepLines:true}),
        para(person.cpf ? `CPF: ${person.cpf}` : '',{alignment:AlignmentType.CENTER,after:0,line:240,keepLines:true})
      ];
      signatureCells.push(new TableCell({children:cellChildren,width:{size:50,type:WidthType.PERCENTAGE},verticalAlign:VerticalAlign.TOP,borders:noBorder,margins:{left:170,right:170}}));
    }
    closing.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:noBorder,rows:[new TableRow({cantSplit:true,children:signatureCells})]}));
    children.push(...closing);

    const doc = new Document({
      creator:'Horizon Servitas',
      features:{updateFields:true},
      title:'Relatório Fast Track de Contingência',
      description:'Relatório gerado pelo aplicativo Fast Track',
      styles:{default:{document:{run:{font:'Arial',size:22,color:BLACK},paragraph:{spacing:{line:360,after:160}}}}},
      sections:[{
        properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:284,right:1134,bottom:284,left:1701,header:57,footer:0,gutter:0}}},
        headers:{default:header,first:firstHeader},
        footers:{default:footer,first:footer},
        children
      }]
    });
    const blob = await Packer.toBlob(doc);
    download(blob,`Relatorio_Fast_Track_${safeName(f.insurerClaim || f.hsClaim || f.claimantName)}.docx`);
  }

  window.FastTrackV06Word = {exportDocx};
})();
