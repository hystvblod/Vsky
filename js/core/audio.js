window.SFX = (function () {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = Ctx ? new Ctx() : null;

  function tone(freq = 440, dur = 0.1, type = "sine", vol = 0.03) {
    if (!ctx || !ctx.createOscillator) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(ctx.destination);
    const t0 = ctx.currentTime;
    o.start(t0);
    o.stop(t0 + dur);
  }

  return {
    tap:   () => tone(520, 0.04, "square", 0.03),
    drop:  () => tone(280, 0.06, "triangle", 0.04),
    fall:  () => tone(180, 0.18, "sawtooth", 0.04),
    win:   () => tone(920, 0.18, "sine", 0.05)
  };
})();
