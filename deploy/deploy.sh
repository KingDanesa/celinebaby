#!/usr/bin/env bash
# Update the site to the latest code from GitHub: install, migrate, build, restart.
# Run as root or as celine:  celinebaby-deploy
set -euo pipefail
APP_DIR=/srv/celinebaby

if [ "$(id -un)" != "celine" ]; then
  exec sudo -u celine -H "$0" "$@"
fi

cd "$APP_DIR"
set -a; . /etc/celinebaby/env; set +a

echo "==> git pull"
git pull --ff-only

echo "==> npm ci"
NODE_ENV=development npm ci --no-audit --no-fund

echo "==> database"
node scripts/db-migrate.mjs

echo "==> build"
NODE_OPTIONS=--max-old-space-size=2048 npm run build

echo "==> restart"
sudo /bin/systemctl restart celinebaby.service
sleep 4
curl -fsS -o /dev/null -w "site answers: HTTP %{http_code}\n" http://127.0.0.1:3000/ru
