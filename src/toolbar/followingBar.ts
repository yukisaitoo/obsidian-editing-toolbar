import { App, Editor } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { positionFollowingBar } from "src/toolbar/geometry";
import { ensureToolbar, getExistingToolbar } from "src/toolbar/toolbarBuilder";
import { resolveToolbarDocument } from "src/toolbar/toolbarHost";
import {
  applyToolbarState,
  resolveToolbarState,
} from "src/toolbar/toolbarVisibility";

// `hostDocument` pins the window to act on; without it the active editor decides.
export function updateFollowingBar(
  app: App,
  plugin: EditingToolbarPlugin,
  editor: Editor | null,
  hostDocument?: Document,
): void {
  const target = editor ?? plugin.commandsManager.getActiveEditor();
  const doc = hostDocument ?? resolveToolbarDocument(app, target);
  const state = resolveToolbarState(plugin, "following");

  const bar =
    state === "visible"
      ? ensureToolbar(app, plugin, "following", doc)
      : getExistingToolbar(app, plugin, "following", doc);
  if (!bar) return;

  applyToolbarState(bar, state);
  if (state === "visible" && target) {
    positionFollowingBar(bar, target, doc);
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
