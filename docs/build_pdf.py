#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère docs/Quadra-Presentation.pdf — présentation du jeu Quadra.
   Dépendance : fpdf2  (pip install fpdf2)
   Usage      : python3 docs/build_pdf.py
"""
import os
from fpdf import FPDF

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# ---- palette (alignée sur le thème du jeu) ----
INK   = (26, 29, 36)
SOFT  = (91, 98, 112)
LINE  = (210, 216, 224)
P1    = (79, 70, 229)     # indigo  — joueur 1
P2    = (244, 63, 94)     # rose    — joueur 2 / IA
P1L   = (224, 222, 252)
P2L   = (252, 220, 226)
BG    = (245, 246, 248)

AUTHORS = [("ONGUENE ABRAHAM", "24P864"), ("POUABE STEPHANE", "24P866")]
URL_LIVE = "https://quadra-mu.vercel.app"
URL_REPO = "https://github.com/abraham1116/quadra"


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_y(8)
        self.set_font("DejaVu", "B", 9)
        self.set_text_color(*SOFT)
        self.cell(0, 6, "Quadra — jeu de stratégie", align="L")
        self.cell(0, 6, f"{self.page_no()}", align="R")
        self.ln(8)
        self.set_draw_color(*LINE)
        self.line(self.l_margin, self.get_y(), 210 - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-14)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*SOFT)
        self.cell(0, 6, f"{URL_LIVE}   ·   {URL_REPO}", align="C")


def dot(pdf, cx, cy, r, color):
    pdf.set_fill_color(*color)
    pdf.ellipse(cx - r, cy - r, 2 * r, 2 * r, "F")


def grid(pdf, x, y, step, n, color=LINE):
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.2)
    for i in range(n):
        pdf.line(x + i * step, y, x + i * step, y + (n - 1) * step)
        pdf.line(x, y + i * step, x + (n - 1) * step, y + i * step)


def h2(pdf, txt, accent=P1):
    pdf.ln(2)
    y = pdf.get_y()
    pdf.set_fill_color(*accent)
    pdf.rect(pdf.l_margin, y + 1.2, 3, 6.5, "F")
    pdf.set_x(pdf.l_margin + 6)
    pdf.set_font("DejaVu", "B", 14)
    pdf.set_text_color(*INK)
    pdf.cell(0, 9, txt, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)


def body(pdf, txt):
    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5.6, txt)
    pdf.ln(1)


def bullet(pdf, lead, rest):
    pdf.set_x(pdf.l_margin + 2)
    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(*P1)
    pdf.cell(5, 5.6, "•")
    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(*INK)
    w = pdf.get_string_width(lead + " ")
    pdf.cell(w, 5.6, lead + " ")
    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5.6, rest)
    pdf.ln(0.5)


def build():
    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.add_font("DejaVu", "", os.path.join(FONT_DIR, "DejaVuSans.ttf"))
    pdf.add_font("DejaVu", "B", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf"))
    pdf.add_font("Mono", "", os.path.join(FONT_DIR, "DejaVuSansMono.ttf"))
    pdf.set_auto_page_break(True, margin=18)
    pdf.set_margins(18, 16, 18)

    # ============ COUVERTURE ============
    pdf.add_page()
    pdf.set_fill_color(*INK)
    pdf.rect(0, 0, 210, 105, "F")
    # logo carré dégradé (deux blocs)
    pdf.set_fill_color(*P1); pdf.rect(18, 26, 9, 9, "F")
    pdf.set_fill_color(*P2); pdf.rect(27, 26, 9, 9, "F")
    pdf.set_xy(40, 24)
    pdf.set_font("DejaVu", "B", 30)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 13, "Quadra")
    pdf.set_xy(40, 38)
    pdf.set_font("DejaVu", "", 13)
    pdf.set_text_color(200, 205, 215)
    pdf.cell(0, 7, "Jeu de stratégie minimaliste — 100% navigateur")

    # petit plateau décoratif
    gx, gy, st = 132, 56, 7
    grid(pdf, gx, gy, st, 5, color=(70, 76, 90))
    decor = [(0, 0, P1), (1, 0, P1), (0, 1, P1), (1, 1, P1),
             (3, 2, P2), (4, 2, P2), (2, 4, P1), (3, 4, P2)]
    for (c, r, col) in decor:
        dot(pdf, gx + c * st, gy + r * st, 2.2, col)
    # carré capturé (remplissage translucide simulé par couleur claire)
    pdf.set_fill_color(*P1L)

    pdf.set_xy(18, 78)
    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(210, 214, 222)
    pdf.cell(0, 6, "Dossier de présentation du projet")

    # bloc auteurs
    pdf.set_xy(18, 118)
    pdf.set_font("DejaVu", "B", 12)
    pdf.set_text_color(*INK)
    pdf.cell(0, 7, "Porteurs du projet", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    for name, mat in AUTHORS:
        pdf.set_x(18)
        pdf.set_font("DejaVu", "B", 12)
        pdf.set_text_color(*INK)
        pdf.cell(80, 7, name)
        pdf.set_font("DejaVu", "", 12)
        pdf.set_text_color(*SOFT)
        pdf.cell(0, 7, f"Matricule {mat}", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    for label, val in [("Jeu en ligne", URL_LIVE),
                       ("Code source", URL_REPO),
                       ("Fichier exécutable", "Quadra.html (double-clic, hors-ligne)")]:
        pdf.set_x(18)
        pdf.set_font("DejaVu", "B", 11)
        pdf.set_text_color(*INK)
        pdf.cell(42, 6.5, label)
        pdf.set_font("DejaVu", "", 11)
        pdf.set_text_color(*P1)
        pdf.cell(0, 6.5, val, new_x="LMARGIN", new_y="NEXT")

    # ============ PRINCIPE ============
    pdf.add_page()
    h2(pdf, "1.  Principe du jeu", P1)
    body(pdf,
         "Quadra est un jeu de stratégie au tour par tour qui se joue sur une "
         "grille de 15x15 intersections. Deux joueurs s'affrontent : à chaque "
         "tour, un joueur pose un point sur une intersection libre. Un point "
         "posé lui appartient definitivement.")
    body(pdf,
         "Le but est de prendre le controle du terrain : selon le mode choisi, "
         "on capture des carrés ou on encercle les points adverses. Chaque "
         "capture rapporte 1 point. La partie se termine quand toutes les "
         "intersections sont occupées ; le joueur avec le plus de captures "
         "l'emporte.")
    body(pdf,
         "L'objectif de conception : un jeu accessible (aucun téléchargement, "
         "aucun compte, une partie lancée en moins de cinq secondes), une "
         "esthétique soignée et un gameplay rapide à prendre en main.")

    h2(pdf, "2.  Les deux mécaniques", P2)
    body(pdf, "Quadra propose deux régles de capture, sélectionnables avant la partie.")

    # --- diagramme Carrés ---
    y0 = pdf.get_y() + 2
    pdf.set_font("DejaVu", "B", 12); pdf.set_text_color(*P1)
    pdf.set_x(18); pdf.cell(0, 7, "Mode Carrés", new_x="LMARGIN", new_y="NEXT")
    gx, gy, st = 22, pdf.get_y() + 2, 10
    # carré capturé (fond)
    pdf.set_fill_color(*P1L); pdf.rect(gx, gy, st, st, "F")
    grid(pdf, gx, gy, st, 3)
    for (c, r) in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        dot(pdf, gx + c * st, gy + r * st, 2.4, P1)
    pdf.set_xy(gx + 2 * st + 8, gy - 1)
    pdf.set_font("DejaVu", "", 10.5); pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5.2,
        "Contrôlez les 4 coins d'un petit carré (1x1) et il est capturé "
        "instantanément : il se remplit de votre couleur. Jeu de placement et "
        "de blocage — chaque coin menace un carré et en défend un autre.")
    pdf.set_y(gy + 2 * st + 6)

    # --- diagramme Encerclement ---
    pdf.set_font("DejaVu", "B", 12); pdf.set_text_color(*P2)
    pdf.set_x(18); pdf.cell(0, 7, "Mode Encerclement", new_x="LMARGIN", new_y="NEXT")
    gx, gy, st = 22, pdf.get_y() + 2, 10
    grid(pdf, gx, gy, st, 4)
    # groupe adverse (2 points rose) au centre
    foe = [(1, 1), (2, 1)]
    for (c, r) in foe:
        dot(pdf, gx + c * st, gy + r * st, 2.4, P2)
    # encerclement par joueur (indigo) sur toutes les libertés
    mine = [(1, 0), (2, 0), (0, 1), (3, 1), (1, 2), (2, 2)]
    for (c, r) in mine:
        dot(pdf, gx + c * st, gy + r * st, 2.4, P1)
    pdf.set_xy(gx + 3 * st + 8, gy - 1)
    pdf.set_font("DejaVu", "", 10.5); pdf.set_text_color(*INK)
    pdf.multi_cell(0, 5.2,
        "Privez un groupe adverse connecté de toutes ses libertés (les cases "
        "vides autour ; le bord du plateau compte comme un mur). Le groupe "
        "entier est capturé d'un seul coup et passe à votre couleur — vous "
        "pouvez ainsi manger plusieurs points simultanément.")
    pdf.set_y(gy + 3 * st + 8)

    # ============ COMMENT JOUER ============
    pdf.add_page()
    h2(pdf, "3.  Comment jouer", P1)
    bullet(pdf, "Poser un point :", "cliquez (ou touchez) une intersection libre. C'est ensuite au tour de l'adversaire.")
    bullet(pdf, "Capturer :", "fermez un carré (mode Carrés) ou encerclez un groupe (mode Encerclement). La capture est automatique et animée.")
    bullet(pdf, "Marquer :", "chaque capture vaut 1 point. Le score s'affiche en temps réel en haut de l'écran.")
    bullet(pdf, "Gagner :", "quand toutes les intersections sont occupées, le joueur avec le plus de captures gagne. Égalité possible.")
    pdf.ln(2)

    h2(pdf, "4.  Modes d'adversaire", P2)
    bullet(pdf, "2 joueurs (local) :", "deux personnes jouent à tour de rôle sur le même appareil.")
    bullet(pdf, "Contre l'IA :", "quatre niveaux — Facile, Moyen, Difficile, Expert. Tous jouent pour gagner (capture + blocage ; l'Expert anticipe plusieurs coups via une recherche alpha-beta).")
    bullet(pdf, "Entraînement :", "partie libre pour tester des stratégies, sans score officiel.")
    pdf.ln(2)

    h2(pdf, "5.  Conseils de stratégie", P1)
    bullet(pdf, "Double menace :", "placez un point qui menace deux captures à la fois — l'adversaire ne peut en bloquer qu'une.")
    bullet(pdf, "Défense active :", "occupez le 4e coin (ou la derniére liberté) que vise l'adversaire avant lui.")
    bullet(pdf, "Centre :", "le centre offre plus de connexions ; gardez l'initiative en y construisant tôt.")

    # ============ TECHNIQUE ============
    pdf.add_page()
    h2(pdf, "6.  Réalisation technique", P2)
    body(pdf,
         "Le jeu est 100% navigateur, sans backend. Toute la logique s'exécute "
         "localement, ce qui le rend instantané et jouable hors-ligne.")
    for lead, rest in [
        ("Interface :", "HTML5 + CSS3, responsive (ordinateur, tablette, smartphone), thème clair/sombre."),
        ("Rendu :", "HTML5 Canvas, avec animations (placement, remplissage des carrés, anneau d'encerclement)."),
        ("Logique :", "JavaScript pur. Moteur agnostique : un même code joue les deux règles."),
        ("IA :", "locale en JavaScript ; recherche alpha-beta avec évaluation et élagage pour les niveaux élevés."),
        ("Déploiement :", "Vercel (site statique), redéploiement automatique à chaque push GitHub."),
        ("Hors-ligne :", "Quadra.html regroupe tout le jeu en un seul fichier exécutable (double-clic)."),
    ]:
        bullet(pdf, lead, rest)
    pdf.ln(2)

    h2(pdf, "7.  Architecture du code", P1)
    pdf.set_font("Mono", "", 9.5)
    pdf.set_text_color(*SOFT)
    tree = [
        "index.html        Landing page (présentation + accès)",
        "game.html         Écran de jeu",
        "Quadra.html       Version autonome 1 fichier (hors-ligne)",
        "css/  style.css · landing.css · game.css",
        "js/   board.js    état & règles (carrés + encerclement)",
        "      ai.js       IA (alpha-beta, agnostique règle)",
        "      animations.js  rendu Canvas + animations",
        "      game.js     tours, modes, score",
        "      ui.js       câblage interface, thème",
        "      main.js     landing : thème + aperçu animé",
    ]
    for line in tree:
        pdf.set_x(20)
        pdf.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    h2(pdf, "8.  Accès au jeu", P2)
    pdf.set_font("DejaVu", "", 11); pdf.set_text_color(*INK)
    pdf.set_x(18); pdf.cell(42, 6.5, "En ligne :")
    pdf.set_text_color(*P1); pdf.cell(0, 6.5, URL_LIVE, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*INK)
    pdf.set_x(18); pdf.cell(42, 6.5, "Code source :")
    pdf.set_text_color(*P1); pdf.cell(0, 6.5, URL_REPO, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*INK)
    pdf.set_x(18); pdf.cell(42, 6.5, "Exécutable :")
    pdf.set_text_color(*SOFT)
    pdf.cell(0, 6.5, "Quadra.html — double-clic, aucun serveur ni Internet.",
             new_x="LMARGIN", new_y="NEXT")

    out = "docs/Quadra-Presentation.pdf"
    pdf.output(out)
    print("PDF écrit :", out)


if __name__ == "__main__":
    build()
