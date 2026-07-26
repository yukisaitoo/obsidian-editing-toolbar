import { Editor, Command } from "obsidian";
import { syntaxTree } from '@codemirror/language';
import { EditingToolbarSettings } from "../settings/settingsData";
import { strings } from "../translations/helper";

// Hangul Filler (U+3164): an invisible, non-whitespace character used as a
// blank spacer line so Obsidian treats an adjacent block as separate from the
// renumbered list without the gap collapsing.
const LIST_SEPARATOR_FILLER = "ㅤ";

export function GenNonDuplicateID(randomLength: number) {
  const idStr = Date.now().toString(36);
  return idStr + Math.random().toString(36).slice(3, 3 + randomLength);
}

/**
 * Where a command lives in a toolbar's command list. `subIndex` is -1 for a
 * top-level command; `index` is -1 when the command is not in the list at all.
 */
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

// A color-picker table is a flat list of rows: a section header, a blank
// spacer, or a row of clickable color swatches. The consuming toolbar reads
// each swatch's `background-color`, so the header labels below are inert.
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


// When a fresh color tag is wrapped around the selection, the head/anchor of
// each selection must shift by the length of the inserted opening+closing tag
// so the visual selection still covers the original text.
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

export function setFontcolor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  const fontColorRegex = /<font\s+color=["']?[^"'>]+["']?>(.*?)<\/font>/gms;
  const hasColorTag = fontColorRegex.test(selectText);
  const isAlreadyInSameColor = (text: string, targetColor: string): boolean => {
    const cleanColorRegex = new RegExp(`^<font\\s+color=["']?${targetColor}["']?>(.+)<\\/font>$`, 'ms');
    return cleanColorRegex.test(text.trim());
  };

  if (isAlreadyInSameColor(selectText, color)) {
    return;
  }

  const replaceColor = (match: string, text: string) => {
    return text.split('\n').map(line =>
      line.trim() ? `<font color="${color}">${line}</font>` : line
    ).join('\n');
  };

  const newText = selectText.replace(fontColorRegex, replaceColor);

  // No tags matched → wrap each non-empty line fresh
  const finalText = newText === selectText
    ? selectText.split('\n').map(line => 
        line.trim() ? `<font color="${color}">${line}</font>` : line
      ).join('\n')
    : newText;

  const tagLength = hasColorTag ? 0 : `<font color="${color}"></font>`.length;
  const adjustedSelections = adjustSelectionsForTag(editor, tagLength);

  editor.replaceSelection(finalText);
  editor.setSelections(adjustedSelections);
}

