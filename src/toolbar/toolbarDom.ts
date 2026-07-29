import { App, ButtonComponent, MenuItem, setIcon } from "obsidian";

export const TOOLTIP_DELAY = 250;

/** Icons are either a Lucide/Obsidian icon name or a raw SVG string. */
export function checkHtml(htmlStr: string): boolean {
  return /<[^>]+>/g.test(htmlStr);
}

export function applyButtonIcon(btn: ButtonComponent, icon?: string): void {
  const iconStr = icon ?? "";
  if (checkHtml(iconStr)) {
    btn.buttonEl.innerHTML = iconStr;
  } else {
    btn.setIcon(iconStr);
  }
}

export function applyMenuItemIcon(menuItem: MenuItem, icon: string = ""): void {
  if (!icon) {
    menuItem.setIcon("");
    menuItem.iconEl?.empty();
    return;
  }

  if (checkHtml(icon)) {
    menuItem.setIcon("lucide-square");
    if (menuItem.iconEl) {
      menuItem.iconEl.empty();
      menuItem.iconEl.innerHTML = icon;
    }
    return;
  }

  menuItem.setIcon(icon);
  if (menuItem.iconEl && menuItem.iconEl.childElementCount === 0) {
    setIcon(menuItem.iconEl, icon);
  }
}

export const NO_HOTKEY = "–";

/** Renders a command's hotkey for a tooltip, marking user-customised ones with `*`. */
export function getHotkey(app: App, cmdId: string, highlight = false): string {
  const command = app.commands.findCommand(cmdId);
  if (!command) return NO_HOTKEY;

  const custom = app.hotkeyManager.customKeys[command.id]?.[0];
  if (custom) return formatCombo(custom, highlight ? "*" : "");

  return formatCombo(command.hotkeys?.[0], "");
}

function formatCombo(
  combo: { modifiers?: string[]; key?: string } | undefined,
  marker: string,
): string {
  if (!combo?.key) return NO_HOTKEY;
  const keys = [...(combo.modifiers ?? []), combo.key].join("+");
  return marker + keys.replace("Mod", "Ctrl") + marker;
}
