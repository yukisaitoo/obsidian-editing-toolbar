#!/usr/bin/env bash

# Deploy the built plugin (main.js + manifest.json + styles.css) into a local
# Obsidian vault for testing. Reads the target vault from `.env` (VAULT_PATH).
#
# Usage:
#   npm run deploy     # builds first, then copies (recommended)
#   bash deploy.sh     # copies an already-built plugin only
#
set -euo pipefail

PLUGIN_ID="editing-toolbar"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BUILD_DIR="$ROOT_DIR/dist"

# --- 1. Load VAULT_PATH from .env ------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ No .env file found."
  echo "   Create one:  cp .env.example .env   then set VAULT_PATH inside it."
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${VAULT_PATH:-}" || "$VAULT_PATH" == "/absolute/path/to/your/obsidian/vault" ]]; then
  echo "❌ VAULT_PATH is not set. Edit .env and point it at your vault folder."
  exit 1
fi

# --- 2. Validate the vault --------------------------------------------------
if [[ ! -d "$VAULT_PATH" ]]; then
  echo "❌ Vault folder does not exist: $VAULT_PATH"
  exit 1
fi

if [[ ! -d "$VAULT_PATH/.obsidian" ]]; then
  echo "❌ '$VAULT_PATH' is not an Obsidian vault (no .obsidian folder inside)."
  exit 1
fi

# --- 3. Make sure the plugin was built --------------------------------------
if [[ ! -f "$BUILD_DIR/main.js" ]]; then
  echo "❌ No built main.js found at:"
  echo "   $BUILD_DIR/main.js"
  echo "   Run 'npm run build' first (or use 'npm run deploy' which builds for you)."
  exit 1
fi

# --- 4. Create the plugin folder only if it doesn't already exist ----------
DEST_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"
if [[ ! -d "$DEST_DIR" ]]; then
  echo "📁 Plugin folder not found in vault — creating it:"
  echo "   $DEST_DIR"
  mkdir -p "$DEST_DIR"
fi

# --- 5. Copy (overwrite) the three plugin files -----------------------------
cp -f "$BUILD_DIR/main.js"      "$DEST_DIR/main.js"
cp -f "$ROOT_DIR/manifest.json" "$DEST_DIR/manifest.json"
cp -f "$ROOT_DIR/styles.css"    "$DEST_DIR/styles.css"

# --- 6. Done — remind to reload --------------------------------------------
echo ""
echo "✅ Deployed '$PLUGIN_ID' to your vault:"
echo "   $DEST_DIR"
echo "   ├─ main.js"
echo "   ├─ manifest.json"
echo "   └─ styles.css"
echo ""
echo "🔁 IMPORTANT: reload the plugin in Obsidian to pick up the new build —"
echo "   Settings → Community plugins → toggle 'Editing Toolbar' OFF then ON"
echo "   (or use Cmd+P > Reload app without saving)."
echo ""
