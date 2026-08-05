// Adapted from https://github.com/valentine195/obsidian-admonition/blob/master/src/lang/helpers.ts

import { moment } from "obsidian";

import type { CommandName } from "src/settings/defaultCommands";

import { en } from "./en";
import ja, { commandNames as jaCommands } from "./locale/ja";
import ptBR, { commandNames as ptBRCommands } from "./locale/pt-br";
import ru, { commandNames as ruCommands } from "./locale/ru";
import zhCN, { commandNames as zhCNCommands } from "./locale/zh-cn";
import zhTW, { commandNames as zhTWCommands } from "./locale/zh-tw";

type UiKey = keyof typeof en;
type Locale = {
  ui: Partial<Record<UiKey, string>>;
  commands: Record<CommandName, string>;
};

const localeMap: { [k: string]: Locale } = {
  ja: { ui: ja, commands: jaCommands },
  "pt-br": { ui: ptBR, commands: ptBRCommands },
  ru: { ui: ru, commands: ruCommands },
  "zh-cn": { ui: zhCN, commands: zhCNCommands },
  "zh-tw": { ui: zhTW, commands: zhTWCommands },
};

const active = localeMap[moment.locale()];

export const strings = { ...en, ...active?.ui } as {
  readonly [K in UiKey]: string;
};

const commandTranslations = active?.commands;

// Callers pass a runtime command name, which may be a renamed or third-party one
// outside the vocabulary. Those fall through untranslated.
export function t(name: string): string {
  return commandTranslations?.[name as CommandName] ?? name;
}

export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
