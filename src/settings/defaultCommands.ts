import type { Command } from "obsidian";

import {
  ALIGN_CENTER_ICON,
  ALIGN_LEFT_ICON,
  ALIGN_RIGHT_ICON,
  BACKGROUND_COLOR_ICON,
  FONT_COLOR_ICON,
  HORIZONTAL_RULE_ICON,
  INDENT_LIST_ICON,
  JUSTIFY_TEXT_ICON,
  MARKDOWN_SYNTAX_ICON,
  ORDERED_LIST_ICON,
  UNINDENT_LIST_ICON,
  UNORDERED_LIST_ICON,
  WIKILINK_ICON,
} from "src/icons/inlineIcons";

export const DEFAULT_TOOLBAR_COMMANDS: Command[] = [
  {
    id: "editing-toolbar:editor-undo",
    name: "Undo edit",
    icon: "undo-glyph",
  },
  {
    id: "editing-toolbar:editor-redo",
    name: "Redo edit",
    icon: "redo-glyph",
  },
  {
    id: "editing-toolbar:format-eraser",
    name: "Clear text formatting",
    icon: "eraser",
  },
  {
    id: "editing-toolbar:header2-text",
    name: "Header 2",
    icon: "header-2",
  },
  {
    id: "editing-toolbar:header3-text",
    name: "Header 3",
    icon: "header-3",
  },
  {
    id: "SubmenuCommands-header",
    name: "Headings",
    icon: "header-n",
    SubmenuCommands: [
      {
        id: "editing-toolbar:header1-text",
        name: "Header 1",
        icon: "header-1",
      },
      {
        id: "editing-toolbar:header4-text",
        name: "Header 4",
        icon: "header-4",
      },
      {
        id: "editing-toolbar:header5-text",
        name: "Header 5",
        icon: "header-5",
      },
      {
        id: "editing-toolbar:header6-text",
        name: "Header 6",
        icon: "header-6",
      },
    ],
  },
  {
    id: "editing-toolbar:toggle-bold",
    name: "Bold",
    icon: "bold-glyph",
  },
  {
    id: "editing-toolbar:toggle-italics",
    name: "Italic",
    icon: "italic-glyph",
  },
  {
    id: "editing-toolbar:toggle-strikethrough",
    name: "Strikethrough",
    icon: "strikethrough-glyph",
  },
  {
    id: "editing-toolbar:underline",
    name: "Underline",
    icon: "underline-glyph",
  },
  {
    id: "editing-toolbar:toggle-highlight",
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
        id: "editing-toolbar:get-plain-text",
        name: "Get plain text",
        icon: "lucide-file-text",
      },

      {
        id: "editing-toolbar:smart-symbols",
        name: "Convert punctuation width",
        icon: "lucide-at-sign",
      },
      {
        id: "editingToolbar-Divider-Line",
        name: "Line operations",
        icon: "vertical-split",
      },
      {
        id: "editing-toolbar:insert-blank-lines",
        name: "Insert blank lines",
        icon: "lucide-space",
      },
      {
        id: "editing-toolbar:remove-blank-lines",
        name: "Remove blank lines",
        icon: "lucide-minimize-2",
      },
      {
        id: "editing-toolbar:split-lines",
        name: "Split lines",
        icon: "lucide-split",
      },
      {
        id: "editing-toolbar:merge-lines",
        name: "Merge lines",
        icon: "lucide-merge",
      },
      {
        id: "editing-toolbar:dedupe-lines",
        name: "Dedupe lines",
        icon: "lucide-filter",
      },
      {
        id: "editingToolbar-Divider-Line",
        name: "Text processing",
        icon: "vertical-split",
      },
      {
        id: "editing-toolbar:add-wrap",
        name: "Add prefix/suffix",
        icon: "lucide-wrap-text",
      },
      {
        id: "editing-toolbar:number-lines",
        name: "Number lines (custom)",
        icon: "lucide-list-ordered",
      },
      {
        id: "editing-toolbar:remove-whitespace-trim",
        name: "Trim line ends",
        icon: "lucide-scissors",
      },
      {
        id: "editing-toolbar:remove-whitespace-compress",
        name: "Shrink extra spaces",
        icon: "lucide-minimize",
      },
      {
        id: "editing-toolbar:remove-whitespace-all",
        name: "Remove all whitespace",
        icon: "lucide-eraser",
      },
      {
        id: "editingToolbar-Divider-Line",
        name: "Advanced tools",
        icon: "vertical-split",
      },
      {
        id: "editing-toolbar:list-to-table",
        name: "List to table",
        icon: "lucide-table",
      },
      {
        id: "editing-toolbar:table-to-list",
        name: "Table to list",
        icon: "lucide-list",
      },
      {
        id: "editing-toolbar:extract-between",
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
        id: "editing-toolbar:editor-cut",
        name: "Cut",
        icon: "lucide-scissors",
      },
      {
        id: "editing-toolbar:editor-copy",
        name: "Copy",
        icon: "lucide-copy",
      },
      {
        id: "editing-toolbar:editor-paste",
        name: "Paste",
        icon: "lucide-clipboard-type",
      },
      {
        id: "editing-toolbar:editor:swap-line-down",
        name: "Swap line down",
        icon: "lucide-corner-right-down",
      },
      {
        id: "editing-toolbar:editor:swap-line-up",
        name: "Swap line up",
        icon: "lucide-corner-right-up",
      },
    ],
  },
  {
    id: "editing-toolbar:editor:attach-file",
    name: "Attach file",
    icon: "lucide-paperclip",
  },
  {
    id: "editing-toolbar:editor:insert-table",
    name: "Insert table",
    icon: "lucide-table",
  },
  {
    id: "editing-toolbar:editor:cycle-list-checklist",
    name: "Cycle list and checklist",
    icon: "check-circle",
  },
  {
    id: "SubmenuCommands-luc8efull",
    name: "Quotes",
    icon: "message-square",
    SubmenuCommands: [
      {
        id: "editing-toolbar:editor:toggle-blockquote",
        name: "Blockquote",
        icon: "lucide-text-quote",
      },
      {
        id: "editing-toolbar:insert-callout",
        name: "Callout",
        icon: "lucide-quote",
      },
    ],
  },
  {
    id: "SubmenuCommands-mdcmder",
    name: "Markdown syntax",
    icon: MARKDOWN_SYNTAX_ICON,
    SubmenuCommands: [
      {
        id: "editing-toolbar:superscript",
        name: "Superscript",
        icon: "superscript-glyph",
      },
      {
        id: "editing-toolbar:subscript",
        name: "Subscript",
        icon: "subscript-glyph",
      },
      {
        id: "editing-toolbar:editor:toggle-code",
        name: "Inline code",
        icon: "code-glyph",
      },
      {
        id: "editing-toolbar:codeblock",
        name: "Code block",
        icon: "codeblock-glyph",
      },
      {
        id: "editing-toolbar:editor:insert-wikilink",
        name: "Wikilink",
        icon: WIKILINK_ICON,
      },
      {
        id: "editing-toolbar:editor:insert-embed",
        name: "Embed",
        icon: "note-glyph",
      },
      {
        id: "editing-toolbar:insert-link",
        name: "Link",
        icon: "link-glyph",
      },
      {
        id: "editing-toolbar:hrline",
        name: "Horizontal rule",
        icon: HORIZONTAL_RULE_ICON,
      },
      {
        id: "editing-toolbar:toggle-inline-math",
        name: "Inline math",
        icon: "lucide-sigma",
      },
      {
        id: "editing-toolbar:editor:insert-mathblock",
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
        id: "editing-toolbar:editor:toggle-checklist-status",
        name: "Checklist",
        icon: "checkbox-glyph",
      },
      {
        id: "editing-toolbar:renumber-ordered-list",
        name: "Renumber ordered list",
        icon: "list-restart",
      },
      {
        id: "editing-toolbar:toggle-numbered-list",
        name: "Ordered list",
        icon: ORDERED_LIST_ICON,
      },
      {
        id: "editing-toolbar:toggle-bullet-list",
        name: "Unordered list",
        icon: UNORDERED_LIST_ICON,
      },
      {
        id: "editing-toolbar:undent-list",
        name: "Unindent list",
        icon: UNINDENT_LIST_ICON,
      },
      {
        id: "editing-toolbar:indent-list",
        name: "Indent list",
        icon: INDENT_LIST_ICON,
      },
    ],
  },
  {
    id: "SubmenuCommands-aligin",
    name: "Alignment",
    icon: ALIGN_CENTER_ICON,
    SubmenuCommands: [
      {
        id: "editing-toolbar:justify",
        name: "Justify text",
        icon: JUSTIFY_TEXT_ICON,
      },
      {
        id: "editing-toolbar:left",
        name: "Align text left",
        icon: ALIGN_LEFT_ICON,
      },
      {
        id: "editing-toolbar:center",
        name: "Center text",
        icon: ALIGN_CENTER_ICON,
      },
      {
        id: "editing-toolbar:right",
        name: "Align text right",
        icon: ALIGN_RIGHT_ICON,
      },
    ],
  },
  {
    id: "editing-toolbar:change-font-color",
    name: "Change font color",
    icon: FONT_COLOR_ICON,
  },
  {
    id: "editing-toolbar:change-background-color",
    name: "Change background color",
    icon: BACKGROUND_COLOR_ICON,
  },
];

// Deep-copied so the following default never aliases the top default's objects.
const cloneToolbarDefault = (id: string): Command =>
  structuredClone(
    DEFAULT_TOOLBAR_COMMANDS.find((command) => command.id === id)!,
  );

// Fresh-install default for the following toolbar.
export const DEFAULT_FOLLOWING_COMMANDS: Command[] = [
  { id: "editing-toolbar:toggle-bold", name: "Bold", icon: "bold-glyph" },
  {
    id: "editing-toolbar:toggle-italics",
    name: "Italic",
    icon: "italic-glyph",
  },
  {
    id: "editing-toolbar:toggle-strikethrough",
    name: "Strikethrough",
    icon: "strikethrough-glyph",
  },
  {
    id: "editing-toolbar:toggle-highlight",
    name: "Highlight",
    icon: "highlight-glyph",
  },
  {
    id: "editing-toolbar:editor:toggle-code",
    name: "Inline code",
    icon: "code-glyph",
  },
  { id: "editing-toolbar:insert-link", name: "Link", icon: "link-glyph" },
  cloneToolbarDefault("editing-toolbar:change-font-color"),
  cloneToolbarDefault("editing-toolbar:change-background-color"),
];
