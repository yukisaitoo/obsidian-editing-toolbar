import { Editor, ItemView } from "obsidian";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped Obsidian canvas view
type CanvasView = any;

export class CommandsManager {
  constructor(private plugin: EditingToolbarPlugin) {}

  public registerCommands(): void {
    const ctx: RegistrarContext = {
      plugin: this.plugin,
      runOnEditor: this.runOnEditor,
      applyCommand: this.applyCommand,
      runHistoryAction: this.runHistoryAction,
    };
    REGISTRARS.forEach((register) => register(ctx));
  }

  public getActiveEditor(): Editor | null {
    return (
      this.plugin.app.workspace?.activeEditor?.editor ??
      this.plugin.app.workspace.getActiveViewOfType(ItemView)?.editor ??
      null
    );
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

  private runHistoryAction = (action: "undo" | "redo"): void => {
    if (this.runCanvasHistoryAction(action)) return;

    this.runOnEditor((editor) =>
      action === "undo" ? editor.undo() : editor.redo(),
    );
  };

  /** Canvas exposes undo/redo under two different names across versions. */
  private runCanvasHistoryAction(action: "undo" | "redo"): boolean {
    const view = this.getActiveCanvasView();
    if (!view) return false;

    view.canvas?.wrapperEl?.focus?.({ preventScroll: true });

    const candidates = [
      { owner: view.canvas, method: action },
      {
        owner: view.canvas?.history,
        method: action === "undo" ? "back" : "forward",
      },
    ];

    for (const { owner, method } of candidates) {
      const fn = owner?.[method];
      if (typeof fn === "function") {
        fn.call(owner);
        return true;
      }
    }
    return false;
  }

  private getActiveCanvasView(): CanvasView | null {
    const active = this.plugin.app.workspace.getActiveViewOfType(ItemView);
    if (active?.getViewType?.() === "canvas") return active;

    const leaves = this.plugin.app.workspace.getLeavesOfType?.("canvas") ?? [];
    return (
      leaves.find((leaf) => leaf?.view?.getViewType?.() === "canvas")?.view ??
      null
    );
  }

  // Wraps the selection in `command`'s prefix/suffix, or unwraps it when the text
  // already matches — the toggle behind bold, italics and friends.
  public applyCommand = (command: CommandPlot, editor: Editor): void => {
    const selectedText = editor.getSelection();
    const start = editor.getCursor("from");
    const end = editor.getCursor("to");
    const suffix = command.suffix;
    const prefix =
      command.islinehead && start.ch > 0
        ? "\n" + command.prefix
        : command.prefix;

    const from = editor.posToOffset(start);
    const preStart = editor.offsetToPos(Math.max(0, from - prefix.length));
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
