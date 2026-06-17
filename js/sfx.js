/* ===== sfx.js — effets sonores synthétisés (WebAudio, aucun fichier) ===== */

const SFX = {
  ctx: null,
  muted: false,
  ready: false,

  init() {
    if (this.ready) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) { /* audio indisponible — silencieux */ }
    this.muted = localStorage.getItem("quadra-muted") === "1";
    this.ready = true;
  },

  setMuted(m) {
    this.muted = m;
    localStorage.setItem("quadra-muted", m ? "1" : "0");
  },

  _blip(freq, dur = 0.08, type = "sine", gain = 0.06, when = 0) {
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  place(player) { this._blip(player === 1 ? 440 : 392, 0.07, "triangle", 0.05); },

  capture(n) {
    const base = 520;
    for (let i = 0; i < Math.min(n, 5); i++)
      this._blip(base + i * 110, 0.11, "sine", 0.06, i * 0.05);
  },

  win() { [523, 659, 784, 1047].forEach((f, i) => this._blip(f, 0.16, "sine", 0.07, i * 0.10)); },
  draw() { [392, 330].forEach((f, i) => this._blip(f, 0.18, "sine", 0.05, i * 0.12)); },
};
