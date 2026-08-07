import type { App } from "obsidian";

export const PLUGIN_ID = "editing-toolbar";

export function ownCommand(id: string): string {
  return `${PLUGIN_ID}:${id}`;
}

// Obsidian namespaces its editor commands with this prefix and the toolbar's own
// ids never use it, so it tells apart an id Obsidian owns from one this plugin
// registers. Core's other prefixes (`app:`, `workspace:`) never reach here.
export function isCoreCommand<T extends string>(
  id: T,
): id is T & `editor:${string}` {
  return id.startsWith("editor:");
}

// Ids come from settings and can go stale when a plugin is removed or renames one.
// executeCommandById returns false both for an id nothing knows and for a command
// that declined to run, so look the id up first to warn about only the former.
export function runCommandById(app: App, id: string): void {
  if (!app.commands.findCommand(id)) {
    console.warn(`${PLUGIN_ID}: unknown command ${id}`);
    return;
  }
  app.commands.executeCommandById(id);
}
