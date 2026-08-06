import { ButtonComponent, setIcon } from "obsidian";

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
