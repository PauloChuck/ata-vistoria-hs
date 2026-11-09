(() => {
  'use strict';

  const REPORT = () => window.FastTrackV06Report;

  const EMU_PER_CM = 360000;
  const PAGE_WIDTH = 11906;
  const PAGE_HEIGHT = 16838;
  const CONTENT_WIDTH = 9071;
  const BODY_FONT = 'Arial';
  const TITLE_FONT = 'Arial Black';
  const BLUE = '29A8E0';
  const CAPTION_BLUE = '1F497D';
  const BLACK = '111111';
  const GRAY = '666666';

  let docxLoadPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureDocx() {
    if (window.docx) return window.docx;
    if (!docxLoadPromise) {
      docxLoadPromise = (async () => {
        try {
          await loadScript('https://unpkg.com/docx@8.5.0/build/index.umd.js');
        } catch {
          await loadScript('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js');
        }
        if (!window.docx) throw new Error('A biblioteca de geração do Word não foi disponibilizada pelo navegador.');
        return window.docx;
      })().catch((error) => { docxLoadPromise = null; throw error; });
    }
    return docxLoadPromise;
  }

  function lib() {
    if (!window.docx) throw new Error('A biblioteca de geração do Word ainda não foi carregada.');
    return window.docx;
  }

  const text = (value) => String(value == null ? '' : value);
  const hasValue = (value) => text(value).trim() !== '';
  const safeName = (value) => text(value || 'processo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'processo';


  function canvasAsset(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,width,height);
    draw(ctx,width,height);
    const info = dataUrlInfo(canvas.toDataURL('image/png'));
    return {bytes:info.bytes,type:'png'};
  }

  async function makeInstitutionalAssets() {
    const blue='#29A8E0';
    const logo=canvasAsset(830,400,(ctx)=>{
      ctx.fillStyle='#fff';ctx.fillRect(0,0,830,400);
      ctx.strokeStyle=blue;ctx.lineWidth=18;
      ctx.beginPath();ctx.ellipse(235,190,150,118,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.ellipse(365,190,150,118,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=blue;ctx.font='900 130px Arial';ctx.fillText('HS',205,235);
      ctx.fillStyle='#111';ctx.font='900 58px Arial';ctx.fillText('beyond',540,155);ctx.fillText('solutions',540,225);
    });
    const watermark=canvasAsset(1000,750,(ctx)=>{
      ctx.globalAlpha=.13;ctx.strokeStyle=blue;ctx.lineWidth=28;
      ctx.beginPath();ctx.ellipse(405,375,310,245,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.ellipse(595,375,310,245,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=blue;ctx.font='900 260px Arial';ctx.fillText('HS',320,470);ctx.globalAlpha=1;
    });
    const footer=canvasAsset(320,239,(ctx)=>{
      ctx.strokeStyle=blue;ctx.lineWidth=13;
      ctx.beginPath();ctx.ellipse(115,120,88,70,0,0,Math.PI*2);ctx.