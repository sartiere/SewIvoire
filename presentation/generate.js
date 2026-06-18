/* Génère la présentation de soutenance SewIvoire.
   Palette navy + or + crème (branding réel de l'app). Gros texte pour projection.
   Les captures du dossier ./captures sont insérées si présentes, sinon un cadre
   "capture à insérer" est dessiné — le script marche avant ET après le dépôt. */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const CAP = path.join(__dirname, "captures");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";          // 13.33" x 7.5"
pres.author = "SewIvoire";
pres.title = "SewIvoire — Soutenance";
const W = 13.33, H = 7.5;

// ---- Palette -------------------------------------------------------------
const NAVY = "15203B", NAVY2 = "243150", GOLD = "C9A227", GOLD_L = "E6CC73";
const CREAM = "FAF6EE", WHITE = "FFFFFF", INK = "26272B", GRAY = "6E6E73";
const CREAM2 = "F2EADb";

const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 90, opacity: 0.16 });

// ---- Helpers -------------------------------------------------------------
let pageNo = 0;
function contentBg(slide, title, kicker) {
  slide.background = { color: CREAM };
  pageNo++;
  if (kicker) {
    slide.addShape(pres.shapes.OVAL, { x: 0.7, y: 0.62, w: 0.22, h: 0.22, fill: { color: GOLD } });
    slide.addText(kicker.toUpperCase(), { x: 1.0, y: 0.55, w: 9, h: 0.35, fontFace: "Calibri",
      fontSize: 14, bold: true, color: GOLD, charSpacing: 2, margin: 0, valign: "middle" });
  }
  slide.addText(title, { x: 0.68, y: kicker ? 0.95 : 0.7, w: 12, h: 0.95, fontFace: "Cambria",
    fontSize: 34, bold: true, color: NAVY, margin: 0 });
  // footer
  slide.addText("SewIvoire", { x: 0.7, y: H - 0.5, w: 4, h: 0.3, fontSize: 11, bold: true,
    color: GOLD, margin: 0, valign: "middle" });
  slide.addText(`sewivoire.olt.ci   ·   ${String(pageNo).padStart(2, "0")}`, { x: W - 4.7, y: H - 0.5,
    w: 4, h: 0.3, fontSize: 11, color: GRAY, align: "right", margin: 0, valign: "middle" });
}

function card(slide, x, y, w, h, fill = WHITE) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill },
    rectRadius: 0.08, shadow: shadow() });
}

function numBadge(slide, x, y, n) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.62, h: 0.62, fill: { color: NAVY } });
  slide.addText(String(n), { x, y, w: 0.62, h: 0.62, align: "center", valign: "middle",
    fontFace: "Cambria", fontSize: 22, bold: true, color: GOLD, margin: 0 });
}

// Insère une capture (ou un cadre placeholder) dans un cadre arrondi.
function shot(slide, file, x, y, w, h, label) {
  card(slide, x, y, w, h, WHITE);
  const p = path.join(CAP, file);
  const pad = 0.12;
  if (fs.existsSync(p)) {
    slide.addImage({ path: p, x: x + pad, y: y + pad, w: w - 2 * pad, h: h - 2 * pad,
      sizing: { type: "contain", w: w - 2 * pad, h: h - 2 * pad } });
  } else {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + pad, y: y + pad, w: w - 2 * pad,
      h: h - 2 * pad, fill: { color: CREAM2 }, line: { color: GOLD_L, width: 1.25, dashType: "dash" }, rectRadius: 0.05 });
    slide.addText([
      { text: "📷  Capture à insérer", options: { bold: true, fontSize: 16, color: "9B8A5E", breakLine: true } },
      { text: file, options: { fontSize: 12, color: "B3A678" } },
      { text: label ? "\n" + label : "", options: { fontSize: 11, italic: true, color: "B3A678" } },
    ], { x: x + pad, y: y + pad, w: w - 2 * pad, h: h - 2 * pad, align: "center", valign: "middle" });
  }
}

