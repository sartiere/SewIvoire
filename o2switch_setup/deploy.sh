#!/bin/bash
DEPLOY_PATH="/home3/sc1zds18/Sewivoire"
PYTHON_BIN="/home3/sc1zds18/virtualenv/sewivoire/SewIvoire/3.12/bin/python"
DJANGO_DIR="$DEPLOY_PATH/SewIvoire/SewIvoire"

set -e

echo "──────────────────────────────────────────"
echo "  SewIvoire — Déploiement $(date '+%d/%m/%Y %H:%M')"
echo "──────────────────────────────────────────"

echo "→ Mise à jour du code (branche deploy)…"
cd "$DEPLOY_PATH"
git pull origin deploy

echo "→ Installation des dépendances Python…"
"$PYTHON_BIN" -m pip install -r "$DJANGO_DIR/requirements.txt" --quiet

echo "→ Migrations base de données…"
cd "$DJANGO_DIR"
"$PYTHON_BIN" manage.py migrate --no-input

echo "→ Fichiers statiques…"
"$PYTHON_BIN" manage.py collectstatic --no-input --clear

echo "→ Redémarrage de l'application (Passenger)…"
mkdir -p "$DJANGO_DIR/tmp"
touch "$DJANGO_DIR/tmp/restart.txt"

echo "✅ Déploiement terminé"
