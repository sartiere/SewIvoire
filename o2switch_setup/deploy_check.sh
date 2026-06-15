#!/bin/bash
DEPLOY_PATH="/home3/sc1zds18/Sewivoire"
DEPLOY_SCRIPT="/home3/sc1zds18/Sewivoire/o2switch_setup/deploy.sh"
LOCKFILE="/home3/sc1zds18/deploy.lock"
LOGFILE="/home3/sc1zds18/deploy.log"

# Empêche deux déploiements simultanés
if [ -f "$LOCKFILE" ]; then
    exit 0
fi
touch "$LOCKFILE"

cd "$DEPLOY_PATH"
git fetch origin deploy --quiet 2>/dev/null

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/deploy 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date '+%d/%m/%Y %H:%M') — Nouveau déploiement détecté…" >> "$LOGFILE"
    bash "$DEPLOY_SCRIPT" >> "$LOGFILE" 2>&1
    echo "$(date '+%d/%m/%Y %H:%M') — Terminé" >> "$LOGFILE"
    echo "──────────────────────────────────────────" >> "$LOGFILE"
fi

rm -f "$LOCKFILE"
