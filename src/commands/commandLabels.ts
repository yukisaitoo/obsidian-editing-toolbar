// The one place a command's display name and icon are written. It covers both the
// commands this plugin registers and the core ones the toolbar merely points at, and
// wins over the registry's own labels wherever a command enters settings — so a
// command re-added from the picker comes back identical to the one that shipped.
// Names double as translation keys — see `CommandName` in src/settings/defaultCommands.
export const COMMAND_LABELS = {
  // Toolbar itself
  "hide-show-menu": { name: "Toggle toolbar", icon: "editingToolbar" },

  // History and clipboard
  "editor-undo": { name: "Undo edit", icon: "undo-glyph" },
  "editor-redo": { name: "Redo edit", icon: "redo-glyph" },
  "editor-cut": { name: "Cut", icon: "lucide-scissors" },
  "editor-copy": { name: "Copy", icon: "lucide-copy" },
  "editor-paste": { name: "Paste", icon: "lucide-clipboard-type" },

  // Headings
  "header0-text": { name: "Remove header level", icon: "heading-glyph" },
  "header1-text": { name: "Header 1", icon: "header-1" },
  "header2-text": { name: "Header 2", icon: "header-2" },
  "header3-text": { name: "Header 3", icon: "header-3" },
  "header4-text": { name: "Header 4", icon: "header-4" },
  "header5-text": { name: "Header 5", icon: "header-5" },
  "header6-text": { name: "Header 6", icon: "header-6" },

  // Inline formatting
  "toggle-bold": { name: "Bold", icon: "bold-glyph" },
  "toggle-italics": { name: "Italic", icon: "italic-glyph" },
  "toggle-strikethrough": { name: "Strikethrough", icon: "strikethrough-glyph" },
  "toggle-highlight": { name: "Highlight", icon: "highlight-glyph" },
  underline: { name: "Underline", icon: "underline-glyph" },
  superscript: { name: "Superscript", icon: "superscript-glyph" },
  subscript: { name: "Subscript", icon: "subscript-glyph" },
  "toggle-inline-math": { name: "Inline math", icon: "lucide-sigma" },
  "format-eraser": { name: "Clear text formatting", icon: "eraser" },
  "change-font-color": { name: "Change font color", icon: "font-color" },
  "change-background-color": {
    name: "Change background color",
    icon: "background-color",
  },

  // Lists
  "toggle-numbered-list": { name: "Ordered list", icon: "ordered-list" },
  "toggle-bullet-list": { name: "Unordered list", icon: "unordered-list" },
  "indent-list": { name: "Indent list", icon: "indent-list" },
  "undent-list": { name: "Unindent list", icon: "unindent-list" },
  "editor:cycle-list-checklist": {
    name: "Cycle list and checklist",
    icon: "check-circle",
  },
  "editor:toggle-checklist-status": {
    name: "Checklist",
    icon: "checkbox-glyph",
  },

  // Alignment
  justify: { name: "Justify text", icon: "justify-text" },
  left: { name: "Align text left", icon: "align-left-glyph" },
  center: { name: "Center text", icon: "align-center-glyph" },
  right: { name: "Align text right", icon: "align-right-glyph" },

  // Blocks and insertions
  codeblock: { name: "Code block", icon: "codeblock-glyph" },
  hrline: { name: "Horizontal rule", icon: "horizontal-rule" },
  "insert-callout": { name: "Callout", icon: "lucide-quote" },
  "editor:toggle-code": { name: "Inline code", icon: "code-glyph" },
  "editor:toggle-blockquote": { name: "Blockquote", icon: "lucide-text-quote" },
  "editor:insert-wikilink": { name: "Wikilink", icon: "wikilink" },
  "editor:insert-embed": { name: "Embed", icon: "note-glyph" },
  "editor:insert-link": { name: "Insert link", icon: "link-glyph" },
  "editor:insert-tag": { name: "Insert tag", icon: "price-tag-glyph" },
  "editor:insert-mathblock": { name: "Math block", icon: "lucide-sigma-square" },
  "editor:insert-table": { name: "Insert table", icon: "lucide-table" },
  "editor:insert-callout": { name: "Insert callout", icon: "lucide-quote" },
  "editor:toggle-comments": {
    name: "Insert comment",
    icon: "percent-sign-glyph",
  },
  "editor:clear-formatting": { name: "Clear formatting", icon: "lucide-eraser" },
  "editor:attach-file": { name: "Attach file", icon: "lucide-paperclip" },
  "editor:swap-line-up": { name: "Swap line up", icon: "lucide-corner-right-up" },
  "editor:swap-line-down": {
    name: "Swap line down",
    icon: "lucide-corner-right-down",
  },
} as const satisfies Record<string, { name: string; icon: string }>;

export type CommandId = keyof typeof COMMAND_LABELS;

export type CommandLabel = (typeof COMMAND_LABELS)[CommandId];

// Ids reaching this come from the registry and settings, so most are not in the table.
export function labelFor(id: string): CommandLabel | undefined {
  return COMMAND_LABELS[id as CommandId];
}

// The ids this plugin implements, as opposed to the core ones it only labels.
// Registration is typed on it so a core command cannot be shadowed by accident.
export type OwnCommandId = Exclude<CommandId, `editor:${string}`>;

export type RegisteredCommandName =
  (typeof COMMAND_LABELS)[CommandId]["name"];
