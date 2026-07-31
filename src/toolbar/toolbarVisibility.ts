import { ItemView, View } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { isAllowedViewType, isSourceMode } from "src/util/viewUtils";

export type ToolbarState = "visible" | "hidden";

// "leave": the active view cannot answer for this bar, so its current state stands.
export type ToolbarDecision = ToolbarState | "leave";

// Hiding uses `visibility` only. `display` is how styles.css picks a bar's
// layout (grid / flex / top), so writing display:none to hide would clobber it.
const HIDDEN_CLASS = "is-hidden";

export function applyToolbarState(el: HTMLElement, state: ToolbarState): void {
  el.toggleClass(HIDDEN_CLASS, state === "hidden");
}

// For callers that already hold a bar and only need it brought up to date.
export function syncToolbarState(
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
  style: ToolbarStyleKey,
): void {
  const decision = resolveToolbarDecision(plugin, style);
  if (decision !== "leave") applyToolbarState(bar, decision);
}

export function resolveToolbarDecision(
  plugin: EditingToolbarPlugin,
  style: ToolbarStyleKey,
): ToolbarDecision {
  if (!plugin.settings.toolbarVisible) return "hidden";
  if (!plugin.isToolbarStyleEnabled(style)) return "hidden";

  const view = plugin.app.workspace.getActiveViewOfType(ItemView);

  if (!isAllowedViewType(view)) {
    // Clicking a sidebar takes focus off the note but leaves it on screen, so the
    // top bar keeps its state; switching the main pane to a PDF/graph does hide it.
    return style === "top" && isMainAreaEditable(plugin) ? "leave" : "hidden";
  }

  if (isReadingMode(view)) return "hidden";

  // Only markdown is selection-gated; canvas has no text selection to follow.
  if (style === "following" && view?.getViewType() === "markdown") {
    const hasSelection =
      plugin.commandsManager.getActiveEditor()?.somethingSelected() ?? false;
    return hasSelection ? "visible" : "hidden";
  }

  return "visible";
}

function isReadingMode(view: View | null): boolean {
  return view?.getViewType() === "markdown" && !isSourceMode(view);
}

function isMainAreaEditable(plugin: EditingToolbarPlugin): boolean {
  const view = plugin.app.workspace.getMostRecentLeaf()?.view ?? null;
  const type = view?.getViewType();
  return type === "canvas" || (type === "markdown" && isSourceMode(view));
}
