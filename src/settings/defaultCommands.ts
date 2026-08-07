import type { Command } from "obsidian";

import {
  COMMAND_LABELS,
  type CommandId,
  iconFor,
} from "src/commands/commandLabels";
import type { RegisteredCommandName } from "src/commands/commandLabels";
import { isCoreCommand, ownCommand } from "src/plugin/pluginId";

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
    icon: "lucide-heading",
    children: ["header1-text", "header4-text", "header5-text", "header6-text"],
  },
  "editor:toggle-bold",
  "editor:toggle-italics",
  "editor:toggle-strikethrough",
  "underline",
  "editor:toggle-highlight",
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
    icon: "lucide-file-code",
    children: [
      "superscript",
      "subscript",
      "editor:toggle-code",
      "editor:insert-codeblock",
      "editor:insert-wikilink",
      "editor:insert-embed",
      "editor:insert-horizontal-rule",
      "editor:toggle-inline-math",
      "editor:insert-mathblock",
    ],
  },
  {
    id: "SubmenuCommands-list",
    name: "Lists",
    icon: "bullet-list-glyph",
    children: [
      "editor:toggle-checklist-status",
      "editor:toggle-numbered-list",
      "editor:toggle-bullet-list",
      "editor:unindent-list",
      "editor:indent-list",
    ],
  },
  {
    id: "SubmenuCommands-alignment",
    name: "Alignment",
    icon: "lucide-align-center",
    children: ["justify", "left", "center", "right"],
  },
  "change-font-color",
  "change-background-color",
] as const satisfies readonly LayoutEntry[];

// Created by the settings UI, not shipped in the default layout.
export const SUBMENU_NAME = "Submenu";
export const DIVIDER_NAME = "Vertical split";

// The names the toolbar supplies itself: own commands, submenu groups, dividers.
// Translations are keyed by this, so anything outside it stays untranslated.
export type CommandName =
  | RegisteredCommandName
  | Extract<(typeof DEFAULT_LAYOUT)[number], { name: string }>["name"]
  | typeof SUBMENU_NAME
  | typeof DIVIDER_NAME;

// Fallback for a core command that stops existing. "editor:toggle-bold" reads as
// "Toggle bold".
function nameFromId(id: string): string {
  const words = id.slice(id.indexOf(":") + 1).replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// A core command is pointed at where it lives, so its own hotkey reaches the tooltip;
// only what this plugin registers is namespaced.
export function toCommand(id: CommandId): Command {
  return isCoreCommand(id)
    ? { id, name: nameFromId(id), icon: iconFor(id) }
    : { id: ownCommand(id), ...COMMAND_LABELS[id] };
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
