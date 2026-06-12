/* =====================================================================
   INTRO — grafica generativa "stampa a strisce" (da Cleafy / stampa-a-strisce)
   Versione ripulita per l'intro del sito: nessun pannello di controllo,
   sorgente fissa (assets/images/0. Index/img. 1.mp4). Il canvas (#intro-canvas)
   È l'overlay: a fine clip scorre verso l'alto rivelando il sito.
   Il motore grafico (computeGrid / smoothGrid / drawStrip / restartPrint)
   è identico all'originale.
   ===================================================================== */
const GRID_W = 1920, GRID_H = 1080;

/* Sorgente da campionare per l'intro */
const INTRO_SRC = 'assets/images/0. Index/img. 1.mp4';

/* ---- Seeded PRNG — Mulberry32: stesso seme → stessa sequenza ----------- */
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

const CONFIG = {
  cells:   100,
  spacing:  1,
  opacity:  100,
  blur:      20,
  bgT:       0.950,
  colors: [
    '#191919',  // banda 0 — ombre profonde
    '#5f5fd2',  // banda 1 — ombre scure
    '#4b4600',  // banda 2 — mezzitoni scuri
    '#f55a0a',  // banda 3 — mezzitoni
    '#50b400',  // banda 4 — mezzitoni chiari
    '#32dcf5',  // banda 5 — semiluci
    '#f0b900',  // banda 6 — luci
  ],
  paper:     '#f6f7f8'
};

/* Mobile: versione leggera dell'intro. Riduciamo il numero di celle e le passate
   di blur (i costi dominanti per frame) per contenere CPU e batteria; il
   framerate viene abbassato in setup(). L'effetto resta, ma molto più economico. */
const IS_MOBILE = typeof window !== 'undefined'
  && window.matchMedia && window.matchMedia('(max-width: 800px)').matches;
if (IS_MOBILE) {
  CONFIG.cells = 48;
  CONFIG.blur  = 6;
}

