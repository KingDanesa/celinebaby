#!/usr/bin/env bash
# Launch day: after celinebaby.kz and www.celinebaby.kz point to this server (A records),
# issue the HTTPS certificate for the real domain and make it the site's address.
# Run as root:  celinebaby-switch-domain
set -euo pipefail
ENV_FILE=/etc/celinebaby/env
CONF=/etc/nginx/sites-available/celinebaby.conf
IP="$(curl -4 -fsS https://api.ipify.org)"

for h in celinebaby.kz www.celinebaby.kz; do
  got="$(getent ahostsv4 "$h" | awk 'NR==1{print $1}')"
  if [ "$got" != "$IP" ]; then
    echo "$h still points to ${got:-nothing}, not to this server ($IP). Change the A record and wait, then retry."
    exit 1
  fi
done

# Serve the real domain next to the preview address.
if ! grep -q 'server_name .*celinebaby.kz www.celinebaby.kz' "$CONF"; then
  sed -i -E '0,/server_name /s/server_name ([^;]*);/server_name celinebaby.kz www.celinebaby.kz \1;/' "$CONF"
fi
nginx -t && systemctl reload nginx
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect --expand \
  -d celinebaby.kz -d www.celinebaby.kz

sed -i -E 's#^SITE_URL=.*#SITE_URL=https://celinebaby.kz#; s#^NEXT_PUBLIC_SITE_URL=.*#NEXT_PUBLIC_SITE_URL=https://celinebaby.kz#' "$ENV_FILE"
systemctl restart celinebaby.service
sleep 4
curl -fsS -o /dev/null -w "https://celinebaby.kz answers: HTTP %{http_code}\n" https://celinebaby.kz/ru
