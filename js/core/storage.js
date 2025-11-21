window.userStore = (function () {
  const L = {
    v:  "vsk_vc",      // VCoins
    tk: "vsk_tk",      // Tokens
    b:  "vsk_best",    // Best height
    th: "vsk_th",      // Owned themes
    np: "vsk_nopub",   // No-ads flag
    ld: "vsk_daily",   // Last daily date
    ic: "vsk_inter",   // Interstitial counter
    gs: "vsk_state"    // Game state snapshot
  };

  function ensure() {
    if (!localStorage.getItem(L.v))  localStorage.setItem(L.v, "0");
    if (!localStorage.getItem(L.tk)) localStorage.setItem(L.tk, "0");
    if (!localStorage.getItem(L.b))  localStorage.setItem(L.b, "0");
    if (!localStorage.getItem(L.th)) localStorage.setItem(L.th, JSON.stringify(["retro"]));
    if (!localStorage.getItem(L.np)) localStorage.setItem(L.np, "0");
    if (!localStorage.getItem(L.ic)) localStorage.setItem(L.ic, "0");
  }

  // --- VCoins ---
  async function getVCoins() { ensure(); return +(localStorage.getItem(L.v) || "0"); }
  async function addVCoins(n = 0) {
    ensure();
    const cur = await getVCoins();
    const v = Math.max(0, cur + (n | 0));
    localStorage.setItem(L.v, String(v));
    return v;
  }

  // --- Tokens ---
  async function getTokens() { ensure(); return +(localStorage.getItem(L.tk) || "0"); }
  async function addTokens(n = 0) {
    ensure();
    const cur = await getTokens();
    const v = Math.max(0, cur + (n | 0));
    localStorage.setItem(L.tk, String(v));
    return v;
  }

  // --- Best ---
  async function getBest() { ensure(); return +(localStorage.getItem(L.b) || "0"); }
  async function setBestIfHigher(h = 0) {
    ensure();
    const cur = await getBest();
    if (h > cur) localStorage.setItem(L.b, String(h));
    return +(localStorage.getItem(L.b) || "0");
  }

  // --- Themes / No-ads ---
  async function getThemes() {
    ensure();
    try { return JSON.parse(localStorage.getItem(L.th) || "[]") || ["retro"]; }
    catch { return ["retro"]; }
  }
  function hasTheme(t) {
    try { return (JSON.parse(localStorage.getItem(L.th) || "[]") || []).includes(t); }
    catch { return t === "retro"; }
  }
  async function addTheme(t) {
    const list = await getThemes();
    if (!list.includes(t)) {
      list.push(t);
      localStorage.setItem(L.th, JSON.stringify(list));
    }
    return list;
  }
  function isNoPub() { ensure(); return localStorage.getItem(L.np) === "1"; }
  function setNoPub(v) { ensure(); localStorage.setItem(L.np, v ? "1" : "0"); }

  // --- Interstitial counter ---
  function incInter() {
    ensure();
    const n = (+(localStorage.getItem(L.ic) || "0")) + 1;
    localStorage.setItem(L.ic, String(n));
    return n;
  }
  function resetInter() { ensure(); localStorage.setItem(L.ic, "0"); }

  // --- Daily reward ---
  async function claimDaily() {
    ensure();
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(L.ld);
    if (last === today) return false;
    localStorage.setItem(L.ld, today);
    await addVCoins(window.CONFIG?.DAILY_REWARD || 100);
    return true;
  }

  // --- Save / Load game snapshot ---
  function saveState(obj) {
    try { localStorage.setItem(L.gs, JSON.stringify(obj || {})); } catch { /* ignore */ }
  }
  function loadState() {
    try {
      const s = localStorage.getItem(L.gs);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
  function clearState() { localStorage.removeItem(L.gs); }

  return {
    ensure,
    getVCoins, addVCoins, getTokens, addTokens,
    getBest, setBestIfHigher,
    getThemes, addTheme, hasTheme, isNoPub, setNoPub,
    incInter, resetInter,
    claimDaily, saveState, loadState, clearState
  };
})();
