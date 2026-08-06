import type { CommandId } from "src/commands/commandLabels";

export type CommandPlot = {
  prefix: string;
  suffix: string;
};

export const WRAP_COMMANDS = {
  justify: { prefix: '<p align="justify">', suffix: "</p>" },
  left: { prefix: '<p align="left">', suffix: "</p>" },
  right: { prefix: '<p align="right">', suffix: "</p>" },
  center: { prefix: "<center>", suffix: "</center>" },
  underline: { prefix: "<u>", suffix: "</u>" },
  superscript: { prefix: "<sup>", suffix: "</sup>" },
  subscript: { prefix: "<sub>", suffix: "</sub>" },
  codeblock: { prefix: "\n```\n", suffix: "\n```\n" },
} as const satisfies Partial<Record<CommandId, CommandPlot>>;

export type WrapCommandId = keyof typeof WRAP_COMMANDS;

// Re-registered under the toolbar's own ids so they can carry an icon.
export const CORE_EDITOR_COMMANDS: CommandId[] = [
  "editor:insert-embed",
  "editor:insert-link",
  "editor:insert-tag",
  "editor:insert-wikilink",
  "editor:toggle-code",
  "editor:toggle-blockquote",
  "editor:toggle-checklist-status",
  "editor:cycle-list-checklist",
  "editor:toggle-comments",
  "editor:insert-callout",
  "editor:insert-mathblock",
  "editor:insert-table",
  "editor:swap-line-up",
  "editor:swap-line-down",
  "editor:attach-file",
  "editor:clear-formatting",
];
