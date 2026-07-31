export function uniqueId(randomLength: number) {
  const idStr = Date.now().toString(36);
  return (
    idStr +
    Math.random()
      .toString(36)
      .slice(3, 3 + randomLength)
  );
}

export const DIVIDER_COMMAND_ID = "editingToolbar-Divider-Line";

// Every divider carries its own id under this prefix; the constant alone is the
// CSS class.
export function isDivider(id: string): boolean {
  return id.startsWith(DIVIDER_COMMAND_ID);
}

export function newDividerId(): string {
  return `${DIVIDER_COMMAND_ID}-${uniqueId(4)}`;
}
