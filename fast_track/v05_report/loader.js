(async function(g){
  "use strict";
  try {
    const encoded = String(g.__FT_V05_REPORT_GZ || "");
    if (!encoded) throw new Error("Pacote do gerador de relatórios V0.5 ausente.");
    if (typeof DecompressionStream !== "function") {
      throw new Error("Este navegador não suporta a descompactação do gerador. Atualize o Chrome ou Microsoft Edge.");
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const code = await new Response(stream).text();
    (0, eval)(code);
    g.__FT_V05_REPORT_GZ = "";
  } catch (error) {
    console.error(error);
    alert("Não foi possível iniciar os geradores Word/PDF V0.5: " + (error?.message || error));
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
