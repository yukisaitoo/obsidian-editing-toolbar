import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";
import { requireSelection } from "src/util/text/selection";

export function insertBlankLines(editor: Editor): void {
  const text = editor.getValue();
  if (!text) return;
  editor.setValue(text.replace(/([^\n])\n([^\n])/g, "$1\n\n$2"));
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

  editor.replaceSelection(splitOutsideBrackets(selection, separator).join("\n"));
  new Notice(`${strings.merged} '${separator}' ${strings.mergeCompleted}`);
}

export function mergeLines(
  editor: Editor,
  options: {
    separator?: string;
    preserveParagraphs?: boolean;
    trimLines?: boolean;
  },
): void {
  const selection = requireSelection(editor, strings.pleaseSelectLinesMergeFirst);
  if (selection === null) return;

  const hasCustomSep = options.separator !== "";
  let result = "";

  for (const raw of selection.split(/\r?\n/)) {
    const line = options.trimLines ? raw.trim() : raw;

    if (line === "") {
      if (options.preserveParagraphs && !hasCustomSep) result += "\n\n";
      continue;
    }

    if (result !== "" && !result.endsWith("\n")) {
      result += hasCustomSep ? options.separator : joinerFor(result, line);
    }
    result += line;
  }

  editor.replaceSelection(result.replace(/[ ]{2,}/g, " ").trim());
  new Notice(
    hasCustomSep
      ? `${strings.merged} '${options.separator}'`
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
  options: {
    includeEmpty?: boolean;
    trimBeforeCompare?: boolean;
    sort?: boolean;
  } = {},
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

    // Blank lines are kept as spacing unless includeEmpty opts them into the
    // duplicate check.
    if (content === "" && !options.includeEmpty) {
      result.push(line);
      continue;
    }

    if (!seen.has(content)) {
      seen.add(content);
      result.push(line);
    }
  }

  if (options.sort) {
    result.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  }

  editor.replaceSelection(result.join("\n"));
  new Notice(
    `${strings.deduplicationCompletedRemaining} ${result.length} ${strings.lines}`,
  );
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

/** A numbered or arrow-delimited run only counts if it repeats. */
function detectListPattern(text: string): RegExp | null {
  const numberedList = /\s?\d+[.、]\s?/g;
  const arrowSymbol = /\s?[→=>]\s?/g;

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

/** Splits on `separator` but leaves quoted and bracketed spans intact. */
function splitOutsideBrackets(text: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let closer: string | null = null;

  for (const char of text) {
    if (closer) {
      current += char;
      if (char === closer) closer = null;
      continue;
    }

    if (BRACKET_PAIRS[char]) {
      closer = BRACKET_PAIRS[char];
      current += char;
    } else if (char === separator) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current) parts.push(current.trim());
  return parts.filter(Boolean);
}
