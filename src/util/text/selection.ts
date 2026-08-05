import { Editor } from "obsidian";

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
