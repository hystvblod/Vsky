(function(){
  "use strict";

  const UI = {
    heightEl: document.getElementById("height"),
    bestEl:   document.getElementById("best"),
    vcoinsEl: document.getElementById("vcoins"),
    tokensEl: document.getElementById("tokens"),
    btnNew:   document.getElementById("btnNew"),
    overlay:  document.getElementById("overlay"),
    oRevive:  document.getElementById("ov-revive"),
    oReward:  document.getElementById("ov-reward"),
    oRestart: document.getElementById("ov-restart"),
    ovTitle:  document.getElementById("ov-title"),
    ovText:   document.getElementById("ov-text")
  };

  const CFG = window.CONFIG?.GAME || {
    BASE_WIDTH: 220,
    BLOCK_HEIGHT: 24,
    SPEED_X: 180,              // vitesse de base
    SPEED_INC_PER_LEVEL: 3,    // bonus vitesse par étage (mode classique)
    SPEED_MAX_CLASSIC: 280,    // plafond vitesse en classique
    WIND_MAX: 28,
    PERFECT_WINDOW: 4,
    REWARD_PERFECT: 4,
    REWARD_HEIGHT: 1,
    MIN_WIDTH: 14,
    REVIVE_WIDTH_BONUS: 6
  };

  // ---------- Mode : classique / infini via ?mode=. ----------
  let GAME_MODE = "classique";
  try {
    const params = new URLSearchParams(window.location.search);
    const m = (params.get("mode") || "").toLowerCase();
    if (m === "infini" || m === "infinite") GAME_MODE = "infini";
  } catch(e){}

  try { window.userStore?.ensure && window.userStore.ensure(); } catch(e) {}

  if (!window.PIXI) {
    console.warn("PIXI introuvable");
    return;
  }

  // ---------- THÈMES : couleurs / textures comme VBlocks/Vanoise ----------

  function getCurrentThemeNameVSky(){
    try {
      if (typeof getCurrentTheme === "function") {
        const t = getCurrentTheme();
        if (t) return t;
      }
    } catch(e){}
    return localStorage.getItem("themeVBlocks") || "neon";
  }

  // IMPORTANT : ici tout est en .webp
  // et chaque thème "texture" a un tableau de textures → tirage aléatoire par bloc
  const THEME_STYLES = {
    // blocs "code" (comme avant)
    neon:   { mode: "color",   fill: 0x111111, stroke: 0x00ffff },
    retro:  { mode: "color",   fill: 0xf5d28c, stroke: 0x000000 },
    nuit:   { mode: "color",   fill: 0xcccccc, stroke: 0x444444 },
    default:{ mode: "color",   fill: 0xFFD27F, stroke: 0x333333 },

    // === Thèmes avec lettres I J L O S T Z (couleurs différentes) ===
    bubble: {
      mode: "texture",
      textures: [
        "themes/bubble/I.webp",
        "themes/bubble/J.webp",
        "themes/bubble/L.webp",
        "themes/bubble/O.webp",
        "themes/bubble/S.webp",
        "themes/bubble/T.webp",
        "themes/bubble/Z.webp"
      ]
    },
    nature: {
      mode: "texture",
      textures: [
        "themes/nature/I.webp",
        "themes/nature/J.webp",
        "themes/nature/L.webp",
        "themes/nature/O.webp",
        "themes/nature/S.webp",
        "themes/nature/T.webp",
        "themes/nature/Z.webp"
      ]
    },
    angelique: {
      mode: "texture",
      textures: [
        "themes/angelique/I.webp",
        "themes/angelique/J.webp",
        "themes/angelique/L.webp",
        "themes/angelique/O.webp",
        "themes/angelique/S.webp",
        "themes/angelique/T.webp",
        "themes/angelique/Z.webp"
      ]
    },
    cyber: {
      mode: "texture",
      textures: [
        "themes/cyber/I.webp",
        "themes/cyber/J.webp",
        "themes/cyber/L.webp",
        "themes/cyber/O.webp",
        "themes/cyber/S.webp",
        "themes/cyber/T.webp",
        "themes/cyber/Z.webp"
      ]
    },
    japon: {
      mode: "texture",
      textures: [
        "themes/japon/I.webp",
        "themes/japon/J.webp",
        "themes/japon/L.webp",
        "themes/japon/O.webp",
        "themes/japon/S.webp",
        "themes/japon/T.webp",
        "themes/japon/Z.webp"
      ]
    },

    // === Thèmes "variantes" façon VBlocks (1..6 carrés random) ===
    space: {
      mode: "texture",
      textures: [
        "themes/space/1.webp",
        "themes/space/2.webp",
        "themes/space/3.webp",
        "themes/space/4.webp",
        "themes/space/5.webp",
        "themes/space/6.webp"
      ]
    },
    vitraux: {
      mode: "texture",
      textures: [
        "themes/vitraux/1.webp",
        "themes/vitraux/2.webp",
        "themes/vitraux/3.webp",
        "themes/vitraux/4.webp",
        "themes/vitraux/5.webp",
        "themes/vitraux/6.webp"
      ]
    },
    luxury: {
      mode: "texture",
      textures: [
        "themes/luxury/1.webp",
        "themes/luxury/2.webp",
        "themes/luxury/3.webp",
        "themes/luxury/4.webp",
        "themes/luxury/5.webp",
        "themes/luxury/6.webp"
      ]
    },

    // === Thèmes mono-image (comme grece/arabic dans VBlocks) ===
    arabic: {
      mode: "texture",
      textures: [
        "themes/arabic/block.webp"
      ]
    },
    grece: {
      mode: "texture",
      textures: [
        "themes/grece/block.webp"
      ]
    }
  };

  function getThemeStyle(){
    const t = getCurrentThemeNameVSky();
    return THEME_STYLES[t] || THEME_STYLES.default;
  }

  // cache des textures PIXI pour éviter de recréer à chaque bloc
  const textureCache = {};
  function getPixiTexture(url){
    if (!url) return null;
    if (!textureCache[url]) {
      textureCache[url] = PIXI.Texture.from(url);
    }
    return textureCache[url];
  }

  const wrap = document.getElementById("stage-wrap") || document.getElementById("game-wrap");
  const vWidth  = CFG.BASE_WIDTH;
  const vHeight = 400;

const app = new PIXI.Application({
  backgroundAlpha: 0,
  antialias: true,
  width: 320,
  height: 568
});

// on donne le même id que V-Blocks
app.view.id = "gameCanvas";

wrap.appendChild(app.view);


  const world = new PIXI.Container();
  app.stage.addChild(world);

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  resize();
  requestAnimationFrame(resize);

  let state = "idle";
  let current = null;
  let last = null;
  let height = 0;
  let best = 0;
  let speedX = CFG.SPEED_X;
  let dir = 1;
  let allowRevive = true;
  let targetY = 0; // y où le bloc doit atterrir

  boot();

  async function boot(){
    try {
      if (window.userStore?.getBest) {
        best = await window.userStore.getBest();
      } else if (window.userStore?.getBestHeight) {
        best = await window.userStore.getBestHeight();
      }
      if (UI.bestEl) UI.bestEl.textContent = best ?? 0;

      if (window.userStore?.getVCoins && UI.vcoinsEl) {
        UI.vcoinsEl.textContent = await window.userStore.getVCoins();
      }
      if (window.userStore?.getTokens && UI.tokensEl) {
        UI.tokensEl.textContent = await window.userStore.getTokens();
      }
    } catch(e){}

    UI.btnNew && UI.btnNew.addEventListener("click", newGame);
    UI.oRestart && UI.oRestart.addEventListener("click", () => {
      hideOverlay();
      newGame();
    });

    UI.oReward && UI.oReward.addEventListener("click", async () => {
      const ok = await window.ads?.rewarded?.("token");
      if (ok && window.userStore?.addTokens && UI.tokensEl) {
        const n = await window.userStore.addTokens(1);
        UI.tokensEl.textContent = n;
      }
    });

    UI.oRevive && UI.oRevive.addEventListener("click", async () => {
      if (!allowRevive || state !== "over" || !window.userStore?.getTokens) return;

      const tok = await window.userStore.getTokens();
      if (tok > 0) {
        await window.userStore.addTokens(-1);
        if (UI.tokensEl) UI.tokensEl.textContent = await window.userStore.getTokens();
        allowRevive = false;
        hideOverlay();
        reviveContinue();
      }
    });

    app.view.addEventListener("pointerdown", () => {
      if (state === "aim") dropBlock();
    });

    newGame();
  }

  function resize(){
    if (!wrap) return;
    const cw = wrap.clientWidth || 0;
    const w  = Math.max(260, cw - 16);
    const h  = Math.max(420, Math.floor(w * 16 / 9));
    app.renderer.resize(w, h);
    const scale = w / vWidth;
    world.scale.set(scale);
  }

  function clearWorld(){
    world.removeChildren();
  }

  function rect(color, x, y, w, h){
    const g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRect(0, 0, w, h);
    g.endFill();
    g.x = x;
    g.y = y;
    return g;
  }

  // === création d'un bloc avec tirage aléatoire dans les textures du thème ===
  function createThemedBlock(x, y, w, h){
    const style = getThemeStyle();

    if (style.mode === "texture") {
      // on récupère toutes les textures possibles pour ce thème (lettres ou 1..6)
      const arr = style.textures && style.textures.length
        ? style.textures
        : (style.texture ? [style.texture] : null);

      if (arr && arr.length) {
        const idx = (Math.random() * arr.length) | 0;
        const url = arr[idx];
        const tex = getPixiTexture(url);
        if (tex) {
          const sprite = new PIXI.Sprite(tex);
          sprite.x = x;
          sprite.y = y;
          sprite.width  = w;
          sprite.height = h;
          return sprite;
        }
      }
      // si jamais aucune texture valide → fallback couleur
    }

    const fill   = style.fill ?? 0xFFD27F;
    const stroke = style.stroke;
    const g = new PIXI.Graphics();
    g.beginFill(fill);
    g.drawRect(0, 0, w, h);
    g.endFill();
    if (typeof stroke === "number") {
      g.lineStyle(1, stroke, 1);
      g.drawRect(0, 0, w, h);
    }
    g.x = x;
    g.y = y;
    return g;
  }

  function recomputeSpeed(){
    const base = CFG.SPEED_X;
    if (GAME_MODE === "infini") {
      // mode infini : vitesse fixe
      speedX = base;
    } else {
      // mode classique : +vitesse par étage jusqu'à un plafond
      const inc = (CFG.SPEED_INC_PER_LEVEL || 0) * Math.max(0, height);
      const max = CFG.SPEED_MAX_CLASSIC || (base * 2);
      speedX = Math.min(base + inc, max);
    }
  }

  function newGame(){
    clearWorld();
    height = 0;
    allowRevive = true;
    if (UI.heightEl) UI.heightEl.textContent = "0";

    recomputeSpeed();
    state = "aim";

    // sol
    const ground = rect(0x2b2b2b, 0, vHeight - 8, vWidth, 8);
    world.addChild(ground);

    // premier bloc (fondation)
    const bw = Math.min((vWidth * 0.8) | 0, 160);
    const baseY = vHeight - 8 - CFG.BLOCK_HEIGHT;
    last = { x: (vWidth - bw) / 2, width: bw, y: baseY };
    const baseBlock = createThemedBlock(last.x, last.y, last.width, CFG.BLOCK_HEIGHT);
    baseBlock.alpha = 0.95;
    baseBlock.name = "last";
    world.addChild(baseBlock);

    targetY = last.y - CFG.BLOCK_HEIGHT;

    spawnNext();
    app.ticker.add(update);
  }

  function spawnNext(){
    const w = last ? last.width : Math.min((vWidth * 0.8) | 0, 160);

    targetY = last ? (last.y - CFG.BLOCK_HEIGHT) : (vHeight - 8 - 2 * CFG.BLOCK_HEIGHT);
    const startY = targetY - CFG.BLOCK_HEIGHT * 3;

    const startLeft = Math.random() < 0.5;
    const x = startLeft ? 0 : (vWidth - w);
    dir = startLeft ? +1 : -1;

    current = createThemedBlock(x, startY, w, CFG.BLOCK_HEIGHT);
    current.name = "current";
    world.addChild(current);
    state = "aim";
  }

  function update(delta){
    if (state === "aim") {
      const dx = (speedX / 60) * dir * delta;
      current.x += dx;
      if (current.x <= 0) {
        current.x = 0;
        dir = +1;
      }
      if (current.x + current.width >= vWidth) {
        current.x = vWidth - current.width;
        dir = -1;
      }
    } else if (state === "fall") {
      const dy = 420 / 60 * delta;
      current.y += dy;
      if (current.y >= targetY) {
        current.y = targetY;
        placeOrFail();
      }
    }
  }

  function dropBlock(){
    if (state !== "aim") return;
    state = "fall";
    try { window.SFX?.tap && window.SFX.tap(); } catch(e){}
  }

  function placeOrFail(){
    const L1 = last.x;
    const R1 = last.x + last.width;
    const L2 = current.x;
    const R2 = current.x + current.width;
    const L = Math.max(L1, L2);
    const R = Math.min(R1, R2);
    const overlap = R - L;

    if (overlap <= 0) {
      missAndGameOver();
      return;
    }

    current.x = L;

    // si c'est un Graphics couleur, on recoupe la largeur proprement
    if (current instanceof PIXI.Graphics) {
      const style = getThemeStyle();
      const fill   = style.fill ?? 0xFFD27F;
      const stroke = style.stroke;
      current.clear();
      current.beginFill(fill);
      current.drawRect(0, 0, overlap, CFG.BLOCK_HEIGHT);
      current.endFill();
      if (typeof stroke === "number") {
        current.lineStyle(1, stroke, 1);
        current.drawRect(0, 0, overlap, CFG.BLOCK_HEIGHT);
      }
    }
    current.width = overlap;

    height += 1;
    if (UI.heightEl) UI.heightEl.textContent = String(height);
    recomputeSpeed();

    // record
    if (height > best) {
      best = height;
      if (UI.bestEl) UI.bestEl.textContent = String(best);
      // ici tu peux pousser le best vers Supabase via userStore si besoin
    }

    last = { x: current.x, width: current.width, y: current.y };

    // on fait descendre légèrement la "caméra" quand la tour monte
    world.y = Math.min(0, vHeight - 8 - (last.y + CFG.BLOCK_HEIGHT + 80));

    spawnNext();
  }

  function missAndGameOver(){
    state = "over";
    app.ticker.remove(update);

    try { window.SFX?.fail && window.SFX.fail(); } catch(e){}

    if (window.userStore?.setBestHeight && height > 0) {
      window.userStore.setBestHeight(height).catch(()=>{});
    }

    showOverlay("Partie terminée", `Tu as construit ${height} étages.`);
  }

  function reviveContinue(){
    if (!last || !current) return;

    const boost = CFG.REVIVE_WIDTH_BONUS || 6;
    const newWidth = Math.min(last.width + boost, vWidth);
    const center = last.x + last.width / 2;
    const nx = Math.max(0, Math.min(vWidth - newWidth, center - newWidth / 2));

    current.x = nx;
    current.y = last.y - CFG.BLOCK_HEIGHT;
    current.width = newWidth;

    last = { x: current.x, width: current.width, y: current.y };
    world.y = Math.min(0, vHeight - 8 - (last.y + CFG.BLOCK_HEIGHT + 80));

    height += 1;
    if (UI.heightEl) UI.heightEl.textContent = String(height);
    recomputeSpeed();

    spawnNext();
    app.ticker.add(update);
    state = "aim";
  }

  function showOverlay(title, text){
    if (!UI.overlay) return;
    UI.ovTitle && (UI.ovTitle.textContent = title || "");
    UI.ovText  && (UI.ovText.textContent  = text || "");
    UI.overlay.classList.add("visible");

    if (UI.oRevive) {
      UI.oRevive.style.display = allowRevive ? "inline-flex" : "none";
    }
  }

  function hideOverlay(){
    if (!UI.overlay) return;
    UI.overlay.classList.remove("visible");
  }

})();
