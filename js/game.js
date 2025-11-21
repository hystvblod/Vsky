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

  const STORAGE = {
    getWallet(){
      try{
        const raw = localStorage.getItem("vplay_wallet");
        if (!raw) return { vcoins:0, jetons:0 };
        const obj = JSON.parse(raw);
        return {
          vcoins: Number(obj.vcoins || 0) || 0,
          jetons: Number(obj.jetons || 0) || 0
        };
      }catch(e){
        return { vcoins:0, jetons:0 };
      }
    },
    setWallet(w){
      localStorage.setItem("vplay_wallet", JSON.stringify({
        vcoins: Number(w.vcoins || 0) || 0,
        jetons: Number(w.jetons || 0) || 0
      }));
    },
    getBest(){
      return Number(localStorage.getItem("vskystack_best") || 0) || 0;
    },
    setBest(v){
      localStorage.setItem("vskystack_best", String(v|0));
    }
  };

  const CFG = {
    GRAVITY:        0.48,
    JUMP_VY:        -9.0,
    BASE_SPEED:     2.0,
    SPEED_INC:      0.08,
    SPEED_MAX:      4.8,
    BLOCK_HEIGHT:   24,
    STRIP_HEIGHT:   8,
    START_OFFSET_Y: -140
  };

  const wrap = document.getElementById("stage-wrap");
  if (!wrap || !window.PIXI) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vWidth  = 320;
  const vHeight = 568;

  const app = new PIXI.Application({
    backgroundAlpha: 0, // canvas transparent → fond géré par le CSS de thème
    antialias: true,
    width: 320,
    height: 568
  });

  // important pour appliquer le CSS (#gameCanvas) comme VBlocks
  app.view.id = "gameCanvas";

  wrap.appendChild(app.view);

  const world = new PIXI.Container();
  app.stage.addChild(world);

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  resize();
  requestAnimationFrame(()=>resize());

  function resize(){
    const rect  = wrap.getBoundingClientRect();
    const ratio = Math.min(rect.width  / vWidth, rect.height / vHeight);
    const scale = ratio > 0 ? ratio : 1;
    world.scale.set(scale);
    const canvas = app.view;
    canvas.style.width  = (vWidth  * scale) + "px";
    canvas.style.height = (vHeight * scale) + "px";
  }

  const ticker = app.ticker;

  const STATE = {
    IDLE: "idle",
    AIM: "aim",
    DROP: "drop",
    GAMEOVER: "gameover"
  };

  let state        = STATE.IDLE;
  let current      = null;
  let last         = null;
  let vy           = 0;
  let speedX       = CFG.BASE_SPEED;
  let direction    = 1;
  let height       = 0;
  let allowRevive  = true;
  let wallet       = STORAGE.getWallet();
  let bestHeight   = STORAGE.getBest();

  let texCache     = {};
  let stripTexture = null;
  let baseTexture  = null;

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
    neon: {
      mode: "code",
      base: "themes/neon/blocks/1.webp",
      blocks: [
        "themes/neon/blocks/1.webp",
        "themes/neon/blocks/2.webp",
        "themes/neon/blocks/3.webp",
        "themes/neon/blocks/4.webp"
      ]
    },
    rétro: {
      mode: "code",
      base: "themes/retro/blocks/1.webp",
      blocks: [
        "themes/retro/blocks/1.webp",
        "themes/retro/blocks/2.webp",
        "themes/retro/blocks/3.webp"
      ]
    },
    retro: {
      mode: "code",
      base: "themes/retro/blocks/1.webp",
      blocks: [
        "themes/retro/blocks/1.webp",
        "themes/retro/blocks/2.webp",
        "themes/retro/blocks/3.webp"
      ]
    },
    bubble: {
      mode: "code",
      base: "themes/bubble/blocks/1.webp",
      blocks: [
        "themes/bubble/blocks/1.webp",
        "themes/bubble/blocks/2.webp",
        "themes/bubble/blocks/3.webp"
      ]
    },
    nature: {
      mode: "code",
      base: "themes/nature/blocks/1.webp",
      blocks: [
        "themes/nature/blocks/1.webp",
        "themes/nature/blocks/2.webp",
        "themes/nature/blocks/3.webp"
      ]
    },
    nuit: {
      mode: "code",
      base: "themes/nuit/blocks/1.webp",
      blocks: [
        "themes/nuit/blocks/1.webp",
        "themes/nuit/blocks/2.webp",
        "themes/nuit/blocks/3.webp"
      ]
    },
    space: {
      mode: "code",
      base: "themes/space/blocks/1.webp",
      blocks: [
        "themes/space/blocks/1.webp",
        "themes/space/blocks/2.webp",
        "themes/space/blocks/3.webp"
      ]
    },
    cyber: {
      mode: "code",
      base: "themes/cyber/blocks/1.webp",
      blocks: [
        "themes/cyber/blocks/1.webp",
        "themes/cyber/blocks/2.webp",
        "themes/cyber/blocks/3.webp"
      ]
    },
    angelique: {
      mode: "code",
      base: "themes/angelique/blocks/1.webp",
      blocks: [
        "themes/angelique/blocks/1.webp",
        "themes/angelique/blocks/2.webp",
        "themes/angelique/blocks/3.webp"
      ]
    },
    luxury: {
      mode: "code",
      base: "themes/luxury/blocks/1.webp",
      blocks: [
        "themes/luxury/blocks/1.webp",
        "themes/luxury/blocks/2.webp",
        "themes/luxury/blocks/3.webp"
      ]
    },
    grece: {
      mode: "code",
      base: "themes/grece/blocks/1.webp",
      blocks: [
        "themes/grece/blocks/1.webp",
        "themes/grece/blocks/2.webp",
        "themes/grece/blocks/3.webp"
      ]
    },
    japon: {
      mode: "code",
      base: "themes/japon/blocks/1.webp",
      blocks: [
        "themes/japon/blocks/1.webp",
        "themes/japon/blocks/2.webp",
        "themes/japon/blocks/3.webp"
      ]
    },
    arabic: {
      mode: "code",
      base: "themes/arabic/blocks/1.webp",
      blocks: [
        "themes/arabic/blocks/1.webp",
        "themes/arabic/blocks/2.webp",
        "themes/arabic/blocks/3.webp"
      ]
    },
    vitraux: {
      mode: "code",
      base: "themes/vitraux/blocks/1.webp",
      blocks: [
        "themes/vitraux/blocks/1.webp",
        "themes/vitraux/blocks/2.webp",
        "themes/vitraux/blocks/3.webp"
      ]
    }
  };

  function loadTexturesForTheme(themeName){
    const key = (themeName || "").toLowerCase();
    const style = THEME_STYLES[key] || THEME_STYLES["retro"];
    if (!texCache[key]){
      texCache[key] = {
        base:  PIXI.Texture.from(style.base),
        list:  style.blocks.map(src => PIXI.Texture.from(src))
      };
    }
    baseTexture  = texCache[key].base;
    stripTexture = texCache[key].list[0];
  }

  function randomBlockTexture(){
    if (!baseTexture){
      loadTexturesForTheme(getCurrentThemeNameVSky());
    }
    const themeName = getCurrentThemeNameVSky().toLowerCase();
    const style = THEME_STYLES[themeName] || THEME_STYLES["retro"];
    const list  = texCache[themeName]?.list || style.blocks.map(src => PIXI.Texture.from(src));
    texCache[themeName] = texCache[themeName] || { base: PIXI.Texture.from(style.base), list };
    const arr = texCache[themeName].list;
    const idx = (Math.random() * arr.length) | 0;
    return arr[idx] || arr[0];
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

  function createBlockSprite(width, height, tex){
    if (!tex) tex = randomBlockTexture();
    const sprite = new PIXI.Sprite(tex);
    sprite.width  = width;
    sprite.height = height;
    sprite.anchor.set(0, 0);
    return sprite;
  }

  function clearlayer(container){
    while (container.children.length){
      container.removeChildAt(0);
    }
  }

  function clearWorld(){
    clearlayer(world);
    current   = null;
    last      = null;
    vy        = 0;
    direction = 1;
  }

  function recomputeSpeed(){
    const base = CFG.BASE_SPEED + height * CFG.SPEED_INC;
    const max  = CFG.SPEED_MAX;
    speedX     = Math.min(base, max);
  }

  function newGame(){
    clearWorld();
    world.y = 0;
    height = 0;
    allowRevive = true;
    if (UI.heightEl) UI.heightEl.textContent = "0";

    recomputeSpeed();
    state = STATE.AIM;

    const ground = rect(0x2b2b2b, 0, vHeight - 8, vWidth, 8);
    world.addChild(ground);

    const bw = Math.min((vWidth * 0.8) | 0, 160);
    const baseY = vHeight - 8 - CFG.BLOCK_HEIGHT;

    const baseBlock = createBlockSprite(bw, CFG.BLOCK_HEIGHT, baseTexture);
    baseBlock.x = (vWidth - bw) / 2;
    baseBlock.y = baseY;
    world.addChild(baseBlock);
    last = baseBlock;

    spawnNext();

    state = STATE.AIM;
    ticker.add(update);
  }

  function spawnNext(){
    const bw = last ? last.width : Math.min((vWidth * 0.8) | 0, 160);
    const b  = createBlockSprite(bw, CFG.BLOCK_HEIGHT);

    b.x = 0;
    b.y = last ? (last.y + CFG.START_OFFSET_Y) : (vHeight * 0.3);
    world.addChild(b);
    current = b;
    vy = 0;
    direction = 1;
  }

  function clamp(x, min, max){
    return x < min ? min : (x > max ? max : x);
  }

  function placeOrFail(){
    if (!current || !last){
      missAndGameOver();
      return;
    }

    const lx = last.x;
    const rx = last.x + last.width;
    const cx = current.x;
    const ex = current.x + current.width;

    const overlapL = Math.max(lx, cx);
    const overlapR = Math.min(rx, ex);
    const overlapW = overlapR - overlapL;

    if (overlapW <= 4){
      missAndGameOver();
      return;
    }

    if (overlapW < current.width){
      const trimmed = createBlockSprite(overlapW, CFG.BLOCK_HEIGHT, current.texture);
      trimmed.x = overlapL;
      trimmed.y = current.y;
      world.addChild(trimmed);
      world.removeChild(current);
      current.destroy({ children:false, texture:false, baseTexture:false });
      current = trimmed;
    }

    const newWidth = current.width;
    last = { x: current.x, width: current.width, y: current.y };
    world.y = 0;

    height += 1;
    if (UI.heightEl) UI.heightEl.textContent = String(height);
    recomputeSpeed();

    if (height > bestHeight){
      bestHeight = height;
      STORAGE.setBest(bestHeight);
      if (UI.bestEl) UI.bestEl.textContent = String(bestHeight);
    }

    if (height % 3 === 0){
      wallet.vcoins += 5;
      STORAGE.setWallet(wallet);
      refreshWalletUI();
    }

    spawnNext();
  }

  function missAndGameOver(){
    state = STATE.GAMEOVER;
    ticker.remove(update);
    showGameOver();
  }

  function reviveContinue(){
    allowRevive = false;
    if (UI.overlay) UI.overlay.style.display = "none";

    if (current){
      current.y = last.y - CFG.BLOCK_HEIGHT - 4;
      vy = CFG.JUMP_VY * 0.4;
      state = STATE.DROP;
      ticker.add(update);
    }
  }

  function update(delta){
    const dt = delta || 1;
    if (state === STATE.AIM){
      if (current){
        current.x += speedX * direction * dt;
        if (current.x <= 0){
          current.x = 0;
          direction = 1;
        } else if (current.x + current.width >= vWidth){
          current.x = vWidth - current.width;
          direction = -1;
        }
      }
    }
    else if (state === STATE.DROP){
      if (!current) return;

      vy += CFG.GRAVITY * dt;
      current.y += vy * dt;

      const targetY = last.y - CFG.BLOCK_HEIGHT;
      if (current.y >= targetY){
        current.y = targetY;
        placeOrFail();
      }
    }
  }

  function showGameOver(){
    if (!UI.overlay) return;
    UI.overlay.style.display = "flex";

    if (UI.ovTitle) UI.ovTitle.textContent = "Tour terminée";
    if (UI.ovText)  UI.ovText.textContent  = allowRevive
      ? "Tu peux revivre avec 1 jeton ou regarder une pub pour en gagner 1."
      : "Tu peux rejouer pour tenter de battre ton record !";

    if (UI.oRevive){
      UI.oRevive.style.display = allowRevive && wallet.jetons > 0 ? "inline-block" : "none";
    }
  }

  function refreshWalletUI(){
    if (UI.vcoinsEl) UI.vcoinsEl.textContent = String(wallet.vcoins);
    if (UI.tokensEl) UI.tokensEl.textContent = String(wallet.jetons);
  }

  if (UI.btnNew){
    UI.btnNew.addEventListener("click", () => {
      loadTexturesForTheme(getCurrentThemeNameVSky());
      newGame();
    });
  }

  if (UI.oRestart){
    UI.oRestart.addEventListener("click", () => {
      if (UI.overlay) UI.overlay.style.display = "none";
      newGame();
    });
  }

  if (UI.oRevive){
    UI.oRevive.addEventListener("click", () => {
      if (!allowRevive) return;
      if (wallet.jetons <= 0) return;
      wallet.jetons -= 1;
      STORAGE.setWallet(wallet);
      refreshWalletUI();
      reviveContinue();
    });
  }

  if (UI.oReward){
    UI.oReward.addEventListener("click", () => {
      wallet.jetons += 1;
      STORAGE.setWallet(wallet);
      refreshWalletUI();
      reviveContinue();
    });
  }

  if (UI.bestEl)   UI.bestEl.textContent   = String(bestHeight);
  refreshWalletUI();

  app.view.addEventListener("pointerdown", () => {
    if (state === STATE.AIM){
      state = STATE.DROP;
      vy = 0;
    }
  });

})();