// ============================================================ SLIDE 1 — TITRE
(() => {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.shapes.OVAL, { x: 10.4, y: -2.1, w: 5.2, h: 5.2, fill: { color: NAVY2 } });
  s.addShape(pres.shapes.OVAL, { x: 11.6, y: 4.7, w: 3.4, h: 3.4, fill: { color: NAVY2 } });
  s.addText([
    { text: "Sew", options: { color: GOLD } },
    { text: "Ivoire", options: { color: WHITE } },
  ], { x: 0.9, y: 1.7, w: 11, h: 1.5, fontFace: "Cambria", fontSize: 72, bold: true, margin: 0 });
  s.addText("Plateforme web de gestion d'atelier de couture sur-mesure",
    { x: 0.95, y: 3.25, w: 10.5, h: 0.9, fontFace: "Calibri", fontSize: 26, color: "D7DEEC", margin: 0 });
  s.addShape(pres.shapes.LINE, { x: 1.0, y: 4.35, w: 3.0, h: 0, line: { color: GOLD, width: 2.5 } });
  s.addText([
    { text: "Soutenance de projet de fin de cycle", options: { fontSize: 18, color: WHITE, breakLine: true, bold: true } },
    { text: "Application full-stack  ·  Django REST + React  ·  déployée en ligne", options: { fontSize: 15, color: "AEB8CE" } },
  ], { x: 1.0, y: 4.55, w: 11, h: 1.0, fontFace: "Calibri", margin: 0, lineSpacingMultiple: 1.1 });
  s.addText([
    { text: "Présenté par : ", options: { color: "AEB8CE" } },
    { text: "[ Votre Nom ]", options: { color: GOLD_L, bold: true } },
    { text: "      Encadreur : ", options: { color: "AEB8CE" } },
    { text: "[ Nom de l'encadreur ]", options: { color: GOLD_L, bold: true } },
  ], { x: 1.0, y: 6.25, w: 11.5, h: 0.4, fontFace: "Calibri", fontSize: 14, margin: 0 });
  s.addText("Juin 2026", { x: 1.0, y: 6.7, w: 6, h: 0.35, fontFace: "Calibri", fontSize: 14,
    color: "AEB8CE", margin: 0 });
})();

// ============================================================ SLIDE 2 — PLAN
(() => {
  const s = pres.addSlide();
  contentBg(s, "Plan de la présentation", "Sommaire");
  const items = [
    ["1", "Contexte & problématique", "Pourquoi digitaliser l'atelier"],
    ["2", "La solution SewIvoire", "Vue d'ensemble de la plateforme"],
    ["3", "Fonctionnalités clés", "Catalogue, commandes, espace client"],
    ["4", "Architecture technique", "React · API REST Django · MySQL"],
    ["5", "Sécurité & API documentée", "JWT, throttling, Swagger"],
    ["6", "Déploiement & perspectives", "Mise en ligne et évolutions"],
  ];
  const cw = 5.75, ch = 1.45, gx = 0.7, gy = 1.95, mx = 0.6, my = 0.35;
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + mx), y = gy + row * (ch + my);
    card(s, x, y, cw, ch);
    numBadge(s, x + 0.3, y + 0.42, it[0]);
    s.addText(it[1], { x: x + 1.15, y: y + 0.28, w: cw - 1.3, h: 0.5, fontFace: "Cambria",
      fontSize: 19, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(it[2], { x: x + 1.15, y: y + 0.8, w: cw - 1.3, h: 0.45, fontFace: "Calibri",
      fontSize: 14, color: GRAY, margin: 0, valign: "middle" });
  });
})();

