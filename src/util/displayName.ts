import { App, Command } from "obsidian";

import { t } from "src/translations/helper";
import { commandLabel } from "src/util/commandStorage";

// Registry names are already localized, so they win. Submenu groups, dividers and dead
// ids have no registry entry and fall back to the stored name.
export function displayName(app: App, item: Command): string {
  const registered = app.commands.findCommand(item.id)?.name;
  return registered ? commandLabel(registered) : t(item.name);
}

// A stored icon is an override (the icon picker, or CORE_ICONS); otherwise Obsidian's.
export function displayIcon(app: App, item: Command): string | undefined {
  return item.icon ?? app.commands.findCommand(item.id)?.icon;
}
