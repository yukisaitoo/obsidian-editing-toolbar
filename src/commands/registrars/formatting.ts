import { Editor } from "obsidian";
import type { OwnCommandId } from "src/commands/commandLabels";
import type { Registrar } from "src/commands/registrars/types";
import { setFormatEraser } from "src/util/text/formatEraser";
import { setHeader } from "src/util/text/header";
import { setBackgroundColor, setFontColor } from "src/util/text/inlineColor";

type MarkdownFormat = Parameters<Editor["toggleMarkdownFormatting"]>[0];

const TOGGLES: { id: OwnCommandId; format: MarkdownFormat }[] = [
  { id: "toggle-highlight", format: "highlight" },
  { id: "toggle-bold", format: "bold" },
  { id: "toggle-italics", format: "italic" },
  { id: "toggle-strikethrough", format: "strikethrough" },
  { id: "toggle-inline-math", format: "math" },
];

const LIST_ACTIONS: { id: OwnCommandId; run: (editor: Editor) => void }[] = [
  { id: "indent-list", run: (e) => e.indentList() },
  { id: "undent-list", run: (e) => e.unindentList() },
  { id: "toggle-numbered-list", run: (e) => e.toggleNumberList() },
  { id: "toggle-bullet-list", run: (e) => e.toggleBulletList() },
];

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

export const registerFormattingCommands: Registrar = ({
  plugin,
  addEditorCommand,
}) => {
  addEditorCommand({ id: "format-eraser", run: setFormatEraser });

  addEditorCommand({
    id: "change-font-color",
    run: (editor) => setFontColor(plugin.settings.lastFontColor, editor),
  });

  addEditorCommand({
    id: "change-background-color",
    run: (editor) =>
      setBackgroundColor(plugin.settings.lastHighlightColor, editor),
  });

  LIST_ACTIONS.forEach(({ id, run }) => addEditorCommand({ id, run }));

  TOGGLES.forEach(({ id, format }) =>
    addEditorCommand({
      id,
      run: (editor) => editor.toggleMarkdownFormatting(format),
    }),
  );

  HEADER_IDS.forEach((id, level) =>
    addEditorCommand({
      id,
      run: (editor) => setHeader("#".repeat(level), editor),
    }),
  );
};