// ============================================================ SLIDE 3 — CONTEXTE
(() => {
  const s = pres.addSlide();
  contentBg(s, "Contexte & problématique", "01 · Contexte");
  s.addText([
    { text: "La couture sur-mesure est un secteur clé en Côte d'Ivoire, mais l'atelier reste géré ",
      options: {} },
    { text: "manuellement", options: { bold: true, color: NAVY } },
    { text: " : carnets, appels, mémoire du couturier.", options: {} },
  ], { x: 0.7, y: 1.85, w: 12, h: 0.9, fontFace: "Calibri", fontSize: 19, color: INK, margin: 0,
    lineSpacingMultiple: 1.15 });
  const probs = [
    ["Commandes non tracées", "Pas de suivi clair du statut, des délais ni de l'historique."],
    ["Mesures dispersées", "Prises sur papier, perdues ou recopiées avec des erreurs."],
    ["Paiements & livraisons flous", "Acomptes et soldes difficiles à suivre, livraisons non planifiées."],
    ["Catalogue invisible", "Le client ne voit pas les modèles disponibles avant de se déplacer."],
  ];
  const cw = 5.75, ch = 1.55, gx = 0.7, gy = 2.95, mx = 0.6, my = 0.3;
  probs.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + mx), y = gy + row * (ch + my);
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.32, w: 0.42, h: 0.42, fill: { color: "F4E3C0" } });
    s.addText("!", { x: x + 0.3, y: y + 0.32, w: 0.42, h: 0.42, align: "center", valign: "middle",
      fontFace: "Cambria", fontSize: 20, bold: true, color: GOLD, margin: 0 });
    s.addText(p[0], { x: x + 0.95, y: y + 0.25, w: cw - 1.2, h: 0.5, fontFace: "Cambria",
      fontSize: 17, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(p[1], { x: x + 0.95, y: y + 0.74, w: cw - 1.2, h: 0.65, fontFace: "Calibri",
      fontSize: 13.5, color: GRAY, margin: 0 });
  });
})();

