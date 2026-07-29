import { App, Editor } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { positionFollowingBar } from "src/toolbar/geometry";
import { ensureToolbar, getExistingToolbar } from "src/toolbar/toolbarBuilder";
import { resolveToolbarDocument } from "src/toolbar/toolbarHost";
import {
  applyToolbarState,
  resolveToolbarState,
} from "src/toolbar/toolbarVisibility";

/** Shows or hides the selection-following bar and re-anchors it to the caret. */
export function updateFollowingBar(
  app: App,
  plugin: EditingToolbarPlugin,
  editor: Editor | null,
): void {
  const doc = resolveToolbarDocument(app, editor);
  const state = resolveToolbarState(plugin, "following");

  const bar =
    state === "visible"
      ? ensureToolbar(app, plugin, "following", doc)
      : getExistingToolbar(app, plugin, "following", doc);
  if (!bar) return;

  applyToolbarState(bar, state);
  if (state === "visible" && editor) {
    positionFollowingBar(bar, editor, doc);
  }
}

export function hideFollowingBar(
  app: App,
  plugin: EditingToolbarPlugin,
  hostDocument?: Document,
): void {
  const bar = getExistingToolbar(app, plugin, "following", hostDocument);
  if (bar) applyToolbarState(bar, "hidden");
}