const sketch = (p) => {
  let grid;
  let catGrid;
  let source;
  let art;
  let videoEl   = null;
  let videoMode = true;
  let exited    = false;     // true una volta congelata/fallita l'intro
  let cnv       = null;      // il canvas p5: È lui l'overlay (nessuna box contenitore)

  /* ---- STEP 1: suddivide in N×N celle, calcola luminanza media per cella -------------- */
  function computeGrid() {
    source.loadPixels();
    const px = source.pixels;
    const N  = CONFIG.cells;
    grid = new Float32Array(N * N);
    for (let cy = 0; cy < N; cy++) {
      const y0 = Math.round(cy       * GRID_H / N);
      const y1 = Math.round((cy + 1) * GRID_H / N);
      for (let cx = 0; cx < N; cx++) {
        const x0 = Math.round(cx       * GRID_W / N);
        const x1 = Math.round((cx + 1) * GRID_W / N);
        let sum = 0, count = 0;
        for (let py = y0; py < y1; py++) {
          for (let pxI = x0; pxI < x1; pxI++) {
            const j = (py * GRID_W + pxI) * 4;
            sum += (0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2]) / 255;
            count++;
          }
        }
        grid[cy * N + cx] = count > 0 ? sum / count : 0;
      }
    }
  }

  /* ---- Classificazione: -1 = sfondo (no draw), oppure 0–6 = banda ---- */
  function classify(b) {
    if (b >= CONFIG.bgT) return -1;
    const bandSize = CONFIG.bgT / 7;
    return Math.min(Math.floor(b / bandSize), 6);
  }

  /* ---- Tratto pennarello: capsula asimmetrica con bordi irregolari ---- */
  function drawMarkerStroke(g, x, y, w, h, seed) {
    if (w <= 0 || h <= 0) return;
    const ctx  = g.drawingContext;
    const rand = seededRand(seed);
    const hh   = h / 2;

    const midY = y + hh + (rand() - 0.5) * hh * 0.07;

    const rLx  = hh * (0.80 + rand() * 0.20);
    const rRx  = hh * (0.22 + rand() * 0.30);

    const bodyW = Math.max(0, w - rLx - rRx);
    const x0    = x + rLx;
    const x1    = x0 + bodyW;

    const a1 = hh * (0.020 + rand() * 0.028);
    const a2 = hh * (0.007 + rand() * 0.012);
    const f1 = 0.6 + rand() * 2.5;
    const f2 = f1  * (2.0 + rand() * 2.0);
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const N  = Math.max(4, Math.ceil(bodyW / 10));

    const edge = (t) =>
      Math.sin(t * f1 * Math.PI * 2 + p1) * a1 +
      Math.sin(t * f2 * Math.PI * 2 + p2) * a2;

    function buildPath(my) {
      ctx.beginPath();
      if (bodyW <= 0) {
        ctx.arc(x + w / 2, my, Math.min(w / 2, hh) * 0.95, 0, Math.PI * 2);
      } else {
        ctx.moveTo(x0, my - hh + edge(0));
        for (let i = 1; i <= N; i++) {
          const t = i / N;
          ctx.lineTo(x0 + bodyW * t, my - hh + edge(t));
        }
        ctx.ellipse(x1, my, rRx, hh, 0, -Math.PI / 2, Math.PI / 2, false);
        for (let i = 1; i <= N; i++) {
          const t = i / N;
          ctx.lineTo(x1 - bodyW * t, my + hh + edge(1 - t));
        }
        ctx.ellipse(x0, my, rLx, hh, 0, Math.PI / 2, -Math.PI / 2, false);
      }
      ctx.closePath();
    }

    buildPath(midY);
    ctx.fill();

    const base = ctx.globalAlpha;
    ctx.globalAlpha = base * 0.08;
    buildPath(midY + hh * (0.06 + rand() * 0.05));
    ctx.fill();
    ctx.globalAlpha = base;
  }

  /* ---- STEP 2b: classifica il grid e applica smoothing orizzontale ---- */
  function smoothGrid() {
    const N = CONFIG.cells;
    catGrid = new Int8Array(N * N);

    let src = grid.slice();
    const tmp = new Float32Array(N * N);
    for (let pa = 0; pa < CONFIG.blur; pa++) {
      for (let cy = 0; cy < N; cy++) {
        for (let cx = 0; cx < N; cx++) {
          const idx = cy * N + cx;
          let sum = src[idx], cnt = 1;
          if (cy > 0)     { sum += src[idx - N]; cnt++; }
          if (cy < N - 1) { sum += src[idx + N]; cnt++; }
          if (cx > 0)     { sum += src[idx - 1]; cnt++; }
          if (cx < N - 1) { sum += src[idx + 1]; cnt++; }
          tmp[idx] = sum / cnt;
        }
      }
      src.set(tmp);
    }

    for (let i = 0; i < N * N; i++) {
      catGrid[i] = classify(src[i]);
    }

    let changed = true;
    while (changed) {
      changed = false;
      const next = catGrid.slice();
      for (let cy = 0; cy < N; cy++) {
        const base = cy * N;
        for (let cx = 0; cx < N; cx++) {
          const idx = base + cx;
          const cur = catGrid[idx];
          if (cur < 0) continue;
          const L = cx > 0     ? catGrid[idx - 1] : -2;
          const R = cx < N - 1 ? catGrid[idx + 1] : -2;
          if (L >= 0 && L === R && L !== cur) {
            next[idx] = L;
            changed = true;
          }
        }
      }
      catGrid = next;
    }
  }

  /* ---- STEP 3+4: percorri UNA riga di celle, accumula run e disegna ---- */
  function drawStrip(g, cy) {
    const N   = CONFIG.cells;
    const cs  = GRID_W / N;
    const csY = GRID_H / N;
    const thickness = csY * 1.25;
    if (cy >= N) return;
    let curCat  = -2;
    let startCX = 0;
    const rowBase = cy * N;
    const drawY   = cy * csY + (csY - thickness) / 2;
    g.drawingContext.globalAlpha = CONFIG.opacity / 100;
    for (let cx = 0; cx <= N; cx++) {
      const cat = (cx < N) ? catGrid[rowBase + cx] : -99;
      if (cat !== curCat) {
        if (curCat >= 0) {
          const seed = (cy * 997 + startCX * 31) | 0;
          const OVL  = cs * (0.10 + seededRand(seed)() * 0.40);
          g.fill(CONFIG.colors[curCat]);
          drawMarkerStroke(g, startCX * cs - OVL, drawY,
                           (cx - startCX) * cs + 2 * OVL, thickness, seed);
        }
        curCat  = cat;
        startCX = cx;
      }
    }
    g.drawingContext.globalAlpha = 1;
  }

  /* ---- Renderizza l'intero frame ---- */
  function restartPrint() {
    computeGrid();
    smoothGrid();
    art.clear();                 // sfondo TRASPARENTE: le zone near-white non vengono disegnate → restano trasparenti
    art.noStroke();
    art.drawingContext.globalCompositeOperation = 'multiply';
    for (let cy = 0; cy < CONFIG.cells; cy += CONFIG.spacing) {
      drawStrip(art, cy);
    }
    art.drawingContext.globalCompositeOperation = 'source-over';
    p.clear();                   // pulisce il canvas principale ad ogni frame (evita ghosting con sfondo trasparente)
    p.image(art, 0, 0);
  }

  /* ---- Fine intro: l'animazione si ferma sull'ultimo frame e RESTA sullo schermo.
     Nessuna dissolvenza, nessuna rimozione del canvas. ---- */
  function freezeIntro() {
    if (exited) return;
    exited = true;
    p.noLoop();                          // congela l'ultimo frame disegnato
    if (videoEl) { videoEl.pause(); videoEl.elt.style.display = 'none'; }  // ferma e nasconde il video sorgente
  }

  /* ---- Sorgente non campionabile (es. apertura via file:// → canvas "tainted"):
     rimuovi il canvas e mostra il sito, SENZA marcare l'intro come vista,
     così riproverà al prossimo caricamento (quando servito via http). ---- */
  function failIntro() {
    if (exited) return;
    exited = true;
    p.noLoop();
    if (videoEl) { videoEl.remove(); videoEl = null; }
    p.remove();
  }

  /* ================= p5 lifecycle ================= */
  p.setup = function () {
    // Il canvas È l'overlay: niente box contenitore. Viene stilizzato fullscreen via CSS (#intro-canvas).
    cnv = p.createCanvas(GRID_W, GRID_H);
    cnv.parent(document.body);
    cnv.elt.id = 'intro-canvas';
    p.pixelDensity(1);
    p.frameRate(IS_MOBILE ? 20 : 30);

    // Primi 3s: il canvas intercetta i click → niente è cliccabile sotto.
    // Dopo, li lascia passare (le zone trasparenti tornano interattive).
    cnv.elt.style.pointerEvents = 'auto';
    setTimeout(function () {
      if (cnv && cnv.elt) cnv.elt.style.pointerEvents = 'none';
    }, 3000);

    source = p.createGraphics(GRID_W, GRID_H); source.pixelDensity(1);
    art    = p.createGraphics(GRID_W, GRID_H); art.pixelDensity(1);

    videoEl = p.createVideo(INTRO_SRC);
    // NON usare hide()/display:none: iOS NON riproduce in autoplay un video con
    // display:none (né, spesso, uno di 1px che considera "non visibile"), quindi
    // p5 non potrebbe campionarne i frame. Lo teniamo a piena dimensione e quasi
    // trasparente, DIETRO al canvas e al blur (che lo coprono): per iOS è un video
    // "visibile" e riproducibile, per l'utente è impercettibile.
    Object.assign(videoEl.elt.style, {
      position: 'fixed', left: '0', top: '0',
      width: '100vw', height: '100vh', objectFit: 'cover',
      opacity: '0.012', pointerEvents: 'none', zIndex: '1'
    });
    videoEl.volume(0);
    videoEl.elt.loop = false;          // NON in loop: alla fine non riparte da capo (era il "glitch")
    videoEl.elt.muted = true;
    videoEl.elt.defaultMuted = true;
    videoEl.elt.setAttribute('muted', '');         // attributo esplicito: richiesto da iOS per l'autoplay
    videoEl.elt.playsInline = true;
    videoEl.elt.setAttribute('playsinline', '');
    let started = false;
    function startPlayback() {
      if (exited || started) return;
      started = true;
      const pr = videoEl.elt.play();
      videoEl.elt.playbackRate = 1.5;  // 6s di clip → ~4s di animazione, poi si ferma e resta
      p.loop();
      if (pr && pr.then) {
        // segniamo l'intro come "vista" SOLO quando parte davvero, così un
        // autoplay bloccato non la salta per il resto della sessione.
        pr.then(() => { try { sessionStorage.setItem('introSeen', '1'); } catch (e) {} })
          .catch(() => { started = false; armGesture(); });
      } else {
        try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      }
    }
    // Fallback mobile: se l'autoplay è bloccato, l'intro parte al primo tocco/click.
    function armGesture() {
      function go() {
        window.removeEventListener('touchend', go);
        window.removeEventListener('click', go);
        startPlayback();
      }
      window.addEventListener('touchend', go, { once: true });
      window.addEventListener('click', go, { once: true });
    }
    videoEl.elt.oncanplay = () => { if (!exited) startPlayback(); };
    videoEl.elt.onended = freezeIntro; // fine naturale della clip → congela e resta sullo schermo
  };

  /* ================= loop video ================= */
  p.draw = function () {
    if (!videoMode || !videoEl) return;
    if (videoEl.elt.readyState < 2) return;
    try {
      source.background(255);
      const vw = videoEl.elt.videoWidth  || GRID_W;
      const vh = videoEl.elt.videoHeight || GRID_H;
      const sc = Math.max(GRID_W / vw, GRID_H / vh);
      const fw = vw * sc, fh = vh * sc;
      source.image(videoEl, (GRID_W - fw) / 2, (GRID_H - fh) / 2, fw, fh);
      restartPrint();
    } catch (e) {
      // SecurityError da loadPixels() su canvas "tainted" (file://) o simili
      console.warn('[intro] sorgente non campionabile, intro disattivata:', e);
      failIntro();
    }
  };
};