// ============================================================ SLIDE 4 — OBJECTIFS
(() => {
  const s = pres.addSlide();
  contentBg(s, "Objectifs du projet", "01 · Objectifs");
  s.addText("Une plateforme unique reliant le client et l'atelier, du catalogue à la livraison.",
    { x: 0.7, y: 1.8, w: 12, h: 0.6, fontFace: "Calibri", fontSize: 19, italic: true, color: NAVY, margin: 0 });
  const objs = [
    ["Digitaliser le catalogue", "Présenter les modèles, prix et délais en ligne, accessibles 24h/24."],
    ["Gérer les commandes sur-mesure", "De la prise de mesures à la confection, avec suivi de statut."],
    ["Tracer paiements & livraisons", "Acomptes, soldes, affectation des livreurs et suivi de tournée."],
    ["Connecter clients & atelier", "Messagerie, notifications, avis et devis personnalisés."],
  ];
  const cw = 5.75, ch = 1.7, gx = 0.7, gy = 2.65, mx = 0.6, my = 0.3;
  objs.forEach((o, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + mx), y = gy + row * (ch + my);
    card(s, x, y, cw, ch);
    numBadge(s, x + 0.32, y + 0.55, i + 1);
    s.addText(o[0], { x: x + 1.2, y: y + 0.3, w: cw - 1.45, h: 0.55, fontFace: "Cambria",
      fontSize: 18, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(o[1], { x: x + 1.2, y: y + 0.85, w: cw - 1.45, h: 0.7, fontFace: "Calibri",
      fontSize: 14, color: GRAY, margin: 0 });
  });
})();

// ============================================================ SLIDE 5 — SOLUTION (accueil)
(() => {
  const s = pres.addSlide();
  contentBg(s, "SewIvoire en un coup d'œil", "02 · La solution");
  s.addText([
    { text: "Un site web public ", options: {} },
    { text: "+ ", options: { color: GOLD, bold: true } },
    { text: "une API sécurisée", options: { bold: true, color: NAVY } },
  ], { x: 0.7, y: 1.9, w: 5.4, h: 0.6, fontFace: "Calibri", fontSize: 20, color: INK, margin: 0 });
  s.addText([
    { text: "Catalogue de modèles en ligne", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Commande sur-mesure guidée", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Espace client personnel", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Suivi des commandes en temps réel", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Paiements, livraisons & avis", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: 0.8, y: 2.65, w: 5.3, h: 3.2, fontFace: "Calibri", fontSize: 17, color: INK,
    paraSpaceAfter: 12, margin: 0 });
  s.addText("En ligne sur sewivoire.olt.ci", { x: 0.8, y: 6.05, w: 5.3, h: 0.5, fontFace: "Calibri",
    fontSize: 14, bold: true, color: GOLD, margin: 0 });
  shot(s, "01-accueil.png", 6.5, 1.85, 6.2, 4.9, "Page d'accueil");
})();

// ============================================================ SLIDE 6 — FONCTION : CATALOGUE
(() => {
  const s = pres.addSlide();
  contentBg(s, "Catalogue de modèles", "03 · Fonctionnalités");
  shot(s, "02-catalogue.png", 0.7, 1.85, 7.1, 4.9, "Catalogue des modèles");
  const x = 8.1, w = 4.5;
  s.addText("Parcourir & filtrer", { x, y: 2.0, w, h: 0.5, fontFace: "Cambria", fontSize: 20,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Modèles classés par catégorie", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Prix et délai de confection affichés", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Recherche et tri", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Ajout aux favoris", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Fiche détaillée par modèle", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: x + 0.05, y: 2.65, w: w - 0.1, h: 3.0, fontFace: "Calibri", fontSize: 16, color: INK,
    paraSpaceAfter: 12, margin: 0 });
})();

// ============================================================ SLIDE 7 — FONCTION : COMMANDE/MESURES
(() => {
  const s = pres.addSlide();
  contentBg(s, "Commande sur-mesure & mesures", "03 · Fonctionnalités");
  const x = 0.7, w = 4.6;
  s.addText("Du modèle à la confection", { x, y: 2.0, w, h: 0.5, fontFace: "Cambria", fontSize: 20,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Saisie des mesures du client", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Choix du modèle et du tissu", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Devis personnalisé par le couturier", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Application de codes promo", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Affectation à un couturier", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: x + 0.05, y: 2.65, w: w - 0.1, h: 3.0, fontFace: "Calibri", fontSize: 16, color: INK,
    paraSpaceAfter: 12, margin: 0 });
  shot(s, "03-modele.png", 5.6, 1.85, 7.05, 4.9, "Fiche modèle / commande");
})();

// ============================================================ SLIDE 8 — COMMANDES / WORKFLOW
(() => {
  const s = pres.addSlide();
  contentBg(s, "Gestion & suivi des commandes", "03 · Fonctionnalités");
  // Workflow horizontal
  const steps = ["En attente", "Confirmée", "En cours", "Livrée"];
  const sw = 2.55, sh = 0.95, sy = 1.95, sx0 = 0.7, gap = 0.45;
  steps.forEach((st, i) => {
    const x = sx0 + i * (sw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: sy, w: sw, h: sh,
      fill: { color: i === 3 ? NAVY : WHITE }, rectRadius: 0.08, shadow: shadow() });
    s.addText(st, { x, y: sy, w: sw, h: sh, align: "center", valign: "middle", fontFace: "Cambria",
      fontSize: 17, bold: true, color: i === 3 ? GOLD_L : NAVY, margin: 0 });
    if (i < 3) s.addText("→", { x: x + sw, y: sy, w: gap, h: sh, align: "center", valign: "middle",
      fontFace: "Calibri", fontSize: 24, bold: true, color: GOLD, margin: 0 });
  });
  shot(s, "07-commandes.png", 0.7, 3.25, 7.1, 3.5, "Mes commandes");
  const x = 8.1, w = 4.5;
  s.addText("Suivi de bout en bout", { x, y: 3.35, w, h: 0.5, fontFace: "Cambria", fontSize: 19,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Statut mis à jour à chaque étape", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Paiement : acompte puis solde", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Sortie de stock automatique", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Livraison planifiée & assignée", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: x + 0.05, y: 3.95, w: w - 0.1, h: 2.6, fontFace: "Calibri", fontSize: 15, color: INK,
    paraSpaceAfter: 10, margin: 0 });
})();

// ============================================================ SLIDE 9 — ESPACE CLIENT (profil)
(() => {
  const s = pres.addSlide();
  contentBg(s, "Espace client", "03 · Fonctionnalités");
  const x = 0.7, w = 4.6;
  s.addText("Tableau de bord personnel", { x, y: 2.0, w, h: 0.5, fontFace: "Cambria", fontSize: 20,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Profil et coordonnées", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Compteurs de commandes par statut", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Historique et favoris", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Avis après livraison", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Changement de mot de passe", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: x + 0.05, y: 2.65, w: w - 0.1, h: 3.0, fontFace: "Calibri", fontSize: 16, color: INK,
    paraSpaceAfter: 12, margin: 0 });
  shot(s, "06-profil.png", 5.6, 1.85, 7.05, 4.9, "Profil client");
})();

// ============================================================ SLIDE 10 — AUTHENTIFICATION
(() => {
  const s = pres.addSlide();
  contentBg(s, "Inscription & connexion sécurisées", "03 · Fonctionnalités");
  s.addText([
    { text: "Authentification par jetons ", options: {} },
    { text: "JWT", options: { bold: true, color: NAVY } },
    { text: " : access + refresh, rotation et liste de révocation.", options: {} },
  ], { x: 0.7, y: 1.8, w: 12, h: 0.6, fontFace: "Calibri", fontSize: 18, color: INK, margin: 0 });
  shot(s, "04-inscription.png", 0.7, 2.5, 6.0, 4.25, "Inscription");
  shot(s, "05-connexion.png", 6.95, 2.5, 5.65, 4.25, "Connexion");
})();

// ============================================================ SLIDE 11 — ARCHITECTURE
(() => {
  const s = pres.addSlide();
  contentBg(s, "Architecture technique", "04 · Technique");
  s.addText("Une application full-stack découplée : front React, back API REST Django, base MySQL.",
    { x: 0.7, y: 1.8, w: 12, h: 0.6, fontFace: "Calibri", fontSize: 18, italic: true, color: NAVY, margin: 0 });
  const boxes = [
    ["Navigateur", "Client web\n(SPA React)", "F4E3C0"],
    ["Frontend", "React + Vite\nservi en statique", WHITE],
    ["API REST", "Django + DRF\nJWT · endpoints", WHITE],
    ["Base de données", "MySQL\n18 tables", WHITE],
  ];
  const bw = 2.6, bh = 1.85, by = 3.05, bx0 = 0.7, gap = 0.5;
  boxes.forEach((b, i) => {
    const x = bx0 + i * (bw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: by, w: bw, h: bh,
      fill: { color: b[2] }, rectRadius: 0.09, shadow: shadow() });
    s.addText(b[0], { x, y: by + 0.25, w: bw, h: 0.5, align: "center", fontFace: "Cambria",
      fontSize: 18, bold: true, color: NAVY, margin: 0 });
    s.addText(b[1], { x: x + 0.15, y: by + 0.8, w: bw - 0.3, h: 0.9, align: "center",
      fontFace: "Calibri", fontSize: 14, color: GRAY, margin: 0 });
    if (i < 3) s.addText("→", { x: x + bw, y: by, w: gap, h: bh, align: "center", valign: "middle",
      fontFace: "Calibri", fontSize: 26, bold: true, color: GOLD, margin: 0 });
  });
  // bandeau hébergement
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 5.35, w: 11.95, h: 1.15,
    fill: { color: NAVY }, rectRadius: 0.08 });
  s.addText([
    { text: "Hébergement  ", options: { bold: true, color: GOLD_L } },
    { text: "O2Switch (cPanel + Passenger)   ·   HTTPS/SSL   ·   fichiers statiques via WhiteNoise   ·   déploiement par Git",
      options: { color: "DCE3F0" } },
  ], { x: 1.0, y: 5.35, w: 11.4, h: 1.15, valign: "middle", fontFace: "Calibri", fontSize: 15, margin: 0 });
})();

