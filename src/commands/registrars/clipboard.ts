import { Editor } from "obsidian";
import type { Registrar } from "src/commands/registrars/types";

export const registerClipboardAndHistoryCommands: Registrar = ({
  plugin,
  runOnEditor,
  runHistoryAction,
}) => {
  plugin.addCommand({
    id: "editor-undo",
    name: "Undo edit",
    icon: "undo-glyph",
    callback: () => runHistoryAction("undo"),
  });

  plugin.addCommand({
    id: "editor-redo",
    name: "Redo edit",
    icon: "redo-glyph",
    callback: () => runHistoryAction("redo"),
  });

  // Each of these hands focus back to the editor, which the clipboard await drops.
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
      callback: () =>
        runOnEditor(async (editor) => {
          await run(editor);
          plugin.app.commands.executeCommandById("editor:focus");
        }),
    });

  addClipboardCommand("editor-copy", "Copy", "lucide-copy", (editor) =>
    navigator.clipboard.writeText(editor.getSelection()),
  );

  addClipboardCommand(
    "editor-cut",
    "Cut",
    "lucide-scissors",
    async (editor) => {
      await navigator.clipboard.writeText(editor.getSelection());
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
