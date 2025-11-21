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
    BASE_WIDTH: 220, BLOCK_HEIGHT: 24, SPEED_X: 180, SPEED_INC: 10, WIND_MAX: 28,
    PERFECT_WINDOW: 4, REWARD_PERFECT: 4, REWARD_HEIGHT: 1, MIN_WIDTH: 14, REVIVE_WIDTH_BONUS: 6
  };

  try { window.userStore.ensure(); } catch(e) {}

  if (!window.PIXI) { console.warn("PIXI introuvable"); return; }

  // --- PIXI App ---
  const wrap = document.getElementById("stage-wrap");
  const vWidth = CFG.BASE_WIDTH, vHeight = 400;
  const app = new PIXI.Application({ backgroundAlpha: 0, antialias: true, width: 320, height: 568 });
  wrap.appendChild(app.view);

  const world = new PIXI.Container();
  app.stage.addChild(world);

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(resize); // 2e passe après layout

  // State
  let state = "idle";
  let current = null, last = null;
  let height = 0, best = 0, speedX = CFG.SPEED_X, dir = 1;
  let allowRevive = true;

  boot();

  async function boot(){
    try {
      best = await window.userStore.getBest();
      UI.bestEl.textContent = best;
      UI.vcoinsEl.textContent = await window.userStore.getVCoins();
      UI.tokensEl.textContent = await window.userStore.getTokens();
    } catch(e){}

    UI.btnNew?.addEventListener("click", newGame);
    UI.oRestart?.addEventListener("click", ()=>{ hideOverlay(); newGame(); });
    UI.oReward?.addEventListener("click", async ()=>{
      const ok = await window.ads.rewarded("token");
      if (ok) {
        const n = await window.userStore.addTokens(1);
        UI.tokensEl.textContent = n;
      }
    });
    UI.oRevive?.addEventListener("click", async ()=>{
      let tok = await window.userStore.getTokens();
      if (tok > 0 && allowRevive) {
        await window.userStore.addTokens(-1);
        UI.tokensEl.textContent = await window.userStore.getTokens();
        allowRevive = false;
        hideOverlay();
        reviveContinue();
      }
    });

    app.view.addEventListener("pointerdown", ()=>{
      if (state === "aim") dropBlock();
    });

    newGame();
  }

  function resize(){
    const cw = (wrap && wrap.clientWidth) ? wrap.clientWidth : 0;
    const w  = Math.max(260, cw - 16);
    const h  = Math.max(420, Math.floor(w * 16 / 9));
    app.renderer.resize(w, h);
    const scale = w / vWidth;
    world.scale.set(scale);
  }

  function clearWorld(){ world.removeChildren(); }

  function rect(color, x, y, w, h){
    const g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRect(0,0,w,h);
    g.endFill();
    g.x = x; g.y = y;
    return g;
  }

  function currentBounds(){ return { x: current.x, width: current.width, y: current.y }; }

  function newGame(){
    clearWorld();
    height = 0;
    speedX = CFG.SPEED_X;
    state = "aim";
    allowRevive = true;
    UI.heightEl.textContent = "0";
    // ground
    const ground = rect(0x2b2b2b, 0, vHeight-8, vWidth, 8);
    world.addChild(ground);
    // base
    const bw = Math.min(vWidth*0.8|0, 160);
    last = { x: (vWidth - bw)/2, width: bw, y: vHeight - 8 - CFG.BLOCK_HEIGHT };
    const base = rect(0xF5D28C, last.x, last.y, last.width, CFG.BLOCK_HEIGHT);
    base.alpha = 0.95;
    base.name = "last";
    world.addChild(base);
    // first moving
    spawnNext();
    app.ticker.add(update);
  }

  function spawnNext(){
    const w = last ? last.width : Math.min(vWidth*0.8|0, 160);
    const y = (last ? last.y : vHeight - 8 - CFG.BLOCK_HEIGHT) - CFG.BLOCK_HEIGHT;
    const startLeft = Math.random() < 0.5;
    const x = startLeft ? 0 : (vWidth - w);
    dir = startLeft ? +1 : -1;
    current = rect(0xFFD27F, x, y, w, CFG.BLOCK_HEIGHT);
    current.name = "current";
    world.addChild(current);
    state = "aim";
  }

  function update(delta){
    if (state === "aim") {
      const dx = (speedX/60) * dir * delta;
      current.x += dx;
      if (current.x <= 0) { current.x = 0; dir = +1; }
      if (current.x + current.width >= vWidth) { current.x = vWidth - current.width; dir = -1; }
    } else if (state === "fall") {
      const dy = 420/60 * delta;
      current.y += dy;
      if (current.y >= last.y) {
        current.y = last.y;
        placeOrFail();
      }
    }
  }

  function dropBlock(){
    if (state !== "aim") return;
    state = "fall";
  }

  function placeOrFail(){
    const L1 = last.x, R1 = last.x + last.width;
    const L2 = current.x, R2 = current.x + current.width;
    const L = Math.max(L1, L2);
    const R = Math.min(R1, R2);
    const overlap = R - L;
    if (overlap <= 0) {
      missAndGameOver();
      return;
    }
    // redraw to exact overlap width
    current.clear();
    current.beginFill(0xFFD27F);
    current.drawRect(0,0,overlap, CFG.BLOCK_HEIGHT);
    current.endFill();
    current.x = L;
    current.width = overlap;

    // perfect bonus?
    if (Math.abs(L - L1) <= CFG.PERFECT_WINDOW) {
      try { window.SFX?.win(); } catch(e){}
      window.userStore.addVCoins(CFG.REWARD_PERFECT).then(v=> UI.vcoinsEl.textContent = v);
    } else {
      try { window.SFX?.tap(); } catch(e){}
    }

    last = currentBounds();
    height += 1;
    UI.heightEl.textContent = String(height);
    window.userStore.setBestIfHigher(height).then(v => UI.bestEl.textContent = v);
    speedX += CFG.SPEED_INC * 0.15;
    spawnNext();
  }

  function missAndGameOver(){
    state = "over";
    try { window.SFX?.fall(); } catch(e){}
    app.ticker.remove(update);

    window.userStore.addVCoins(height * CFG.REWARD_HEIGHT).then(v=> UI.vcoinsEl.textContent = v);
    showOverlay(I18N.t("game_over"));
  }

  function showOverlay(title){
    if (UI.ovTitle) UI.ovTitle.textContent = title || I18N.t("game_over");
    if (UI.ovText) UI.ovText.textContent = I18N.t("revive") + " / " + I18N.t("watch_ad_get_token");
    if (UI.overlay) UI.overlay.style.display = "block";
  }
  function hideOverlay(){ if (UI.overlay) UI.overlay.style.display = "none"; }

  function reviveContinue(){
    const w = Math.min(vWidth, (last.width + (CFG.REVIVE_WIDTH_BONUS||6)));
    const y = last.y - CFG.BLOCK_HEIGHT;
    const x = Math.max(0, Math.min(vWidth - w, last.x + (Math.random() < 0.5 ? -6 : 6)));
    current = rect(0xFFD27F, x, y, w, CFG.BLOCK_HEIGHT);
    world.addChild(current);
    state = "aim";
    app.ticker.add(update);
  }
})();