// ============================================================ SLIDE 12 — STACK
(() => {
  const s = pres.addSlide();
  contentBg(s, "Stack technologique", "04 · Technique");
  const stack = [
    ["Frontend", "React · Vite", "Single-Page App, routage côté client, appels API en Axios."],
    ["Backend", "Django 6 · DRF", "API REST, sérialiseurs, permissions par rôle, pagination."],
    ["Base de données", "MySQL", "18 tables relationnelles, intégrité référentielle."],
    ["Authentification", "JWT (SimpleJWT)", "Jetons access/refresh, rotation, blacklist."],
    ["Documentation", "drf-spectacular", "Schéma OpenAPI et interface Swagger interactive."],
    ["Déploiement", "O2Switch · Git", "Passenger, WhiteNoise, HTTPS, mises à jour par push."],
  ];
  const cw = 3.85, ch = 1.95, gx = 0.7, gy = 1.95, mx = 0.3, my = 0.3;
  stack.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = gx + col * (cw + mx), y = gy + row * (ch + my);
    card(s, x, y, cw, ch);
    s.addText(t[0].toUpperCase(), { x: x + 0.3, y: y + 0.25, w: cw - 0.6, h: 0.35, fontFace: "Calibri",
      fontSize: 12, bold: true, color: GOLD, charSpacing: 1, margin: 0 });
    s.addText(t[1], { x: x + 0.3, y: y + 0.58, w: cw - 0.6, h: 0.55, fontFace: "Cambria",
      fontSize: 19, bold: true, color: NAVY, margin: 0 });
    s.addText(t[2], { x: x + 0.3, y: y + 1.15, w: cw - 0.55, h: 0.7, fontFace: "Calibri",
      fontSize: 13, color: GRAY, margin: 0 });
  });
})();

