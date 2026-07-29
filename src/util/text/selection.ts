import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";

/**
 * The single gate for selection-backed tools: a string result is guaranteed
 * non-empty, otherwise the prompt has already been shown and the caller bails.
 */
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
