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
