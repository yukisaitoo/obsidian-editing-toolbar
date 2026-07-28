import { Editor } from "obsidian";

import {
  CommandPlot,
  CORE_EDITOR_COMMANDS,
  WRAP_COMMAND_NAMES,
  WRAP_COMMANDS,
} from "src/commands/commandDefinitions";
import { BACKGROUND_COLOR_ICON, FONT_COLOR_ICON } from "src/icons/inlineIcons";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import { InsertLinkModal } from "src/modals/insertLinkModal";
import {
  IExtractBetweenResult,
  IWrapInputResult,
  TextInputModal,
} from "src/modals/TextInputModal";
import EditingToolbarPlugin from "src/plugin/main";
import { selfDestruct, setFormatEraser } from "src/toolbar/editingToolbar";
import { strings } from "src/translations/helper";
import { TextEnhancement } from "src/util/textEnhancement";
import { setMenuVisibility } from "src/util/toolbarVisibility";
import {
  renumberSelection,
  setBackgroundcolor,
  setFontcolor,
  setHeader,
} from "src/util/util";

export class CommandsManager {
  private plugin: EditingToolbarPlugin;

  constructor(plugin: EditingToolbarPlugin) {
    this.plugin = plugin;
  }

  private executeCommandWithoutBlur = async (
    editor: Editor,
    callback: () => unknown,
  ) => {
    await callback();
    editor.focus();
  };

  // Single validation point for editor-backed commands: resolve the active
  // editor, bail if there is none, and run the action with focus preserved.
  // Downstream actions receive a guaranteed-live editor and never re-check.
  private runOnEditor = (action: (editor: Editor) => unknown): void => {
    const editor = this.getActiveEditor();
    if (!editor) return;
    void this.executeCommandWithoutBlur(editor, () => action(editor));
  };

  private executeHistoryAction = (action: "undo" | "redo") => {
    if (this.executeCanvasHistoryAction(action)) {
      return;
    }

    const editor = this.getActiveEditor();
    if (editor) {
      void this.executeCommandWithoutBlur(editor, () =>
        action === "undo" ? editor.undo() : editor.redo(),
      );
      return;
    }

    const fallbackCommandIds =
      action === "undo"
        ? ["canvas:undo", "editor:undo"]
        : ["canvas:redo", "editor:redo"];

    for (const commandId of fallbackCommandIds) {
      try {
        if (this.plugin.app.commands.executeCommandById(commandId)) {
          return;
        }
      } catch {
        continue;
      }
    }
  };

  private executeCanvasHistoryAction(action: "undo" | "redo"): boolean {
    const activeView = this.getActiveCanvasView();
    if (activeView?.getViewType?.() !== "canvas") {
      return false;
    }

    try {
      activeView.canvas?.wrapperEl?.focus?.({ preventScroll: true });
    } catch {
      // noop
    }

    const invocationCandidates: Array<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamically-invoked untyped canvas API objects
      owner: any;
      method: string;
      label: string;
    }> = [
      { owner: activeView.canvas, method: action, label: `canvas.${action}()` },
      {
        owner: activeView.canvas?.history,
        method: action === "undo" ? "back" : "forward",
        label: `canvas.history.${action === "undo" ? "back" : "forward"}()`,
      },
    ];

