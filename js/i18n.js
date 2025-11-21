// public/js/i18n.js
(function(){
  "use strict";

  // ==== FALLBACK en-US (utilisé si le chargement JSON échoue) ====
  const EN_FALLBACK = {
    "app": { "title": "Vskytower - Home" },
    "top": { "profile": "Profile", "settings": "Settings" },
    "menu": {
      "classic": "Classic",
      "infinity": "Endless",
      "duel": "Duel",
      "shop": "Shop",
      "game": "Game"
    },
    "tip": {
      "classic": "Classic mode",
      "infinity": "Endless mode",
      "duel": "Duel mode",
      "shop": "Unlock themes and customize the game",
      "game": "Start Vskytower"
    }
  };

  const I18N = {
    dict: EN_FALLBACK,   // <- fallback par défaut = EN
    lang: "en",
    async init(lang){
      this.lang = lang || (navigator.language || "en").slice(0,2);
      try{
        const url = new URL(`i18n/${this.lang}.json`, location.href);
        const res = await fetch(url, {cache:"no-store"});
        if(res.ok){
          this.dict = await res.json();  // si ça marche, on écrase le fallback
        } else {
          this.dict = EN_FALLBACK;       // sinon fallback EN
        }
      }catch(_){
        this.dict = EN_FALLBACK;         // file:// ou CORS -> fallback EN
      }
      this.apply();
    },
    t(key){
      try { return key.split(".").reduce((o,k)=>o && o[k]!=null ? o[k] : null, this.dict) ?? key; }
      catch { return key; }
    },
    apply(root=document){
      root.querySelectorAll("[data-i18n]").forEach(el=>{
        const v = this.t(el.getAttribute("data-i18n"));
        if(v!=null) el.textContent = v;
      });
      root.querySelectorAll("[data-i18n-aria]").forEach(el=>{
        const v = this.t(el.getAttribute("data-i18n-aria"));
        if(v!=null) el.setAttribute("aria-label", v);
      });
      const t = document.querySelector("title[data-i18n]");
      if(t){ t.textContent = this.t(t.getAttribute("data-i18n")); }
    }
  };

  window.I18N = I18N;
})();
