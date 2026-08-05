import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";
import { requireSelection } from "src/util/text/selection";

// Code spans, math, URLs and links keep their ASCII punctuation.
const PROTECTED_PATTERNS = [
  /`[^`]+`/g,
  /\$[^$]+\$/g,
  /https?:\/\/[^\s)]+/g,
  /!\[.*?\]\(.*?\)/g,
  /\[.*?\]\(.*?\)/g,
];

// Kana as well as ideographs. Kana is what makes this honest for Japanese: a
// kana-heavy sentence holds almost no ideographs, so an ideograph-only test scores
// it as English and runs TO_HALFWIDTH over it — rewriting 。 to ". " and （） to ().
const CJK_CHARS = /[぀-ヿ一-鿿]/g;

const TO_FULLWIDTH: [RegExp, string][] = [
  [/,/g, "，"],
  [/\.(?!\d)/g, "。"],
  [/;/g, "；"],
  [/:/g, "："],
  [/\?/g, "？"],
  [/!/g, "！"],
  [/\(/g, "（"],
  [/\)/g, "）"],
  [/"([^"]*)"/g, "“$1”"],
  [/([぀-ヿ一-鿿])([a-zA-Z0-9])/g, "$1 $2"],
  [/([a-zA-Z0-9])([぀-ヿ一-鿿])/g, "$1 $2"],
];

const TO_HALFWIDTH: [RegExp, string][] = [
  [/，/g, ", "],
  [/。/g, ". "],
  [/；/g, "; "],
  [/：/g, ": "],
  [/？/g, "? "],
  [/！/g, "! "],
  [/（/g, "("],
  [/）/g, ")"],
  [/[“”]/g, '"'],
  [/ {2,}/g, " "],
];

// Below this fraction of CJK characters, treat the text as English.
const CJK_CONTEXT_THRESHOLD = 0.1;

export function smartTypography(editor: Editor): void {
  const selection = requireSelection(editor);
  if (selection === null) return;

  const cjkCount = (selection.match(CJK_CHARS) || []).length;
  const isCjk = cjkCount / selection.length > CJK_CONTEXT_THRESHOLD;

  const placeholders: string[] = [];
  let result = PROTECTED_PATTERNS.reduce(
    (acc, pattern) =>
      acc.replace(pattern, (match) => {
        placeholders.push(match);
        return `__PROTECTED_${placeholders.length - 1}__`;
      }),
    selection,
  );

  const rules = isCjk ? TO_FULLWIDTH : TO_HALFWIDTH;
  result = rules.reduce((acc, [from, to]) => acc.replace(from, to), result);

  placeholders.forEach((value, index) => {
    result = result.replace(`__PROTECTED_${index}__`, () => value);
  });

  editor.replaceSelection(result);
  new Notice(
    isCjk
      ? strings.detectedCjkContextConvertedFull
      : strings.detectedCodeEnglishContextConverted,
  );
}
