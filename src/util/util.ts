import { Editor, Command } from "obsidian";
import { EditingToolbarSettings } from "../settings/settingsData";
import { strings } from "../translations/helper";

export function GenNonDuplicateID(randomLength: number) {
  const idStr = Date.now().toString(36);
  return idStr + Math.random().toString(36).slice(3, 3 + randomLength);
}

export const DIVIDER_COMMAND_ID = "editingToolbar-Divider-Line";

// Every divider carries its own id under this prefix; the constant alone is the
// CSS class.
export function isDivider(id: string): boolean {
  return id.startsWith(DIVIDER_COMMAND_ID);
}

export function newDividerId(): string {
  return `${DIVIDER_COMMAND_ID}-${GenNonDuplicateID(4)}`;
}

// `subIndex` is -1 for a top-level command, `index` -1 when it is not in the list.
export function findCommandLocation(
  command: Command,
  isSubmenuItem: boolean,
  currentCommands: Command[]
): { index: number; subIndex: number } {
  if (!isSubmenuItem) {
    return {
      index: currentCommands.findIndex((v) => v.id === command.id),
      subIndex: -1,
    };
  }

  for (let index = 0; index < currentCommands.length; index++) {
    const submenu = currentCommands[index].SubmenuCommands;
    const subIndex = submenu?.findIndex((v) => v.id === command.id) ?? -1;
    if (subIndex >= 0) {
      return { index, subIndex };
    }
  }
  return { index: -1, subIndex: -1 };
}

// The toolbar reads each swatch's `background-color`; headers and spacers are inert.
type PickerRow =
  | { header: string }
  | { spacer: true }
  | { colors: string[] };

