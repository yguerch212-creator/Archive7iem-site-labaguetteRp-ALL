#!/bin/bash
# ============================================================
# Archives 7e Armeekorps — Sauvegarde automatique de la DB
# Exécuté par cron quotidiennement
# ============================================================
set -e

# Config
BACKUP_DIR="/opt/archives7e/backups"
DB_CONTAINER="archives-mysql"
DB_NAME="archives7e"
DB_USER="archives_user"
DB_PASS="Archives7ePass2025!"
KEEP_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/db_${DATE}.sql.gz"

# GitHub backup repo (optional — set to enable cloud push)
GITHUB_BACKUP_REPO="${GITHUB_BACKUP_REPO:-}"

# ============================================================
echo "[$(date)] Démarrage sauvegarde..."

# Create backup dir
mkdir -p "$BACKUP_DIR"

# Dump MySQL + compress
docker exec "$DB_CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASS" \
  --single-transaction --routines --triggers --events \
  "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Dump créé: $BACKUP_FILE ($SIZE)"

# Verify backup is not empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[$(date)] ERREUR: Le dump est vide !"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Clean old backups (keep KEEP_DAYS days)
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$KEEP_DAYS -delete
REMAINING=$(ls "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Nettoyage: $REMAINING sauvegardes conservées (max $KEEP_DAYS jours)"

# Push to GitHub backup repo (if configured)
if [ -n "$GITHUB_BACKUP_REPO" ] && [ -d "$BACKUP_DIR/.git" ]; then
  cd "$BACKUP_DIR"
  git add -A
  git commit -m "backup: $DATE ($SIZE)" 2>/dev/null || true
  git push origin main 2>/dev/null && echo "[$(date)] Poussé vers GitHub" || echo "[$(date)] WARN: Push GitHub échoué"
fi

# Log
echo "[$(date)] ✅ Sauvegarde terminée: $BACKUP_FILE ($SIZE)"
echo "$DATE $SIZE" >> "$BACKUP_DIR/backup.log"
