import { Editor } from "obsidian";
import type { Registrar } from "src/commands/registrars/types";
import { setFormatEraser } from "src/util/text/formatEraser";
import { setBackgroundcolor, setFontcolor, setHeader } from "src/util/util";

type MarkdownFormat = Parameters<Editor["toggleMarkdownFormatting"]>[0];

const TOGGLES: {
  id: string;
  name: string;
  icon: string;
  format: MarkdownFormat;
}[] = [
  {
    id: "toggle-highlight",
    name: "Toggle highlight",
    icon: "highlight-glyph",
    format: "highlight",
  },
  {
    id: "toggle-bold",
    name: "Toggle bold",
    icon: "bold-glyph",
    format: "bold",
  },
  {
    id: "toggle-italics",
    name: "Toggle italics",
    icon: "italic-glyph",
    format: "italic",
  },
  {
    id: "toggle-strikethrough",
    name: "Toggle strikethrough",
    icon: "strikethrough-glyph",
    format: "strikethrough",
  },
  {
    id: "toggle-inline-math",
    name: "Toggle inline math",
    icon: "lucide-sigma",
    format: "math",
  },
];

const LIST_ACTIONS: {
  id: string;
  name: string;
  icon: string;
  run: (editor: Editor) => void;
}[] = [
  {
    id: "indent-list",
    name: "Indent list",
    icon: "indent-glyph",
    run: (e) => e.indentList(),
  },
  {
    id: "undent-list",
    name: "Unindent list",
    icon: "unindent-glyph",
    run: (e) => e.unindentList(),
  },
  {
    id: "toggle-numbered-list",
    name: "Toggle ordered list",
    icon: "number-list-glyph",
    run: (e) => e.toggleNumberList(),
  },
  {
    id: "toggle-bullet-list",
    name: "Toggle unordered list",
    icon: "bullet-list-glyph",
    run: (e) => e.toggleBulletList(),
  },
  {
    id: "editor:cycle-list-checklist",
    name: "Cycle list and checklist",
    icon: "lucide-check-square",
    run: (e) => e.toggleCheckList(true),
  },
];

export const registerFormattingCommands: Registrar = ({
  plugin,
  runOnEditor,
}) => {
  const add = (
    id: string,
    name: string,
    icon: string,
    run: (editor: Editor) => void,
  ) => plugin.addCommand({ id, name, icon, callback: () => runOnEditor(run) });

  add("format-eraser", "Format eraser", "eraser", setFormatEraser);

  add("change-font-color", "Change font color", "font-color", (editor) =>
    setFontcolor(plugin.settings.lastFontColor, editor),
  );

  add(
    "change-background-color",
    "Change background color",
    "background-color",
    (editor) => setBackgroundcolor(plugin.settings.lastHighlightColor, editor),
  );

  LIST_ACTIONS.forEach(({ id, name, icon, run }) => add(id, name, icon, run));

  TOGGLES.forEach(({ id, name, icon, format }) =>
    add(id, name, icon, (editor) => editor.toggleMarkdownFormatting(format)),
  );

  for (let level = 0; level <= 6; level++) {
    add(
      `header${level}-text`,
      level === 0 ? "Remove header level" : `Header ${level}`,
      level === 0 ? "heading-glyph" : `header-${level}`,
      (editor) => setHeader("#".repeat(level), editor),
    );
  }
};
