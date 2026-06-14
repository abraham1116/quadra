/* ===== animations.js — canvas rendering + animated feedback ===== */

class BoardView {
  constructor(canvas, board) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.board = board;
    this.hover = null;          // {r,c} or null
    this.hoverPlayer = 1;
    this.pointAnims = new Map(); // "r,c" -> {start, player}
    this.cellAnims = new Map();  // "r,c" -> {start, player}
    this.ringAnims = new Map();  // "r,c" -> {start, player}  (encircle close)
    this._raf = null;
    this.POINT_MS = 220;
    this.CELL_MS = 320;
    this.RING_MS = 520;
    this.resize();
  }

  /* --- geometry --- */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const size = this.canvas.clientWidth || 600;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    this.pad = size * 0.04;
    this.step = (size - this.pad * 2) / (GRID_SIZE - 1);
    this.dot = Math.max(4, this.step * 0.30);
    this.draw();
  }

  px(c) { return this.pad + c * this.step; }
  py(r) { return this.pad + r * this.step; }

  /** pixel -> nearest intersection within snap radius, else null */
  toGrid(px, py) {
    const c = Math.round((px - this.pad) / this.step);
    const r = Math.round((py - this.pad) / this.step);
    if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) return null;
    const dx = px - this.px(c), dy = py - this.py(r);
    if (Math.hypot(dx, dy) > this.step * 0.5) return null;
    return { r, c };
  }

  /* --- theme colors (re-read so dark mode works live) --- */
  colors() {
    const cs = getComputedStyle(document.body);
    return {
      line: cs.getPropertyValue("--grid-line").trim(),
      p1: cs.getPropertyValue("--p1").trim(),
      p2: cs.getPropertyValue("--p2").trim(),
      p1Fill: cs.getPropertyValue("--p1-fill").trim(),
      p2Fill: cs.getPropertyValue("--p2-fill").trim(),
      bg: cs.getPropertyValue("--bg-elev").trim(),
    };
  }

  pColor(p, col) { return p === 1 ? col.p1 : col.p2; }
  pFill(p, col)  { return p === 1 ? col.p1Fill : col.p2Fill; }

  /* --- public animation triggers --- */
  setHover(cell, player) {
    const changed = JSON.stringify(cell) !== JSON.stringify(this.hover);
    this.hover = cell;
    this.hoverPlayer = player;
    if (changed) this.draw();
  }

  animatePoint(r, c, player) {
    this.pointAnims.set(`${r},${c}`, { start: performance.now(), player });
    this._loop();
  }

  animateCaptures(squares) {
    const now = performance.now();
    for (const s of squares) this.cellAnims.set(`${s.r},${s.c}`, { start: now, player: s.player });
    this._loop();
  }

  // Encircle mode: a closing ring drawn around each captured point.
  animateRings(points) {
    const now = performance.now();
    for (const p of points) this.ringAnims.set(`${p.r},${p.c}`, { start: now, player: p.player });
    this._loop();
  }

  /* --- render loop --- */
  _loop() {
    if (this._raf) return;
    const tick = () => {
      const more = this.draw();
      this._raf = more ? requestAnimationFrame(tick) : null;
    };
    this._raf = requestAnimationFrame(tick);
  }

  draw() {
    const ctx = this.ctx, col = this.colors();
    const now = performance.now();
    let animating = false;
    ctx.clearRect(0, 0, this.size, this.size);

    // captured cell fills
    for (let r = 0; r < CELL_COUNT; r++) {
      for (let c = 0; c < CELL_COUNT; c++) {
        const owner = this.board.cells[r][c];
        if (!owner) continue;
        let a = 1;
        const anim = this.cellAnims.get(`${r},${c}`);
        if (anim) {
          const t = (now - anim.start) / this.CELL_MS;
          if (t >= 1) this.cellAnims.delete(`${r},${c}`);
          else { a = this._ease(t); animating = true; }
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = this.pFill(owner, col);
        ctx.fillRect(this.px(c), this.py(r), this.step, this.step);
        ctx.globalAlpha = 1;
      }
    }

    // grid lines
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < GRID_SIZE; i++) {
      const v = Math.round(this.px(i)) + 0.5;
      ctx.moveTo(v, this.pad); ctx.lineTo(v, this.size - this.pad);
      ctx.moveTo(this.pad, v); ctx.lineTo(this.size - this.pad, v);
    }
    ctx.stroke();

    // hover ghost
    if (this.hover && this.board.isEmpty(this.hover.r, this.hover.c)) {
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = this.pColor(this.hoverPlayer, col);
      ctx.beginPath();
      ctx.arc(this.px(this.hover.c), this.py(this.hover.r), this.dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // points
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const p = this.board.grid[r][c];
        if (!p) continue;
        let scale = 1;
        const anim = this.pointAnims.get(`${r},${c}`);
        if (anim) {
          const t = (now - anim.start) / this.POINT_MS;
          if (t >= 1) this.pointAnims.delete(`${r},${c}`);
          else { scale = this._overshoot(t); animating = true; }
        }
        ctx.fillStyle = this.pColor(p, col);
        ctx.beginPath();
        ctx.arc(this.px(c), this.py(r), this.dot * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // encircle rings — a circle that sweeps shut around the captured point
    for (const [key, anim] of this.ringAnims) {
      const t = (now - anim.start) / this.RING_MS;
      if (t >= 1) { this.ringAnims.delete(key); continue; }
      animating = true;
      const [r, c] = key.split(",").map(Number);
      const cx = this.px(c), cy = this.py(r);
      const sweep = Math.min(1, t / 0.55);          // close the loop
      const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4; // then fade
      const radius = this.step * (0.50 + 0.10 * this._ease(Math.min(1, t / 0.55)));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.strokeStyle = this.pColor(anim.player, col);
      ctx.lineWidth = Math.max(2, this.step * 0.11);
      ctx.lineCap = "round";
      ctx.beginPath();
      const start = -Math.PI / 2;
      ctx.arc(cx, cy, radius, start, start + sweep * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return animating;
  }

  _ease(t) { return 1 - Math.pow(1 - t, 3); }
  _overshoot(t) {
    const s = 1.70158;
    const x = t - 1;
    return 1 + (s + 1) * x * x * x + s * x * x; // back-ease-out
  }
}
