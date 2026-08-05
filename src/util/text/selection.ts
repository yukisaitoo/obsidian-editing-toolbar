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
