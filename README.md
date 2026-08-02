# Editing Toolbar

_This fork is not affiliated with or endorsed by the original author, and will **not** be distributed through the Obsidian community plugin store. For the real thing, see [original plugin](https://github.com/cumany/obsidian-editing-toolbar)._

## Contents

- [What this does](#what-this-does)
- [Install](#install)

## What this does

This project adds a Word-style editing toolbar to Obsidian. It sits at the top of the
editing pane.

<center>
  <img src="docs/images/top-toolbar.png" width="80%" alt="Toolbar">
</center>

Config in **Settings → Editing Toolbar**:

**Appearance**

<center>
  <img src="docs/images/settings-appearance.png" width="80%" alt="Appearance settings">
</center>

**Toolbar Commands**

<center>
  <img src="docs/images/settings-commands.png" width="80%" alt="Toolbar Commands settings">
</center>

## Install

Will need to build and deploy it into your vault manually.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/yukisaitoo/obsidian-editing-toolbar.git
   cd obsidian-editing-toolbar
   npm install
   ```

2. Point it at your vault. Copy the example env file and set `VAULT_PATH` to your vault folder:

   ```bash
   cp .env.example .env
   # then edit .env:  VAULT_PATH="/absolute/path/to/your/obsidian/vault"
   ```

3. Build and deploy:

   ```bash
   npm run deploy
   ```

   The script builds the plugin, copies it into your vault. In Obsidian, toggle the plugin off/on under **Settings → Community plugins**, or run **Reload app without saving** from the command palette.

> [!WARNING]
> This fork uses the same plugin id (`editing-toolbar`) as the [official plugin](https://github.com/cumany/obsidian-editing-toolbar). If you're switching from the official plugin, uninstall it first through **Settings → Community plugins**.

---

_I consider this feature-complete and only plan to fix bugs from here. Found a bug? [Open an issue](https://github.com/yukisaitoo/obsidian-editing-toolbar/issues) Enjoying it? A ⭐ never hurts._
