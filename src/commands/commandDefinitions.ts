import type { Command } from "obsidian";

export type CommandPlot = {
  prefix: string;
  suffix: string;
  islinehead: boolean;
};

export const WRAP_COMMANDS: Record<string, CommandPlot> = {
  hrline: {
    prefix: "\n---\n",
    suffix: "",
    islinehead: true,
  },
  justify: {
    prefix: '<p align="justify">',
    suffix: "</p>",
    islinehead: false,
  },
  left: {
    prefix: '<p align="left">',
    suffix: "</p>",
    islinehead: false,
  },
  right: {
    prefix: '<p align="right">',
    suffix: "</p>",
    islinehead: false,
  },
  center: {
    prefix: "<center>",
    suffix: "</center>",
    islinehead: false,
  },
  underline: {
    prefix: "<u>",
    suffix: "</u>",
    islinehead: false,
  },
  superscript: {
    prefix: "<sup>",
    suffix: "</sup>",
    islinehead: false,
  },
  subscript: {
    prefix: "<sub>",
    suffix: "</sub>",
    islinehead: false,
  },
  codeblock: {
    prefix: "\n```\n",
    suffix: "\n```\n",
    islinehead: false,
  },
};

export const WRAP_COMMAND_NAMES: Record<string, string> = {
  hrline: "Insert horizontal rule",
  justify: "Justify text",
  left: "Align text left",
  right: "Align text right",
  center: "Center text",
  underline: "Toggle underline",
  superscript: "Toggle superscript",
  subscript: "Toggle subscript",
  codeblock: "Toggle code block",
};

// Re-registered under the toolbar's own ids so they can carry an icon and a
// cursor-offset fixup.
export const CORE_EDITOR_COMMANDS: Command[] = [
  {
    id: "editor:insert-embed",
    name: "Insert embed",
    icon: "note-glyph",
  },
  {
    id: "editor:insert-link",
    name: "Insert link",
    icon: "link-glyph",
  },
  {
    id: "editor:insert-tag",
    name: "Insert tag",
    icon: "price-tag-glyph",
  },
  {
    id: "editor:insert-wikilink",
    name: "Insert internal link",
    icon: "bracket-glyph",
  },
  {
    id: "editor:toggle-code",
    name: "Insert code",
    icon: "code-glyph",
  },
  {
    id: "editor:toggle-blockquote",
    name: "Insert blockquote",
    icon: "lucide-text-quote",
  },
  {
    id: "editor:toggle-checklist-status",
    name: "Toggle checklist status",
    icon: "checkbox-glyph",
  },
  {
    id: "editor:toggle-comments",
    name: "Insert comment",
    icon: "percent-sign-glyph",
  },

  {
    id: "editor:insert-callout",
    name: "Insert callout",
    icon: "lucide-quote",
  },
  {
    id: "editor:insert-mathblock",
    name: "Insert math block",
    icon: "lucide-sigma-square",
  },
  {
    id: "editor:insert-table",
    name: "Insert table",
    icon: "lucide-table",
  },
  {
    id: "editor:swap-line-up",
    name: "Swap line up",
    icon: "lucide-corner-right-up",
  },
  {
    id: "editor:swap-line-down",
    name: "Swap line down",
    icon: "lucide-corner-right-down",
  },
  {
    id: "editor:attach-file",
    name: "Attach file",
    icon: "lucide-paperclip",
  },
  {
    id: "editor:clear-formatting",
    name: "Clear formatting",
    icon: "lucide-eraser",
  },
];
