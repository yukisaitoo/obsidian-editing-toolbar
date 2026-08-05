import { Editor, Notice } from "obsidian";
import { format, strings } from "src/translations/helper";
import { requireSelection, selectionOrParagraph } from "src/util/text/selection";

export function insertBlankLines(editor: Editor): void {
  const text = selectionOrParagraph(editor);
  if (text === null) return;
  editor.replaceSelection(text.replace(/([^\n])\n(?=[^\n])/g, "$1\n\n"));
}

export function splitLines(editor: Editor): void {
  const selection = requireSelection(editor);
  if (selection === null) return;

  const listPattern = detectListPattern(selection);
  if (listPattern) {
    const items = selection
      .split(listPattern)
      .map((item) => item.trim())
      .filter(Boolean);
    editor.replaceSelection(items.join("\n"));
    new Notice(strings.listPatternDetectedAutoSplit);
    return;
  }

  const separator = detectSeparator(selection);
  if (!separator) {
    new Notice(strings.obviousSeparatorListPatternDetected);
    return;
  }

  editor.replaceSelection(
    splitOutsideBrackets(selection, separator).join("\n"),
  );
  new Notice(`${strings.splitOn} '${separator}' — ${strings.splitCompleted}`);
}

export function mergeLines(
  editor: Editor,
  options: {
    separator?: string;
    preserveParagraphs?: boolean;
    trimLines?: boolean;
  },
): void {
  const selection = requireSelection(
    editor,
    strings.pleaseSelectLinesMergeFirst,
  );
  if (selection === null) return;

  const separator = options.separator ?? "";
  const hasCustomSep = separator !== "";
  let result = "";

  for (const raw of selection.split(/\r?\n/)) {
    const line = options.trimLines ? raw.trim() : raw;

    if (line === "") {
      if (options.preserveParagraphs && !hasCustomSep) result += "\n\n";
      continue;
    }

    if (result !== "" && !result.endsWith("\n")) {
      result += hasCustomSep ? separator : joinerFor(result, line);
    }
    result += line;
  }

  editor.replaceSelection(result.trim());
  new Notice(
    hasCustomSep
      ? `${strings.merged} '${separator}'`
      : strings.mergeCompleted,
  );
}

// CJK text runs together without spaces; anything else needs one.
function joinerFor(soFar: string, next: string): string {
  const cjk = /[一-龥]/;
  return cjk.test(soFar.slice(-1)) && cjk.test(next.charAt(0)) ? "" : " ";
}

export function dedupe(
  editor: Editor,
  options: { trimBeforeCompare?: boolean } = {},
): void {
  const selection = requireSelection(
    editor,
    strings.pleaseSelectTextDedupeFirst,
  );
  if (selection === null) return;

  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of selection.split(/\r?\n/)) {
    const content = options.trimBeforeCompare ? line.trim() : line;

    if (content === "") {
      result.push(line);
      continue;
    }

    if (!seen.has(content)) {
      seen.add(content);
      result.push(line);
    }
  }

  editor.replaceSelection(result.join("\n"));
  new Notice(format(strings.dedupeCompleted, { count: result.length }));
}

export function numberList(
  editor: Editor,
  startNumber = 1,
  stepNumber = 1,
  separator = ". ",
  prefix = "",
): void {
  const selection = requireSelection(
    editor,
    strings.pleaseSelectTextNumberFirst,
  );
  if (selection === null) return;

  let current = startNumber;
  const result = selection
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return line;
      const bare = line.replace(/^\s*\d+[.)）、]?\s*/, "");
      const numbered = `${prefix}${current}${separator}${bare}`;
      current += stepNumber;
      return numbered;
    })
    .join("\n");

  editor.replaceSelection(result);
  new Notice(`${strings.numberingCompletedStarting} ${startNumber}`);
}

function detectListPattern(text: string): RegExp | null {
  // Zero-width so the marker stays on its item and matches once each, keeping the
  // counts below honest. (?!\d) rules out decimals like "3.5".
  const numberedList = /(?=\d+[.、](?!\d))/g;
  const arrowSymbol = /\s*(?:→|⇒|=>|->)\s*/g;

  if ((text.match(numberedList) || []).length > 1) return numberedList;
  if ((text.match(arrowSymbol) || []).length > 1) return arrowSymbol;
  return null;
}

function detectSeparator(text: string): string | null {
  const candidates = ["、", "，", ",", ";", "；", "|", "·"];
  let best: string | null = null;
  let maxCount = 0;

  for (const sep of candidates) {
    const count = text.split(sep).length - 1;
    if (count > maxCount) {
      maxCount = count;
      best = sep;
    }
  }
  return best;
}

const BRACKET_PAIRS: Record<string, string> = {
  '"': '"',
  "'": "'",
  "“": "”",
  "‘": "’",
  "(": ")",
  "（": "）",
  "《": "》",
  "[": "]",
};

function splitOutsideBrackets(text: string, separator: string): string[] {
  const chars = [...text];
  const parts: string[] = [];
  let current = "";
  let closer: string | null = null;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (closer) {
      current += char;
      if (char === closer) closer = null;
      continue;
    }

    const pair = BRACKET_PAIRS[char];
    // A symmetric quote opens only at a word boundary, so "don't" is an apostrophe.
    const opens =
      pair && (pair !== char || i === 0 || /[\s([{]/.test(chars[i - 1]));

    if (opens) {
      closer = pair;
      current += char;
    } else if (char === separator) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Nothing ever closed the group, so the guess was wrong — split anyway.
  if (closer) return text.split(separator).map((s) => s.trim()).filter(Boolean);

  if (current) parts.push(current.trim());
  return parts.filter(Boolean);
}
