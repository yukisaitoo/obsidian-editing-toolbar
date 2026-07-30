import { syntaxTree } from "@codemirror/language";
import { Editor } from "obsidian";

// Hangul Filler (U+3164): invisible but non-whitespace, so it spaces a block
// apart from a renumbered list without the gap collapsing.
const LIST_SEPARATOR_FILLER = "ㅤ";

const ORDERED_ITEM = /^(\s*)(\d+)\.\s(.*)$/;

interface OrderedItem {
  indent: string;
  number: number;
  body: string;
}

function parseOrderedItem(line: string): OrderedItem | null {
  const match = line.match(ORDERED_ITEM);
  if (!match) return null;
  return { indent: match[1], number: Number(match[2]), body: match[3] };
}

function indentWidth(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

export function renumberSelection(editor: Editor): void {
  const selection = editor.getSelection();
  if (selection) {
    renumberLines(editor, selection.split("\n"), editor.getCursor("from").line);
    return;
  }

  const cursor = editor.getCursor();
  if (!parseOrderedItem(editor.getLine(cursor.line))) return;

  const { startLine, endLine } = startsList(editor, cursor.line)
    ? fullListRange(editor, cursor.line)
    : listRangeFromCursor(editor, cursor.line);

  const lines: string[] = [];
  for (let line = startLine; line <= endLine; line++) {
    lines.push(editor.getLine(line));
  }
  renumberLines(editor, lines, startLine);
}

// Begins a list (renumber all of it) rather than continuing one (renumber from the
// cursor down). Any indented item counts as a start.
function startsList(editor: Editor, line: number): boolean {
  if (line === 0) return true;
  if (!parseOrderedItem(editor.getLine(line - 1))) return true;
  return indentWidth(editor.getLine(line)) > 0;
}

/** The contiguous run of ordered items around `line`, at any depth. */
function fullListRange(
  editor: Editor,
  line: number,
): { startLine: number; endLine: number } {
  let startLine = line;
  let endLine = line;

  while (startLine > 0 && parseOrderedItem(editor.getLine(startLine - 1))) {
    startLine--;
  }
  while (
    endLine < editor.lineCount() - 1 &&
    parseOrderedItem(editor.getLine(endLine + 1))
  ) {
    endLine++;
  }

  return { startLine, endLine };
}

/** From `line` down for as long as items stay at least as deep as it is. */
function listRangeFromCursor(
  editor: Editor,
  line: number,
): { startLine: number; endLine: number } {
  const depth = indentWidth(editor.getLine(line));
  let endLine = line;

  while (endLine < editor.lineCount() - 1) {
    const next = editor.getLine(endLine + 1);
    if (!parseOrderedItem(next) || indentWidth(next) < depth) break;
    endLine++;
  }

  return { startLine: line, endLine };
}

function renumberLines(
  editor: Editor,
  lines: string[],
  startLine: number,
): void {
  if (!lines.some((line) => parseOrderedItem(line))) return;
  if (!editor.cm) return;

  const firstLine = separateFromPreviousList(editor, startLine);

  const result = needsSeparationBefore(editor, firstLine)
    ? ["", LIST_SEPARATOR_FILLER, ...renumber(lines)]
    : renumber(lines);

  const lastLine = firstLine + lines.length - 1;
  editor.replaceRange(
    result.join("\n"),
    { line: firstLine, ch: 0 },
    { line: lastLine, ch: editor.getLine(lastLine).length },
  );
}

// An earlier ordered list butted right up against this one reads as a single list
// to the markdown parser, so a blank line is pushed between them before
// renumbering. Returns the start line shifted by any insertion.
function separateFromPreviousList(editor: Editor, startLine: number): number {
  const tree = syntaxTree(editor.cm.state);
  const startOffset = editor.posToOffset({ line: startLine, ch: 0 });

  let previousListEnd = -1;
  tree.iterate({
    from: 0,
    to: startOffset,
    enter: (node) => {
      if (node.name === "OrderedList") previousListEnd = node.to;
    },
  });
  if (previousListEnd < 0) return startLine;

  const gapLine = editor.offsetToPos(previousListEnd).line + 1;
  if (gapLine >= startLine || editor.getLine(gapLine).trim() === "") {
    return startLine;
  }

  editor.replaceRange("\n", { line: gapLine, ch: 0 });
  return startLine + 1;
}

function needsSeparationBefore(editor: Editor, startLine: number): boolean {
  if (startLine === 0) return false;
  const previous = editor.getLine(startLine - 1).trim();
  return previous !== "" && !previous.includes(LIST_SEPARATOR_FILLER);
}

function renumber(lines: string[]): string[] {
  const numberByIndent: Record<number, number> = {};
  let previousIndent = -1;

  return lines.map((line) => {
    const item = parseOrderedItem(line);
    if (!item) {
      previousIndent = -1;
      return line;
    }

    const indent = item.indent.length;
    numberByIndent[indent] =
      indent === previousIndent ? (numberByIndent[indent] ?? 1) + 1 : 1;
    previousIndent = indent;

    return `${item.indent}${numberByIndent[indent]}. ${item.body}`;
  });
}
