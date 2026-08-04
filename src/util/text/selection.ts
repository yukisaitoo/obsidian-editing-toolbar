import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";

/** A non-empty selection, or null once the prompt has been shown. */
export function requireSelection(
  editor: Editor,
  emptyMessage: string = strings.pleaseSelectTextFirst,
): string | null {
  const selection = editor.getSelection();
  if (!selection || selection.trim() === "") {
    new Notice(emptyMessage);
    return null;
  }
  return selection;
}

/** The current selection, or the paragraph around the cursor, which it selects. */
export function selectionOrParagraph(editor: Editor): string | null {
  const selection = editor.getSelection();
  if (selection.trim() !== "") return selection;

  const isBlank = (line: number) => editor.getLine(line).trim() === "";
  const cursor = editor.getCursor();
  if (isBlank(cursor.line)) {
    new Notice(strings.pleaseSelectTextFirst);
    return null;
  }

  let start = cursor.line;
  let end = cursor.line;
  while (start > 0 && !isBlank(start - 1)) start--;
  while (end < editor.lineCount() - 1 && !isBlank(end + 1)) end++;

  editor.setSelection(
    { line: start, ch: 0 },
    { line: end, ch: editor.getLine(end).length },
  );
  return editor.getSelection();
}

export function selectAt(editor: Editor, offset: number, length: number): void {
  editor.setSelection(
    editor.offsetToPos(offset),
    editor.offsetToPos(offset + length),
  );
}

/** Replaces the selection and leaves the replacement itself selected. */
export function replaceSelectionAndSelect(editor: Editor, text: string): void {
  const start = editor.posToOffset(editor.getCursor("from"));
  editor.replaceSelection(text);
  selectAt(editor, start, text.length);
}
