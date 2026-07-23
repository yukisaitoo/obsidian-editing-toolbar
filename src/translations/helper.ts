// Adapted from https://github.com/valentine195/obsidian-admonition/blob/master/src/lang/helpers.ts

import { moment } from "obsidian";

import { en } from "./en";
import enGB, { commandNames as enGBCommands } from "./locale/en-gb";
import ja, { commandNames as jaCommands } from "./locale/ja";
import ptBR, { commandNames as ptBRCommands } from "./locale/pt-br";
import ru, { commandNames as ruCommands } from "./locale/ru";
import zhCN, { commandNames as zhCNCommands } from "./locale/zh-cn";
import zhTW, { commandNames as zhTWCommands } from "./locale/zh-tw";

type UiKey = keyof typeof en;
type Locale = {
  ui: Partial<Record<UiKey, string>>;
  commands: Record<string, string>;
};

const localeMap: { [k: string]: Locale } = {
  "en-gb": { ui: enGB, commands: enGBCommands },
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

const commandTranslations: { [english: string]: string } = {};
if (active) {
  for (const [id, translated] of Object.entries(active.ui)) {
    commandTranslations[en[id as UiKey]] = translated as string;
  }
  Object.assign(commandTranslations, active.commands);
}

export function t(name: string): string {
  if (typeof name !== "string" || name.length === 0) {
    return "";
  }
  return commandTranslations[name] ?? name;
}
