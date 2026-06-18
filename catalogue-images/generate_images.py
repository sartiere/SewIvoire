# -*- coding: utf-8 -*-
"""Génère des vignettes stylisées (motif wax) pour les modèles du catalogue SewIvoire.
Une image par modèle : fond couleur-par-catégorie, anneaux wax, nom + catégorie + logo.
Sortie : ./out/<slug>.png  (900x1200, supersampling x2 pour l'anti-aliasing)."""
import os, math, unicodedata
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

W, H, S = 900, 1200, 2            # taille finale + facteur supersampling
SW, SH = W * S, H * S

# (nom, catégorie)
MODELES = [
    ("Robe pagne cintrée", "Mode Femme"), ("Robe wax longue", "Mode Femme"),
    ("Ensemble jupe-top wax", "Mode Femme"), ("Blouse brodée", "Mode Femme"),
    ("Combinaison wax", "Mode Femme"), ("Tailleur femme bazin", "Tenues Professionnelles"),
    ("Chemise wax homme", "Mode Homme"), ("Complet 3 pièces homme", "Mode Homme"),
    ("Pantalon sur-mesure", "Mode Homme"), ("Dashiki brodé", "Mode Homme"),
    ("Agbada brodé", "Tenues Traditionnelles"), ("Boubou bazin homme", "Tenues Traditionnelles"),
    ("Grand boubou femme", "Tenues Traditionnelles"), ("Caftan cérémonie", "Mariage & Cérémonie"),
    ("Robe de mariée traditionnelle", "Mariage & Cérémonie"),
    ("Tenue de demoiselle d'honneur", "Mariage & Cérémonie"),
    ("Ensemble enfant wax", "Enfant"), ("Robe fillette cérémonie", "Enfant"),
    ("Costume garçon", "Enfant"), ("Kimono africain", "Mode Femme"),
    ("Jupe portefeuille wax", "Mode Femme"), ("Veste blazer wax", "Tenues Professionnelles"),
    ("Chemisier soie", "Tenues Professionnelles"), ("Foulard assorti", "Accessoires"),
    ("Pochette wax", "Accessoires"), ("Cravate wax", "Accessoires"),
    ("Ensemble cérémonie couple", "Mariage & Cérémonie"), ("Robe cocktail", "Mode Femme"),
    ("Boubou brodé enfant", "Enfant"), ("Tunique unisexe", "Sur-mesure"),
]

# Couleur de base par catégorie (palette africaine vibrante)
CAT = {
    "Mode Femme": (181, 70, 46),                 # terracotta
    "Mode Homme": (40, 58, 102),                 # indigo
    "Enfant": (210, 142, 36),                    # ambre
    "Tenues Traditionnelles": (29, 116, 86),     # émeraude
    "Mariage & Cérémonie": (120, 44, 72),        # bordeaux
    "Tenues Professionnelles": (44, 86, 104),    # bleu ardoise
    "Accessoires": (162, 116, 38),               # ocre
    "Sur-mesure": (92, 56, 104),                 # prune
}
CREAM = (250, 243, 226)
GOLD = (230, 200, 110)

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-").replace("--", "-")

def font(name, size):
    for p in (f"C:/Windows/Fonts/{name}", f"C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()

def darken(c, f):
    return tuple(int(v * f) for v in c)

def lighten(c, f):
    return tuple(int(v + (255 - v) * f) for v in c)

def gradient(top, bottom):
    img = Image.new("RGB", (SW, SH), top)
    d = ImageDraw.Draw(img)
    for y in range(SH):
        t = y / SH
        col = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (SW, y)], fill=col)
    return img

def rings(draw, cx, cy, r0, n, gap, color, alpha, width):
    for i in range(n):
        r = r0 + i * gap
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color + (alpha,), width=width)

def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= maxw:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def make(nom, cat):
    base = CAT.get(cat, (90, 90, 90))
    img = gradient(lighten(base, 0.10), darken(base, 0.55))
    ov = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    # Motif wax : anneaux concentriques répartis
    rings(d, SW * 0.78, SH * 0.20, 60 * S, 6, 34 * S, CREAM, 34, 3 * S)
    rings(d, SW * 0.20, SH * 0.42, 45 * S, 5, 30 * S, GOLD, 30, 3 * S)
    rings(d, SW * 0.62, SH * 0.55, 30 * S, 4, 26 * S, CREAM, 26, 2 * S)
    # pois en grille
    for gx in range(8):
        for gy in range(11):
            x = (gx + 0.5) * SW / 8
            y = (gy + 0.5) * SH / 11
            d.ellipse([x - 3 * S, y - 3 * S, x + 3 * S, y + 3 * S], fill=CREAM + (16,))
    img = Image.alpha_composite(img.convert("RGBA"), ov)

    # Bandeau bas dégradé sombre pour lisibilité du texte
    band = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    bandtop = int(SH * 0.60)
    for y in range(bandtop, SH):
        t = (y - bandtop) / (SH - bandtop)
        a = int(170 * t * t)
        bd.line([(0, y), (SW, y)], fill=(0, 0, 0, a))
    img = Image.alpha_composite(img, band)

    d = ImageDraw.Draw(img)
    # Logo haut
    f_logo = font("georgiab.ttf", 34 * S)
    d.text((46 * S, 40 * S), "Sew", font=f_logo, fill=GOLD)
    w_sew = d.textlength("Sew", font=f_logo)
    d.text((46 * S + w_sew, 40 * S), "Ivoire", font=f_logo, fill=CREAM)

    # Cadre fin
    d.rectangle([14 * S, 14 * S, SW - 14 * S, SH - 14 * S], outline=CREAM + (90,), width=2 * S)

    # Catégorie + nom (en bas)
    f_cat = font("arialbd.ttf", 22 * S)
    cat_txt = cat.upper()
    d.text((50 * S, SH - 250 * S), cat_txt, font=f_cat, fill=GOLD)

    f_nom = font("georgiab.ttf", 52 * S)
    lines = wrap(d, nom, f_nom, SW - 100 * S)
    y = SH - 205 * S
    for ln in lines:
        d.text((50 * S, y), ln, font=f_nom, fill=CREAM)
        y += 62 * S

    return img.convert("RGB").resize((W, H), Image.LANCZOS)

count = 0
for nom, cat in MODELES:
    make(nom, cat).save(os.path.join(OUT, slug(nom) + ".jpg"), quality=88)
    count += 1
print(f"{count} images generees dans {OUT}")
