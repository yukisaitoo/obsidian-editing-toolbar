import { Editor } from "obsidian";
import type { Registrar } from "src/commands/registrars/types";

export const registerClipboardAndHistoryCommands: Registrar = ({
  addEditorCommand,
}) => {
  addEditorCommand({
    id: "editor-undo",
    name: "Undo edit",
    icon: "undo-glyph",
    run: (editor) => editor.undo(),
  });

  addEditorCommand({
    id: "editor-redo",
    name: "Redo edit",
    icon: "redo-glyph",
    run: (editor) => editor.redo(),
  });

  const addClipboardCommand = (
    id: string,
    name: string,
    icon: string,
    run: (editor: Editor) => Promise<void>,
  ) => addEditorCommand({ id, name, icon, run });

  addClipboardCommand("editor-copy", "Copy", "lucide-copy", async (editor) => {
    const text = editor.getSelection();
    if (!text) return;
    await navigator.clipboard.writeText(text);
  });

  addClipboardCommand(
    "editor-cut",
    "Cut",
    "lucide-scissors",
    async (editor) => {
      const text = editor.getSelection();
      if (!text) return;
      await navigator.clipboard.writeText(text);
      editor.replaceSelection("");
    },
  );

  addClipboardCommand(
    "editor-paste",
    "Paste",
    "lucide-clipboard-type",
    async (editor) => {
      const text = await navigator.clipboard.readText();
      if (text) editor.replaceSelection(text);
    },
  );
};
