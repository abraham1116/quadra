/* ===== main.js — landing page: theme + animated board preview ===== */

(function () {
  const THEME_KEY = "quadra-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const icon = document.querySelector(".theme-icon");
    if (icon) icon.textContent = t === "dark" ? "☀️" : "🌙";
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefers ? "dark" : "light"));
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }

  /* --- self-contained preview: alternates Carrés ↔ Encerclement --- */
  function initPreview() {
    const canvas = document.getElementById("preview-canvas");
    if (!canvas) return;
    const caption = document.getElementById("preview-caption");
    const ctx = canvas.getContext("2d");
    const N = 7, M = N - 1;        // 7×7 intersections, 6×6 squares
    let grid, cells, rings, script, idx, mode, transitioning;

    // Scripted demos (r, c, player). Chosen so captures actually happen.
    const DEMOS = {
      squares: [
        { r: 4, c: 4, p: 2 }, { r: 2, c: 2, p: 1 },
        { r: 1, c: 5, p: 2 }, { r: 2, c: 3, p: 1 },
        { r: 5, c: 1, p: 2 }, { r: 3, c: 2, p: 1 },
        { r: 4, c: 1, p: 2 }, { r: 3, c: 3, p: 1 }, // closes square (2,2)
        { r: 0, c: 3, p: 2 }, { r: 1, c: 3, p: 1 },
        { r: 5, c: 5, p: 2 }, { r: 1, c: 2, p: 1 }, // closes square (1,2)
      ],
      // foe pair at (3,3)+(3,4); p1 fills its 6 liberties → both eaten at once
      encircle: [
        { r: 3, c: 3, p: 2 }, { r: 2, c: 3, p: 1 },
        { r: 3, c: 4, p: 2 }, { r: 2, c: 4, p: 1 },
        { r: 0, c: 0, p: 2 }, { r: 4, c: 3, p: 1 },
        { r: 0, c: 1, p: 2 }, { r: 4, c: 4, p: 1 },
        { r: 6, c: 6, p: 2 }, { r: 3, c: 2, p: 1 },
        { r: 6, c: 5, p: 2 }, { r: 3, c: 5, p: 1 }, // last liberty → eat BOTH
      ],
    };

    function start(m) {
      mode = m;
      grid = Array.from({ length: N }, () => new Array(N).fill(0));
      cells = Array.from({ length: M }, () => new Array(M).fill(0));
      rings = [];
      script = DEMOS[m];
      idx = 0;
      transitioning = false;
      if (caption) caption.textContent = m === "squares" ? "Mode Carrés" : "Mode Encerclement";
    }

    function colors() {
      const cs = getComputedStyle(document.body);
      return {
        line: cs.getPropertyValue("--grid-line").trim(),
        p1: cs.getPropertyValue("--p1").trim(),
        p2: cs.getPropertyValue("--p2").trim(),
        p1f: cs.getPropertyValue("--p1-fill").trim(),
        p2f: cs.getPropertyValue("--p2-fill").trim(),
      };
    }

    function inB(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }

    function capSquares(r, c, p) {
      const cand = [[r, c], [r - 1, c], [r, c - 1], [r - 1, c - 1]];
      for (const [sr, sc] of cand) {
        if (sr < 0 || sc < 0 || sr >= M || sc >= M || cells[sr][sc]) continue;
        if (grid[sr][sc] === p && grid[sr][sc + 1] === p &&
            grid[sr + 1][sc] === p && grid[sr + 1][sc + 1] === p) cells[sr][sc] = p;
      }
    }

    // Go-style group capture: a connected foe group with no liberty is eaten whole.
    function capEncircle(p) {
      const foe = p === 1 ? 2 : 1;
      const seen = Array.from({ length: N }, () => new Array(N).fill(false));
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        if (grid[i][j] !== foe || seen[i][j]) continue;
        const group = []; let lib = false; const stack = [[i, j]];
        seen[i][j] = true;
        while (stack.length) {
          const [a, b] = stack.pop(); group.push([a, b]);
          for (const [na, nb] of [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]]) {
            if (!inB(na, nb)) continue;
            if (grid[na][nb] === 0) lib = true;
            else if (grid[na][nb] === foe && !seen[na][nb]) { seen[na][nb] = true; stack.push([na, nb]); }
          }
        }
        if (!lib) for (const [a, b] of group) {
          grid[a][b] = p;
          rings.push({ r: a, c: b, p, start: performance.now() });
        }
      }
    }

    function setup() {
      const dpr = window.devicePixelRatio || 1;
      const size = canvas.clientWidth || 320;
      canvas.width = size * dpr; canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return size;
    }

    function draw() {
      const size = setup();
      const pad = size * 0.10;
      const step = (size - pad * 2) / (N - 1);
      const dot = step * 0.26;
      const col = colors();
      const now = performance.now();
      ctx.clearRect(0, 0, size, size);

      for (let r = 0; r < M; r++) for (let c = 0; c < M; c++)
        if (cells[r][c]) {
          ctx.fillStyle = cells[r][c] === 1 ? col.p1f : col.p2f;
          ctx.fillRect(pad + c * step, pad + r * step, step, step);
        }

      ctx.strokeStyle = col.line; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const v = Math.round(pad + i * step) + 0.5;
        ctx.moveTo(v, pad); ctx.lineTo(v, size - pad);
        ctx.moveTo(pad, v); ctx.lineTo(size - pad, v);
      }
      ctx.stroke();

      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
        if (grid[r][c]) {
          ctx.fillStyle = grid[r][c] === 1 ? col.p1 : col.p2;
          ctx.beginPath();
          ctx.arc(pad + c * step, pad + r * step, dot, 0, Math.PI * 2);
          ctx.fill();
        }

      // closing rings (encircle)
      rings = rings.filter((ring) => {
        const t = (now - ring.start) / 620;
        if (t >= 1) return false;
        const cx = pad + ring.c * step, cy = pad + ring.r * step;
        const sweep = Math.min(1, t / 0.55);
        const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.strokeStyle = ring.p === 1 ? col.p1 : col.p2;
        ctx.lineWidth = Math.max(2, step * 0.12);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx, cy, step * 0.52, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return true;
      });
    }

    let lastMove = 0;
    function loop(ts) {
      if (ts - lastMove > 560) {
        lastMove = ts;
        if (idx >= script.length) {
          if (!transitioning) {
            transitioning = true;
            setTimeout(() => start(mode === "squares" ? "encircle" : "squares"), 1400);
          }
        } else {
          const mv = script[idx++];
          grid[mv.r][mv.c] = mv.p;
          if (mode === "squares") capSquares(mv.r, mv.c, mv.p);
          else capEncircle(mv.p);
        }
      }
      draw();
      requestAnimationFrame(loop);
    }

    start("squares");
    draw();
    window.addEventListener("resize", draw);
    requestAnimationFrame(loop);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initPreview();
  });
})();
