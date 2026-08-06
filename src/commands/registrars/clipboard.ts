import type { Registrar } from "src/commands/registrars/types";

export const registerClipboardAndHistoryCommands: Registrar = ({
  addEditorCommand,
}) => {
  addEditorCommand({ id: "editor-undo", run: (editor) => editor.undo() });
  addEditorCommand({ id: "editor-redo", run: (editor) => editor.redo() });

  addEditorCommand({
    id: "editor-copy",
    run: async (editor) => {
      const text = editor.getSelection();
      if (!text) return;
      await navigator.clipboard.writeText(text);
    },
  });

  addEditorCommand({
    id: "editor-cut",
    run: async (editor) => {
      const text = editor.getSelection();
      if (!text) return;
      await navigator.clipboard.writeText(text);
      editor.replaceSelection("");
    },
  });

  addEditorCommand({
    id: "editor-paste",
    run: async (editor) => {
      const text = await navigator.clipboard.readText();
      if (text) editor.replaceSelection(text);
    },
  });
};
