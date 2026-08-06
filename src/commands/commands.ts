import { Editor } from "obsidian";

import { CommandPlot } from "src/commands/commandDefinitions";
import { registerClipboardAndHistoryCommands } from "src/commands/registrars/clipboard";
import { registerCoreCommands } from "src/commands/registrars/core";
import { registerFormattingCommands } from "src/commands/registrars/formatting";
import { registerInsertCommands } from "src/commands/registrars/insert";
import type {
  Registrar,
  RegistrarContext,
} from "src/commands/registrars/types";
import EditingToolbarPlugin from "src/plugin/main";
import { selectAt } from "src/util/text/selection";

const REGISTRARS: Registrar[] = [
  registerCoreCommands,
  registerFormattingCommands,
  registerClipboardAndHistoryCommands,
  registerInsertCommands,
];

export class CommandsManager {
  constructor(private plugin: EditingToolbarPlugin) {}

  public registerCommands(): void {
    const ctx: RegistrarContext = {
      plugin: this.plugin,
      runOnEditor: this.runOnEditor,
      applyCommand: this.applyCommand,
    };
    REGISTRARS.forEach((register) => register(ctx));
  }

  public getActiveEditor(): Editor | null {
    return this.plugin.app.workspace.activeEditor?.editor ?? null;
  }

  // Focus is restored after: clicking a toolbar button takes it off the editor.
  public runOnEditor = (action: (editor: Editor) => unknown): void => {
    const editor = this.getActiveEditor();
    if (!editor) return;
    void (async () => {
      try {
        await action(editor);
      } catch (error) {
        console.error("editing-toolbar: command failed", error);
      } finally {
        editor.focus();
      }
    })();
  };

  // Wraps the selection in `command`'s prefix/suffix, or unwraps it when the text
  // already matches — the toggle behind bold, italics and friends.
  public applyCommand = (command: CommandPlot, editor: Editor): void => {
    const selectedText = editor.getSelection();
    const start = editor.getCursor("from");
    const end = editor.getCursor("to");
    const { prefix, suffix } = command;

    const from = editor.posToOffset(start);
    const preStart = editor.offsetToPos(from - prefix.length);
    const sufEnd = editor.offsetToPos(editor.posToOffset(end) + suffix.length);

    if (
      editor.getRange(preStart, start) === prefix &&
      editor.getRange(end, sufEnd) === suffix
    ) {
      editor.replaceRange(selectedText, preStart, sufEnd);
      selectAt(editor, from - prefix.length, selectedText.length);
      return;
    }

    editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
    selectAt(editor, from + prefix.length, selectedText.length);
  };
}
