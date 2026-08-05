import { Editor } from "obsidian";

const CALLOUT_HEAD = /^>\s*\[![\w\s]*\]/m;
const CALLOUT_LINE = /^(>+)\s*\[!([\w\s]*)\]\s*(.*?)$/;

// Emphasis delimiters have to hug non-space and sit on a word boundary, or
// `snake_case`, `a * b` and underscored URLs get eaten.
const MARKDOWN_STRIPPERS: [RegExp, string][] = [
  [/^ {0,3}```.*$/gm, ""],
  [/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, ""],
  [/^ {0,3}(#{1,6} +|> ?|- \[[ x]\] +|[-*+] +|\d+\. +)/gm, ""],
  [/<[^<>]+>/g, ""],
  [/!?\[\[[^[\]]*\|([^[\]|]+)\]\]/g, "$1"],
  [/!?\[\[([^[\]|]+)\]\]/g, "$1"],
  [/!?\[([^[\]]*)\]\([^()]*\)/g, "$1"],
  [/`([^`\n]+)`/g, "$1"],
  [/(?<!\w)(\*\*\*|___)(\S(?:.*?\S)?)\1(?!\w)/g, "$2"],
  [/(?<!\w)(\*\*|__)(\S(?:.*?\S)?)\1(?!\w)/g, "$2"],
  [/(?<!\w)([*_])(\S(?:.*?\S)?)\1(?!\w)/g, "$2"],
  [/==(\S(?:.*?\S)?)==/g, "$1"],
  [/~~(\S(?:.*?\S)?)~~/g, "$1"],
  [/^[ \t]+|[ \t]+$/gm, ""],
];

export function setFormatEraser(editor: Editor): void {
  const selection = editor.getSelection();
  if (!selection.trim()) return;

  editor.replaceSelection(
    CALLOUT_HEAD.test(selection)
      ? unwrapCallout(selection)
      : stripInlineMarkdown(selection),
  );
}

function stripInlineMarkdown(text: string): string {
  return MARKDOWN_STRIPPERS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text,
  );
}

function unwrapCallout(text: string): string {
  let level = 0;
  let inCallout = false;
  let seenHeader = false;

  return text
    .split("\n")
    .flatMap((line) => {
      const header = line.match(CALLOUT_LINE);
      if (header && !seenHeader) {
        level = header[1].length;
        seenHeader = true;
        inCallout = true;
        return header[3].trim() ? [header[3].trim()] : [];
      }

      if (!inCallout) return [line];

      const prefix = line.match(/^(>+)\s*/);
      if (prefix && prefix[1].length >= level) {
        return [line.replace(new RegExp(`^>{${level}}\\s*`), "")];
      }

      inCallout = false;
      return [line];
    })
    .join("\n");
}
