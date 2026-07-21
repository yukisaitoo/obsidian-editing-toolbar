// Code from https://github.com/valentine195/obsidian-admonition/blob/master/src/lang/helpers.ts

import { moment } from 'obsidian';

import { KEYS } from './keys';
import en from './locale/en';
import enGB from './locale/en-gb';
import ja from './locale/ja';
import ptBR from './locale/pt-br';
import ru from './locale/ru';
import zhCN from './locale/zh-cn';
import zhTW from './locale/zh-tw';

const localeMap: { [k: string]: Partial<typeof en> } = {
  en,
  'en-gb': enGB,
  ja,
  'pt-br': ptBR,
  ru,
  'zh-cn': zhCN,
  'zh-tw': zhTW,
};

const locale = localeMap[moment.locale()] ?? en;

/**
 * Translates keys on-the-fly. Use for values not known at compile time 
 * (command names, enum values, arbitrary labels).
 */
export function t(str: keyof typeof en | string): string {
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }

  const key = str as keyof typeof en;
  return locale[key] || en[key] || str;
}

/**
 * Fully-resolved, read-only map of static UI strings for the active locale.
 */
export const strings = Object.fromEntries(
  Object.entries(KEYS).map(([id, natKey]) => [id, t(natKey)])
) as { readonly [K in keyof typeof KEYS]: string };
