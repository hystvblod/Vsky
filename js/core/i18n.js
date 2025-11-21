window.I18N = (function () {
  const STR = {
    fr: {
      new_game: "Nouvelle partie",
      game_over: "Partie terminée",
      revive: "Revivre (1 jeton)",
      watch_ad_get_token: "Gagner 1 jeton",
      replay: "Rejouer",
      perfect: "Parfait !"
    },
    en: {
      new_game: "New game",
      game_over: "Game over",
      revive: "Revive (1 token)",
      watch_ad_get_token: "Get 1 token",
      replay: "Replay",
      perfect: "Perfect!"
    }
  };
  function lang() {
    try {
      const n = (navigator.language || "fr").slice(0, 2).toLowerCase();
      return STR[n] ? n : "fr";
    } catch (e) { return "fr"; }
  }
  return { t: (k) => STR[lang()][k] || k, lang };
})();
