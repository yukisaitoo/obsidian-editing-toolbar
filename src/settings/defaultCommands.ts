import type { Command } from "obsidian";

import { ownCommand } from "src/plugin/pluginId";

export const DEFAULT_TOOLBAR_COMMANDS: Command[] = [
  {
    id: ownCommand("editor-undo"),
    name: "Undo edit",
    icon: "undo-glyph",
  },
  {
    id: ownCommand("editor-redo"),
    name: "Redo edit",
    icon: "redo-glyph",
  },
  {
    id: ownCommand("format-eraser"),
    name: "Clear text formatting",
    icon: "eraser",
  },
  {
    id: ownCommand("header2-text"),
    name: "Header 2",
    icon: "header-2",
  },
  {
    id: ownCommand("header3-text"),
    name: "Header 3",
    icon: "header-3",
  },
  {
    id: "SubmenuCommands-header",
    name: "Headings",
    icon: "header-n",
    SubmenuCommands: [
      {
        id: ownCommand("header1-text"),
        name: "Header 1",
        icon: "header-1",
      },
      {
        id: ownCommand("header4-text"),
        name: "Header 4",
        icon: "header-4",
      },
      {
        id: ownCommand("header5-text"),
        name: "Header 5",
        icon: "header-5",
      },
      {
        id: ownCommand("header6-text"),
        name: "Header 6",
        icon: "header-6",
      },
    ],
  },
  {
    id: ownCommand("toggle-bold"),
    name: "Bold",
    icon: "bold-glyph",
  },
  {
    id: ownCommand("toggle-italics"),
    name: "Italic",
    icon: "italic-glyph",
  },
  {
    id: ownCommand("toggle-strikethrough"),
    name: "Strikethrough",
    icon: "strikethrough-glyph",
  },
  {
    id: ownCommand("underline"),
    name: "Underline",
    icon: "underline-glyph",
  },
  {
    id: ownCommand("toggle-highlight"),
    name: "Highlight",
    icon: "highlight-glyph",
  },
  {
    id: "SubmenuCommands-text-tools",
    name: "Text tools",
    icon: "box",
    menuType: "dropdown",
    SubmenuCommands: [
      {
        id: ownCommand("get-plain-text"),
        name: "Get plain text",
        icon: "lucide-file-text",
      },

      {
        id: ownCommand("smart-symbols"),
        name: "Convert punctuation width",
        icon: "lucide-at-sign",
      },
      {
        id: "editingToolbar-Divider-Line-line-ops",
        name: "Line operations",
        icon: "vertical-split",
      },
      {
        id: ownCommand("insert-blank-lines"),
        name: "Insert blank lines",
        icon: "lucide-space",
      },
      {
        id: ownCommand("remove-blank-lines"),
        name: "Remove blank lines",
        icon: "lucide-minimize-2",
      },
      {
        id: ownCommand("split-lines"),
        name: "Split lines",
        icon: "lucide-split",
      },
      {
        id: ownCommand("merge-lines"),
        name: "Merge lines",
        icon: "lucide-merge",
      },
      {
        id: ownCommand("dedupe-lines"),
        name: "Dedupe lines",
        icon: "lucide-filter",
      },
      {
        id: "editingToolbar-Divider-Line-text-processing",
        name: "Text processing",
        icon: "vertical-split",
      },
      {
        id: ownCommand("add-wrap"),
        name: "Add prefix/suffix",
        icon: "lucide-wrap-text",
      },
      {
        id: ownCommand("number-lines"),
        name: "Number lines (custom)",
        icon: "lucide-list-ordered",
      },
      {
        id: ownCommand("remove-whitespace-trim"),
        name: "Trim line ends",
        icon: "lucide-scissors",
      },
      {
        id: ownCommand("remove-whitespace-compress"),
        name: "Shrink extra spaces",
        icon: "lucide-minimize",
      },
      {
        id: ownCommand("remove-whitespace-all"),
        name: "Remove all whitespace",
        icon: "lucide-eraser",
      },
      {
        id: "editingToolbar-Divider-Line-advanced",
        name: "Advanced tools",
        icon: "vertical-split",
      },
      {
        id: ownCommand("list-to-table"),
        name: "List to table",
        icon: "lucide-table",
      },
      {
        id: ownCommand("table-to-list"),
        name: "Table to list",
        icon: "lucide-list",
      },
      {
        id: ownCommand("extract-between"),
        name: "Extract between strings",
        icon: "lucide-brackets",
      },
    ],
  },
  {
    id: "SubmenuCommands-lucdf3en5",
    name: "Edit",
    icon: "edit",
    SubmenuCommands: [
      {
        id: ownCommand("editor-cut"),
        name: "Cut",
        icon: "lucide-scissors",
      },
      {
        id: ownCommand("editor-copy"),
        name: "Copy",
        icon: "lucide-copy",
      },
      {
        id: ownCommand("editor-paste"),
        name: "Paste",
        icon: "lucide-clipboard-type",
      },
      {
        id: ownCommand("editor:swap-line-down"),
        name: "Swap line down",
        icon: "lucide-corner-right-down",
      },
      {
        id: ownCommand("editor:swap-line-up"),
        name: "Swap line up",
        icon: "lucide-corner-right-up",
      },
    ],
  },
  {
    id: ownCommand("editor:attach-file"),
    name: "Attach file",
    icon: "lucide-paperclip",
  },
  {
    id: ownCommand("editor:insert-table"),
    name: "Insert table",
    icon: "lucide-table",
  },
  {
    id: ownCommand("editor:cycle-list-checklist"),
    name: "Cycle list and checklist",
    icon: "check-circle",
  },
  {
    id: "SubmenuCommands-luc8efull",
    name: "Quotes",
    icon: "message-square",
    SubmenuCommands: [
      {
        id: ownCommand("editor:toggle-blockquote"),
        name: "Blockquote",
        icon: "lucide-text-quote",
      },
      {
        id: ownCommand("insert-callout"),
        name: "Callout",
        icon: "lucide-quote",
      },
    ],
  },
  {
    id: "SubmenuCommands-mdcmder",
    name: "Markdown syntax",
    icon: "markdown-syntax",
    SubmenuCommands: [
      {
        id: ownCommand("superscript"),
        name: "Superscript",
        icon: "superscript-glyph",
      },
      {
        id: ownCommand("subscript"),
        name: "Subscript",
        icon: "subscript-glyph",
      },
      {
        id: ownCommand("editor:toggle-code"),
        name: "Inline code",
        icon: "code-glyph",
      },
      {
        id: ownCommand("codeblock"),
        name: "Code block",
        icon: "codeblock-glyph",
      },
      {
        id: ownCommand("editor:insert-wikilink"),
        name: "Wikilink",
        icon: "wikilink",
      },
      {
        id: ownCommand("editor:insert-embed"),
        name: "Embed",
        icon: "note-glyph",
      },
      {
        id: ownCommand("hrline"),
        name: "Horizontal rule",
        icon: "horizontal-rule",
      },
      {
        id: ownCommand("toggle-inline-math"),
        name: "Inline math",
        icon: "lucide-sigma",
      },
      {
        id: ownCommand("editor:insert-mathblock"),
        name: "Math block",
        icon: "lucide-sigma-square",
      },
    ],
  },
  {
    id: "SubmenuCommands-list",
    name: "Lists",
    icon: "bullet-list-glyph",
    SubmenuCommands: [
      {
        id: ownCommand("editor:toggle-checklist-status"),
        name: "Checklist",
        icon: "checkbox-glyph",
      },
      {
        id: ownCommand("renumber-ordered-list"),
        name: "Renumber ordered list",
        icon: "list-restart",
      },
      {
        id: ownCommand("toggle-numbered-list"),
        name: "Ordered list",
        icon: "ordered-list",
      },
      {
        id: ownCommand("toggle-bullet-list"),
        name: "Unordered list",
        icon: "unordered-list",
      },
      {
        id: ownCommand("undent-list"),
        name: "Unindent list",
        icon: "unindent-list",
      },
      {
        id: ownCommand("indent-list"),
        name: "Indent list",
        icon: "indent-list",
      },
    ],
  },
  {
    id: "SubmenuCommands-aligin",
    name: "Alignment",
    icon: "align-center-glyph",
    SubmenuCommands: [
      {
        id: ownCommand("justify"),
        name: "Justify text",
        icon: "justify-text",
      },
      {
        id: ownCommand("left"),
        name: "Align text left",
        icon: "align-left-glyph",
      },
      {
        id: ownCommand("center"),
        name: "Center text",
        icon: "align-center-glyph",
      },
      {
        id: ownCommand("right"),
        name: "Align text right",
        icon: "align-right-glyph",
      },
    ],
  },
  {
    id: ownCommand("change-font-color"),
    name: "Change font color",
    icon: "font-color",
  },
  {
    id: ownCommand("change-background-color"),
    name: "Change background color",
    icon: "background-color",
  },
];

// Deep-copied so the following default never aliases the top default's objects.
const cloneToolbarDefault = (id: string): Command =>
  structuredClone(
    DEFAULT_TOOLBAR_COMMANDS.find((command) => command.id === id)!,
  );

export const DEFAULT_FOLLOWING_COMMANDS: Command[] = [
  { id: ownCommand("toggle-bold"), name: "Bold", icon: "bold-glyph" },
  {
    id: ownCommand("toggle-italics"),
    name: "Italic",
    icon: "italic-glyph",
  },
  {
    id: ownCommand("toggle-strikethrough"),
    name: "Strikethrough",
    icon: "strikethrough-glyph",
  },
  {
    id: ownCommand("toggle-highlight"),
    name: "Highlight",
    icon: "highlight-glyph",
  },
  {
    id: ownCommand("editor:toggle-code"),
    name: "Inline code",
    icon: "code-glyph",
  },
  cloneToolbarDefault(ownCommand("change-font-color")),
  cloneToolbarDefault(ownCommand("change-background-color")),
];
