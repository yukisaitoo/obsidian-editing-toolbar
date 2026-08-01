import { Command } from "obsidian";

export type SubmenuCommand = Command & { SubmenuCommands: Command[] };

// A submenu parent holds a list of children, empty until the user drags some in.
export function hasSubmenu(command: Command): command is SubmenuCommand {
  return Array.isArray(command.SubmenuCommands);
}

// `app.commands.listCommands()` hands back the LIVE registry objects. Storing one
// in settings means a later rename or icon change writes straight through to
// Obsidian's command palette, so everything entering settings is copied to plain
// data first. It also drops the `callback`s that would break structuredClone.
export function toStoredCommand(command: Command): Command {
  const stored: Command = {
    id: command.id,
    name: command.name,
    icon: command.icon,
  };
  if (command.menuType) stored.menuType = command.menuType;
  if (hasSubmenu(command)) {
    stored.SubmenuCommands = command.SubmenuCommands.map(toStoredCommand);
  }
  return stored;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCommandList(value: any): Command[] | null {
  if (!Array.isArray(value)) return null;

  const commands: Command[] = [];
  for (const item of value) {
    if (typeof item?.id !== "string" || typeof item.name !== "string") {
      return null;
    }
    if (item.icon !== undefined && typeof item.icon !== "string") return null;

    const command: Command = { id: item.id, name: item.name, icon: item.icon };

    if (item.menuType !== undefined) {
      if (item.menuType !== "submenu" && item.menuType !== "dropdown") {
        return null;
      }
      command.menuType = item.menuType;
    }

    if (item.SubmenuCommands !== undefined) {
      const submenu = parseCommandList(item.SubmenuCommands);
      if (!submenu) return null;
      command.SubmenuCommands = submenu;
    }

    commands.push(command);
  }
  return commands;
}

// The stored entry for this command, or null once it is no longer in the list.
export function findStoredCommand(
  command: Command,
  isSubmenuItem: boolean,
  currentCommands: Command[],
): Command | null {
  if (!isSubmenuItem) {
    return currentCommands.find((v) => v.id === command.id) ?? null;
  }

  for (const parent of currentCommands) {
    const match = parent.SubmenuCommands?.find((v) => v.id === command.id);
    if (match) return match;
  }
  return null;
}
