#!/usr/bin/env bash
# ===== Quadra — lanceur macOS / Linux. Double-cliquez ce fichier. =====
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILE="$DIR/Quadra.html"
if command -v open >/dev/null 2>&1; then
  open "$FILE"            # macOS
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$FILE"       # Linux
else
  echo "Ouvrez ce fichier dans un navigateur : $FILE"
  read -n1 -r -p "Appuyez sur une touche pour fermer..."
fi
