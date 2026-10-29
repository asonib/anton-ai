#!/bin/bash
# Development only: lets the app user create Prisma's temporary *shadow database*
# required by `prisma migrate dev`. Runs once, on first container start.
set -e
mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
GRANT ALL PRIVILEGES ON *.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
echo "[init] Granted dev privileges to ${MYSQL_USER}"
