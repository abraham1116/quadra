/* ===== ai.js — local AI opponents (ruleset-agnostic) =====
 * Relies only on Board's generic interface (place/undo/gain/scores), so the
 * same engine plays both the "squares" and "encircle" rulesets.
 *
 *   easy   — greedy capture + block direct threats. Shallow but never passes
 *            up a free capture; punishes loose play.
 *   medium — 1-ply safe search: capture, avoid handing a capture back, build.
 *   hard   — alpha-beta, depth 2.
 *   expert — alpha-beta, depth 3, wider candidate set.
 */

const AI = {
  chooseMove(board, player, difficulty) {
    const moves = board.emptyCells();
    if (moves.length === 0) return null;
    switch (difficulty) {
      case "easy":   return this._easy(board, player, moves);
      case "medium": return this._onePly(board, player, moves);
      case "hard":   return this._minimax(board, player, moves, 2, 8);
      case "expert": return this._minimax(board, player, moves, 3, 12);
      default:       return this._onePly(board, player, moves);
    }
  },

  _rand(a) { return a[Math.floor(Math.random() * a.length)]; },

  /* ---------- easy: greedy + block ---------- */
  _easy(board, player, moves) {
    const foe = otherPlayer(player);
    const mine = this._bestGain(board, player, moves);
    if (mine.gain > 0) return this._rand(mine.moves);
    const theirs = this._bestGain(board, foe, moves);
    if (theirs.gain > 0) return this._rand(theirs.moves); // deny their capture
    // otherwise build near the action
    const near = this._nearActive(board, moves);
    return this._rand(near.length ? near : moves);
  },

  /* ---------- medium: 1-ply safe ---------- */
  _onePly(board, player, moves) {
    const foe = otherPlayer(player);
    const mid = (GRID_SIZE - 1) / 2;
    const pool = this._candidates(board, player, moves, 18);
    let best = null, bestScore = -Infinity;
    for (const m of pool) {
      const cap = board.place(m.r, m.c, player);
      const myGain = cap.length;
      const reply = this._maxGain(board, foe);       // opponent's best answer
      board.undo(m.r, m.c, cap);
      const dist = Math.abs(m.r - mid) + Math.abs(m.c - mid);
      const s = myGain * 10 - reply * 11 - dist * 0.06;
      if (s > bestScore) { bestScore = s; best = m; }
    }
    return best || this._rand(moves);
  },

  /* ---------- hard / expert: alpha-beta ---------- */
  _minimax(board, player, moves, depth, width) {
    const pool = this._candidates(board, player, moves, width);
    let best = null, bestVal = -Infinity;
    let alpha = -Infinity;
    for (const m of pool) {
      const cap = board.place(m.r, m.c, player);
      const v = this._search(board, otherPlayer(player), player,
        depth - 1, alpha, Infinity, width);
      board.undo(m.r, m.c, cap);
      if (v > bestVal) { bestVal = v; best = m; }
      if (v > alpha) alpha = v;
    }
    return best || this._rand(moves);
  },

  _search(board, toMove, me, depth, alpha, beta, width) {
    if (depth <= 0 || board.isFull()) return this._eval(board, me);
    const moves = board.emptyCells();
    if (!moves.length) return this._eval(board, me);
    const pool = this._candidates(board, toMove, moves, width);
    const maximizing = toMove === me;
    let val = maximizing ? -Infinity : Infinity;
    for (const m of pool) {
      const cap = board.place(m.r, m.c, toMove);
      const child = this._search(board, otherPlayer(toMove), me,
        depth - 1, alpha, beta, width);
      board.undo(m.r, m.c, cap);
      if (maximizing) {
        if (child > val) val = child;
        if (val > alpha) alpha = val;
      } else {
        if (child < val) val = child;
        if (val < beta) beta = val;
      }
      if (beta <= alpha) break; // prune
    }
    return val;
  },

  _eval(board, me) {
    return board.scores[me] - board.scores[otherPlayer(me)];
  },

  /* ---------- candidate generation ---------- */
  // Top-K empty moves near the action, ranked by own capture + block value,
  // with a mild pull toward the centre.
  _candidates(board, player, moves, K) {
    const foe = otherPlayer(player);
    const mid = (GRID_SIZE - 1) / 2;
    const near = this._nearActive(board, moves);
    const pool = near.length ? near : moves;
    if (pool.length <= K) return pool;
    const scored = pool.map((m) => {
      const g = board.gain(m.r, m.c, player);
      const b = board.gain(m.r, m.c, foe);
      const dist = Math.abs(m.r - mid) + Math.abs(m.c - mid);
      return { m, s: g * 10 + b * 7 - dist * 0.08 };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, K).map((x) => x.m);
  },

  _nearActive(board, moves) {
    const near = moves.filter(({ r, c }) => {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr, nc = c + dc;
          if (board.inBounds(nr, nc) && board.grid[nr][nc] !== 0) return true;
        }
      return false;
    });
    return near;
  },

  /* ---------- gain helpers ---------- */
  _bestGain(board, player, moves) {
    let g = 0, list = [];
    for (const m of moves) {
      const v = board.gain(m.r, m.c, player);
      if (v > g) { g = v; list = [m]; }
      else if (v === g && v > 0) list.push(m);
    }
    return { gain: g, moves: list.length ? list : moves };
  },

  _maxGain(board, player) {
    let g = 0;
    const moves = this._nearActive(board, board.emptyCells());
    const pool = moves.length ? moves : board.emptyCells();
    for (const m of pool) {
      const v = board.gain(m.r, m.c, player);
      if (v > g) g = v;
    }
    return g;
  },
};
