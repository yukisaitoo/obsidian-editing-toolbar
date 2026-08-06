import type { App } from "obsidian";

export const PLUGIN_ID = "editing-toolbar";

export function ownCommand(id: string): string {
  return `${PLUGIN_ID}:${id}`;
}

// Ids come from settings or from Obsidian core and can go stale. executeCommandById
// runs the command but discards its result, so findCommand is the only real check.
export function runCommandById(app: App, id: string): void {
  if (!app.commands.findCommand(id)) {
    console.warn(`${PLUGIN_ID}: unknown command ${id}`);
    return;
  }
  app.commands.executeCommandById(id);
}
