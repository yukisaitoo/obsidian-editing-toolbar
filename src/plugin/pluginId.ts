export const PLUGIN_ID = "editing-toolbar";

export function ownCommand(id: string): string {
  return `${PLUGIN_ID}:${id}`;
}
