// Display name and icon for every command the toolbar knows: the ones this plugin
// registers and the core editor commands it points at. Names double as translation
// keys; see `CommandName` in src/settings/defaultCommands.
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

  "editor:toggle-bold": { name: "Bold", icon: "bold-glyph" },
  "editor:toggle-italics": { name: "Italic", icon: "italic-glyph" },
  "editor:toggle-strikethrough": {
    name: "Strikethrough",
    icon: "strikethrough-glyph",
  },
  "editor:toggle-highlight": { name: "Highlight", icon: "highlight-glyph" },
  underline: { name: "Underline", icon: "lucide-underline" },
  superscript: { name: "Superscript", icon: "lucide-superscript" },
  subscript: { name: "Subscript", icon: "lucide-subscript" },
  "editor:toggle-inline-math": { name: "Inline math", icon: "lucide-sigma" },
  "format-eraser": { name: "Clear text formatting", icon: "eraser" },
  "change-font-color": { name: "Change font color", icon: "font-color" },
  "change-background-color": {
    name: "Change background color",
    icon: "background-color",
  },

  "editor:toggle-numbered-list": {
    name: "Ordered list",
    icon: "lucide-list-ordered",
  },
  "editor:toggle-bullet-list": {
    name: "Unordered list",
    icon: "lucide-list",
  },
  "editor:indent-list": { name: "Indent list", icon: "lucide-indent" },
  "editor:unindent-list": { name: "Unindent list", icon: "lucide-outdent" },
  "editor:cycle-list-checklist": {
    name: "Cycle list and checklist",
    icon: "check-circle",
  },
  "editor:toggle-checklist-status": {
    name: "Checklist",
    icon: "checkbox-glyph",
  },

  justify: { name: "Justify text", icon: "lucide-align-justify" },
  left: { name: "Align text left", icon: "lucide-align-left" },
  center: { name: "Center text", icon: "lucide-align-center" },
  right: { name: "Align text right", icon: "lucide-align-right" },

  "editor:insert-codeblock": { name: "Code block", icon: "lucide-square-code" },
  "editor:insert-horizontal-rule": {
    name: "Horizontal rule",
    icon: "lucide-minus",
  },
  "insert-callout": { name: "Callout", icon: "lucide-quote" },
  "editor:toggle-code": { name: "Inline code", icon: "code-glyph" },
  "editor:toggle-blockquote": { name: "Blockquote", icon: "lucide-text-quote" },
  "editor:insert-wikilink": { name: "Wikilink", icon: "lucide-brackets" },
  "editor:insert-embed": { name: "Embed", icon: "note-glyph" },
  "editor:insert-link": { name: "Insert link", icon: "link-glyph" },
  "editor:insert-tag": { name: "Insert tag", icon: "price-tag-glyph" },
  "editor:insert-mathblock": {
    name: "Math block",
    icon: "lucide-sigma-square",
  },
  "editor:insert-table": { name: "Insert table", icon: "lucide-table" },
  "editor:insert-callout": { name: "Insert callout", icon: "lucide-quote" },
  "editor:toggle-comments": {
    name: "Insert comment",
    icon: "percent-sign-glyph",
  },
  "editor:clear-formatting": {
    name: "Clear formatting",
    icon: "lucide-eraser",
  },
  "editor:attach-file": { name: "Attach file", icon: "lucide-paperclip" },
  "editor:swap-line-up": {
    name: "Swap line up",
    icon: "lucide-corner-right-up",
  },
  "editor:swap-line-down": {
    name: "Swap line down",
    icon: "lucide-corner-right-down",
  },
} as const satisfies Record<string, { name: string; icon: string }>;

export type CommandId = keyof typeof COMMAND_LABELS;

type CommandLabel = (typeof COMMAND_LABELS)[CommandId];

export function labelFor(id: string): CommandLabel | undefined {
  return COMMAND_LABELS[id as CommandId];
}

// The ids this plugin registers itself, as opposed to the core ones it only labels.
export type OwnCommandId = Exclude<CommandId, `editor:${string}`>;

export type RegisteredCommandName = (typeof COMMAND_LABELS)[CommandId]["name"];
