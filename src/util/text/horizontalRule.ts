import { Editor } from "obsidian";

export function insertHorizontalRule(editor: Editor): void {
  const from = editor.getCursor("from");
  const before = editor.getLine(from.line).slice(0, from.ch);
  const prevLine = from.line > 0 ? editor.getLine(from.line - 1) : "";

  // `---` directly under a non-empty line is a setext heading, not a rule.
  const lead =
    before.trim() !== "" ? "\n\n" : prevLine.trim() !== "" ? "\n" : "";

  editor.replaceSelection(`${lead}---\n`);
}
