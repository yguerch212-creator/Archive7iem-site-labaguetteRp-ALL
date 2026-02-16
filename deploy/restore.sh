#!/bin/bash
# ============================================================
# Archives 7e Armeekorps — Restauration d'une sauvegarde DB
# Usage: ./restore.sh [fichier_backup.sql.gz]
# ============================================================
set -e

DB_CONTAINER="archives-mysql"
DB_NAME="archives7e"
DB_USER="archives_user"
DB_PASS="Archives7ePass2025!"
BACKUP_DIR="/opt/archives7e/backups"

# Select backup file
if [ -n "$1" ]; then
  BACKUP_FILE="$1"
else
  echo "Sauvegardes disponibles:"
  echo "========================"
  ls -lh "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | awk '{print NR")", $NF, $5}'
  echo ""
  read -p "Numéro du fichier à restaurer (ou chemin complet): " CHOICE
  if [[ "$CHOICE" =~ ^[0-9]+$ ]]; then
    BACKUP_FILE=$(ls "$BACKUP_DIR"/db_*.sql.gz | sed -n "${CHOICE}p")
  else
    BACKUP_FILE="$CHOICE"
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERREUR: Fichier introuvable: $BACKUP_FILE"
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "⚠️  ATTENTION: Cette opération va REMPLACER toute la base de données !"
echo "Fichier: $BACKUP_FILE ($SIZE)"
echo ""
read -p "Confirmer la restauration ? (oui/non): " CONFIRM
if [ "$CONFIRM" != "oui" ]; then
  echo "Annulé."
  exit 0
fi

echo "[$(date)] Restauration en cours..."

# Stop the app
pm2 stop archives7e-prod 2>/dev/null || true

# Restore
zcat "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>/dev/null

# Restart the app
pm2 start archives7e-prod 2>/dev/null || true

echo "[$(date)] ✅ Restauration terminée depuis: $BACKUP_FILE"
echo "Le site a été redémarré."
