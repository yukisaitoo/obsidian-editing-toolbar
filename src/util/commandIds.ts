export const DIVIDER_COMMAND_ID = "editingToolbar-Divider-Line";

// Every divider carries its own id under this prefix; the constant alone is the
// CSS class.
export function isDivider(id: string): boolean {
  return id.startsWith(DIVIDER_COMMAND_ID);
}

export function newDividerId(): string {
  return `${DIVIDER_COMMAND_ID}-${crypto.randomUUID()}`;
}

// Cosmetic prefix; submenus are recognised by their SubmenuCommands array.
export function newSubmenuId(): string {
  return `SubmenuCommands-${crypto.randomUUID()}`;
}
