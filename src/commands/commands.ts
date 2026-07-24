import { Command, Editor } from "obsidian";

import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import { InsertLinkModal } from "src/modals/insertLinkModal";
import {
  IExtractBetweenResult,
  IWrapInputResult,
  TextInputModal,
} from "src/modals/TextInputModal";
import EditingToolbarPlugin from "src/plugin/main";
import { resolveNextPositionStyle } from "src/settings/settingsData";
import { selfDestruct, setFormatEraser } from "src/toolbar/editingToolbar";
import { strings } from "src/translations/helper";
import { fullscreenMode, workplacefullscreenMode } from "src/util/fullscreen";
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

  private _commandsMap: Record<string, CommandPlot> = {
    hrline: {
      char: 5,
      line: 1,
      prefix: "\n---",
      suffix: "\n",
      islinehead: true,
    },
    justify: {
      char: 0,
      line: 0,
      prefix: '<p align="justify">',
      suffix: "</p>",
      islinehead: false,
    },
    left: {
      char: 0,
      line: 0,
      prefix: '<p align="left">',
      suffix: "</p>",
      islinehead: false,
    },
    right: {
      char: 0,
      line: 0,
      prefix: '<p align="right">',
      suffix: "</p>",
      islinehead: false,
    },
    center: {
      char: 0,
      line: 0,
      prefix: "<center>",
      suffix: "</center>",
      islinehead: false,
    },
    underline: {
      char: 0,
      line: 0,
      prefix: "<u>",
      suffix: "</u>",
      islinehead: false,
    },
    superscript: {
      char: 0,
      line: 0,
      prefix: "<sup>",
      suffix: "</sup>",
      islinehead: false,
    },
    subscript: {
      char: 0,
      line: 0,
      prefix: "<sub>",
      suffix: "</sub>",
      islinehead: false,
    },
    codeblock: {
      char: 4,
      line: 0,
      prefix: "\n```\n",
      suffix: "\n```\n",
      islinehead: false,
    },
  };

  private modCommands: Command[] = [
    {
      id: "editor:insert-embed",
      name: "Insert Embed",
      icon: "note-glyph",
    },
    {
      id: "editor:insert-link",
      name: "Insert Link",
      icon: "link-glyph",
    },
    {
      id: "editor:insert-tag",
      name: "Insert Tag",
      icon: "price-tag-glyph",
    },
    {
      id: "editor:insert-wikilink",
      name: "Insert Internal link",
      icon: "bracket-glyph",
    },
    {
      id: "editor:toggle-code",
      name: "Insert Code",
      icon: "code-glyph",
    },
    {
      id: "editor:toggle-blockquote",
      name: "Insert Blockquote",
      icon: "lucide-text-quote",
    },
    {
      id: "editor:toggle-checklist-status",
      name: "Cycle List and Checklist",
      icon: "checkbox-glyph",
    },
    {
      id: "editor:toggle-comments",
      name: "Insert Comment",
      icon: "percent-sign-glyph",
    },

    {
      id: "editor:insert-callout",
      name: "Insert Callout",
      icon: "lucide-quote",
    },
    {
      id: "editor:insert-mathblock",
      name: "Insert MathBlock",
      icon: "lucide-sigma-square",
    },
    {
      id: "editor:insert-table",
      name: "Insert Table",
      icon: "lucide-table",
    },
    {
      id: "editor:swap-line-up",
      name: "Swap Line Up",
      icon: "lucide-corner-right-up",
    },
    {
      id: "editor:swap-line-down",
      name: "Swap Line Down",
      icon: "lucide-corner-right-down",
    },
    {
      id: "editor:attach-file",
      name: "Attach File",
      icon: "lucide-paperclip",
    },
    {
      id: "editor:clear-formatting",
      name: "Clear Formatting",
      icon: "lucide-eraser",
    },
  ];

  public applyCommand = (command: CommandPlot, editor: Editor) => {
    const selectedText = editor.getSelection();
    const curserStart = editor.getCursor("from");
    const curserEnd = editor.getCursor("to");
    let prefix = command.prefix;

    if (command.islinehead && curserStart.ch > 0) {
      prefix = "\n" + prefix;
    }
    const suffix = command.suffix;

    const preStart = {
      line: curserStart.line - command.line,
      ch: curserStart.ch - prefix.length,
    };
    const pre = editor.getRange(preStart, curserStart);

    if (pre == prefix) {
      const sufEnd = {
        line: curserStart.line + command.line,
        ch: curserEnd.ch + suffix.length,
      };
      const suf = editor.getRange(curserEnd, sufEnd);
      if (suf == suffix) {
        editor.replaceRange(selectedText, preStart, sufEnd);
        editor.setCursor(curserStart.line - command.line, curserStart.ch);
        const newSelectionStart = {
          line: curserStart.line,
          ch: curserStart.ch - prefix.length,
        };
        const newSelectionEnd = {
          line: curserStart.line,
          ch: newSelectionStart.ch + selectedText.length,
        };
        editor.setSelection(newSelectionStart, newSelectionEnd);
        return;
      }
    }
    editor.replaceSelection(`${prefix}${selectedText}${suffix}`);
    if (command.char > 0) {
      editor.setCursor(
        curserStart.line + command.line,
        curserStart.ch + command.char + selectedText.length,
      );
    } else {
      const originalSelectionStart = curserStart;

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

    this.plugin.addCommand({
      id: "toggle-format-brush",
      name: "Toggle Format Brush",
      icon: "paintbrush",
      editorCallback: (_editor: Editor) => {
        this.plugin.toggleFormatBrush();
      },
    });

    this.trackFormatCommandExecution();
  }

  private registerCoreCommands() {
    this.plugin.addCommand({
      id: "renumber-ordered-list",
      name: "Renumber Ordered List",
      editorCallback: (editor: Editor) => {
        void this.executeCommandWithoutBlur(editor, () =>
          renumberSelection(editor),
        );
      },
    });
    this.plugin.addCommand({
      id: "hide-show-menu",
      name: "Hide/Show ",
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
      name: "Toggle Top Toolbar",
      callback: async () => {
        const s = this.plugin.settings;
        const prevStyle = this.plugin.positionStyle;
        s.enableTopToolbar = !s.enableTopToolbar;
        const nextStyle = resolveNextPositionStyle(
          s,
          "top",
          s.enableTopToolbar,
          prevStyle,
        );
        if (nextStyle && nextStyle !== prevStyle) {
          this.plugin.onPositionStyleChange(nextStyle);
        }
        await this.plugin.saveSettings();
        this.plugin.handleEditingToolbar();
      },
    });

    this.plugin.addCommand({
      id: "toggle-following-toolbar",
      name: "Toggle Following Toolbar",
      callback: async () => {
        const s = this.plugin.settings;
        const prevStyle = this.plugin.positionStyle;
        s.enableFollowingToolbar = !s.enableFollowingToolbar;
        const nextStyle = resolveNextPositionStyle(
          s,
          "following",
          s.enableFollowingToolbar,
          prevStyle,
        );
        if (nextStyle && nextStyle !== prevStyle) {
          this.plugin.onPositionStyleChange(nextStyle);
        }
        await this.plugin.saveSettings();
        this.plugin.handleEditingToolbar();
      },
    });

    this.plugin.addCommand({
      id: "toggle-fixed-toolbar",
      name: "Toggle Fixed Toolbar",
      callback: async () => {
        const s = this.plugin.settings;
        const prevStyle = this.plugin.positionStyle;
        s.enableFixedToolbar = !s.enableFixedToolbar;
        const nextStyle = resolveNextPositionStyle(
          s,
          "fixed",
          s.enableFixedToolbar,
          prevStyle,
        );
        if (nextStyle && nextStyle !== prevStyle) {
          this.plugin.onPositionStyleChange(nextStyle);
        }
        await this.plugin.saveSettings();
        this.plugin.handleEditingToolbar();
      },
    });
  }

  private registerTextToolCommands() {
    this.plugin.addCommand({
      id: "get-plain-text",
      name: "Get Plain Text",
      editorCallback: (editor: Editor) => {
        TextEnhancement.getPlainText(editor);
      },
    });

    this.plugin.addCommand({
      id: "insert-blank-lines",
      name: "Insert Blank Lines",
      editorCallback: (editor: Editor) => {
        TextEnhancement.insertBlankLines(editor);
      },
    });

    this.plugin.addCommand({
      id: "remove-blank-lines",
      name: "Remove Blank Lines",
      editorCallback: (editor) =>
        TextEnhancement.processWhitespace(editor, { removeEmptyLines: true }),
    });

    this.plugin.addCommand({
      id: "split-lines",
      name: "Split Lines",
      editorCallback: (editor: Editor) => {
        TextEnhancement.splitLines(editor);
      },
    });

    this.plugin.addCommand({
      id: "smart-symbols",
      name: "Full Half Converter",
      editorCallback: (editor: Editor) => {
        TextEnhancement.smartTypography(editor);
      },
    });

    this.plugin.addCommand({
      id: "dedupe-lines",
      name: "Dedupe Lines",
      editorCallback: (editor) =>
        TextEnhancement.dedupe(editor, { trimBeforeCompare: true }),
    });

    this.plugin.addCommand({
      id: "add-wrap",
      name: "Add Prefix/Suffix",
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
      name: "Number Lines (Custom)",
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
      name: "Trim Line Ends",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { trim: true });
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-compress",
      name: "Shrink Extra Spaces",
      editorCallback: (editor: Editor) => {
        TextEnhancement.processWhitespace(editor, { compress: true });
      },
    });

    this.plugin.addCommand({
      id: "remove-whitespace-all",
      name: "Remove All Whitespace",
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
      name: "Extract Between Strings",
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
      name: "Format Eraser",
      callback: () =>
        this.runOnEditor((editor) => setFormatEraser(this.plugin, editor)),
      icon: `eraser`,
    });

    this.plugin.addCommand({
      id: "change-font-color",
      name: "Change Font Color",
      callback: () =>
        this.runOnEditor((editor) =>
          setFontcolor(this.plugin.settings.cMenuFontColor, editor),
        ),
      icon: `<svg width="24" height="24" focusable="false" fill="currentColor"><g fill-rule="evenodd"><path id="change-font-color-icon" d="M3 18h18v3H3z" style="fill:#2DC26B"></path><path d="M8.7 16h-.8a.5.5 0 01-.5-.6l2.7-9c.1-.3.3-.4.5-.4h2.8c.2 0 .4.1.5.4l2.7 9a.5.5 0 01-.5.6h-.8a.5.5 0 01-.4-.4l-.7-2.2c0-.3-.3-.4-.5-.4h-3.4c-.2 0-.4.1-.5.4l-.7 2.2c0 .3-.2.4-.4.4zm2.6-7.6l-.6 2a.5.5 0 00.5.6h1.6a.5.5 0 00.5-.6l-.6-2c0-.3-.3-.4-.5-.4h-.4c-.2 0-.4.1-.5.4z"></path></g></svg>`,
    });

    this.plugin.addCommand({
      id: "change-background-color",
      name: "Change Background Color",
      callback: () =>
        this.runOnEditor((editor) =>
          setBackgroundcolor(this.plugin.settings.cMenuBackgroundColor, editor),
        ),
      icon: `<svg width="18" height="24" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg"><g   stroke="none" stroke-width="1" fill="currentColor" fill-rule="evenodd"><g  ><g fill="currentColor"><g transform="translate(119.502295, 137.878331) rotate(-135.000000) translate(-119.502295, -137.878331) translate(48.002295, 31.757731)" ><path d="M100.946943,60.8084699 L43.7469427,60.8084699 C37.2852111,60.8084699 32.0469427,66.0467383 32.0469427,72.5084699 L32.0469427,118.70847 C32.0469427,125.170201 37.2852111,130.40847 43.7469427,130.40847 L100.946943,130.40847 C107.408674,130.40847 112.646943,125.170201 112.646943,118.70847 L112.646943,72.5084699 C112.646943,66.0467383 107.408674,60.8084699 100.946943,60.8084699 Z M93.646,79.808 L93.646,111.408 L51.046,111.408 L51.046,79.808 L93.646,79.808 Z" fill-rule="nonzero"></path><path d="M87.9366521,16.90916 L87.9194966,68.2000001 C87.9183543,69.4147389 86.9334998,70.399264 85.7187607,70.4 L56.9423078,70.4 C55.7272813,70.4 54.7423078,69.4150264 54.7423078,68.2 L54.7423078,39.4621057 C54.7423078,37.2523513 55.5736632,35.1234748 57.0711706,33.4985176 L76.4832996,12.4342613 C78.9534987,9.75382857 83.1289108,9.5834005 85.8093436,12.0535996 C87.1658473,13.303709 87.9372691,15.0644715 87.9366521,16.90916 Z" fill-rule="evenodd"></path><path d="M131.3,111.241199 L11.7,111.241199 C5.23826843,111.241199 0,116.479467 0,122.941199 L0,200.541199 C0,207.002931 5.23826843,212.241199 11.7,212.241199 L131.3,212.241199 C137.761732,212.241199 143,207.002931 143,200.541199 L143,122.941199 C143,116.479467 137.761732,111.241199 131.3,111.241199 Z M124,130.241 L124,193.241 L19,193.241 L19,130.241 L124,130.241 Z" fill-rule="nonzero"></path></g></g><path d="M51,218 L205,218 C211.075132,218 216,222.924868 216,229 C216,235.075132 211.075132,240 205,240 L51,240 C44.9248678,240 40,235.075132 40,229 C40,222.924868 44.9248678,218 51,218 Z" id="change-background-color-icon" style="fill:#FA541C"></path></g></g></svg>`,
    });
    this.plugin.addCommand({
      id: "indent-list",
      name: "Indent List",
      callback: () => this.runOnEditor((editor) => editor.indentList()),
      icon: "indent-glyph",
    });
    this.plugin.addCommand({
      id: "undent-list",
      name: "Unindent List",
      callback: () => this.runOnEditor((editor) => editor.unindentList()),
      icon: "unindent-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-numbered-list",
      name: "Numbered List",
      callback: () => this.runOnEditor((editor) => editor.toggleNumberList()),
      icon: "number-list-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-bullet-list",
      name: "Unordered List",
      callback: () => this.runOnEditor((editor) => editor.toggleBulletList()),
      icon: "bullet-list-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-highlight",
      name: "Highlight",
      callback: () =>
        this.runOnEditor((editor) =>
          editor.toggleMarkdownFormatting("highlight"),
        ),
      icon: "highlight-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-bold",
      name: "Toggle Bold",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleMarkdownFormatting("bold")),
      icon: "bold-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-italics",
      name: "Toggle Italics",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleMarkdownFormatting("italic")),
      icon: "italic-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-strikethrough",
      name: "Toggle Strikethrough",
      callback: () =>
        this.runOnEditor((editor) =>
          editor.toggleMarkdownFormatting("strikethrough"),
        ),
      icon: "strikethrough-glyph",
    });
    this.plugin.addCommand({
      id: "toggle-inline-math",
      name: "Toggle Inline Math",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleMarkdownFormatting("math")),
      icon: "lucide-sigma",
    });
    this.plugin.addCommand({
      id: "editor:cycle-list-checklist",
      name: "Cycle List and Checklist",
      icon: "lucide-check-square",
      callback: () =>
        this.runOnEditor((editor) => editor.toggleCheckList(true)),
    });
  }

  private registerClipboardAndHistoryCommands() {
    this.plugin.addCommand({
      id: "editor-undo",
      name: "Undo Edit",
      callback: () => {
        this.executeHistoryAction("undo");
      },
      icon: "undo-glyph",
    });
    this.plugin.addCommand({
      id: "editor-redo",
      name: "Redo Edit",
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
      name: "Insert Callout(Modal)",
      icon: "lucide-quote",
      callback: () => {
        const modal = new InsertCalloutModal(this.plugin);
        modal.open();
      },
    });
    this.plugin.addCommand({
      id: "insert-link",
      name: "Insert Link(Modal)",
      icon: "lucide-link",
      callback: () => {
        const modal = new InsertLinkModal(this.plugin);
        modal.open();
      },
    });
    this.plugin.addCommand({
      id: "fullscreen-focus",
      name: "Toggle Fullscreen Focus Mode",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "F11" }],
      callback: () => {
        return fullscreenMode(this.plugin.app);
      },
      icon: "fullscreen",
    });
    this.plugin.addCommand({
      id: "workplace-fullscreen-focus",
      name: "Toggle Workplace Fullscreen Focus",
      callback: () => {
        return workplacefullscreenMode(this.plugin.app);
      },
      hotkeys: [{ modifiers: ["Mod"], key: "F11" }],
      icon: "remix-SplitCellsHorizontal",
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
    Object.keys(this._commandsMap).forEach((type) => {
      this.plugin.addCommand({
        id: `${type}`,
        name: `Toggle ${type}`,
        icon: `${type}-glyph`,
        callback: () =>
          this.runOnEditor((editor) =>
            this.applyCommand(this._commandsMap[type], editor),
          ),
      });
    });

    this.modCommands.forEach((type) => {
      this.plugin.addCommand({
        id: `${type["id"]}`,
        name: `${type["name"]}`,
        icon: `${type["icon"]}`,
        callback: () =>
          this.runOnEditor(async (editor) => {
            const curserEnd = editor.getCursor("to");
            const char = this.getCharacterOffset(type["id"]);
            await this.plugin.app.commands.executeCommandById(`${type["id"]}`);
            if (char != 0)
              editor.setCursor(curserEnd.line, curserEnd.ch + char);
          }),
      });
    });
  }

  private trackFormatCommandExecution() {
    const formatCommands = [
      "toggle-bold",
      "toggle-italics",
      "toggle-strikethrough",
      "toggle-highlight",
      "toggle-code",
      "toggle-blockquote",
      "header0-text",
      "header1-text",
      "header2-text",
      "header3-text",
      "header4-text",
      "header5-text",
      "header6-text",
      "toggle-numbered-list",
      "toggle-bullet-list",
      "format-eraser",
      "indent-list",
      "undent-list",
      "change-font-color",
      "change-background-color",
      ...Object.keys(this._commandsMap),
    ];

    formatCommands.forEach((cmdId) => {
      const originalCommand =
        this.plugin.app.commands.commands[`editing-toolbar:${cmdId}`];
      if (originalCommand && originalCommand.callback) {
        const originalCallback = originalCommand.callback;
        originalCommand.callback = () => {
          originalCallback();
          this.plugin.setLastExecutedCommand(`editing-toolbar:${cmdId}`);
        };
      }
    });
  }

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

  public get commandsMap(): Record<string, CommandPlot> {
    return this._commandsMap;
  }
}

type CommandPlot = {
  char: number;
  line: number;
  prefix: string;
  suffix: string;
  islinehead: boolean;
};
