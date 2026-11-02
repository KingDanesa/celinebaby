#!/usr/bin/env bash
# Launch day: after celinebaby.kz and www.celinebaby.kz point to this server (A records),
# issue the HTTPS certificate for the real domain and make it the site's address.
# Run as root:  celinebaby-switch-domain
set -euo pipefail
ENV_FILE=/etc/celinebaby/env
CONF=/etc/nginx/sites-available/celinebaby.conf
IP="$(curl -4 -fsS https://api.ipify.org)"

for h in celinebaby.kz www.celinebaby.kz; do
  # Ask public resolvers: the hosting provider's resolver may keep the old address for hours.
  got="$(dig +short A "$h" @1.1.1.1 | tail -1)"
  [ -n "$got" ] || got="$(getent ahostsv4 "$h" | awk 'NR==1{print $1}')"
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

# After certbot: every plain-HTTP request and every other host name (www, the old preview address)
# goes to https://celinebaby.kz, so search engines see one site.
python3 - "$CONF" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("""    if ($host = www.celinebaby.kz) {
        return 301 https://celinebaby.kz$request_uri;
    }""", """    # www and the old preview address -> celinebaby.kz
    if ($host != celinebaby.kz) {
        return 301 https://celinebaby.kz$request_uri;
    }""", 1)
start = s.rindex("server {")
if "listen 80" in s[start:]:
    names = [l.strip()[len("server_name "):-1] for l in s.splitlines() if l.strip().startswith("server_name ")][0]
    s = s[:start] + f"""server {{
    listen 80;
    listen [::]:80;
    server_name {names};

    location ^~ /.well-known/acme-challenge/ {{
        root /var/www/certbot;
    }}
    location / {{
        return 301 https://celinebaby.kz$request_uri;
    }}
}}
"""
open(p, "w").write(s)
PY
PREVIEW="$(grep -m1 -o 'celinebaby\.[0-9-]*\.sslip\.io' "$CONF" || true)"
nginx -t && systemctl reload nginx
if [ -n "$PREVIEW" ]; then
  certbot --nginx --non-interactive --cert-name celinebaby.kz --expand -d celinebaby.kz -d www.celinebaby.kz -d "$PREVIEW" || true
  nginx -t && systemctl reload nginx
fi

sed -i -E 's#^SITE_URL=.*#SITE_URL=https://celinebaby.kz#; s#^NEXT_PUBLIC_SITE_URL=.*#NEXT_PUBLIC_SITE_URL=https://celinebaby.kz#' "$ENV_FILE"
systemctl restart celinebaby.service
sleep 4
curl -fsS -o /dev/null -w "https://celinebaby.kz answers: HTTP %{http_code}\n" https://celinebaby.kz/ru