/* Intro mobile: una WebP animata con alpha (assets/images/0. Index/intro-mobile.webp).
   Essendo un'immagine, si anima sempre da sola su iOS — senza le restrizioni di
   autoplay dei video (niente blocco in Risparmio Energetico). Sostituisce lo
   sketch p5, che su mobile non riusciva a campionare il video. */
function showMobileIntro() {
  try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}

  // Per la massima fluidità usiamo un VIDEO con alpha decodificato in hardware
  // (come il desktop), con il codec giusto per piattaforma:
  //   - iOS/Safari: HEVC con alpha (unico formato video alpha che iOS riproduce)
  //   - Android/Chrome: VP9 con alpha (WebM)
  // Se il video non è disponibile o l'autoplay è bloccato, si ripiega sulla WebP
  // animata (che parte sempre). Comportamento identico al desktop: parte una
  // volta a 1.5×, si congela sull'ultimo frame e RESTA; click bloccati per 3s.
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  var v = document.createElement('video');
  v.id = 'intro-video';
  v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
  v.playsInline = true; v.setAttribute('playsinline', '');
  v.setAttribute('preload', 'auto');
  v.loop = false;

  var src = document.createElement('source');
  if (isIOS) {
    src.src = 'assets/images/0. Index/intro-mobile.mov?v=1';   // HEVC-alpha (da generare su Mac)
    src.type = 'video/mp4; codecs="hvc1"';
  } else {
    src.src = 'assets/images/0. Index/intro-mobile.webm?v=1';  // VP9-alpha
    src.type = 'video/webm';
  }
  v.appendChild(src);

  var settled = false;
  function useWebp() {
    if (settled) return; settled = true;
    if (v.parentNode) v.remove();
    showWebpIntro();
  }
  function ok() { settled = true; v.playbackRate = 1.5; }   // il video sta riproducendo

  v.addEventListener('error', useWebp);
  v.addEventListener('loadedmetadata', function () { v.playbackRate = 1.5; });
  document.body.appendChild(v);
  setTimeout(function () { if (v.style) v.style.pointerEvents = 'none'; }, 3000);

  var pr = v.play();
  if (pr && pr.then) {
    pr.then(ok).catch(useWebp);            // autoplay bloccato → WebP (anima sempre)
  } else {
    v.addEventListener('playing', ok);
  }
  // rete di sicurezza: se entro 2.5s il video non è partito, ripiega sulla WebP
  setTimeout(function () { if (!settled && (v.paused || v.readyState < 2)) useWebp(); }, 2500);
}

function showWebpIntro() {
  var img = document.createElement('img');
  img.id = 'intro-webp';
  img.decoding = 'async';
  img.alt = '';
  img.src = 'assets/images/0. Index/intro-mobile.webp?v=4';
  document.body.appendChild(img);
  setTimeout(function () { if (img && img.style) img.style.pointerEvents = 'none'; }, 3000);
}

/* L'intro parte SOLO la prima volta della sessione: una volta vista, il flag
   'introSeen' resta in sessionStorage e i caricamenti successivi non la mostrano
   (si azzera alla chiusura della scheda/browser).
   - Desktop: sketch p5 generativo (campiona il video).
   - Mobile: WebP animata con alpha (vedi showMobileIntro). */
(function () {
  if (sessionStorage.getItem('introSeen')) return;
  var onMobile = window.matchMedia && window.matchMedia('(max-width: 800px)').matches;
  if (onMobile) {
    showMobileIntro();
  } else {
    new p5(sketch);
  }
})();
