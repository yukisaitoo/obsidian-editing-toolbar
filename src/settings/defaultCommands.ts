import type { Command } from "obsidian";

import { COMMAND_LABELS, type CommandId } from "src/commands/commandLabels";
import type { RegisteredCommandName } from "src/commands/commandLabels";
import { ownCommand } from "src/plugin/pluginId";

// A bare id is a button; an object is a submenu holding buttons. Submenu ids are
// cosmetic — a submenu is recognised by its SubmenuCommands array.
type LayoutGroup = {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly children: readonly CommandId[];
};
type LayoutEntry = CommandId | LayoutGroup;

const DEFAULT_LAYOUT = [
  "editor-undo",
  "editor-redo",
  "format-eraser",
  "header2-text",
  "header3-text",
  {
    id: "SubmenuCommands-header",
    name: "Headings",
    icon: "header-n",
    children: ["header1-text", "header4-text", "header5-text", "header6-text"],
  },
  "toggle-bold",
  "toggle-italics",
  "toggle-strikethrough",
  "underline",
  "toggle-highlight",
  {
    id: "SubmenuCommands-edit",
    name: "Edit",
    icon: "edit",
    children: [
      "editor-cut",
      "editor-copy",
      "editor-paste",
      "editor:swap-line-down",
      "editor:swap-line-up",
    ],
  },
  "editor:attach-file",
  "editor:insert-table",
  "editor:cycle-list-checklist",
  {
    id: "SubmenuCommands-quotes",
    name: "Quotes",
    icon: "message-square",
    children: ["editor:toggle-blockquote", "insert-callout"],
  },
  {
    id: "SubmenuCommands-markdown",
    name: "Markdown syntax",
    icon: "markdown-syntax",
    children: [
      "superscript",
      "subscript",
      "editor:toggle-code",
      "codeblock",
      "editor:insert-wikilink",
      "editor:insert-embed",
      "hrline",
      "toggle-inline-math",
      "editor:insert-mathblock",
    ],
  },
  {
    id: "SubmenuCommands-list",
    name: "Lists",
    icon: "bullet-list-glyph",
    children: [
      "editor:toggle-checklist-status",
      "toggle-numbered-list",
      "toggle-bullet-list",
      "undent-list",
      "indent-list",
    ],
  },
  {
    id: "SubmenuCommands-alignment",
    name: "Alignment",
    icon: "align-center-glyph",
    children: ["justify", "left", "center", "right"],
  },
  "change-font-color",
  "change-background-color",
] as const satisfies readonly LayoutEntry[];

// Names the settings UI creates on demand rather than shipping in the defaults.
export const SUBMENU_NAME = "Submenu";
export const DIVIDER_NAME = "Vertical split";

// Every display name the toolbar can show, submenu parents included. Command name
// translations are keyed by it, so a name that is not here cannot be translated.
export type CommandName =
  | RegisteredCommandName
  | Extract<(typeof DEFAULT_LAYOUT)[number], { name: string }>["name"]
  | typeof SUBMENU_NAME
  | typeof DIVIDER_NAME;

function toCommand(id: CommandId): Command {
  return { id: ownCommand(id), ...COMMAND_LABELS[id] };
}

export function defaultToolbarCommands(): Command[] {
  return DEFAULT_LAYOUT.map((entry) =>
    typeof entry === "string"
      ? toCommand(entry)
      : {
          id: entry.id,
          name: entry.name,
          icon: entry.icon,
          SubmenuCommands: entry.children.map(toCommand),
        },
  );
}
