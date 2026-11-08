(async function(g){
  'use strict';
  const bytes=Uint8Array.from(atob(g.__V06_PACKAGE_B64||''),c=>c.charCodeAt(0));
  const pkg=await g.JSZip.loadAsync(bytes);
  const templateBytes=await pkg.file('template.docx').async('uint8array');
  let binary='';
  for(let i=0;i<templateBytes.length;i+=0x8000) binary+=String.fromCharCode(...templateBytes.subarray(i,i+0x8000));
  g.__V06_TEMPLATE_B64=btoa(binary);
  const templateZip=await g.JSZip.loadAsync(templateBytes);
  g.__V06_ASSETS={
    logo:`data:image/png;base64,${await templateZip.file('word/media/image21.png').async('base64')}`,
    watermark:`data:image/jpeg;base64,${await templateZip.file('word/media/image20.jpeg').async('base64')}`,
    footer:`data:image/jpeg;base64,${await templateZip.file('word/media/image22.jpg').async('base64')}`
  };
  const inject=(source)=>{const s=document.createElement('script');s.textContent=source;document.head.appendChild(s);};
  inject(await pkg.file('report.js').async('string'));
  inject(await pkg.file('app.js').async('string'));
})(globalThis).catch(error=>{console.error(error);throw error;});
