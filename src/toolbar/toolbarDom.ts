import { App, ButtonComponent, Platform, setIcon } from "obsidian";

// Two separate hooks on purpose: SHARED_BAR_CLASS is styling only (the settings
// preview wears it too), while the selectors below mark a *live* bar and are what
// every lifecycle query matches.
export const SHARED_BAR_CLASS = "editing-toolbar-bar";
export const BAR_SELECTOR = ".editingToolbarModalBar";
export const POPOVER_SELECTOR = ".editingToolbarPopoverBar";

// Every button that opens a panel wears this: dropdowns, flyouts and the colour
// pickers alike.
export const SUBMENU_BUTTON_CLASS = "editingToolbarCommandsubItem";

// Returns the icon element so a tooltip can be anchored to it: Obsidian labels
// the nearest [aria-label] ancestor, which on the button would take in a flyout.
export function applyButtonIcon(
  btn: ButtonComponent,
  icon?: string,
): HTMLElement {
  const iconEl = btn.buttonEl.createSpan({ cls: "editing-toolbar-icon" });
  setIcon(iconEl, icon ?? "");
  return iconEl;
}

export const NO_HOTKEY = "–";

const MODIFIER_LABELS: Record<string, string> = Platform.isMacOS
  ? { Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Meta: "⌘", Mod: "⌘" }
  : { Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Win", Mod: "Ctrl" };

const MODIFIER_ORDER = Platform.isMacOS
  ? ["Ctrl", "Alt", "Shift", "Meta", "Mod"]
  : ["Mod", "Ctrl", "Meta", "Alt", "Shift"];

export function getHotkey(app: App, cmdId: string): string {
  const { hotkeyManager } = app;
  // A custom binding replaces the default wholesale, so an empty array means
  // the user deleted the hotkey.
  const hotkeys =
    hotkeyManager.getHotkeys(cmdId) ?? hotkeyManager.getDefaultHotkeys(cmdId);
  return formatCombo(hotkeys?.[0]);
}

function formatCombo(
  combo: { modifiers?: string[]; key?: string } | undefined,
): string {
  if (!combo?.key) return NO_HOTKEY;

  const modifiers = [...(combo.modifiers ?? [])]
    .sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b))
    .map((modifier) => MODIFIER_LABELS[modifier] ?? modifier);

  return [...modifiers, combo.key].join(Platform.isMacOS ? "" : "+");
}
