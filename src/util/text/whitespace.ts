import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";
import { requireSelection } from "src/util/text/selection";

export interface WhitespaceOptions {
  trim?: boolean;
  compress?: boolean;
  all?: boolean;
  removeEmptyLines?: boolean;
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
  } else if (options.compress) {
    result = result.replace(/[ \u3000]+/g, " ");
  }

  let lines = result.split(/\r?\n/);
  if (options.trim) lines = lines.map((line) => line.trim());
  if (options.removeEmptyLines) {
    lines = lines.filter((line) => line.length > 0);
  }

  result = lines.join("\n");
  editor.replaceSelection(options.removeEmptyLines ? result.trim() : result);
  new Notice(strings.whitespaceCleaningCompleted);
}
