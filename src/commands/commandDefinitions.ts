import type { Command } from "obsidian";

/** A prefix/suffix pair applied around the selection, plus where to leave the cursor. */
export type CommandPlot = {
  char: number;
  line: number;
  prefix: string;
  suffix: string;
  islinehead: boolean;
};

/** Formatting commands that work by wrapping the selection in fixed markup. */
export const WRAP_COMMANDS: Record<string, CommandPlot> = {
  hrline: {
    char: 5,
    line: 1,
    prefix: "\n---",
    suffix: "\n",
    islinehead: true,
  },
  justify: {
    char: 0,
    line: 0,
    prefix: '<p align="justify">',
    suffix: "</p>",
    islinehead: false,
  },
  left: {
    char: 0,
    line: 0,
    prefix: '<p align="left">',
    suffix: "</p>",
    islinehead: false,
  },
  right: {
    char: 0,
    line: 0,
    prefix: '<p align="right">',
    suffix: "</p>",
    islinehead: false,
  },
  center: {
    char: 0,
    line: 0,
    prefix: "<center>",
    suffix: "</center>",
    islinehead: false,
  },
  underline: {
    char: 0,
    line: 0,
    prefix: "<u>",
    suffix: "</u>",
    islinehead: false,
  },
  superscript: {
    char: 0,
    line: 0,
    prefix: "<sup>",
    suffix: "</sup>",
    islinehead: false,
  },
  subscript: {
    char: 0,
    line: 0,
    prefix: "<sub>",
    suffix: "</sub>",
    islinehead: false,
  },
  codeblock: {
    char: 4,
    line: 0,
    prefix: "\n```\n",
    suffix: "\n```\n",
    islinehead: false,
  },
};

/**
 * Obsidian's own editor commands that the toolbar re-registers under its own ids,
 * so they can carry a toolbar icon and a cursor-offset fixup.
 */
export const CORE_EDITOR_COMMANDS: Command[] = [
  {
    id: "editor:insert-embed",
    name: "Insert Embed",
    icon: "note-glyph",
  },
  {
    id: "editor:insert-link",
    name: "Insert Link",
    icon: "link-glyph",
  },
  {
    id: "editor:insert-tag",
    name: "Insert Tag",
    icon: "price-tag-glyph",
  },
  {
    id: "editor:insert-wikilink",
    name: "Insert Internal link",
    icon: "bracket-glyph",
  },
  {
    id: "editor:toggle-code",
    name: "Insert Code",
    icon: "code-glyph",
  },
  {
    id: "editor:toggle-blockquote",
    name: "Insert Blockquote",
    icon: "lucide-text-quote",
  },
  {
    id: "editor:toggle-checklist-status",
    name: "Cycle List and Checklist",
    icon: "checkbox-glyph",
  },
  {
    id: "editor:toggle-comments",
    name: "Insert Comment",
    icon: "percent-sign-glyph",
  },

  {
    id: "editor:insert-callout",
    name: "Insert Callout",
    icon: "lucide-quote",
  },
  {
    id: "editor:insert-mathblock",
    name: "Insert MathBlock",
    icon: "lucide-sigma-square",
  },
  {
    id: "editor:insert-table",
    name: "Insert Table",
    icon: "lucide-table",
  },
  {
    id: "editor:swap-line-up",
    name: "Swap Line Up",
    icon: "lucide-corner-right-up",
  },
  {
    id: "editor:swap-line-down",
    name: "Swap Line Down",
    icon: "lucide-corner-right-down",
  },
  {
    id: "editor:attach-file",
    name: "Attach File",
    icon: "lucide-paperclip",
  },
  {
    id: "editor:clear-formatting",
    name: "Clear Formatting",
    icon: "lucide-eraser",
  },
];