function renderColorPicker(tableId: string, colspan: number, rows: PickerRow[]): string {
  const body = rows
    .map((row) => {
      if ("header" in row) {
        return `<tr><th colspan="${colspan}" class="ui-widget-content">${row.header}</th></tr>`;
      }
      if ("spacer" in row) {
        return `<tr><th colspan="${colspan}"></th></tr>`;
      }
      const cells = row.colors
        .map((color) => `<td style="background-color:${color}"><span></span></td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n    ");

  return `<div class='x-color-picker-wrapper'>
<div class='x-color-picker'>
  <table class="x-color-picker-table" id='${tableId}'>
    <tbody>
    ${body}
    </tbody>
  </table>
</div>
</div>`;
}

export function colorpicker(plugin: { settings: EditingToolbarSettings }) {
  const s = plugin.settings;
  return renderColorPicker("x-color-picker-table", 10, [
    { header: strings.themeColors },
    { colors: ["#ffffff", "#000000", "#eeece1", "#1f497d", "#4f81bd", "#c0504d", "#9bbb59", "#8064a2", "#4bacc6", "#f79646"] },
    { spacer: true },
    { colors: ["#f2f2f2", "#7f7f7f", "#ddd9c3", "#c6d9f0", "#dbe5f1", "#f2dcdb", "#ebf1dd", "#e5e0ec", "#dbeef3", "#fdeada"] },
    { colors: ["#d8d8d8", "#595959", "#c4bd97", "#8db3e2", "#b8cce4", "#e5b9b7", "#d7e3bc", "#ccc1d9", "#b7dde8", "#fbd5b5"] },
    { colors: ["#bfbfbf", "#3f3f3f", "#938953", "#548dd4", "#95b3d7", "#d99694", "#c3d69b", "#b2a2c7", "#92cddc", "#fac08f"] },
    { colors: ["#a5a5a5", "#262626", "#494429", "#17365d", "#366092", "#953734", "#76923c", "#5f497a", "#31859b", "#e36c09"] },
    { colors: ["#7f7f7f", "#0c0c0c", "#1d1b10", "#0f243e", "#244061", "#632423", "#4f6128", "#3f3151", "#205867", "#974806"] },
    { spacer: true },
    { header: strings.standardColors },
    { colors: ["#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"] },
    { header: strings.customFontColors },
    { colors: [s.custom_fc1, s.custom_fc2, s.custom_fc3, s.custom_fc4, s.custom_fc5] },
  ]);
}

export function backcolorpicker(plugin: { settings: EditingToolbarSettings }) {
  const s = plugin.settings;
  return renderColorPicker("x-backgroundcolor-picker-table", 5, [
    { header: strings.translucentColors },
    { colors: ["rgba(140, 140, 140, 0.12)", "rgba(92, 92, 92, 0.2)", "rgba(163, 67, 31, 0.2)", "rgba(240, 107, 5, 0.2)", "rgba(240, 200, 0, 0.2)"] },
    { colors: ["rgba(3, 135, 102, 0.2)", "rgba(3, 135, 102, 0.2)", "rgba(5, 117, 197, 0.2)", "rgba(74, 82, 199, 0.2)", "rgba(136, 49, 204, 0.2)"] },
    { header: strings.highlighterColors },
    { colors: ["rgb(255, 248, 143)", "rgb(211, 248, 182)", "rgb(175, 250, 209)", "rgb(177, 255, 255)", "rgb(253, 191, 255)"] },
    { colors: ["rgb(210, 203, 255)", "rgb(64, 169, 255)", "rgb(255, 77, 79)", "rgb(212, 177, 6)", "rgb(146, 84, 222)"] },
    { header: strings.customColors },
    { colors: [s.custom_bg1, s.custom_bg2, s.custom_bg3, s.custom_bg4, s.custom_bg5] },
  ]);
}

export function setHeader(str: string, editor: Editor) {
  // from https://github.com/obsidian-canzi/Enhanced-editing
  const cursor = editor.getCursor();
  const linetext = editor.getLine(cursor.line);
  let newstr: string;
  const headingRegex = /^(\s*(?:>\s*)*(?:\[[!\w]+\]\s*)?)#{1,6}\s+/;
  const blockPrefixRegex = /^(?:\s*(?:>\s*)*(?:\[[!\w]+\]\s*)?)?(?:(?:#{1,6}\s+)|(?:[-+*]\s+)|(?:\d+\.\s+)|(?:\[[ xX]\]\s+))+/;
  const match = linetext.match(headingRegex);
  const matchstr = match?.[0]?.trim();

  if (str === matchstr || str === "") {
    newstr = linetext.replace(headingRegex, "$1");
  } else {
    newstr = linetext.replace(blockPrefixRegex, "").trimStart();
    newstr = `${str} ${newstr}`;
  }

  const lineEnd = newstr !== "" ? linetext.length : 0;
  const linend = editor.getRange(cursor, { line: cursor.line, ch: lineEnd });

  editor.setLine(cursor.line, newstr);
  editor.setCursor({ line: cursor.line, ch: newstr.length - linend.length });
}


function adjustSelectionsForTag(editor: Editor, tagLength: number) {
  return editor.listSelections().map((sel) => {
    const isForward =
      sel.anchor.line < sel.head.line ||
      (sel.anchor.line === sel.head.line && sel.anchor.ch < sel.head.ch);

    return isForward
      ? {
          anchor: { line: sel.anchor.line, ch: sel.anchor.ch },
          head: { line: sel.head.line, ch: sel.head.ch + tagLength },
        }
      : {
          anchor: { line: sel.anchor.line, ch: sel.anchor.ch + tagLength },
          head: { line: sel.head.line, ch: sel.head.ch },
        };
  });
}

function wrapEachLine(text: string, open: string, close: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `${open}${line}${close}` : line))
    .join("\n");
}

export function setFontcolor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  const fontColorRegex = /<font\s+color=["']?[^"'>]+["']?>(.*?)<\/font>/ms;
  const hasColorTag = fontColorRegex.test(selectText);

  const sameColorRegex = new RegExp(
    `^<font\\s+color=["']?${color}["']?>(.+)<\\/font>$`,
    "ms",
  );
  if (sameColorRegex.test(selectText.trim())) {
    return;
  }

  const open = `<font color="${color}">`;
  const close = "</font>";

  const finalText = hasColorTag
    ? selectText.replace(
        new RegExp(fontColorRegex.source, "gms"),
        (_match, inner: string) => wrapEachLine(inner, open, close),
      )
    : wrapEachLine(selectText, open, close);

  const tagLength = hasColorTag ? 0 : `${open}${close}`.length;
  const adjustedSelections = adjustSelectionsForTag(editor, tagLength);

  editor.replaceSelection(finalText);
  editor.setSelections(adjustedSelections);
}

const COLOR_VALUE = String.raw`(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))`;
// The trailing `color:` is optional: older highlights carry only `background:`.
const MARK_STYLE = String.raw`background:${COLOR_VALUE}(?:\s*;\s*color:[^"'>]*)?`;
const escapeForRegex = (value: string) =>
  value.replace(/([()[{*+.$^\\|?])/g, "\\$1");

function parseColor(
  color: string,
): { r: number; g: number; b: number; a: number } | null {
  const hex = color.trim().match(/^#([0-9a-fA-F]+)$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((d) => d + d)
        .join("");
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fn = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!fn) return null;
  const parts = fn[1]
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
  };
}

// A translucent fill composites over the theme background and keeps the theme's
// text colour; an opaque one needs black or white picked by luminance.
function highlightTextColor(background: string): string {
  const rgba = parseColor(background);
  if (!rgba || rgba.a < 0.5) return "var(--text-normal)";
  // Rec. 709 luma — the usual cheap stand-in for perceived lightness.
  const luma = (0.2126 * rgba.r + 0.7152 * rgba.g + 0.0722 * rgba.b) / 255;
  return luma > 0.5 ? "#000000" : "#ffffff";
}

export function setBackgroundcolor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  const style = `background:${color};color:${highlightTextColor(color)}`;

  const hasColorTag = new RegExp(
    String.raw`<mark\s+style=["']?${MARK_STYLE}["']?>([\s\S]*?)<\/mark>`,
  ).test(selectText);

  const sameColorRegex = new RegExp(
    `^<mark\\s+style=["']?${escapeForRegex(style)}["']?>([\\s\\S]+)<\\/mark>$`,
  );
  if (sameColorRegex.test(selectText.trim())) {
    return;
  }

  // A recolour rewrites the whole declaration pair, since the text colour is
  // derived from the new background.
  const finalText = hasColorTag
    ? selectText.replace(
        new RegExp(String.raw`(<mark\s+style=["']?)${MARK_STYLE}(["']?>)`, "gi"),
        `$1${style}$2`,
      )
    : wrapEachLine(selectText, `<mark style="${style}">`, "</mark>");

  const tagLength = hasColorTag ? 0 : `<mark style="${style}"></mark>`.length;
  const adjustedSelections = adjustSelectionsForTag(editor, tagLength);

  editor.replaceSelection(finalText);
  editor.setSelections(adjustedSelections);
}