export function setBackgroundcolor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  const bgColorRegex = /<mark\s+style=["']?background:(?:#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))["']?>([\s\S]*?)<\/mark>/g;
  const hasColorTag = bgColorRegex.test(selectText);

  const isAlreadyInSameColor = (text: string, targetColor: string): boolean => {
    const escapedColor = targetColor.replace(/([()[{*+.$^\\|?])/g, '\\$1');
    const cleanColorRegex = new RegExp(`^<mark\\s+style=["']?background:${escapedColor}["']?>([\\s\\S]+)<\\/mark>$`);
    return cleanColorRegex.test(text.trim());
  };

  if (isAlreadyInSameColor(selectText, color)) {
    return;
  }

  let finalText;
  
  if (hasColorTag) {
    finalText = selectText.replace(/(background:)(?:#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/gi, `$1${color}`);
  } else {
    finalText = selectText.split('\n').map(line => 
      line.trim() ? `<mark style="background:${color}">${line}</mark>` : line
    ).join('\n');
  }

  const tagLength = hasColorTag ? 0 : `<mark style="background:${color}"></mark>`.length;
  const adjustedSelections = adjustSelectionsForTag(editor, tagLength);

  editor.replaceSelection(finalText);
  editor.setSelections(adjustedSelections);
}

export function renumberSelection(editor: Editor) {
  const selection = editor.getSelection();
  if (!selection) {
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    if (/^\s*\d+\.\s/.test(lineText)) {
      const currentIndent = editor.getLine(cursor.line).match(/^\s*/)?.[0].length || 0;
      const prevLineNum = cursor.line - 1;
      const prevLine = prevLineNum >= 0 ? editor.getLine(prevLineNum).trim() : '';
      const isListStart = prevLineNum < 0 || !/^\s*\d+\.\s/.test(prevLine) || (prevLine.match(/^\s*/)?.[0].length || 0) < currentIndent;

      if (isListStart) {
        const { startLine, endLine } = getFullListRange(editor, cursor.line);
        renumberLines(editor, startLine, endLine);
      } else {
        const { startLine, endLine } = getListRangeForCursor(editor, cursor.line);
        renumberLines(editor, startLine, endLine);
      }
    }
    return;
  }

  const { lines, startLine } = getSelectionLines(editor);
  processSelectionWithContext(lines, startLine, editor);
}

function getSelectionLines(editor: Editor): { lines: string[]; startLine: number } {
  const selection = editor.getSelection();
  const cursor = editor.getCursor('from');
  return { lines: selection.split('\n'), startLine: cursor.line };
}

function processSelectionWithContext(lines: string[], startLine: number, editor: Editor) {
  let hasListItems = false;
  for (const line of lines) {
    if (/^\s*\d+\.\s/.test(line.trim())) {
      hasListItems = true;
      break;
    }
  }
  if (!hasListItems) {
    return;
  };

  const view = editor.cm;
  if (!view) return;

  const state = view.state;
  const tree = syntaxTree(state);

  const docStartPos = editor.posToOffset({ line: startLine, ch: 0 });
  let prevListEndPos = -1;

  tree.iterate({
    from: 0,
    to: docStartPos,
    enter: (node) => {
      if (node.name === 'OrderedList') {
        prevListEndPos = node.to;
      }
    },
  });

  if (prevListEndPos >= 0) {
    const prevListEndLine = editor.offsetToPos(prevListEndPos).line;
    const nextLineAfterPrevList = prevListEndLine + 1;
    if (nextLineAfterPrevList < startLine && !/^\s*$/.test(editor.getLine(nextLineAfterPrevList).trim())) {
      editor.replaceRange(
        '\n',
        { line: nextLineAfterPrevList, ch: 0 },
        { line: nextLineAfterPrevList, ch: 0 }
      );
      startLine++;
    }
  }

  let isAlreadyNumberedCorrectly = true;
  const expectedNumbers: number[] = [];
  let prevIndentLevel = -1;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (/^\d+\.\s/.test(trimmedLine)) {
      const indentLevel = line.match(/^\s*/)?.[0].length || 0;
      const currentNumber = parseInt(trimmedLine.match(/^\d+/)![0], 10);

      if (indentLevel !== prevIndentLevel) {
        expectedNumbers[indentLevel] = 1;
      } else {
        expectedNumbers[indentLevel] = (expectedNumbers[indentLevel] || 1) + 1;
      }

      if (currentNumber !== expectedNumbers[indentLevel]) {
        isAlreadyNumberedCorrectly = false;
        break;
      }
      prevIndentLevel = indentLevel;
    }
  }

  const result: string[] = [];
  const prevLineNum = startLine - 1;
  const prevLine = prevLineNum >= 0 ? editor.getLine(prevLineNum).trim() : '';
  const needsSeparationBefore =
    prevLine && !/^\s*$/.test(prevLine) && !prevLine.includes(LIST_SEPARATOR_FILLER);

  if (needsSeparationBefore) {
    result.push('');
    result.push(LIST_SEPARATOR_FILLER);
  }

  if (isAlreadyNumberedCorrectly) {
    result.push(...lines);
  } else {
    const numberByIndent: { [level: number]: number } = {};
    let prevLevel = -1;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const isListItem = /^\d+\.\s/.test(trimmedLine);
      const indentation = line.match(/^\s*/)?.[0] || '';

      if (isListItem) {
        const indentLevel = indentation.length;
        if (indentLevel !== prevLevel) {
          numberByIndent[indentLevel] = 1;
        } else {
          numberByIndent[indentLevel] = (numberByIndent[indentLevel] || 1) + 1;
        }
        result.push(`${indentation}${numberByIndent[indentLevel]}. ${trimmedLine.replace(/^\d+\.\s/, '')}`);
        prevLevel = indentLevel;
      } else {
        result.push(line);
        prevLevel = -1;
      }
    }
  }

  editor.replaceRange(
    result.join('\n'),
    { line: startLine, ch: 0 },
    { line: startLine + lines.length - 1, ch: editor.getLine(startLine + lines.length - 1).length }
  );
}

function getListRangeForCursor(editor: Editor, currentLine: number): { startLine: number; endLine: number } {
  const startLine = currentLine;
  let endLine = currentLine;

  const currentIndent = editor.getLine(currentLine).match(/^\s*/)?.[0].length || 0;

  while (endLine < editor.lineCount() - 1) {
    const nextLine = editor.getLine(endLine + 1);
    const nextIndent = nextLine.match(/^\s*/)?.[0].length || 0;
    if (!/^\s*\d+\.\s/.test(nextLine.trim()) || nextIndent < currentIndent) {
      break;
    }
    endLine++;
  }

  return { startLine, endLine };
}

function getFullListRange(editor: Editor, currentLine: number): { startLine: number; endLine: number } {
  let startLine = currentLine;
  let endLine = currentLine;

  while (startLine > 0) {
    const prevLine = editor.getLine(startLine - 1);
    if (!/^\s*\d+\.\s/.test(prevLine.trim())) {
      break;
    }
    startLine--;
  }

  while (endLine < editor.lineCount() - 1) {
    const nextLine = editor.getLine(endLine + 1);
    if (!/^\s*\d+\.\s/.test(nextLine.trim())) {
      break;
    }
    endLine++;
  }

  return { startLine, endLine };
}

function renumberLines(editor: Editor, startLine: number, endLine: number) {
  const lines = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(editor.getLine(i));
  }
  processSelectionWithContext(lines, startLine, editor);
}