    for (const candidate of invocationCandidates) {
      const fn = candidate.owner?.[candidate.method];
      if (typeof fn === "function") {
        fn.call(candidate.owner);
        return true;
      }
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped Obsidian canvas view
  private getActiveCanvasView(): any | null {
    const activeLeafView = this.plugin.app.workspace.activeLeaf?.view;
    if (activeLeafView?.getViewType?.() === "canvas") {
      return activeLeafView;
    }

    const canvasLeaves =
      this.plugin.app.workspace.getLeavesOfType?.("canvas") ?? [];
    for (const leaf of canvasLeaves) {
      const view = leaf?.view;
      if (view?.getViewType?.() === "canvas") {
        return view;
      }
    }

    return null;
  }

  public applyCommand = (command: CommandPlot, editor: Editor) => {
    const selectedText = editor.getSelection();
    const cursorStart = editor.getCursor("from");
    const cursorEnd = editor.getCursor("to");
    let prefix = command.prefix;

    if (command.islinehead && cursorStart.ch > 0) {
      prefix = "\n" + prefix;
    }
    const suffix = command.suffix;

    const preStart = {
      line: cursorStart.line - command.line,
      ch: cursorStart.ch - prefix.length,
    };
    const pre = editor.getRange(preStart, cursorStart);

    if (pre == prefix) {
      const sufEnd = {
        line: cursorStart.line + command.line,
        ch: cursorEnd.ch + suffix.length,
      };
      const suf = editor.getRange(cursorEnd, sufEnd);
      if (suf == suffix) {
        editor.replaceRange(selectedText, preStart, sufEnd);
        editor.setCursor(cursorStart.line - command.line, cursorStart.ch);
        const newSelectionStart = {
          line: cursorStart.line,
          ch: cursorStart.ch - prefix.length,
        };
        const newSelectionEnd = {
          line: cursorStart.line,
          ch: newSelectionStart.ch + selectedText.length,
        };
        editor.setSelection(newSelectionStart, newSelectionEnd);
        return;
      }
    }
    editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
    if (command.char > 0) {
      editor.setCursor(
        cursorStart.line + command.line,
        cursorStart.ch + command.char + selectedText.length,
      );
    } else {
      const originalSelectionStart = cursorStart;

      const newSelectionStart = {
        line: originalSelectionStart.line,
        ch: originalSelectionStart.ch + prefix.length,
      };
      const newSelectionEnd = {
        line: originalSelectionStart.line,
        ch: newSelectionStart.ch + selectedText.length,
      };

      editor.setSelection(newSelectionStart, newSelectionEnd);
    }
  };

  public getActiveEditor(): Editor | null {
    const activeEditor = this.plugin.app.workspace?.activeEditor;
    if (activeEditor && activeEditor.editor) {
      return activeEditor.editor;
    }

    try {
      const activeLeafEditor =
        this.plugin.app.workspace.activeLeaf?.view?.editor;
      if (activeLeafEditor) {
        return activeLeafEditor;
      }
    } catch {}
    return null;
  }

  public registerCommands() {
    this.registerCoreCommands();
    this.registerToolbarToggleCommands();
    this.registerTextToolCommands();
    this.registerFormattingCommands();
    this.registerClipboardAndHistoryCommands();
    this.registerInsertCommands();
    this.registerHeadingCommands();
    this.registerMappedCommands();
  }

  private registerCoreCommands() {
    this.plugin.addCommand({
      id: "renumber-ordered-list",
      name: "Renumber ordered list",
      editorCallback: (editor: Editor) => {
        void this.executeCommandWithoutBlur(editor, () =>
          renumberSelection(editor),
        );
      },
    });
    this.plugin.addCommand({
      id: "hide-show-menu",
      name: "Toggle toolbar",
      icon: "editingToolbar",
      callback: async () => {
        this.plugin.settings.cMenuVisibility =
          !this.plugin.settings.cMenuVisibility;
        if (this.plugin.settings.cMenuVisibility) {
          setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100);
        } else {
          setMenuVisibility(this.plugin.settings.cMenuVisibility);
        }
        selfDestruct(this.plugin);
        await this.plugin.saveSettings();
      },
    });
  }

  private registerToolbarToggleCommands() {
    this.plugin.addCommand({
      id: "toggle-top-toolbar",
      name: "Toggle top toolbar",
      callback: () =>
        this.plugin.setToolbarStyleEnabled(
          "top",
          !this.plugin.settings.enableTopToolbar,
        ),
    });

    this.plugin.addCommand({
      id: "toggle-following-toolbar",
      name: "Toggle selection toolbar",
      callback: () =>
        this.plugin.setToolbarStyleEnabled(
          "following",
          !this.plugin.settings.enableFollowingToolbar,
        ),
    });
  }

