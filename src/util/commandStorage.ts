import { Command } from "obsidian";

export type SubmenuCommand = Command & { SubmenuCommands: Command[] };

// A submenu parent holds a list of children, empty until the user drags some in.
export function hasSubmenu(command: Command): command is SubmenuCommand {
  return Array.isArray(command.SubmenuCommands);
}

// Obsidian's `Plugin.addCommand` renames commands to "<Plugin name>: <command name>",
// so registry names arrive with a source prefix the toolbar's own labels never have.
// Split on the first ": ", as the command palette does.
const SOURCE_SEPARATOR = ": ";

export function commandSource(name: string): string {
  const end = name.indexOf(SOURCE_SEPARATOR);
  return end === -1 ? "" : name.slice(0, end + SOURCE_SEPARATOR.length);
}

export function commandLabel(name: string): string {
  const end = name.indexOf(SOURCE_SEPARATOR);
  return end === -1 ? name : name.slice(end + SOURCE_SEPARATOR.length);
}

// `app.commands.listCommands()` hands back the LIVE registry objects. Storing one
// in settings means a later rename or icon change writes straight through to
// Obsidian's command palette, so everything entering settings is copied to plain
// data first.
export function toStoredCommand(command: Command): Command {
  const stored: Command = {
    id: command.id,
    name: commandLabel(command.name),
    icon: command.icon,
  };
  if (command.menuType) stored.menuType = command.menuType;

  if (hasSubmenu(command)) {
    stored.SubmenuCommands = command.SubmenuCommands.map(toStoredCommand);
  }

  return stored;
}

// An entry that will not parse costs itself and nothing else; its id lands in
// `skipped` so the caller can report the loss. Null means the payload held
// something other than a list.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unvalidated settings JSON
export function parseCommandList(value: any, skipped: string[]): Command[] | null {
  if (!Array.isArray(value)) return null;

  const commands: Command[] = [];
  for (const item of value) {
    const command = parseCommand(item, skipped);
    if (command) commands.push(command);
    else skipped.push(typeof item?.id === "string" ? item.id : "(unnamed)");
  }
  return commands;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unvalidated settings JSON
function parseCommand(item: any, skipped: string[]): Command | null {
  if (typeof item?.id !== "string" || typeof item.name !== "string") return null;
  if (item.icon !== undefined && typeof item.icon !== "string") return null;

  const command: Command = { id: item.id, name: item.name, icon: item.icon };

  if (item.menuType !== undefined) {
    if (item.menuType !== "submenu" && item.menuType !== "dropdown") {
      return null;
    }

    command.menuType = item.menuType;
  }

  if (item.SubmenuCommands !== undefined) {
    // A child that fails is dropped by the nested loop, leaving the parent intact.
    const submenu = parseCommandList(item.SubmenuCommands, skipped);
    if (!submenu) return null;

    command.SubmenuCommands = submenu;
  }

  return command;
}
