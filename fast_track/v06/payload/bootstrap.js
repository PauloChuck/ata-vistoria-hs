(function(g){
  'use strict';

  const waitFor=(predicate,timeout=30000)=>new Promise((resolve,reject)=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      try{
        if(predicate()){
          clearInterval(timer);
          resolve();
          return;
        }
      }catch(error){
        clearInterval(timer);
        reject(error);
        return;
      }
      if(Date.now()-started>timeout){
        clearInterval(timer);
        reject(new Error('Tempo excedido ao inicializar o Fast Track V0.6.'));
      }
    },50);
  });

  g.__V06_BOOTSTRAP_READY=(async()=>{
    if(!g.JSZip) throw new Error('A biblioteca necessária para abrir o pacote V0.6 não foi carregada.');

    const encoded=g.__V06_PACKAGE_B64||'';
    if(!encoded) throw new Error('O pacote de dados da V0.6 está vazio.');

    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const pkg=await g.JSZip.loadAsync(bytes);
    const templateFile=pkg.file('template.docx');
    const reportFile=pkg.file('report.js');
    const appFile=pkg.file('app.js');

    if(!templateFile||!reportFile||!appFile){
      throw new Error('O pacote V0.6 está incompleto. Atualize a página para baixar novamente os arquivos.');
    }

    const templateBytes=await templateFile.async('uint8array');
    let binary='';
    for(let i=0;i<templateBytes.length;i+=0x8000){
      binary+=String.fromCharCode(...templateBytes.subarray(i,i+0x8000));
    }
    g.__V06_TEMPLATE_B64=btoa(binary);

    const templateZip=await g.JSZip.loadAsync(templateBytes);
    const logoFile=templateZip.file('word/media/image21.png');
    const watermarkFile=templateZip.file('word/media/image20.jpeg');
    const footerFile=templateZip.file('word/media/image22.jpg');
    if(!logoFile||!watermarkFile||!footerFile){
      throw new Error('Os elementos institucionais do modelo V0.6 não foram encontrados.');
    }

    g.__V06_ASSETS={
      logo:`data:image/png;base64,${await logoFile.async('base64')}`,
      watermark:`data:image/jpeg;base64,${await watermarkFile.async('base64')}`,
      footer:`data:image/jpeg;base64,${await footerFile.async('base64')}`
    };

    const inject=(source)=>{
      const script=document.createElement('script');
      script.textContent=source;
      document.head.appendChild(script);
    };

    inject(await reportFile.async('string'));
    inject(await appFile.async('string'));

    await waitFor(()=>Boolean(g.FastTrackV06&&g.FastTrackV06.ready));
    await g.FastTrackV06.ready;
    return g.FastTrackV06;
  })().catch(error=>{
    console.error('Falha na inicialização do Fast Track V0.6:',error);
    throw error;
  });
})(globalThis);
