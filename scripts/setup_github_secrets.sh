#!/usr/bin/env bash
# Helper script to set GitHub repository secrets using `gh`.
# Usage: run locally after logging in with `gh auth login`.

set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "Please install GitHub CLI (https://cli.github.com/) first." >&2
  exit 1
fi

read -p "Enter Railway token (will be added as RAILWAY_TOKEN): " -r RAILWAY_TOKEN
read -p "Enter Railway project ID (will be added as RAILWAY_PROJECT_ID): " -r RAILWAY_PROJECT_ID

echo "Setting secrets on the current repository..."

echo "$RAILWAY_TOKEN" | gh secret set RAILWAY_TOKEN

echo "$RAILWAY_PROJECT_ID" | gh secret set RAILWAY_PROJECT_ID

cat <<EOF
Done. Secrets are set. Push a commit to trigger the Deploy to Railway workflow.
EOF