// ============================================================ SLIDE 13 — MODÈLE DE DONNÉES
(() => {
  const s = pres.addSlide();
  contentBg(s, "Modèle de données — 18 entités", "04 · Technique");
  const groups = [
    ["Utilisateurs & rôles", "Utilisateur (Client · Couturier · Livreur), Livreur"],
    ["Catalogue", "Catégorie, Modèle, Matériau, Consommation"],
    ["Commandes", "Commande, Mesure, Paiement, Livraison"],
    ["Devis & promotions", "Devis, Code promo"],
    ["Communication", "Message, Notification, Avis, Favoris"],
    ["Stock & atelier", "Mouvement de stock, Paramètres atelier"],
  ];
  const cw = 5.75, ch = 1.45, gx = 0.7, gy = 1.95, mx = 0.6, my = 0.3;
  groups.forEach((g, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + mx), y = gy + row * (ch + my);
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.OVAL, { x: x + 0.28, y: y + 0.5, w: 0.45, h: 0.45, fill: { color: NAVY } });
    s.addText(String(i + 1), { x: x + 0.28, y: y + 0.5, w: 0.45, h: 0.45, align: "center",
      valign: "middle", fontFace: "Cambria", fontSize: 16, bold: true, color: GOLD, margin: 0 });
    s.addText(g[0], { x: x + 0.95, y: y + 0.28, w: cw - 1.2, h: 0.5, fontFace: "Cambria",
      fontSize: 17, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(g[1], { x: x + 0.95, y: y + 0.76, w: cw - 1.2, h: 0.6, fontFace: "Calibri",
      fontSize: 13, color: GRAY, margin: 0 });
  });
})();

