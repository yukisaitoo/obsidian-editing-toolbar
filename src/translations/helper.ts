// Adapted from https://github.com/valentine195/obsidian-admonition/blob/master/src/lang/helpers.ts

import { moment } from 'obsidian';

import { KEYS } from './keys';
import enGB, { commandNames as enGBCommands } from './locale/en-gb';
import ja, { commandNames as jaCommands } from './locale/ja';
import ptBR, { commandNames as ptBRCommands } from './locale/pt-br';
import ru, { commandNames as ruCommands } from './locale/ru';
import zhCN, { commandNames as zhCNCommands } from './locale/zh-cn';
import zhTW, { commandNames as zhTWCommands } from './locale/zh-tw';

type UiKey = keyof typeof KEYS;
type Locale = { ui: Partial<Record<UiKey, string>>; commands: Record<string, string> };

const localeMap: { [k: string]: Locale } = {
  'en-gb': { ui: enGB, commands: enGBCommands },
  ja: { ui: ja, commands: jaCommands },
  'pt-br': { ui: ptBR, commands: ptBRCommands },
  ru: { ui: ru, commands: ruCommands },
  'zh-cn': { ui: zhCN, commands: zhCNCommands },
  'zh-tw': { ui: zhTW, commands: zhTWCommands },
};

const active = localeMap[moment.locale()];

/**
 * Fully-resolved, read-only map of static UI strings for the active locale.
 * Keyed by string id; English (from KEYS) fills any key the locale omits.
 */
export const strings = { ...KEYS, ...active?.ui } as { readonly [K in UiKey]: string };

// English label -> active-locale translation, for strings whose English form is
// stored in user data (command and menu names). UI translations are re-indexed by
// their English source so labels that double as commands (e.g. "More") still
// resolve; explicit command names win on any overlap.
const commandTranslations: { [english: string]: string } = {};
if (active) {
  for (const [id, translated] of Object.entries(active.ui)) {
    commandTranslations[KEYS[id as UiKey]] = translated as string;
  }
  Object.assign(commandTranslations, active.commands);
}

/**
 * Translates an English command/menu label to the active locale on-the-fly.
 * Use for values not known at compile time (command names, arbitrary labels).
 * Returns the input unchanged when there is no translation.
 */
export function t(name: string): string {
  if (typeof name !== 'string' || name.length === 0) {
    return '';
  }
  return commandTranslations[name] ?? name;
}
