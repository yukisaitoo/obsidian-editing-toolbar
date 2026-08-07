import { ButtonComponent, setIcon } from "obsidian";

// SHARED_BAR_CLASS is styling only (the settings preview wears it too); the two
// selectors below mark a live bar and are what the lifecycle queries match.
export const SHARED_BAR_CLASS = "editing-toolbar-bar";
export const BAR_SELECTOR = ".editingToolbarModalBar";
export const POPOVER_SELECTOR = ".editingToolbarPopoverBar";

// Worn by every button that opens a panel: dropdowns, flyouts, colour pickers.
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
