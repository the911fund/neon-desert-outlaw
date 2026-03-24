#!/bin/bash
# Auto-deploy neon-desert-outlaw to turbo.911fund.io
set -e
cd "$(dirname "$0")"
git fetch origin master
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "New changes detected, deploying..."
  git pull origin master
  npm run build
  echo "✅ Deployed $(git log --oneline -1)"
else
  echo "Already up to date."
fi
