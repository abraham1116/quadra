# Quadra

Jeu de stratégie minimaliste, 100 % navigateur. Posez des points sur une grille
15×15, fermez les petits carrés en contrôlant leurs quatre coins, marquez le plus
de carrés pour gagner.

## Jouer

Ouvrez `index.html`, cliquez **Play Now**. Aucune installation, aucun compte.

Pour un serveur local :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Jouer hors-ligne — fichier unique (double-clic)

`Quadra.html` contient **tout le jeu dans un seul fichier** (CSS + JS inlinés),
sans serveur ni Internet. Double-cliquez-le, ou utilisez un lanceur :

- **Windows** : double-clic sur `Quadra.bat`
- **macOS / Linux** : double-clic sur `Quadra.command`

Régénérer `Quadra.html` après modification des sources :

```bash
node build-standalone.js
```

## Règles (2 modes)

- **Carrés** — contrôlez les 4 coins d'un carré 1×1 pour le capturer.
- **Encerclement** — capture de groupe (style Go) : un groupe adverse connecté
  privé de toutes ses libertés (cases vides adjacentes ; bord = mur) est capturé
  en entier d'un coup. Permet de manger plusieurs points simultanément.

Dans les deux cas : 1 point par capture, le plus de captures gagne.

## Adversaires

- **2 joueurs (local)** — à tour de rôle sur le même appareil.
- **Contre l'IA** — 4 niveaux : Facile, Moyen, Difficile, Expert.
  Tous jouent pour gagner (capture + blocage ; Expert = alpha-beta, anticipation).
- **Entraînement** — partie libre, sans score officiel.

Le moteur d'IA est agnostique : il joue les deux règles avec la même force.

## Stack

HTML5 · CSS3 · JavaScript (vanilla) · HTML5 Canvas. Aucun backend.

## Architecture

```
index.html        Landing page
game.html         Écran de jeu
css/              style.css · landing.css · game.css
js/               main.js · board.js · ai.js · animations.js · game.js · ui.js
```

- `board.js` — état pur de la grille + capture des carrés (sans DOM).
- `ai.js` — IA locale (random → recherche 1-ply pour Expert).
- `animations.js` — rendu Canvas + animations (placement, remplissage).
- `game.js` — déroulé des tours, modes, score.
- `ui.js` — câblage DOM, thème clair/sombre, overlay de fin.
- `main.js` — landing : thème + aperçu animé.

## Déploiement

Site statique — déployable tel quel sur Vercel (aucune configuration requise).

```bash
vercel deploy
```
