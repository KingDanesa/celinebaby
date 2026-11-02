#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server (hoster.kz Cloud VPS) for celinebaby.kz.
# Run as root:  bash setup-server.sh <git-repo-url> [preview-host]
#   git-repo-url  e.g. git@github.com:KingDanesa/celinebaby.git
#   preview-host  optional temporary address for testing before the domain switch,
#                 default: celinebaby.<server-ip-with-dashes>.sslip.io (works with a real HTTPS certificate)
set -euo pipefail

REPO="${1:?usage: setup-server.sh <git-repo-url> [preview-host]}"
APP_DIR=/srv/celinebaby
MEDIA_DIR=/srv/celinebaby-media
BACKUP_DIR=/var/backups/celinebaby
ENV_FILE=/etc/celinebaby/env
IP="$(curl -4 -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
PREVIEW_HOST="${2:-celinebaby.${IP//./-}.sslip.io}"

say() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-32}"; }

say "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw unattended-upgrades rsync python3
timedatectl set-timezone Asia/Almaty || true

say "Node.js 24 LTS"
if ! command -v node >/dev/null || ! node -v | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v

say "Swap (keeps builds alive on a 4 GB server)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

say "Service user and folders"
id celine >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/celine --shell /bin/bash celine
mkdir -p "$APP_DIR" "$MEDIA_DIR/image" "$MEDIA_DIR/uploads" "$BACKUP_DIR" /etc/celinebaby /var/www/certbot
chown -R celine:celine "$APP_DIR" "$MEDIA_DIR" "$BACKUP_DIR"

say "PostgreSQL database (UTF-8)"
DB_PASS="$(rand 32)"
if ! sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='celinebaby'" | grep -q 1; then
  sudo -u postgres psql -c "create user celinebaby with password '$DB_PASS';"
  sudo -u postgres createdb -O celinebaby -E UTF8 -T template0 --locale=C.UTF-8 celinebaby
  NEW_DB=1
else
  NEW_DB=0
fi

say "Settings file $ENV_FILE"
if [ ! -f "$ENV_FILE" ]; then
  [ "$NEW_DB" = 1 ] || { echo "Database user exists but $ENV_FILE is missing: set DATABASE_URL by hand"; DB_PASS=CHANGE_ME; }
  ADMIN_PASSWORD="$(rand 14)"
  cat > "$ENV_FILE" <<EOF
SITE_URL=https://$PREVIEW_HOST
NEXT_PUBLIC_SITE_URL=https://$PREVIEW_HOST
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgres://celinebaby:$DB_PASS@127.0.0.1:5432/celinebaby
MEDIA_DIR=$MEDIA_DIR
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_SECRET=$(rand 48)
CRON_SECRET=$(rand 40)
HALYK_TEST=1
HALYK_CLIENT_ID=test
HALYK_CLIENT_SECRET=yF587AV9Ms94qN2QShFzVR3vFnWkhjbAK3sG
HALYK_TERMINAL=67e34d63-102f-4bd1-898e-370781d0074d
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
RESEND_API_KEY=
EMAIL_FROM="Celine Baby <orders@celinebaby.kz>"
ORDER_NOTIFY_EMAIL=celinebabykazakhstan@gmail.com
EOF
  chown root:celine "$ENV_FILE"
  chmod 640 "$ENV_FILE"
  echo "Admin password: $ADMIN_PASSWORD   (also in $ENV_FILE)"
fi

say "Deploy key for GitHub"
if [ ! -f /home/celine/.ssh/id_ed25519 ]; then
  sudo -u celine mkdir -p /home/celine/.ssh
  sudo -u celine ssh-keygen -t ed25519 -N "" -C "celinebaby-server" -f /home/celine/.ssh/id_ed25519 >/dev/null
  sudo -u celine bash -c 'ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null'
fi
echo "Add this key in GitHub → repository → Settings → Deploy keys (read-only):"
cat /home/celine/.ssh/id_ed25519.pub

say "Nginx"
SRC="$(cd "$(dirname "$0")" && pwd)"
sed -e "s#__HOSTS__#$PREVIEW_HOST#g" -e "s#__MEDIA__#$MEDIA_DIR#g" "$SRC/nginx/celinebaby.conf" > /etc/nginx/sites-available/celinebaby.conf
ln -sf /etc/nginx/sites-available/celinebaby.conf /etc/nginx/sites-enabled/celinebaby.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

say "systemd units"
cp "$SRC"/systemd/*.service "$SRC"/systemd/*.timer /etc/systemd/system/
install -m 755 "$SRC/backup.sh" /usr/local/bin/celinebaby-backup
install -m 755 "$SRC/deploy.sh" /usr/local/bin/celinebaby-deploy
install -m 755 "$SRC/switch-domain.sh" /usr/local/bin/celinebaby-switch-domain
install -m 755 "$SRC/admin.sh" /usr/local/bin/celinebaby-admin
echo 'celine ALL=(root) NOPASSWD: /bin/systemctl restart celinebaby.service' > /etc/sudoers.d/celinebaby
chmod 440 /etc/sudoers.d/celinebaby
systemctl daemon-reload
systemctl enable celinebaby.service
systemctl enable --now celinebaby-reconcile.timer celinebaby-backup.timer

say "HTTPS certificate for the preview address"
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$PREVIEW_HOST" || echo "certbot failed: run it again once the server answers on $PREVIEW_HOST"

cat <<EOF

Done. Next steps:
  1. Add the deploy key above to GitHub (Settings → Deploy keys).
  2. sudo -u celine git clone $REPO $APP_DIR
  3. celinebaby-deploy            # installs, builds and starts the site
  4. Load the catalogue: see deploy/README.md, "Перенос данных".
  Preview: https://$PREVIEW_HOST
EOF
