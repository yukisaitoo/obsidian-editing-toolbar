import { MarkdownView, View } from "obsidian";
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

// For callers that already hold a bar and only need it brought up to date. The
// user just clicked this bar, so its view is the active one.
export function syncToolbarState(
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
): void {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (view) applyToolbarState(bar, toolbarStateFor(plugin, view));
}
