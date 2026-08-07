import type { Command } from "obsidian";

import type { RegisteredCommandName } from "src/commands/commandLabels";
import {
  COMMAND_LABELS,
  type CommandId,
  iconFor,
} from "src/commands/commandLabels";
import { isCoreCommand, ownCommand } from "src/plugin/pluginId";
import { newDividerId } from "src/toolbar/layoutIds";

// Safe as a sentinel because "|" is neither an own id nor an `editor:` one.
const DIV = "|" as const;
type Divider = typeof DIV;

type LayoutGroup = {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly menuType?: "dropdown";
  readonly children: readonly (CommandId | Divider)[];
};
type LayoutEntry = CommandId | LayoutGroup | Divider;

// reflowToolbarOverflow hides the tail first, so the least-used runs sit last.
const DEFAULT_LAYOUT = [
  "editor-undo",
  "editor-redo",
  DIV,
  "header2-text",
  "header3-text",
  {
    id: "SubmenuCommands-header",
    name: "Headings",
    icon: "lucide-heading",
    children: [
      "header1-text",
      "header4-text",
      "header5-text",
      "header6-text",
      DIV,
      "header0-text",
    ],
  },
  DIV,
  "editor:toggle-bold",
  "editor:toggle-italics",
  "editor:toggle-strikethrough",
  "underline",
  "editor:toggle-highlight",
  "editor:toggle-code",
  // Plural. The singular appears in Obsidian's source but is never registered, so
  // it would type-check and no-op.
  "editor:toggle-comments",
  "change-font-color",
  "change-background-color",
  "format-eraser",
  DIV,
  "editor:cycle-list-checklist",
  "editor:toggle-blockquote",
  "insert-callout",
  {
    id: "SubmenuCommands-list",
    name: "Lists",
    icon: "bullet-list-glyph",
    menuType: "dropdown",
    children: [
      "editor:toggle-bullet-list",
      "editor:toggle-numbered-list",
      "editor:toggle-checklist-status",
      DIV,
      "editor:indent-list",
      "editor:unindent-list",
      DIV,
      "editor:swap-line-up",
      "editor:swap-line-down",
    ],
  },
  DIV,
  "editor:insert-wikilink",
  "editor:insert-link",
  "editor:insert-table",
  {
    id: "SubmenuCommands-insert",
    name: "Insert",
    icon: "lucide-plus",
    menuType: "dropdown",
    children: [
      "editor:insert-embed",
      "editor:attach-file",
      "editor:insert-tag",
      DIV,
      "editor:insert-codeblock",
      "editor:insert-mathblock",
      "editor:toggle-inline-math",
      "editor:insert-horizontal-rule",
      "editor:insert-footnote",
      DIV,
      "superscript",
      "subscript",
    ],
  },
  DIV,
  "editor:open-search-replace",
  {
    id: "SubmenuCommands-alignment",
    name: "Alignment",
    icon: "lucide-align-center",
    children: ["left", "center", "right", "justify"],
  },
] as const satisfies readonly LayoutEntry[];

// SUBMENU_NAME only ever comes from the settings UI; DIVIDER_NAME is also what
// every DIV above materialises as.
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

// Mirrors INSERTABLE.divider in commandsTab, so a shipped divider is
// indistinguishable from a hand-added one.
function toEntry(entry: CommandId | Divider): Command {
  return entry === DIV
    ? { id: newDividerId(), name: DIVIDER_NAME, icon: "vertical-split" }
    : toCommand(entry);
}

// `children` is destructured away so it never reaches data.json.
function toGroup({ children, ...group }: LayoutGroup): Command {
  return { ...group, SubmenuCommands: children.map(toEntry) };
}

export function defaultToolbarCommands(): Command[] {
  return DEFAULT_LAYOUT.map((entry) =>
    typeof entry === "string" ? toEntry(entry) : toGroup(entry),
  );
}
