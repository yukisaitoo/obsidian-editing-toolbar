import { App, Editor } from "obsidian";

import { COMMAND_LABELS, type OwnCommandId } from "src/commands/commandLabels";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import type EditingToolbarPlugin from "src/plugin/main";
import { t } from "src/translations/helper";
import { insertCallout } from "src/util/text/callout";
import { setFormatEraser } from "src/util/text/formatEraser";
import { setHeader } from "src/util/text/header";
import { setBackgroundColor, setFontColor } from "src/util/text/inlineColor";
import { selectAt } from "src/util/text/selection";

interface Wrap {
  prefix: string;
  suffix: string;
}

const WRAP_COMMANDS = {
  justify: { prefix: '<p align="justify">', suffix: "</p>" },
  left: { prefix: '<p align="left">', suffix: "</p>" },
  right: { prefix: '<p align="right">', suffix: "</p>" },
  center: { prefix: "<center>", suffix: "</center>" },
  underline: { prefix: "<u>", suffix: "</u>" },
  superscript: { prefix: "<sup>", suffix: "</sup>" },
  subscript: { prefix: "<sub>", suffix: "</sub>" },
} as const satisfies Partial<Record<OwnCommandId, Wrap>>;

// Level N maps to N hashes, so level 0 strips the header.
const HEADER_IDS: OwnCommandId[] = [
  "header0-text",
  "header1-text",
  "header2-text",
  "header3-text",
  "header4-text",
  "header5-text",
  "header6-text",
];

// Translated here so the palette matches the toolbar and `displayName` can read both
// off the registry.
function label(id: OwnCommandId) {
  const { name, icon } = COMMAND_LABELS[id];
  return { name: t(name), icon };
}

export function registerCommands(plugin: EditingToolbarPlugin): void {
  // editorCallback gates each command on a live editor, keeping it out of reading
  // mode, the note title, the properties panel, and the palette.
  const add = (id: OwnCommandId, run: (editor: Editor) => unknown) =>
    plugin.addCommand({
      id,
      ...label(id),
      editorCallback: (editor) => runOn(editor, run),
    });

  plugin.addCommand({
    id: "hide-show-menu",
    ...label("hide-show-menu"),
    callback: async () => {
      plugin.settings.toolbarVisible = !plugin.settings.toolbarVisible;
      await plugin.saveSettings();
      plugin.rebuildToolbars();
    },
  });

  add("editor-undo", (editor) => editor.undo());
  add("editor-redo", (editor) => editor.redo());

  add("editor-copy", async (editor) => {
    const text = editor.getSelection();
    if (!text) return;
    await navigator.clipboard.writeText(text);
  });

  add("editor-cut", async (editor) => {
    const text = editor.getSelection();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    editor.replaceSelection("");
  });

  add("editor-paste", async (editor) => {
    const text = await navigator.clipboard.readText();
    if (text) editor.replaceSelection(text);
  });

  add("format-eraser", setFormatEraser);

  add("change-font-color", (editor) =>
    setFontColor(plugin.settings.lastFontColor, editor),
  );

  add("change-background-color", (editor) =>
    setBackgroundColor(plugin.settings.lastHighlightColor, editor),
  );

  HEADER_IDS.forEach((id, level) =>
    add(id, (editor) => setHeader("#".repeat(level), editor)),
  );

  add("insert-callout", async (editor) => {
    const spec = await InsertCalloutModal.prompt(plugin, editor);
    if (spec) insertCallout(editor, spec);
  });

  for (const [id, wrap] of Object.entries(WRAP_COMMANDS)) {
    add(id as OwnCommandId, (editor) => wrapSelection(editor, wrap));
  }
}

// For toolbar handlers that are not commands (the colour swatch grid) and so get
// no gating from Obsidian.
export function runOnEditor(
  app: App,
  action: (editor: Editor) => unknown,
): void {
  const editor = app.workspace.activeEditor?.editor;
  if (editor) runOn(editor, action);
}

// Restores focus for the paths that lose it (a modal closing, the palette); the
// toolbar itself never takes it.
function runOn(editor: Editor, action: (editor: Editor) => unknown): void {
  void (async () => {
    try {
      await action(editor);
    } catch (error) {
      console.error("editing-toolbar: command failed", error);
    } finally {
      editor.focus();
    }
  })();
}

// Unwraps when the wrap is already there, which is what makes these toggles.
function wrapSelection(editor: Editor, { prefix, suffix }: Wrap): void {
  const selectedText = editor.getSelection();
  const start = editor.getCursor("from");
  const end = editor.getCursor("to");

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
}