// ============================================================ SLIDE 14 — SÉCURITÉ
(() => {
  const s = pres.addSlide();
  contentBg(s, "Sécurité de l'application", "05 · Sécurité");
  const sec = [
    ["Authentification JWT", "Jetons access/refresh signés, rotation et blacklist à la déconnexion."],
    ["Limitation de débit", "Throttling : 5 tentatives de connexion/minute, quotas par utilisateur."],
    ["Permissions par rôle", "Accès différencié Client / Couturier / Livreur / Admin."],
    ["CORS & HTTPS", "Origines de confiance, tout le trafic chiffré en SSL."],
    ["Validation des données", "Contrôles serveur sur mesures, paiements et saisies."],
    ["Mots de passe", "Hachés (jamais stockés en clair), règles de robustesse."],
  ];
  const cw = 5.75, ch = 1.45, gx = 0.7, gy = 1.95, mx = 0.6, my = 0.3;
  sec.forEach((p, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + mx), y = gy + row * (ch + my);
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.OVAL, { x: x + 0.28, y: y + 0.5, w: 0.45, h: 0.45, fill: { color: "F4E3C0" } });
    s.addText("✓", { x: x + 0.28, y: y + 0.5, w: 0.45, h: 0.45, align: "center", valign: "middle",
      fontFace: "Calibri", fontSize: 18, bold: true, color: GOLD, margin: 0 });
    s.addText(p[0], { x: x + 0.95, y: y + 0.26, w: cw - 1.2, h: 0.5, fontFace: "Cambria",
      fontSize: 16.5, bold: true, color: NAVY, margin: 0, valign: "middle" });
    s.addText(p[1], { x: x + 0.95, y: y + 0.74, w: cw - 1.2, h: 0.62, fontFace: "Calibri",
      fontSize: 13, color: GRAY, margin: 0 });
  });
})();

// ============================================================ SLIDE 15 — API DOCUMENTÉE
(() => {
  const s = pres.addSlide();
  contentBg(s, "API REST documentée", "05 · API");
  const x = 0.7, w = 4.6;
  s.addText("Auto-documentée", { x, y: 2.0, w, h: 0.5, fontFace: "Cambria", fontSize: 20,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Schéma OpenAPI généré automatiquement", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Interface Swagger interactive", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Endpoints testables en direct", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Filtres, recherche et pagination", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: x + 0.05, y: 2.65, w: w - 0.1, h: 2.6, fontFace: "Calibri", fontSize: 16, color: INK,
    paraSpaceAfter: 12, margin: 0 });
  s.addText("/api/docs/", { x: x + 0.05, y: 5.55, w, h: 0.5, fontFace: "Courier New", fontSize: 16,
    bold: true, color: GOLD, margin: 0 });
  shot(s, "08-api-docs.png", 5.6, 1.85, 7.05, 4.9, "Documentation Swagger");
})();

// ============================================================ SLIDE 16 — ADMINISTRATION
(() => {
  const s = pres.addSlide();
  contentBg(s, "Interface d'administration", "05 · Back-office");
  shot(s, "09-admin.png", 0.7, 1.85, 7.1, 4.9, "Admin Django");
  const x = 8.1, w = 4.5;
  s.addText("Pilotage de l'atelier", { x, y: 2.0, w, h: 0.5, fontFace: "Cambria", fontSize: 20,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Gestion des modèles & catégories", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Suivi des commandes et paiements", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Gestion du stock de matériaux", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Utilisateurs, livreurs & devis", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Codes promo & paramètres", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: x + 0.05, y: 2.65, w: w - 0.1, h: 3.0, fontFace: "Calibri", fontSize: 16, color: INK,
    paraSpaceAfter: 12, margin: 0 });
})();

