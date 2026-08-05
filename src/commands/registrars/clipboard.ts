import { Editor } from "obsidian";
import type { Registrar } from "src/commands/registrars/types";

export const registerClipboardAndHistoryCommands: Registrar = ({
  plugin,
  runOnEditor,
}) => {
  plugin.addCommand({
    id: "editor-undo",
    name: "Undo edit",
    icon: "undo-glyph",
    callback: () => runOnEditor((editor) => editor.undo()),
  });

  plugin.addCommand({
    id: "editor-redo",
    name: "Redo edit",
    icon: "redo-glyph",
    callback: () => runOnEditor((editor) => editor.redo()),
  });

  const addClipboardCommand = (
    id: string,
    name: string,
    icon: string,
    run: (editor: Editor) => Promise<void>,
  ) =>
    plugin.addCommand({
      id,
      name,
      icon,
      callback: () => runOnEditor(run),
    });

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
