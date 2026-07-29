import { Editor } from "obsidian";

import { CommandPlot } from "src/commands/commandDefinitions";
import { registerClipboardAndHistoryCommands } from "src/commands/registrars/clipboard";
import { registerCoreCommands } from "src/commands/registrars/core";
import { registerFormattingCommands } from "src/commands/registrars/formatting";
import { registerInsertCommands } from "src/commands/registrars/insert";
import { registerTextToolCommands } from "src/commands/registrars/textTools";
import type {
  Registrar,
  RegistrarContext,
} from "src/commands/registrars/types";
import EditingToolbarPlugin from "src/plugin/main";

const REGISTRARS: Registrar[] = [
  registerCoreCommands,
  registerTextToolCommands,
  registerFormattingCommands,
  registerClipboardAndHistoryCommands,
  registerInsertCommands,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped Obsidian canvas view
type CanvasView = any;

/** Owns editor access and the shared command mechanics; registrars own the lists. */
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
      this.plugin.app.workspace.activeLeaf?.view?.editor ??
      null
    );
  }

  // The single validation point for editor-backed commands: downstream actions
  // get a guaranteed-live editor and never re-check. Focus is restored after,
  // since clicking a toolbar button takes it off the editor.
  public runOnEditor = (action: (editor: Editor) => unknown): void => {
    const editor = this.getActiveEditor();
    if (!editor) return;
    void Promise.resolve(action(editor)).then(() => editor.focus());
  };

  private runHistoryAction = (action: "undo" | "redo"): void => {
    if (this.runCanvasHistoryAction(action)) return;

    const editor = this.getActiveEditor();
    if (editor) {
      this.runOnEditor(() => (action === "undo" ? editor.undo() : editor.redo()));
      return;
    }

    // No editor and no canvas — let whichever core command is applicable answer.
    const fallbacks =
      action === "undo"
        ? ["canvas:undo", "editor:undo"]
        : ["canvas:redo", "editor:redo"];
    fallbacks.some((id) => {
      try {
        return this.plugin.app.commands.executeCommandById(id);
      } catch {
        return false;
      }
    });
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
    const active = this.plugin.app.workspace.activeLeaf?.view;
    if (active?.getViewType?.() === "canvas") return active;

    const leaves = this.plugin.app.workspace.getLeavesOfType?.("canvas") ?? [];
    return leaves.find((leaf) => leaf?.view?.getViewType?.() === "canvas")?.view ?? null;
  }

  /**
   * Wraps the selection in `command`'s prefix/suffix, or unwraps it when the
   * surrounding text already matches — the toggle behind bold, italics, etc.
   */
  public applyCommand = (command: CommandPlot, editor: Editor): void => {
    const selectedText = editor.getSelection();
    const cursorStart = editor.getCursor("from");
    const cursorEnd = editor.getCursor("to");
    const suffix = command.suffix;
    const prefix =
      command.islinehead && cursorStart.ch > 0
        ? "\n" + command.prefix
        : command.prefix;

    const preStart = {
      line: cursorStart.line - command.line,
      ch: cursorStart.ch - prefix.length,
    };
    const sufEnd = {
      line: cursorStart.line + command.line,
      ch: cursorEnd.ch + suffix.length,
    };

    if (
      editor.getRange(preStart, cursorStart) === prefix &&
      editor.getRange(cursorEnd, sufEnd) === suffix
    ) {
      editor.replaceRange(selectedText, preStart, sufEnd);
      editor.setCursor(cursorStart.line - command.line, cursorStart.ch);
      selectRange(editor, cursorStart.line, preStart.ch, selectedText.length);
      return;
    }

    editor.replaceSelection(`${prefix}${selectedText}${suffix}`);

    if (command.char > 0) {
      editor.setCursor(
        cursorStart.line + command.line,
        cursorStart.ch + command.char + selectedText.length,
      );
      return;
    }
    selectRange(
      editor,
      cursorStart.line,
      cursorStart.ch + prefix.length,
      selectedText.length,
    );
  };
}

function selectRange(
  editor: Editor,
  line: number,
  ch: number,
  length: number,
): void {
  editor.setSelection({ line, ch }, { line, ch: ch + length });
}
