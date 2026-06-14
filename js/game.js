/* ===== game.js — turn flow, modes, scoring orchestration ===== */

class Game {
  /**
   * @param {object} opts
   *   canvas, mode ('local'|'ai'|'training'), difficulty,
   *   onUpdate(state), onEnd(result)
   */
  constructor(opts) {
    this.canvas = opts.canvas;
    this.mode = opts.mode || "ai";
    this.difficulty = opts.difficulty || "medium";
    this.ruleset = opts.ruleset || "squares";
    this.onUpdate = opts.onUpdate || (() => {});
    this.onEnd = opts.onEnd || (() => {});

    this.board = new Board(this.ruleset);
    this.view = new BoardView(this.canvas, this.board);
    this.current = 1;       // whose turn
    this.aiPlayer = 2;      // AI controls player 2 in 'ai' mode
    this.locked = false;    // input lock during AI / animation
    this.over = false;

    this._bindInput();
    window.addEventListener("resize", () => this.view.resize());
    this.update();
  }

  /* --- config changes (start fresh game) --- */
  configure({ mode, difficulty, ruleset }) {
    if (mode !== undefined) this.mode = mode;
    if (difficulty !== undefined) this.difficulty = difficulty;
    if (ruleset !== undefined && ruleset !== this.ruleset) {
      this.ruleset = ruleset;
      this.board.setRuleset(ruleset);
    }
    this.reset();
  }

  reset() {
    this.board.reset();
    this.current = 1;
    this.locked = false;
    this.over = false;
    this.view.pointAnims.clear();
    this.view.cellAnims.clear();
    this.view.ringAnims.clear();
    this.view.setHover(null, this.current);
    this.view.draw();
    this.update();
  }

  /* --- input --- */
  _bindInput() {
    const cv = this.canvas;
    const pos = (e) => {
      const rect = cv.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
    };

    cv.addEventListener("mousemove", (e) => {
      if (this.locked || this.over) return;
      const { x, y } = pos(e);
      this.view.setHover(this.view.toGrid(x, y), this.current);
    });
    cv.addEventListener("mouseleave", () => this.view.setHover(null, this.current));

    cv.addEventListener("click", (e) => {
      if (this._humanBlocked()) return;
      const { x, y } = pos(e);
      const g = this.view.toGrid(x, y);
      if (g) this.tryMove(g.r, g.c);
    });

    // touch: tap to place
    cv.addEventListener("touchstart", (e) => {
      if (this._humanBlocked()) return;
      e.preventDefault();
      const { x, y } = pos(e);
      const g = this.view.toGrid(x, y);
      if (g) this.tryMove(g.r, g.c);
    }, { passive: false });
  }

  _humanBlocked() {
    if (this.over || this.locked) return true;
    if (this.mode === "ai" && this.current === this.aiPlayer) return true;
    return false;
  }

  /* --- turn flow --- */
  tryMove(r, c) {
    if (!this.board.isEmpty(r, c)) return;
    const player = this.current;
    const captured = this.board.place(r, c, player);

    this.view.setHover(null, player);
    this.view.animatePoint(r, c, player);
    if (captured.length) {
      if (this.ruleset === "squares") {
        this.view.animateCaptures(captured);
      } else {
        for (const f of captured) this.view.animatePoint(f.r, f.c, f.player);
        this.view.animateRings(captured); // show the loop closing
      }
    }
    this.update();

    if (this.board.isFull()) return this._finish();

    // Extra turn? Standard rule: turn always passes. Spec says alternate.
    this._next();
  }

  _next() {
    this.current = this.current === 1 ? 2 : 1;
    this.update();

    if (this.mode === "ai" && this.current === this.aiPlayer && !this.over) {
      this.locked = true;
      // small delay so the AI move feels deliberate
      setTimeout(() => this._aiMove(), 280);
    }
  }

  _aiMove() {
    const move = AI.chooseMove(this.board, this.aiPlayer, this.difficulty);
    this.locked = false;
    if (!move) { if (this.board.isFull()) this._finish(); return; }
    this.tryMove(move.r, move.c);
  }

  _finish() {
    this.over = true;
    this.locked = true;
    const w = this.board.winner();
    this.onEnd({
      winner: w,
      scores: { ...this.board.scores },
      mode: this.mode,
    });
  }

  /* --- state out --- */
  update() {
    this.onUpdate({
      current: this.current,
      scores: { ...this.board.scores },
      mode: this.mode,
      over: this.over,
    });
  }
}
