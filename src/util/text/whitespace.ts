import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";
import { requireSelection } from "src/util/text/selection";

export interface WhitespaceOptions {
  trim?: boolean;
  compress?: boolean;
  all?: boolean;
  tabs?: boolean;
  removeEmptyLines?: boolean;
  compactEmptyLines?: boolean;
}

export function processWhitespace(
  editor: Editor,
  options: WhitespaceOptions = {},
): void {
  const selection = requireSelection(editor);
  if (selection === null) return;

  let result = selection;
  if (options.all) {
    result = result.replace(/[ \u3000\t]+/g, "");
  } else {
    if (options.tabs) result = result.replace(/\t/g, "");
    if (options.compress) result = result.replace(/[ \u3000]+/g, " ");
  }

  let lines = result.split(/\r?\n/);
  if (options.trim) lines = lines.map((line) => line.trim());

  if (options.removeEmptyLines) {
    lines = lines.filter((line) => line.length > 0);
  } else if (options.compactEmptyLines) {
    lines = lines.filter(
      (line, i) => line.length > 0 || lines[i - 1]?.length !== 0,
    );
  }

  result = lines.join("\n");
  editor.replaceSelection(options.removeEmptyLines ? result.trim() : result);
  new Notice(strings.whitespaceCleaningCompleted);
}

const MARKDOWN_SYNTAX =
  /(^#+\s|(?<=^|\s*)#|^>|^- \[( |x)\]|^\+ |<[^<>]+>|^1\. |^-+$|^\*+$|==|\*+|~~|```|!*\[\[|\]\])/gm;

export function copySelectionAsPlainText(editor: Editor): void {
  const selection = requireSelection(editor);
  if (selection === null) return;

  const plainText = selection
    .replace(/\[([^[\]]*)\]\([^()]+\)/gim, "$1")
    .replace(MARKDOWN_SYNTAX, "")
    .replace(/^[ ]+|[ ]+$/gm, "")
    .replace(/(\r\n|\n)+/gm, "\n");

  navigator.clipboard
    .writeText(plainText)
    .then(() => new Notice(strings.plainTextCopiedClipboard))
    .catch((error) =>
      console.error("editing-toolbar: failed to copy plain text", error),
    );
}
