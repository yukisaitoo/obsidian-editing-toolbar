// Names double as translation keys; see `CommandName` in src/settings/defaultCommands.
export const COMMAND_LABELS = {
  "hide-show-menu": { name: "Toggle toolbar", icon: "editingToolbar" },

  "editor-undo": { name: "Undo edit", icon: "undo-glyph" },
  "editor-redo": { name: "Redo edit", icon: "redo-glyph" },
  "editor-cut": { name: "Cut", icon: "lucide-scissors" },
  "editor-copy": { name: "Copy", icon: "lucide-copy" },
  "editor-paste": { name: "Paste", icon: "lucide-clipboard-type" },

  "header0-text": { name: "Remove header level", icon: "heading-glyph" },
  "header1-text": { name: "Header 1", icon: "lucide-heading-1" },
  "header2-text": { name: "Header 2", icon: "lucide-heading-2" },
  "header3-text": { name: "Header 3", icon: "lucide-heading-3" },
  "header4-text": { name: "Header 4", icon: "lucide-heading-4" },
  "header5-text": { name: "Header 5", icon: "lucide-heading-5" },
  "header6-text": { name: "Header 6", icon: "lucide-heading-6" },

  underline: { name: "Underline", icon: "lucide-underline" },
  superscript: { name: "Superscript", icon: "lucide-superscript" },
  subscript: { name: "Subscript", icon: "lucide-subscript" },
  "format-eraser": { name: "Clear text formatting", icon: "eraser" },
  "change-font-color": { name: "Change font color", icon: "font-color" },
  "change-background-color": {
    name: "Change background color",
    icon: "background-color",
  },

  justify: { name: "Justify text", icon: "lucide-align-justify" },
  left: { name: "Align text left", icon: "lucide-align-left" },
  center: { name: "Center text", icon: "lucide-align-center" },
  right: { name: "Align text right", icon: "lucide-align-right" },

  "insert-callout": { name: "Callout", icon: "lucide-quote" },
} as const satisfies Record<string, { name: string; icon: string }>;

// Obsidian's own icon is used unless it collides with another button on the same bar:
// check-square also lands on Checklist, quote on the Callout beside it under Quotes.
const CORE_ICONS = {
  "editor:cycle-list-checklist": "check-circle",
  "editor:toggle-blockquote": "lucide-text-quote",
} as const satisfies Record<`editor:${string}`, string>;

export type OwnCommandId = keyof typeof COMMAND_LABELS;

export type CommandId = OwnCommandId | `editor:${string}`;

export function iconFor(id: string): string | undefined {
  return (
    COMMAND_LABELS[id as OwnCommandId]?.icon ??
    CORE_ICONS[id as keyof typeof CORE_ICONS]
  );
}

export type RegisteredCommandName =
  (typeof COMMAND_LABELS)[OwnCommandId]["name"];
