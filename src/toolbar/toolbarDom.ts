import { App, ButtonComponent, MenuItem, setIcon } from "obsidian";

export const TOOLTIP_DELAY = 250;

// Two separate hooks on purpose: SHARED_BAR_CLASS is styling only (the settings
// preview wears it too), while the selectors below mark a *live* bar and are what
// every lifecycle query matches.
export const SHARED_BAR_CLASS = "editing-toolbar-bar";
export const BAR_SELECTOR = ".editingToolbarModalBar";
export const POPOVER_SELECTOR = ".editingToolbarPopoverBar";

export function applyButtonIcon(btn: ButtonComponent, icon?: string): void {
  btn.setIcon(icon ?? "");
}

export function applyMenuItemIcon(menuItem: MenuItem, icon: string = ""): void {
  if (!icon) {
    menuItem.setIcon("");
    menuItem.iconEl?.empty();
    return;
  }

  menuItem.setIcon(icon);
  if (menuItem.iconEl && menuItem.iconEl.childElementCount === 0) {
    setIcon(menuItem.iconEl, icon);
  }
}

export const NO_HOTKEY = "–";

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
