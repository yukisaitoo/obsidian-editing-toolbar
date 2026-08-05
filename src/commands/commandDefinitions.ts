import type { Command } from "obsidian";

export type CommandPlot = {
  name: string;
  prefix: string;
  suffix: string;
};

export const WRAP_COMMANDS: Record<string, CommandPlot> = {
  justify: {
    name: "Justify text",
    prefix: '<p align="justify">',
    suffix: "</p>",
  },
  left: {
    name: "Align text left",
    prefix: '<p align="left">',
    suffix: "</p>",
  },
  right: {
    name: "Align text right",
    prefix: '<p align="right">',
    suffix: "</p>",
  },
  center: {
    name: "Center text",
    prefix: "<center>",
    suffix: "</center>",
  },
  underline: {
    name: "Toggle underline",
    prefix: "<u>",
    suffix: "</u>",
  },
  superscript: {
    name: "Toggle superscript",
    prefix: "<sup>",
    suffix: "</sup>",
  },
  subscript: {
    name: "Toggle subscript",
    prefix: "<sub>",
    suffix: "</sub>",
  },
  codeblock: {
    name: "Toggle code block",
    prefix: "\n```\n",
    suffix: "\n```\n",
  },
};

// Re-registered under the toolbar's own ids so they can carry an icon.
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
