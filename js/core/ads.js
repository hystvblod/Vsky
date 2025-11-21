/** Wrapper pubs (web + Capacitor). Sur web, renvoie false sans planter. */
window.ads = (function () {
  const CAP = window.Capacitor;
  const Plugins = CAP?.Plugins || {};
  const AdMob = Plugins?.AdMob || window.AdMob || null;
  const isNative = !!CAP?.isNativePlatform?.() || (CAP && CAP.platform && CAP.platform !== "web");

  async function interstitial(tag = "game") {
    if (!isNative || !AdMob || !window.CONFIG?.ADS?.ADMOB?.INTER_ID) return false;
    try {
      // await AdMob.prepareInterstitial({ adId: window.CONFIG.ADS.ADMOB.INTER_ID });
      // await AdMob.showInterstitial();
      return true;
    } catch (e) { console.warn("[ADS interstitial]", e); return false; }
  }

  async function rewarded(tag = "reward") {
    if (!isNative || !AdMob || !window.CONFIG?.ADS?.ADMOB?.REWARD_ID) return false;
    try {
      // await AdMob.prepareRewardVideoAd({ adId: window.CONFIG.ADS.ADMOB.REWARD_ID });
      // await AdMob.showRewardVideoAd();
      return true;
    } catch (e) { console.warn("[ADS rewarded]", e); return false; }
  }

  return { interstitial, rewarded, canShow: () => isNative && !!AdMob };
})();