  private registerTextToolCommands() {
    this.plugin.addCommand({
      id: "get-plain-text",
      name: "Get plain text",
      editorCallback: (editor: Editor) => {
        TextEnhancement.getPlainText(editor);
      },
    });

    this.plugin.addCommand({
      id: "insert-blank-lines",
      name: "Insert blank lines",
      editorCallback: (editor: Editor) => {
        TextEnhancement.insertBlankLines(editor);
      },
    });

    this.plugin.addCommand({
      id: "remove-blank-lines",
      name: "Remove blank lines",
      editorCallback: (editor) =>
        TextEnhancement.processWhitespace(editor, { removeEmptyLines: true }),
    });

    this.plugin.addCommand({
      id: "split-lines",
      name: "Split lines",
      editorCallback: (editor: Editor) => {
        TextEnhancement.splitLines(editor);
      },
    });

    this.plugin.addCommand({
      id: "smart-symbols",
      name: "Convert punctuation width",
      editorCallback: (editor: Editor) => {
        TextEnhancement.smartTypography(editor);
      },
    });

    this.plugin.addCommand({
      id: "dedupe-lines",
      name: "Dedupe lines",
      editorCallback: (editor) =>
        TextEnhancement.dedupe(editor, { trimBeforeCompare: true }),
    });

    this.plugin.addCommand({
      id: "add-wrap",
      name: "Add prefix/suffix",
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          strings.addPrefixSuffix,
          [
            {
              key: "prefix",
              label: strings.prefix,
              placeholder: strings.enterPrefix,
              defaultValue: "",
            },
            {
              key: "suffix",
              label: strings.suffix,
              placeholder: strings.enterSuffix,
              defaultValue: "",
            },
          ],
          (result) => {
            const typedResult = result as unknown as IWrapInputResult;
            TextEnhancement.addWrap(
              editor,
              typedResult.prefix,
              typedResult.suffix,
              true,
            );
          },
        ).open();
      },
    });

    this.plugin.addCommand({
      id: "number-lines",
      name: "Number lines (custom)",
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          strings.numberLinesConfiguration,
          [
            {
              key: "start",
              label: strings.startNumber,
              placeholder: "1",
              defaultValue: "1",
            },
            {
              key: "step",
              label: strings.step,
              placeholder: "1",
              defaultValue: "1",
            },
            {
              key: "sep",
              label: strings.separator,
              placeholder: ". ",
              defaultValue: ". ",
            },
          ],
          (result) => {
            const start = parseInt(result.start) || 1;
            const step = parseInt(result.step) || 1;
            const sep = result.sep || ". ";

            TextEnhancement.numberList(editor, start, step, sep, "");
          },
        ).open();
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-trim",
      name: "Trim line ends",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { trim: true });
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-compress",
      name: "Shrink extra spaces",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { compress: true });
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-all",
      name: "Remove all whitespace",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { all: true });
      },
    });
    this.plugin.addCommand({
      id: "list-to-table",
      name: strings.listTable,
      editorCallback: (editor: Editor) => {
        TextEnhancement.convertListToTableMultiDim(editor);
      },
    });

    this.plugin.addCommand({
      id: "table-to-list",
      name: strings.tableList,
      editorCallback: (editor: Editor) =>
        TextEnhancement.convertTableToList(editor),
    });
    this.plugin.addCommand({
      id: "extract-between",
      name: "Extract between strings",
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          strings.extractBetweenStrings,
          [
            {
              key: "start",
              label: strings.startString,
              placeholder: strings.enterStartString,
              defaultValue: "[",
            },
            {
              key: "end",
              label: strings.endString,
              placeholder: strings.enterEndString,
              defaultValue: "]",
            },
          ],
          (result) => {
            const typedResult = result as unknown as IExtractBetweenResult;
            TextEnhancement.extractBetween(
              editor,
              typedResult.start,
              typedResult.end,
            );
          },
        ).open();
      },
    });

    this.plugin.addCommand({
      id: "merge-lines",
      name: strings.mergeLines,
      editorCallback: (editor: Editor) => {
        new TextInputModal(
          this.plugin.app,
          strings.mergeLinesSettings,
          [
            {
              key: "sep",
              label: strings.separatorLeaveEmptySmartSpacing,
              placeholder: strings.eGCommaPipeArrow,
              defaultValue: "",
            },
          ],
          (result) => {
            TextEnhancement.mergeLines(editor, {
              separator: result.sep,
              preserveParagraphs: result.sep === "",
              trimLines: true,
            });
          },
        ).open();
      },
    });
  }

  private registerFormattingCommands() {
    this.plugin.addCommand({
      id: "format-eraser",
      name: "Format eraser",
      callback: () =>
        this.runOnEditor((editor) => setFormatEraser(this.plugin, editor)),
      icon: `eraser`,
    });

    this.plugin.addCommand({
      id: "change-font-color",
      name: "Change font color",
      callback: () =>
        this.runOnEditor((editor) =>
          setFontcolor(this.plugin.settings.cMenuFontColor, editor),
        ),
      icon: FONT_COLOR_ICON,
    });

    this.plugin.addCommand({
      id: "change-background-color",
      name: "Change background color",
      callback: () =>
        this.runOnEditor((editor) =>
          setBackgroundcolor(this.plugin.settings.cMenuBackgroundColor, editor),
        ),
      icon: BACKGROUND_COLOR_ICON,
    });
    this.plugin.addCommand({
      id: "indent-list",
      name: "Indent list",
      callback: () => this.runOnEditor((editor) => editor.indentList()),
      icon: "indent-glyph",
    });
    this.plugin.addCommand({
      id: "undent-list",
      name: "Unindent list",
      callback: () => this.runOnEditor((editor) => editor.unindentList()),
      icon: "unindent-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-numbered-list",
      name: "Toggle ordered list",
      callback: () => this.runOnEditor((editor) => editor.toggleNumberList()),
      icon: "number-list-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-bullet-list",
      name: "Toggle unordered list",
      callback: () => this.runOnEditor((editor) => editor.toggleBulletList()),
      icon: "bullet-list-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-highlight",
      name: "Toggle highlight",
      callback: () =>
        this.runOnEditor((editor) =>
          editor.toggleMarkdownFormatting("highlight"),
        ),
      icon: "highlight-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-bold",
      name: "Toggle bold",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleMarkdownFormatting("bold")),
      icon: "bold-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-italics",
      name: "Toggle italics",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleMarkdownFormatting("italic")),
      icon: "italic-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-strikethrough",
      name: "Toggle strikethrough",
      callback: () =>
        this.runOnEditor((editor) =>
          editor.toggleMarkdownFormatting("strikethrough"),
        ),
      icon: "strikethrough-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-inline-math",
      name: "Toggle inline math",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleMarkdownFormatting("math")),
      icon: "lucide-sigma",
    });
    this.plugin.addCommand({
      id: "editor:cycle-list-checklist",
      name: "Cycle list and checklist",
      icon: "lucide-check-square",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleCheckList(true)),
    });
  }

  private registerClipboardAndHistoryCommands() {
    this.plugin.addCommand({
      id: "editor-undo",
      name: "Undo edit",
      callback: () => {
        this.executeHistoryAction("undo");
      },
      icon: "undo-glyph",
    });
    this.plugin.addCommand({
      id: "editor-redo",
      name: "Redo edit",
      callback: () => {
        this.executeHistoryAction("redo");
      },
      icon: "redo-glyph",
    });
    this.plugin.addCommand({
      id: "editor-copy",
      name: "Copy",
      callback: () =>
        this.runOnEditor(async (editor) => {
          try {
            await window.navigator.clipboard.writeText(editor.getSelection());
            this.plugin.app.commands.executeCommandById("editor:focus");
          } catch (error) {
            console.error("Copy failed:", error);
          }
        }),
      icon: "lucide-copy",
    });
    this.plugin.addCommand({
      id: "editor-paste",
      name: "Paste",
      callback: () =>
        this.runOnEditor(async (editor) => {
          try {
            const text = await window.navigator.clipboard.readText();
            if (text) editor.replaceSelection(text);
            this.plugin.app.commands.executeCommandById("editor:focus");
          } catch (error) {
            console.error("Paste failed:", error);
          }
        }),
      icon: "lucide-clipboard-type",
    });
    this.plugin.addCommand({
      id: "editor-cut",
      name: "Cut",
      callback: () =>
        this.runOnEditor(async (editor) => {
          try {
            await window.navigator.clipboard.writeText(editor.getSelection());
            editor.replaceSelection("");
            this.plugin.app.commands.executeCommandById("editor:focus");
          } catch (error) {
            console.error("Cut failed:", error);
          }
        }),
      icon: "lucide-scissors",
    });
  }

  private registerInsertCommands() {
    this.plugin.addCommand({
      id: "insert-callout",
      name: "Insert callout…",
      icon: "lucide-quote",
      callback: () => {
        const modal = new InsertCalloutModal(this.plugin);
        modal.open();
      },
    });
    this.plugin.addCommand({
      id: "insert-link",
      name: "Insert link…",
      icon: "lucide-link",
      callback: () => {
        const modal = new InsertLinkModal(this.plugin);
        modal.open();
      },
    });
  }

  private registerHeadingCommands() {
    for (let i = 0; i <= 6; i++) {
      this.plugin.addCommand({
        id: `header${i}-text`,
        name: i === 0 ? "Remove header level" : `Header ${i}`,
        callback: () =>
          this.runOnEditor((editor) => setHeader("#".repeat(i), editor)),
        icon: i === 0 ? "heading-glyph" : `header-${i}`,
      });
    }
  }

  private registerMappedCommands() {
    Object.entries(WRAP_COMMANDS).forEach(([name, plot]) => {
      this.plugin.addCommand({
        id: name,
        name: WRAP_COMMAND_NAMES[name] ?? `Toggle ${name}`,
        icon: `${name}-glyph`,
        callback: () =>
          this.runOnEditor((editor) => this.applyCommand(plot, editor)),
      });
    });

    CORE_EDITOR_COMMANDS.forEach((command) => {
      this.plugin.addCommand({
        id: command.id,
        name: command.name,
        icon: command.icon,
        callback: () =>
          this.runOnEditor(async (editor) => {
            const cursorEnd = editor.getCursor("to");
            const offset = this.getCharacterOffset(command.id);
            await this.plugin.app.commands.executeCommandById(command.id);
            if (offset !== 0) {
              editor.setCursor(cursorEnd.line, cursorEnd.ch + offset);
            }
          }),
      });
    });
  }

  // Obsidian leaves the cursor inside the markup it just inserted for these two;
  // nudge past it so typing continues after the insertion.
  private getCharacterOffset(commandId: string): number {
    switch (commandId) {
      case "editor:insert-tag":
        return 1;
      case "editor:insert-callout":
        return 11;
      default:
        return 0;
    }
  }
}
