import { Command } from "obsidian";

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
  if (command.SubmenuCommands) {
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

// `subIndex` is -1 for a top-level command, `index` -1 when it is not in the list.
export function findCommandLocation(
  command: Command,
  isSubmenuItem: boolean,
  currentCommands: Command[],
): { index: number; subIndex: number } {
  if (!isSubmenuItem) {
    return {
      index: currentCommands.findIndex((v) => v.id === command.id),
      subIndex: -1,
    };
  }

  for (let index = 0; index < currentCommands.length; index++) {
    const submenu = currentCommands[index].SubmenuCommands;
    const subIndex = submenu?.findIndex((v) => v.id === command.id) ?? -1;
    if (subIndex >= 0) {
      return { index, subIndex };
    }
  }
  return { index: -1, subIndex: -1 };
}
