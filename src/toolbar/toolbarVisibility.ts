import { View } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { isReadingMode } from "src/util/viewUtils";

export type ToolbarState = "visible" | "hidden";

// Hiding uses `visibility` only: `display` carries the bar's flex layout, so
// writing display:none to hide would clobber it.
const HIDDEN_CLASS = "is-hidden";

export function applyToolbarState(el: HTMLElement, state: ToolbarState): void {
  el.toggleClass(HIDDEN_CLASS, state === "hidden");
}

export function toolbarStateFor(
  plugin: EditingToolbarPlugin,
  view: View,
): ToolbarState {
  if (!plugin.settings.toolbarVisible) return "hidden";
  return isReadingMode(view) ? "hidden" : "visible";
}
