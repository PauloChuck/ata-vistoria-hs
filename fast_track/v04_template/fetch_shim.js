(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const templatePath = 'templates/contingencia_base_v04.docx';

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (!url.includes(templatePath)) return originalFetch(input, init);

    const base64 = String(window.__FT_V04_TEMPLATE_B64 || '');
    if (!base64) return new Response('Modelo Word não carregado.', {status:404});

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

    return new Response(bytes, {
      status:200,
      headers:{
        'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Cache-Control':'no-store'
      }
    });
  };
})();
