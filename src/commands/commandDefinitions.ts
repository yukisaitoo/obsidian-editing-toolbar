import type { OwnCommandId } from "src/commands/commandLabels";

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
} as const satisfies Partial<Record<OwnCommandId, CommandPlot>>;

export type WrapCommandId = keyof typeof WRAP_COMMANDS;
