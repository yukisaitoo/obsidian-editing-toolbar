#!/usr/bin/env bash

# Copies the built plugin (main.js + manifest.json + styles.css) into the local
# Obsidian vault named by VAULT_PATH in .env.
#
# Usage:
#   npm run deploy     # builds first, then copies
#   bash deploy.sh     # copies an already-built plugin only
#
set -euo pipefail

PLUGIN_ID="editing-toolbar"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BUILD_DIR="$ROOT_DIR/dist"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No .env file found. Create one with: cp .env.example .env"
  echo "then set VAULT_PATH inside it."
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${VAULT_PATH:-}" || "$VAULT_PATH" == "/absolute/path/to/your/obsidian/vault" ]]; then
  echo "VAULT_PATH is not set. Edit .env and point it at your vault folder."
  exit 1
fi

if [[ ! -d "$VAULT_PATH" ]]; then
  echo "Vault folder does not exist: $VAULT_PATH"
  exit 1
fi

if [[ ! -d "$VAULT_PATH/.obsidian" ]]; then
  echo "'$VAULT_PATH' is not an Obsidian vault (no .obsidian folder inside)."
  exit 1
fi

if [[ ! -f "$BUILD_DIR/main.js" ]]; then
  echo "No built main.js at $BUILD_DIR/main.js."
  echo "Run 'npm run build' first, or 'npm run deploy' which builds for you."
  exit 1
fi

DEST_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"
mkdir -p "$DEST_DIR"

cp -f "$BUILD_DIR/main.js"      "$DEST_DIR/main.js"
cp -f "$ROOT_DIR/manifest.json" "$DEST_DIR/manifest.json"
cp -f "$ROOT_DIR/styles.css"    "$DEST_DIR/styles.css"

echo "Deployed '$PLUGIN_ID' to $DEST_DIR."
echo "Reload the plugin in Obsidian to pick up the new build:"
echo "Settings > Community plugins > toggle it off and on, or reload the app."