// ============================================================ SLIDE 17 — DÉPLOIEMENT & CHIFFRES
(() => {
  const s = pres.addSlide();
  contentBg(s, "Déploiement & chiffres clés", "06 · Déploiement");
  const stats = [["18", "tables métier"], ["4", "rôles utilisateurs"], ["9", "modules fonctionnels"], ["100%", "en ligne · HTTPS"]];
  const cw = 2.85, ch = 1.7, gx = 0.7, gy = 1.95, mx = 0.32;
  stats.forEach((st, i) => {
    const x = gx + i * (cw + mx);
    card(s, x, gy, cw, ch);
    s.addText(st[0], { x, y: gy + 0.2, w: cw, h: 0.85, align: "center", fontFace: "Cambria",
      fontSize: 46, bold: true, color: GOLD, margin: 0 });
    s.addText(st[1], { x, y: gy + 1.05, w: cw, h: 0.5, align: "center", fontFace: "Calibri",
      fontSize: 15, color: NAVY, bold: true, margin: 0 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 4.0, w: 11.95, h: 2.45, fill: { color: WHITE },
    rectRadius: 0.08, shadow: shadow() });
  s.addText("Mise en production", { x: 1.0, y: 4.2, w: 11, h: 0.5, fontFace: "Cambria", fontSize: 19,
    bold: true, color: NAVY, margin: 0 });
  s.addText([
    { text: "Hébergement mutualisé O2Switch (cPanel) avec serveur Passenger", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Frontend React et API Django servis sur un même domaine sécurisé", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Fichiers statiques optimisés via WhiteNoise, base MySQL en production", options: { bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "Déploiement et mises à jour par dépôt Git", options: { bullet: { code: "2022", indent: 18 } } },
  ], { x: 1.05, y: 4.7, w: 11.2, h: 1.6, fontFace: "Calibri", fontSize: 15, color: INK,
    paraSpaceAfter: 8, margin: 0 });
})();

// ============================================================ SLIDE 18 — PERSPECTIVES & CONCLUSION
(() => {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.shapes.OVAL, { x: -1.7, y: 5.0, w: 4.6, h: 4.6, fill: { color: NAVY2 } });
  s.addShape(pres.shapes.OVAL, { x: 11.3, y: -1.8, w: 4.2, h: 4.2, fill: { color: NAVY2 } });
  s.addText("Perspectives & conclusion", { x: 0.9, y: 0.7, w: 11.5, h: 0.9, fontFace: "Cambria",
    fontSize: 36, bold: true, color: WHITE, margin: 0 });
  s.addShape(pres.shapes.LINE, { x: 0.95, y: 1.7, w: 2.6, h: 0, line: { color: GOLD, width: 2.5 } });
  s.addText("Évolutions envisagées", { x: 0.95, y: 2.0, w: 11, h: 0.5, fontFace: "Cambria",
    fontSize: 20, bold: true, color: GOLD_L, margin: 0 });
  s.addText([
    { text: "Paiement Mobile Money intégré en ligne (Orange, MTN, Wave)", options: { bullet: { code: "2022", indent: 18 }, breakLine: true, color: "DCE3F0" } },
    { text: "Application mobile pour les clients et livreurs", options: { bullet: { code: "2022", indent: 18 }, breakLine: true, color: "DCE3F0" } },
    { text: "Notifications en temps réel et tableau de bord statistique", options: { bullet: { code: "2022", indent: 18 }, color: "DCE3F0" } },
  ], { x: 1.0, y: 2.55, w: 11.4, h: 1.7, fontFace: "Calibri", fontSize: 16, paraSpaceAfter: 9, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.9, y: 4.55, w: 11.55, h: 1.55, fill: { color: NAVY2 },
    rectRadius: 0.08 });
  s.addText([
    { text: "En conclusion  ", options: { bold: true, color: GOLD_L } },
    { text: "SewIvoire digitalise tout le cycle de l'atelier — du catalogue à la livraison — dans une application full-stack sécurisée et déjà en ligne.",
      options: { color: WHITE } },
  ], { x: 1.25, y: 4.55, w: 10.9, h: 1.55, valign: "middle", fontFace: "Calibri", fontSize: 17,
    margin: 0, lineSpacingMultiple: 1.12 });
  s.addText("Merci de votre attention", { x: 0.9, y: 6.4, w: 8, h: 0.6, fontFace: "Cambria",
    fontSize: 24, bold: true, color: WHITE, margin: 0 });
  s.addText("sewivoire.olt.ci", { x: 8.0, y: 6.5, w: 4.45, h: 0.5, align: "right", fontFace: "Calibri",
    fontSize: 16, bold: true, color: GOLD, margin: 0 });
})();

pres.writeFile({ fileName: "SewIvoire-Soutenance.pptx" }).then(f => console.log("OK ->", f));
