import { App, Platform } from "obsidian";

const MODIFIER_LABELS: Record<string, string> = Platform.isMacOS
  ? { Ctrl: "⌃", Alt: "⌥", Shift: "⇧", Meta: "⌘", Mod: "⌘" }
  : { Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Win", Mod: "Ctrl" };

const MODIFIER_ORDER = Platform.isMacOS
  ? ["Ctrl", "Alt", "Shift", "Meta", "Mod"]
  : ["Mod", "Ctrl", "Meta", "Alt", "Shift"];

// The command's shortcut as the user would read it, or null when it has none.
export function hotkeyLabel(app: App, commandId: string): string | null {
  const { hotkeyManager } = app;
  // A custom binding replaces the default wholesale, so an empty array means the
  // user deleted the hotkey rather than that there never was one.
  const hotkeys =
    hotkeyManager.getHotkeys(commandId) ??
    hotkeyManager.getDefaultHotkeys(commandId);

  const combo = hotkeys?.[0];
  if (!combo?.key) return null;

  const modifiers = [...(combo.modifiers ?? [])]
    .sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b))
    .map((modifier) => MODIFIER_LABELS[modifier] ?? modifier);

  return [...modifiers, combo.key].join(Platform.isMacOS ? "" : "+");
}
