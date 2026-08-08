import { Command } from "obsidian";

import { iconFor } from "src/commands/commandLabels";

export type SubmenuCommand = Command & { SubmenuCommands: Command[] };

export function hasSubmenu(command: Command): command is SubmenuCommand {
  return Array.isArray(command.SubmenuCommands);
}

// Obsidian's `Plugin.addCommand` renames commands to "<Plugin name>: <command name>",
// so registry names arrive with a source prefix the toolbar's own labels never have.
// Split on the first ": ", as the command palette does.
const SOURCE_SEPARATOR = ": ";

export function commandLabel(name: string): string {
  const end = name.indexOf(SOURCE_SEPARATOR);
  return end === -1 ? name : name.slice(end + SOURCE_SEPARATOR.length);
}

// `listCommands()` hands back the live registry objects, and storing one would let
// a later rename or icon change write straight through to Obsidian's palette, so
// everything entering settings is copied to plain data first.
export function toStoredCommand(command: Command, icon?: string): Command {
  // The stored name is a fallback (`displayName` prefers the registry); the stored
  // icon is an override (`displayIcon` prefers it). Unset tracks Obsidian's.
  const stored: Command = {
    id: command.id,
    name: commandLabel(command.name),
    icon: icon ?? iconFor(command.id),
  };
  if (command.menuType) stored.menuType = command.menuType;

  if (hasSubmenu(command)) {
    stored.SubmenuCommands = command.SubmenuCommands.map((child) =>
      toStoredCommand(child),
    );
  }

  return stored;
}
