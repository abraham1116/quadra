/* ===== ui.js — DOM wiring for the game screen ===== */

(function () {
  /* --- theme (shared behaviour) --- */
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
      if (window._game) window._game.view.draw();
    });
  }

  /* --- elements --- */
  const $ = (id) => document.getElementById(id);
  const els = {
    canvas: $("board-canvas"),
    selRule: $("sel-rule"),
    selMode: $("sel-mode"),
    selDiff: $("sel-difficulty"),
    grpDiff: $("group-difficulty"),
    btnNew: $("btn-new"),
    btnRematch: $("btn-rematch"),
    overlay: $("board-overlay"),
    overlayTitle: $("overlay-title"),
    overlayMsg: $("overlay-msg"),
    scoreP1: $("score-p1"), scoreP2: $("score-p2"),
    nameP1: $("name-p1"), nameP2: $("name-p2"),
    valP1: $("val-p1"), valP2: $("val-p2"),
    turn: $("turn-indicator"),
  };

  const DIFF_LABEL = { easy: "Facile", medium: "Moyen", hard: "Difficile", expert: "Expert" };

  function names(mode, diff) {
    if (mode === "ai") return ["Vous", `IA · ${DIFF_LABEL[diff]}`];
    if (mode === "training") return ["Entraînement", "Libre"];
    return ["Joueur 1", "Joueur 2"];
  }

  function refreshLabels(mode, diff) {
    const [n1, n2] = names(mode, diff);
    els.nameP1.textContent = n1;
    els.nameP2.textContent = n2;
    els.grpDiff.style.display = mode === "ai" ? "" : "none";
  }

  /* --- callbacks --- */
  function onUpdate(s) {
    els.valP1.textContent = s.scores[1];
    els.valP2.textContent = s.scores[2];
    els.scoreP1.classList.toggle("active", !s.over && s.current === 1);
    els.scoreP2.classList.toggle("active", !s.over && s.current === 2);
    const [n1, n2] = names(s.mode, els.selDiff.value);
    els.turn.textContent = s.over ? "Partie terminée" : `Au tour de ${s.current === 1 ? n1 : n2}`;
  }

  function onEnd(res) {
    const [n1, n2] = names(res.mode, els.selDiff.value);
    const unit = els.selRule.value === "encircle" ? "points encerclés" : "carrés";
    let title, msg;
    if (res.mode === "training") {
      title = "Entraînement terminé";
      msg = `${n1}: ${res.scores[1]} · ${n2}: ${res.scores[2]} ${unit}`;
    } else if (res.winner === 0) {
      title = "Égalité !";
      msg = `${res.scores[1]} — ${res.scores[2]} ${unit}. Personne ne l'emporte.`;
    } else {
      const wName = res.winner === 1 ? n1 : n2;
      title = res.mode === "ai" && res.winner === 2 ? "L'IA gagne" : `${wName} gagne !`;
      msg = `Score final ${res.scores[1]} — ${res.scores[2]} ${unit}.`;
    }
    els.overlayTitle.textContent = title;
    els.overlayMsg.textContent = msg;
    els.overlay.hidden = false;
  }

  /* --- boot --- */
  function boot() {
    initTheme();

    const params = new URLSearchParams(location.search);
    const startMode = ["local", "ai", "training"].includes(params.get("mode"))
      ? params.get("mode") : "local";
    const startRule = ["squares", "encircle"].includes(params.get("rule"))
      ? params.get("rule") : "squares";
    els.selMode.value = startMode;
    els.selRule.value = startRule;

    refreshLabels(startMode, els.selDiff.value);

    const game = new Game({
      canvas: els.canvas,
      mode: startMode,
      difficulty: els.selDiff.value,
      ruleset: startRule,
      onUpdate,
      onEnd,
    });
    window._game = game;

    const restart = () => {
      els.overlay.hidden = true;
      refreshLabels(els.selMode.value, els.selDiff.value);
      game.configure({
        mode: els.selMode.value,
        difficulty: els.selDiff.value,
        ruleset: els.selRule.value,
      });
    };

    els.selRule.addEventListener("change", restart);
    els.selMode.addEventListener("change", restart);
    els.selDiff.addEventListener("change", restart);
    els.btnNew.addEventListener("click", restart);
    els.btnRematch.addEventListener("click", restart);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
