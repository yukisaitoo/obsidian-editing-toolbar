import { Editor } from "obsidian";

const CALLOUT_HEAD = /^>\s*\[![\w\s]*\]/m;
const CALLOUT_LINE = /^(>+)\s*\[!([\w\s]*)\]\s*(.*?)$/;

const MARKDOWN_STRIPPERS: [RegExp, string][] = [
  [/(^#+\s|^#(?=\s)|^>|^- \[( |x)\]|^\+ |<[^<>]+?>|^1\. |^\s*- |^-+$|^\*+$)/gm, ""],
  [/^[ ]+|[ ]+$/gm, ""],
  [/!?\[\[([^[\]|]*\|)*([^()[\]]+)\]\]/g, "$2"],
  [/!?\[+([^[\]()]+)\]+\(([^()]+)\)/g, "$1"],
  [/`([^`]+)`/g, "$1"],
  [/_([^_]+)_/g, "$1"],
  [/==([^=]+)==/g, "$1"],
  [/\*\*\*([^*]+)\*\*\*/g, "$1"],
  [/\*\*?([^*]+)\*\*?/g, "$1"],
  [/~~([^~]+)~~/g, "$1"],
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
