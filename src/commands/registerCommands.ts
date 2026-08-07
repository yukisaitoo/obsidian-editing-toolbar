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
  group: string;
}

const WRAP_COMMANDS = {
  justify: { prefix: '<p align="justify">', suffix: "</p>", group: "align" },
  left: { prefix: '<p align="left">', suffix: "</p>", group: "align" },
  right: { prefix: '<p align="right">', suffix: "</p>", group: "align" },
  center: { prefix: "<center>", suffix: "</center>", group: "align" },
  underline: { prefix: "<u>", suffix: "</u>", group: "underline" },
  superscript: { prefix: "<sup>", suffix: "</sup>", group: "script" },
  subscript: { prefix: "<sub>", suffix: "</sub>", group: "script" },
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
    const group = Object.values(WRAP_COMMANDS).filter(
      (w) => w.group === wrap.group,
    );
    add(id as OwnCommandId, (editor) => wrapSelection(editor, wrap, group));
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

// A wrap replaces whichever member of its group is already there, so switching
// alignment (or sup <-> sub) swaps the tags instead of nesting a second pair.
function wrapSelection(
  editor: Editor,
  wrap: Wrap,
  group: readonly Wrap[],
): void {
  const text = editor.getSelection();
  const from = editor.posToOffset(editor.getCursor("from"));
  const to = editor.posToOffset(editor.getCursor("to"));

  const existing = group.find((w) => surrounds(editor, w, from, to));
  const start = existing ? from - existing.prefix.length : from;
  const end = existing ? to + existing.suffix.length : to;
  const off = existing === wrap;

  editor.replaceRange(
    off ? text : `${wrap.prefix}${text}${wrap.suffix}`,
    editor.offsetToPos(start),
    editor.offsetToPos(end),
  );
  selectAt(editor, start + (off ? 0 : wrap.prefix.length), text.length);
}

function surrounds(
  editor: Editor,
  { prefix, suffix }: Wrap,
  from: number,
  to: number,
): boolean {
  const at = (offset: number) => editor.offsetToPos(offset);
  return (
    editor.getRange(at(from - prefix.length), at(from)) === prefix &&
    editor.getRange(at(to), at(to + suffix.length)) === suffix
  );
}
