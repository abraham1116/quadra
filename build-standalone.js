/* build-standalone.js — inline CSS + JS into a single double-clickable file.
 * Produces Quadra.html : the whole game in one offline file (no server). */
const fs = require("fs");
const path = require("path");
const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let html = read("game.html");

// 1) inline stylesheets (in order) into one <style> block
const cssFiles = ["css/style.css", "css/game.css"];
const styleBlock =
  "<style>\n" + cssFiles.map(read).join("\n") + "\n</style>";
// drop the individual <link> tags, then inject the combined <style> before </head>
html = html
  .replace(/\s*<link rel="stylesheet" href="css\/[^"]+" \/>/g, "")
  .replace("</head>", "  " + styleBlock + "\n</head>");

// 2) inline scripts (in load order) into one <script> block
const jsFiles = ["js/board.js", "js/ai.js", "js/sfx.js", "js/animations.js", "js/game.js", "js/ui.js"];
const scriptBlock =
  "<script>\n" + jsFiles.map(read).join("\n") + "\n<\/script>";
html = html
  .replace(/\s*<script src="js\/[^"]+"><\/script>/g, "")
  .replace("</body>", "  " + scriptBlock + "\n</body>");

// 3) standalone has no separate landing page — neutralise the "Accueil" links
html = html
  .replace(/href="index\.html"/g, 'href="#" onclick="return false"')
  .replace(/<title>[^<]*<\/title>/, "<title>Quadra — Jouer</title>");

fs.writeFileSync(path.join(root, "Quadra.html"), html);
console.log("Quadra.html written:", html.length, "bytes");
