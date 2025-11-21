(function(){
  "use strict";
  const THEMES=window.CONFIG.THEMES, PACKS=window.CONFIG.PACKS, TOKENS=window.CONFIG.TOKEN_PACKS;
  const themesEl=id("themes"), packsEl=id("packs"), tksEl=id("tokensShop");
  const vcEl=id("vcoins"), tkEl=id("tokens"), stEl=id("status"), noPubBtn=id("btnNoPub");

  function cardHtml(title,body,price,btn,disabled=false){return `<div class="card"><h3>${title}</h3><p>${body||""}</p><div class="price">${price}</div><button class="btn" ${disabled?"disabled":""}>${btn}</button></div>`;}
  async function refresh(){vcEl.textContent=await window.userStore.getVCoins(); tkEl.textContent=await window.userStore.getTokens(); stEl.textContent=window.userStore.isNoPub()?"NoPub":"Local"; renderThemes(); renderPacks(); renderTokens();}
  function renderThemes(){themesEl.innerHTML=""; window.userStore.getThemes().then(owned=>{THEMES.forEach(t=>{const have=owned.includes(t.id); const d=document.createElement("div"); d.innerHTML=cardHtml(t.name,"Palette "+t.id,t.price===0?"Gratuit":t.price+" VCoins",have?"Déjà possédé":"Débloquer",have); d.querySelector("button").addEventListener("click",()=>buyTheme(t)); themesEl.appendChild(d.firstElementChild);});});}
  function renderPacks(){packsEl.innerHTML=""; PACKS.forEach(p=>{const d=document.createElement("div"); d.innerHTML=cardHtml(p.name,'<span class="tag">IAP</span>',p.price,"Acheter"); d.querySelector("button").addEventListener("click",()=>buyPack(p)); packsEl.appendChild(d.firstElementChild);});}
  function renderTokens(){tksEl.innerHTML=""; TOKENS.forEach(t=>{const d=document.createElement("div"); d.innerHTML=cardHtml(t.name,'<span class="tag">IAP/Rewarded</span>',t.price,"Acheter"); d.querySelector("button").addEventListener("click",()=>buyTokens(t)); tksEl.appendChild(d.firstElementChild);}); const b=document.createElement("div"); b.innerHTML=cardHtml("Jeton (pub)","Regarde une vidéo pour gagner 1 jeton.","Rewarded","Regarder"); b.querySelector("button").addEventListener("click",async()=>{const ok=await window.ads.rewarded("shop_token"); if(ok){await window.userStore.addTokens(1); refresh();}}); tksEl.appendChild(b.firstElementChild);}
  async function buyTheme(t){const owned=await window.userStore.getThemes(); if(owned.includes(t.id))return; const vc=await window.userStore.getVCoins(); if(vc<t.price){alert("Pas assez de VCoins.");return;} await window.userStore.addVCoins(-t.price); await window.userStore.unlockTheme(t.id); localStorage.setItem("themeVBlocks",t.id); const link=document.getElementById("theme-css"); if(link)link.href="themes/"+t.id+".css"; refresh();}
  async function buyPack(p){alert("Brancher IAP réel ici (Capacitor)."); /* après achat: */ /* await window.userStore.addVCoins(p.grant); refresh(); */ }
  async function buyTokens(t){alert("Brancher IAP réel ici (Capacitor)."); /* après achat: */ /* await window.userStore.addTokens(t.grant); refresh(); */ }
  noPubBtn?.addEventListener("click",()=>{window.userStore.setNoPub(true); refresh();});
  function id(x){return document.getElementById(x)}
  refresh();
})();
