import { ItemView, View } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { ViewUtils } from "src/util/viewUtils";

export type ToolbarState = "visible" | "hidden";

// Hiding uses `visibility` only. `display` is how styles.css picks a bar's
// layout (grid / flex / top), so writing display:none to hide would clobber it.
const HIDDEN_CLASS = "is-hidden";

export function applyToolbarState(el: HTMLElement, state: ToolbarState): void {
  el.toggleClass(HIDDEN_CLASS, state === "hidden");
}

export interface VisibilityOverrides {
  /** Defaults to the live editor's selection. */
  hasSelection?: boolean;
}

// The one place that decides whether a toolbar shows. Every caller applies this
// result rather than reasoning about its own case.
export function resolveToolbarState(
  plugin: EditingToolbarPlugin,
  style: ToolbarStyleKey,
  overrides: VisibilityOverrides = {},
): ToolbarState {
  if (!plugin.settings.cMenuVisibility) return "hidden";
  if (!plugin.isToolbarStyleEnabled(style)) return "hidden";

  const view = plugin.app.workspace.getActiveViewOfType(ItemView);

  if (!ViewUtils.isAllowedViewType(view)) {
    // Clicking a sidebar takes focus off the note but leaves it on screen, so
    // the top bar stays; switching the main pane to a PDF/graph does hide it.
    return style === "top" && isMainAreaEditable(plugin) ? "visible" : "hidden";
  }

  if (isReadingMode(view)) return "hidden";

  // Canvas has no text selection to follow, so the bar just stays up there.
  if (style === "following" && view?.getViewType() === "markdown") {
    const hasSelection =
      overrides.hasSelection ??
      (plugin.commandsManager.getActiveEditor()?.somethingSelected() || false);
    return hasSelection ? "visible" : "hidden";
  }

  return "visible";
}

function isReadingMode(view: View | null): boolean {
  return view?.getViewType() === "markdown" && !ViewUtils.isSourceMode(view);
}

function isMainAreaEditable(plugin: EditingToolbarPlugin): boolean {
  const view = plugin.app.workspace.getMostRecentLeaf()?.view ?? null;
  const type = view?.getViewType();
  return type === "canvas" || (type === "markdown" && ViewUtils.isSourceMode(view));
}
