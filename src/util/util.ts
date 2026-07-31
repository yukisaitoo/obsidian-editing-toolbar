import { Command, Editor } from "obsidian";
import { EditingToolbarSettings } from "../settings/settingsData";
import { strings } from "../translations/helper";

export function GenNonDuplicateID(randomLength: number) {
  const idStr = Date.now().toString(36);
  return (
    idStr +
    Math.random()
      .toString(36)
      .slice(3, 3 + randomLength)
  );
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

// `app.commands.listCommands()` hands back the LIVE registry objects. Storing one
// in settings means a later rename or icon change writes straight through to
// Obsidian's command palette, so everything entering settings is copied to plain
// data first. It also drops the `callback`s that would break structuredClone.
export function toStoredCommand(command: Command): Command {
  const stored: Command = {
    id: command.id,
    name: command.name,
    icon: command.icon,
  };
  if (command.menuType) stored.menuType = command.menuType;
  if (command.SubmenuCommands) {
    stored.SubmenuCommands = command.SubmenuCommands.map(toStoredCommand);
  }
  return stored;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCommandList(value: any): Command[] | null {
  if (!Array.isArray(value)) return null;

  const commands: Command[] = [];
  for (const item of value) {
    if (typeof item?.id !== "string" || typeof item.name !== "string") {
      return null;
    }
    if (item.icon !== undefined && typeof item.icon !== "string") return null;

    const command: Command = { id: item.id, name: item.name, icon: item.icon };

    if (item.menuType !== undefined) {
      if (item.menuType !== "submenu" && item.menuType !== "dropdown") {
        return null;
      }
      command.menuType = item.menuType;
    }

    if (item.SubmenuCommands !== undefined) {
      const submenu = parseCommandList(item.SubmenuCommands);
      if (!submenu) return null;
      command.SubmenuCommands = submenu;
    }

    commands.push(command);
  }
  return commands;
}

// `subIndex` is -1 for a top-level command, `index` -1 when it is not in the list.
export function findCommandLocation(
  command: Command,
  isSubmenuItem: boolean,
  currentCommands: Command[],
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
type PickerRow = { header: string } | { spacer: true } | { colors: string[] };

// Built as DOM rather than an HTML string: the custom swatches are settings values,
// and settings arrive from Import as unvalidated JSON. Assigning a colour through
// `style.backgroundColor` makes an unparseable one render as no colour, which
// wireSwatches already skips — an interpolated string would make it markup.
function renderColorPicker(
  parent: HTMLElement,
  tableId: string,
  colspan: number,
  rows: PickerRow[],
): void {
  const wrapper = parent.createDiv({ cls: "x-color-picker-wrapper" });
  const table = wrapper
    .createDiv({ cls: "x-color-picker" })
    .createEl("table", { cls: "x-color-picker-table", attr: { id: tableId } });
  const body = table.createEl("tbody");

  for (const row of rows) {
    const tr = body.createEl("tr");

    if ("header" in row) {
      tr.createEl("th", {
        cls: "ui-widget-content",
        text: row.header,
        attr: { colspan },
      });
      continue;
    }

    if ("spacer" in row) {
      tr.createEl("th", { attr: { colspan } });
      continue;
    }

    for (const color of row.colors) {
      const cell = tr.createEl("td");
      cell.style.backgroundColor = color;
      cell.createEl("span");
    }
  }
}

export function colorpicker(
  parent: HTMLElement,
  plugin: { settings: EditingToolbarSettings },
): void {
  const s = plugin.settings;
  renderColorPicker(parent, "x-color-picker-table", 10, [
    { header: strings.themeColors },
    {
      colors: [
        "#ffffff",
        "#000000",
        "#eeece1",
        "#1f497d",
        "#4f81bd",
        "#c0504d",
        "#9bbb59",
        "#8064a2",
        "#4bacc6",
        "#f79646",
      ],
    },
    { spacer: true },
    {
      colors: [
        "#f2f2f2",
        "#7f7f7f",
        "#ddd9c3",
        "#c6d9f0",
        "#dbe5f1",
        "#f2dcdb",
        "#ebf1dd",
        "#e5e0ec",
        "#dbeef3",
        "#fdeada",
      ],
    },
    {
      colors: [
        "#d8d8d8",
        "#595959",
        "#c4bd97",
        "#8db3e2",
        "#b8cce4",
        "#e5b9b7",
        "#d7e3bc",
        "#ccc1d9",
        "#b7dde8",
        "#fbd5b5",
      ],
    },
    {
      colors: [
        "#bfbfbf",
        "#3f3f3f",
        "#938953",
        "#548dd4",
        "#95b3d7",
        "#d99694",
        "#c3d69b",
        "#b2a2c7",
        "#92cddc",
        "#fac08f",
      ],
    },
    {
      colors: [
        "#a5a5a5",
        "#262626",
        "#494429",
        "#17365d",
        "#366092",
        "#953734",
        "#76923c",
        "#5f497a",
        "#31859b",
        "#e36c09",
      ],
    },
    {
      colors: [
        "#7f7f7f",
        "#0c0c0c",
        "#1d1b10",
        "#0f243e",
        "#244061",
        "#632423",
        "#4f6128",
        "#3f3151",
        "#205867",
        "#974806",
      ],
    },
    { spacer: true },
    { header: strings.standardColors },
    {
      colors: [
        "#c00000",
        "#ff0000",
        "#ffc000",
        "#ffff00",
        "#92d050",
        "#00b050",
        "#00b0f0",
        "#0070c0",
        "#002060",
        "#7030a0",
      ],
    },
    { header: strings.customFontColors },
    {
      colors: [
        s.custom_fc1,
        s.custom_fc2,
        s.custom_fc3,
        s.custom_fc4,
        s.custom_fc5,
      ],
    },
  ]);
}

export function backcolorpicker(
  parent: HTMLElement,
  plugin: { settings: EditingToolbarSettings },
): void {
  const s = plugin.settings;
  renderColorPicker(parent, "x-backgroundcolor-picker-table", 5, [
    { header: strings.translucentColors },
    {
      colors: [
        "rgba(140, 140, 140, 0.12)",
        "rgba(92, 92, 92, 0.2)",
        "rgba(163, 67, 31, 0.2)",
        "rgba(240, 107, 5, 0.2)",
        "rgba(240, 200, 0, 0.2)",
      ],
    },
    {
      colors: [
        "rgba(3, 135, 102, 0.2)",
        "rgba(3, 135, 102, 0.2)",
        "rgba(5, 117, 197, 0.2)",
        "rgba(74, 82, 199, 0.2)",
        "rgba(136, 49, 204, 0.2)",
      ],
    },
    { header: strings.highlighterColors },
    {
      colors: [
        "rgb(255, 248, 143)",
        "rgb(211, 248, 182)",
        "rgb(175, 250, 209)",
        "rgb(177, 255, 255)",
        "rgb(253, 191, 255)",
      ],
    },
    {
      colors: [
        "rgb(210, 203, 255)",
        "rgb(64, 169, 255)",
        "rgb(255, 77, 79)",
        "rgb(212, 177, 6)",
        "rgb(146, 84, 222)",
      ],
    },
    { header: strings.customColors },
    {
      colors: [
        s.custom_bg1,
        s.custom_bg2,
        s.custom_bg3,
        s.custom_bg4,
        s.custom_bg5,
      ],
    },
  ]);
}

// Blockquote and callout lead-in. Held aside and re-attached, so a heading change
// never rewrites it. `[!name]` requires the `!` so a top-level `[x] task` is not
// mistaken for a callout.
const BLOCK_PREFIX = /^\s*(?:>\s*)*(?:\[!\w+\]\s*)?/;
// Heading, bullet, ordered and task markers all give way to a new heading.
const LINE_MARKERS =
  /^(?:(?:#{1,6}\s+)|(?:[-+*]\s+)|(?:\d+\.\s+)|(?:\[[ xX]\]\s+))+/;

// from https://github.com/obsidian-canzi/Enhanced-editing
export function setHeader(marker: string, editor: Editor) {
  const cursor = editor.getCursor();
  const lineText = editor.getLine(cursor.line);
  const blockPrefix = lineText.match(BLOCK_PREFIX)?.[0] ?? "";
  const body = lineText.slice(blockPrefix.length);
  const heading = body.match(/^(#{1,6})\s+/);

  const newText =
    marker === "" || marker === heading?.[1]
      ? blockPrefix + body.slice(heading?.[0].length ?? 0)
      : `${blockPrefix}${marker} ${body.replace(LINE_MARKERS, "").trimStart()}`;

  // Hold the cursor the same distance from the end of the line.
  const textAfterCursor = lineText.slice(cursor.ch);
  editor.setLine(cursor.line, newText);
  editor.setCursor({
    line: cursor.line,
    ch: Math.max(0, newText.length - textAfterCursor.length),
  });
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

// One tag wrapping the whole selection, with its colour captured. Comparing that
// capture as a string keeps a colour containing regex syntax out of the pattern.
const SINGLE_FONT_TAG = /^<font\s+color=["']?([^"'>]+)["']?>[\s\S]+<\/font>$/;

export function setFontcolor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  const fontColorRegex = /<font\s+color=["']?[^"'>]+["']?>(.*?)<\/font>/ms;
  const hasColorTag = fontColorRegex.test(selectText);

  if (selectText.trim().match(SINGLE_FONT_TAG)?.[1] === color) {
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
// The trailing `color:` is optional: marks written back when the text colour was
// derived still carry one, and a recolour has to match them to strip it.
const MARK_STYLE = String.raw`background:${COLOR_VALUE}(?:\s*;\s*color:[^"'>]*)?`;
// Marks the highlights as ours. styles.css hooks this to undo the `<mark>` user
// agent rule, which must not reach Obsidian's own `==highlight==` or a mark
// written by hand.
const HIGHLIGHT_CLASS = "editing-toolbar-highlight";
// The class is optional when matching so a recolour still finds marks written
// before it existed — recognising them is what lets the rewrite upgrade them
// rather than nest a second mark inside.
const MARK_OPEN = String.raw`<mark\s+(?:class=["']?${HIGHLIGHT_CLASS}["']?\s+)?style=["']?${MARK_STYLE}["']?>`;
// One mark wrapping the whole selection, with its style captured. Requires the
// class, so a mark of the same colour that predates it still falls through to the
// rewrite and picks one up. Comparing the capture as a string keeps a colour
// containing regex syntax out of the pattern.
const SINGLE_MARK = new RegExp(
  String.raw`^<mark\s+class=["']?${HIGHLIGHT_CLASS}["']?\s+style=["']?(${MARK_STYLE})["']?>[\s\S]+<\/mark>$`,
);

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()`. Anything
// else (a `var()`, a named colour) returns null for the caller to pass through.
export function parseColor(color: string): Rgba | null {
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

// Serialises back to hex, keeping alpha as the 8-digit form. Colours that
// parseColor does not understand are returned untouched.
export function toHexColor(color: string): string {
  const rgba = parseColor(color);
  if (!rgba) return color;

  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");

  const rgb = `#${channel(rgba.r)}${channel(rgba.g)}${channel(rgba.b)}`;
  return rgba.a >= 1 ? rgb : `${rgb}${channel(rgba.a * 255)}`;
}

export function setBackgroundcolor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  // Background only: the chosen colour goes in as-is and the text colour is left
  // to the theme. Deriving one would mean guessing, and a translucent fill has
  // no fixed luminance to guess from — it composites over whatever is behind it.
  const style = `background:${color}`;
  const open = `<mark class="${HIGHLIGHT_CLASS}" style="${style}">`;

  const hasColorTag = new RegExp(String.raw`${MARK_OPEN}[\s\S]*?<\/mark>`).test(
    selectText,
  );

  if (selectText.trim().match(SINGLE_MARK)?.[1] === style) {
    return;
  }

  // The whole opening tag is replaced rather than just the colour, so a mark ends
  // up with one set of attributes: a stale `color:` goes and a missing class
  // arrives. Replacing via a function keeps `$` in the colour from being read as
  // a backreference.
  const finalText = hasColorTag
    ? selectText.replace(new RegExp(MARK_OPEN, "gi"), () => open)
    : wrapEachLine(selectText, open, "</mark>");

  const tagLength = hasColorTag ? 0 : `${open}</mark>`.length;
  const adjustedSelections = adjustSelectionsForTag(editor, tagLength);

  editor.replaceSelection(finalText);
  editor.setSelections(adjustedSelections);
}
