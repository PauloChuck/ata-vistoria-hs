(() => {
  "use strict";
  const originalFetch = window.fetch.bind(window);
  const templateName = "contingencia_modelo_v05.docx";
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (!url.includes(templateName)) return originalFetch(input, init);
    const b64 = String(window.__FT_V05_TEMPLATE_B64 || "");
    if (!b64) return new Response("Modelo Word não carregado.", {status:404});
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Response(bytes, {
      status:200,
      headers:{
        "Content-Type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Cache-Control":"no-store"
      }
    });
  };
})();
