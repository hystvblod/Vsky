(function(){
  "use strict";

  const K = {
    VCOINS: "vsk_vc",
    TOKENS: "vsk_tk",
    BEST: "vsk_best",
    THEME_ACTIVE: "vsk_theme_active",
    THEMES_OWNED: "vsk_themes_owned"
  };

  // === Thèmes disponibles ===
  // price en VCoins; blue est offert
  const THEMES = {
    blue: {
      label: "Bleu",
      price: 0,
      css: "themes/theme-blue.css",
      assets: {
        bg: "assets/themes/blue/bg.webp",
        block_base: "assets/themes/blue/block_base.webp",
        block_active: "assets/themes/blue/block_active.webp"
      }
    },
    green: {
      label: "Vert",
      price: 120,
      css: "themes/theme-green.css",
      assets: {
        bg: "assets/themes/green/bg.webp",
        block_base: "assets/themes/green/block_base.webp",
        block_active: "assets/themes/green/block_active.webp"
      }
    },
    orange: {
      label: "Orange",
      price: 120,
      css: "themes/theme-orange.css",
      assets: {
        bg: "assets/themes/orange/bg.webp",
        block_base: "assets/themes/orange/block_base.webp",
        block_active: "assets/themes/orange/block_active.webp"
      }
    }
  };

  function ensureBase(){
    if (localStorage.getItem(K.VCOINS) == null) localStorage.setItem(K.VCOINS, "0");
    if (localStorage.getItem(K.TOKENS) == null) localStorage.setItem(K.TOKENS, "0");
    if (localStorage.getItem(K.BEST) == null)   localStorage.setItem(K.BEST,   "0");
    if (localStorage.getItem(K.THEMES_OWNED) == null) localStorage.setItem(K.THEMES_OWNED, JSON.stringify(["blue"]));
    if (localStorage.getItem(K.THEME_ACTIVE) == null) localStorage.setItem(K.THEME_ACTIVE, "blue");
  }

  const Store = {
    vcoins(){ ensureBase(); return +(localStorage.getItem(K.VCOINS)||"0"); },
    addV(n){ ensureBase(); const v=Math.max(0, this.vcoins()+(n|0)); localStorage.setItem(K.VCOINS, String(v)); App.updateWallet(); return v; },
    tokens(){ ensureBase(); return +(localStorage.getItem(K.TOKENS)||"0"); },
    addT(n){ ensureBase(); const v=Math.max(0, this.tokens()+(n|0)); localStorage.setItem(K.TOKENS, String(v)); App.updateWallet(); return v; },
    best(){ ensureBase(); return +(localStorage.getItem(K.BEST)||"0"); },
    setBestIfHigher(h){ ensureBase(); const b=this.best(); if(h>b) localStorage.setItem(K.BEST, String(h)); return +(localStorage.getItem(K.BEST)||"0"); }
  };

  const Themes = {
    all: THEMES,
    owned(){ ensureBase(); try{ return JSON.parse(localStorage.getItem(K.THEMES_OWNED)||"[]"); }catch{ return ["blue"]; } },
    saveOwned(list){ localStorage.setItem(K.THEMES_OWNED, JSON.stringify(list)); },
    active(){ ensureBase(); return localStorage.getItem(K.THEME_ACTIVE)||"blue"; },
    isOwned(name){ return this.owned().includes(name); },
    setActive(name){
      if (!THEMES[name]) return false;
      if (!this.isOwned(name)) return false;
      localStorage.setItem(K.THEME_ACTIVE, name);
      // injecte/maj la CSS
      let link = document.getElementById("theme-css");
      if (!link){
        link = document.createElement("link");
        link.id="theme-css"; link.rel="stylesheet";
        document.head.appendChild(link);
      }
      link.href = THEMES[name].css;
      document.documentElement.setAttribute("data-theme", name);
      return true;
    },
    getActiveConfig(){ return THEMES[this.active()] || THEMES.blue; },
    purchase(name){
      const t = THEMES[name]; if (!t) return {ok:false, reason:"not_found"};
      if (this.isOwned(name)) return {ok:false, reason:"already_owned"};
      const price = t.price|0;
      if (Store.vcoins() < price) return {ok:false, reason:"not_enough"};
      Store.addV(-price);
      const o = this.owned(); o.push(name); this.saveOwned(o);
      return {ok:true};
    }
  };

  const App = {
    Store, Themes,
    initPage(){
      ensureBase();
      // applique thème actif
      Themes.setActive(Themes.active());
      this.updateWallet();
    },
    updateWallet(){
      const vEl = document.getElementById("vcoins");
      if (vEl) vEl.textContent = String(Store.vcoins());
      const tEl = document.getElementById("tokens");
      if (tEl) tEl.textContent = String(Store.tokens());
    },
    renderBoutiqueThemes(containerId="shop-themes"){
      const el = document.getElementById(containerId);
      if (!el) return;
      const owned = new Set(Themes.owned());
      el.innerHTML = "";
      Object.entries(Themes.all).forEach(([name, cfg])=>{
        const li = document.createElement("div");
        li.className = "panel";
        li.style.margin = "8px 0";
        li.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <div>
              <div style="font-weight:800">${cfg.label}</div>
              <small>${owned.has(name) ? "Possédé" : `Prix: ${cfg.price} VCoins`}</small>
            </div>
            <div style="display:flex;gap:8px">
              ${owned.has(name)
                ? `<button class="btn" data-act="${name}">Activer</button>`
                : `<button class="btn alt" data-buy="${name}">Acheter</button>`
              }
            </div>
          </div>`;
        el.appendChild(li);
      });
      // events
      el.addEventListener("click",(e)=>{
        const buy = e.target.closest("[data-buy]"); const act = e.target.closest("[data-act]");
        if (buy){
          const name = buy.getAttribute("data-buy");
          const res = Themes.purchase(name);
          if (!res.ok){
            if (res.reason==="not_enough") alert("Pas assez de VCoins.");
            else if (res.reason==="already_owned") alert("Déjà possédé.");
            else alert("Achat impossible.");
            return;
          }
          this.renderBoutiqueThemes(containerId);
        } else if (act){
          const name = act.getAttribute("data-act");
          if (Themes.setActive(name)) alert("Thème activé : "+Themes.all[name].label);
        }
      });
    }
  };

  window.App = App;
})();
