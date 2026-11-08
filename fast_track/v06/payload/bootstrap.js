(function(g){
  'use strict';
  const decode=(b64)=>new TextDecoder().decode(Uint8Array.from(atob(b64||''),c=>c.charCodeAt(0)));
  g.__V06_ASSETS={
    logo:`data:image/png;base64,${g.__V06_LOGO_B64||''}`,
    watermark:`data:image/jpeg;base64,${g.__V06_WM_B64||''}`,
    footer:`data:image/jpeg;base64,${g.__V06_FOOT_B64||''}`
  };
  const inject=(source)=>{const s=document.createElement('script');s.textContent=source;document.head.appendChild(s);};
  inject(decode(g.__V06_REPORT_SRC_B64));
  inject(decode(g.__V06_APP_SRC_B64));
})(globalThis);
