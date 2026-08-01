import { Editor, Notice } from "obsidian";
import { format, strings } from "src/translations/helper";
import { replaceDocument, requireSelection } from "src/util/text/selection";

export function addWrap(
  editor: Editor,
  prefix = "",
  suffix = "",
  excludeEmpty = true,
): void {
  const selection = editor.getSelection();
  const useSelection = selection.trim() !== "";
  const text = useSelection ? selection : editor.getValue();
  if (!text) return;

  const result = text
    .split("\n")
    .map((line) =>
      excludeEmpty && line.trim() === "" ? line : `${prefix}${line}${suffix}`,
    )
    .join("\n");

  if (useSelection) {
    editor.replaceSelection(result);
  } else {
    replaceDocument(editor, result);
  }
  new Notice(strings.prefixSuffixAdded);
}

export function extractBetween(
  editor: Editor,
  startStr: string,
  endStr: string,
): void {
  if (!startStr || !endStr) {
    new Notice(strings.pleaseSpecifyStartEndString);
    return;
  }

  const text = requireSelection(editor);
  if (text === null) return;

  try {
    const pattern = new RegExp(
      `${escapeRegExp(startStr)}(.*?)${escapeRegExp(endStr)}`,
      "g",
    );
    const matches = Array.from(text.matchAll(pattern), (m) => m[1]).filter(
      (m) => m !== undefined,
    );

    if (!matches.length) {
      new Notice(strings.matchesFound);
      return;
    }

    editor.replaceSelection(matches.join("\n"));
    new Notice(format(strings.extractedMatches, { count: matches.length }));
  } catch {
    new Notice(strings.extractionFailed);
  }
}

// Code spans, math, URLs and links keep their ASCII punctuation.
const PROTECTED_PATTERNS = [
  /`[^`]+`/g,
  /\$[^$]+\$/g,
  /https?:\/\/[^\s)]+/g,
  /!\[.*?\]\(.*?\)/g,
  /\[.*?\]\(.*?\)/g,
];

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
  [/([一-龥])([a-zA-Z0-9])/g, "$1 $2"],
  [/([a-zA-Z0-9])([一-龥])/g, "$1 $2"],
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
const CHINESE_CONTEXT_THRESHOLD = 0.1;

export function smartTypography(editor: Editor): void {
  const selection = requireSelection(editor);
  if (selection === null) return;

  const cjkCount = (selection.match(/[一-龥]/g) || []).length;
  const isChinese = cjkCount / selection.length > CHINESE_CONTEXT_THRESHOLD;

  const placeholders: string[] = [];
  let result = PROTECTED_PATTERNS.reduce(
    (acc, pattern) =>
      acc.replace(pattern, (match) => {
        placeholders.push(match);
        return `__PROTECTED_${placeholders.length - 1}__`;
      }),
    selection,
  );

  const rules = isChinese ? TO_FULLWIDTH : TO_HALFWIDTH;
  result = rules.reduce((acc, [from, to]) => acc.replace(from, to), result);

  placeholders.forEach((value, index) => {
    result = result.replace(`__PROTECTED_${index}__`, () => value);
  });

  editor.replaceSelection(result);
  new Notice(
    isChinese
      ? strings.detectedChineseContextConvertedFull
      : strings.detectedCodeEnglishContextConverted,
  );
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
