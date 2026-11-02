#!/usr/bin/env bash
# Admin accounts from the command line: celinebaby-admin list | add <email> [name] | reset <email> | remove <email>
set -euo pipefail
exec sudo -u celine -H bash -c 'cd /srv/celinebaby && set -a && . /etc/celinebaby/env && set +a && exec node scripts/admin-user.mjs "$@"' _ "$@"
