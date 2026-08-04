import { ItemView } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import {
  isAllowedViewType,
  isReadingMode,
  isSourceMode,
} from "src/util/viewUtils";

export type ToolbarState = "visible" | "hidden";

// "leave": the active view cannot answer for this bar, so its current state stands.
export type ToolbarDecision = ToolbarState | "leave";

// Hiding uses `visibility` only: `display` carries the bar's flex layout, so
// writing display:none to hide would clobber it.
const HIDDEN_CLASS = "is-hidden";

export function applyToolbarState(el: HTMLElement, state: ToolbarState): void {
  el.toggleClass(HIDDEN_CLASS, state === "hidden");
}

// For callers that already hold a bar and only need it brought up to date.
export function syncToolbarState(
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
): void {
  const decision = resolveToolbarDecision(plugin);
  if (decision !== "leave") applyToolbarState(bar, decision);
}

export function resolveToolbarDecision(
  plugin: EditingToolbarPlugin,
): ToolbarDecision {
  if (!plugin.settings.toolbarVisible) return "hidden";

  const view = plugin.app.workspace.getActiveViewOfType(ItemView);

  if (!isAllowedViewType(view)) {
    // Clicking a sidebar takes focus off the note but leaves it on screen, so the
    // bar keeps its state; switching the main pane to a PDF/graph does hide it.
    return isMainAreaEditable(plugin) ? "leave" : "hidden";
  }

  if (isReadingMode(view)) return "hidden";

  return "visible";
}

function isMainAreaEditable(plugin: EditingToolbarPlugin): boolean {
  const view = plugin.app.workspace.getMostRecentLeaf()?.view ?? null;
  return view?.getViewType() === "canvas" || isSourceMode(view);
}
