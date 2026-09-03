#!/usr/bin/env bash
# Redeploy script -- run from the repo root on the VPS after the first-time
# setup in deploy/DEPLOY.md is done.
#
#   ./deploy/deploy.sh
set -euo pipefail

echo "==> Pulling latest main"
git pull origin main

echo "==> Installing dependencies"
npm ci

echo "==> Running DB migrations"
npm run db:migrate

echo "==> Building"
npm run build

echo "==> Restarting app"
pm2 restart optometrist-app

echo "==> Done"
pm2 status optometrist-app
