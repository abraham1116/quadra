/* ===== board.js — pure game state & geometry (no DOM) =====
 * Two rulesets share the same grid:
 *   "squares"  — capture a 1×1 square by owning its 4 corners.
 *   "encircle" — capture an opponent point when every on-board orthogonal
 *                neighbour is yours (board edge counts as a wall). The point
 *                flips to your colour. Captures chain. */

const GRID_SIZE = 15;             // intersections per side
const CELL_COUNT = GRID_SIZE - 1; // 14×14 capturable squares

function otherPlayer(p) { return p === 1 ? 2 : 1; }

class Board {
  constructor(ruleset = "squares") {
    this.ruleset = ruleset;
    this.reset();
  }

  setRuleset(r) { this.ruleset = r; this.reset(); }

  reset() {
    this.grid = Array.from({ length: GRID_SIZE }, () =>
      new Array(GRID_SIZE).fill(0));
    this.cells = Array.from({ length: CELL_COUNT }, () =>
      new Array(CELL_COUNT).fill(0));
    this.scores = { 1: 0, 2: 0 };
    this.filled = 0;
  }

  inBounds(r, c) {
    return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
  }

  isEmpty(r, c) {
    return this.inBounds(r, c) && this.grid[r][c] === 0;
  }

  /** Place a point. Returns list of captured items (shape depends on ruleset). */
  place(r, c, player) {
    if (!this.isEmpty(r, c)) return [];
    this.grid[r][c] = player;
    this.filled++;
    return this.ruleset === "squares"
      ? this._captureSquares(r, c, player)
      : this._captureEncircle(r, c, player);
  }

  /** Revert a placement together with the captures it produced. */
  undo(r, c, captured) {
    this.grid[r][c] = 0;
    this.filled--;
    if (this.ruleset === "squares") {
      for (const sq of captured) {
        this.cells[sq.r][sq.c] = 0;
        this.scores[sq.player]--;
      }
    } else {
      for (const f of captured) {
        this.grid[f.r][f.c] = f.from;   // restore previous owner
        this.scores[f.player]--;
      }
    }
  }

  /* ---------- squares ruleset ---------- */
  _captureSquares(r, c, player) {
    const out = [];
    const cand = [[r, c], [r - 1, c], [r, c - 1], [r - 1, c - 1]];
    for (const [sr, sc] of cand) {
      if (sr < 0 || sc < 0 || sr >= CELL_COUNT || sc >= CELL_COUNT) continue;
      if (this.cells[sr][sc] !== 0) continue;
      if (this._squareOwnedBy(sr, sc, player)) {
        this.cells[sr][sc] = player;
        this.scores[player]++;
        out.push({ r: sr, c: sc, player });
      }
    }
    return out;
  }

  _squareOwnedBy(sr, sc, player) {
    return (
      this.grid[sr][sc] === player &&
      this.grid[sr][sc + 1] === player &&
      this.grid[sr + 1][sc] === player &&
      this.grid[sr + 1][sc + 1] === player
    );
  }

  _squareGain(r, c, player) {
    let n = 0;
    const cand = [[r, c], [r - 1, c], [r, c - 1], [r - 1, c - 1]];
    for (const [sr, sc] of cand) {
      if (sr < 0 || sc < 0 || sr >= CELL_COUNT || sc >= CELL_COUNT) continue;
      if (this.cells[sr][sc] !== 0) continue;
      const corners = [
        this.grid[sr][sc], this.grid[sr][sc + 1],
        this.grid[sr + 1][sc], this.grid[sr + 1][sc + 1],
      ];
      let mine = 0, foe = 0;
      for (const v of corners) {
        if (v === player) mine++; else if (v !== 0) foe++;
      }
      if (foe === 0 && mine === 3) n++;
    }
    return n;
  }

  /* ---------- encircle ruleset (Go-style group capture) ----------
   * Any connected opponent group with no liberty (no empty orthogonal
   * neighbour; board edge counts as a wall) is captured WHOLE — every point
   * flips at once. Lets you swallow several points simultaneously. */
  _captureEncircle(r, c, player) {
    const foe = otherPlayer(player);
    const flipped = [];
    const seen = Array.from({ length: GRID_SIZE }, () =>
      new Array(GRID_SIZE).fill(false));

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (this.grid[i][j] !== foe || seen[i][j]) continue;
        const group = [];
        let hasLiberty = false;
        const stack = [[i, j]];
        seen[i][j] = true;
        while (stack.length) {
          const [a, b] = stack.pop();
          group.push([a, b]);
          const nb = [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]];
          for (const [na, nb2] of nb) {
            if (!this.inBounds(na, nb2)) continue;   // wall: no liberty
            const v = this.grid[na][nb2];
            if (v === 0) { hasLiberty = true; }
            else if (v === foe && !seen[na][nb2]) {
              seen[na][nb2] = true;
              stack.push([na, nb2]);
            }
          }
        }
        if (!hasLiberty) {
          for (const [a, b] of group) {
            this.grid[a][b] = player;
            this.scores[player]++;
            flipped.push({ r: a, c: b, from: foe, player });
          }
        }
      }
    }
    return flipped;
  }

  /* ---------- shared queries ---------- */

  /** Captures `player` would gain by playing (r,c). Ruleset-aware, no net mutation. */
  gain(r, c, player) {
    if (!this.isEmpty(r, c)) return 0;
    if (this.ruleset === "squares") return this._squareGain(r, c, player);
    return this._encircleGain(r, c, player);
  }

  /** Encircle gain — only foe groups orthogonally adjacent to (r,c) can lose
   *  their last liberty, so the check stays local (fast for AI search). */
  _encircleGain(r, c, player) {
    const foe = otherPlayer(player);
    this.grid[r][c] = player;               // hypothetically occupy
    let total = 0;
    const counted = new Set();
    const nbs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of nbs) {
      if (!this.inBounds(nr, nc) || this.grid[nr][nc] !== foe) continue;
      const key = nr * GRID_SIZE + nc;
      if (counted.has(key)) continue;
      const stack = [[nr, nc]];
      const groupSeen = new Set([key]);
      let liberty = false, size = 0;
      while (stack.length) {
        const [a, b] = stack.pop();
        size++;
        for (const [na, nb] of [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]]) {
          if (!this.inBounds(na, nb)) continue;
          const v = this.grid[na][nb];
          if (v === 0) liberty = true;
          else if (v === foe) {
            const k = na * GRID_SIZE + nb;
            if (!groupSeen.has(k)) { groupSeen.add(k); stack.push([na, nb]); }
          }
        }
      }
      for (const k of groupSeen) counted.add(k);
      if (!liberty) total += size;
    }
    this.grid[r][c] = 0;                     // restore
    return total;
  }

  emptyCells() {
    const out = [];
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (this.grid[r][c] === 0) out.push({ r, c });
    return out;
  }

  isFull() { return this.filled >= GRID_SIZE * GRID_SIZE; }

  winner() {
    if (this.scores[1] > this.scores[2]) return 1;
    if (this.scores[2] > this.scores[1]) return 2;
    return 0;
  }
}
