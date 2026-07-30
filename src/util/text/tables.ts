import { Editor, Notice } from "obsidian";
import { strings } from "src/translations/helper";
import { requireSelection } from "src/util/text/selection";

const LIST_ITEM = /^((\s*)(?:[-*+]|\d+\.)\s+)(.*)/;

export function convertListToTableMultiDim(editor: Editor): void {
  const selection = requireSelection(editor);
  if (selection === null) return;

  const lines = selection.split(/\r?\n/);
  const tabSize = detectIndentWidth(lines);
  const maxLevel = deepestLevel(lines, tabSize);

  const { preText, rows } = collectRows(lines, tabSize, maxLevel);

  const finalRows = maxLevel === 1 ? rows : blankRepeatedAncestors(rows);
  editor.replaceSelection(
    renderTable(editor, preText, finalRows, maxLevel + 1),
  );
  new Notice(strings.superConversionCompletedContextPreserved);
}

export function convertTableToList(editor: Editor): void {
  const selection = selectSurroundingTable(editor);
  if (!selection?.includes("|")) {
    new Notice(strings.pleaseSelectValidMarkdownTable);
    return;
  }

  const result: string[] = [];
  for (const line of selection.split(/\r?\n/)) {
    if (line.match(/^\s*\|?[\s\-:|]+\|?\s*$/) || line.trim() === "") continue;

    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
      .forEach((cell, index) => {
        if (!cell || cell === strings.item || cell.startsWith(strings.content)) {
          return;
        }
        result.push(`${"  ".repeat(index)}- ${cell}`);
      });
  }

  editor.replaceSelection(result.join("\n"));
  new Notice(strings.tableConvertedMultiLevelList);
}

function detectIndentWidth(lines: string[]): number {
  const indents = lines
    .map((line) => line.match(LIST_ITEM))
    .filter((m): m is RegExpMatchArray => !!m && m[2].length > 0)
    .map((m) => m[2].replace(/\t/g, "    ").length);
  return indents.length ? Math.min(...indents) : 4;
}

function levelOf(indent: string, tabSize: number): number {
  return Math.round(indent.replace(/\t/g, " ".repeat(tabSize)).length / tabSize);
}

function deepestLevel(lines: string[], tabSize: number): number {
  return lines.reduce((max, line) => {
    const m = line.match(LIST_ITEM);
    return m ? Math.max(max, levelOf(m[2], tabSize)) : max;
  }, 0);
}

function collectRows(lines: string[], tabSize: number, maxLevel: number) {
  const preText: string[] = [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let insideTable = false;

  for (const line of lines) {
    const match = line.match(LIST_ITEM);

    if (!match) {
      if (!insideTable) {
        preText.push(line);
      } else if (line.trim() !== "" && currentRow.length) {
        currentRow[currentRow.length - 1] += "<br>" + line.trim();
      }
      continue;
    }

    insideTable = true;
    const content = match[3].trim();
    const level = levelOf(match[2] || "", tabSize);

    if (maxLevel === 1) {
      if (level === 0) {
        if (currentRow.length) rows.push([...currentRow]);
        currentRow = [content, ""];
      } else {
        currentRow[1] = currentRow[1] ? currentRow[1] + "<br>" + content : content;
      }
      continue;
    }

    if (currentRow[level] !== undefined) {
      rows.push([...currentRow]);
      currentRow = currentRow.slice(0, level);
    }
    currentRow[level] = content;
  }

  if (currentRow.length) rows.push(currentRow);
  return { preText, rows };
}

function blankRepeatedAncestors(rows: string[][]): string[][] {
  let previous: string[] = [];
  return rows.map((row, rowIndex) => {
    if (rowIndex === 0) {
      previous = [...row];
      return row;
    }
    const merged = row.map((cell, colIndex) => {
      const samePath = row
        .slice(0, colIndex)
        .every((c, i) => c === previous[i] || c === "");
      return samePath && cell === previous[colIndex] ? "" : cell;
    });
    previous = [...row];
    return merged;
  });
}

function renderTable(
  editor: Editor,
  pre: string[],
  rows: string[][],
  columns: number,
): string {
  const headings = Array.from({ length: columns }, (_, i) =>
    i === 0 ? strings.item : `${strings.content} ${i}`,
  );
  const table = [
    `| ${headings.join(" | ")} |`,
    `| ${Array.from({ length: columns }, () => "---").join(" | ")} |`,
    ...rows.map((row) => {
      const cells = Array.from({ length: columns }, (_, i) =>
        (row[i] || "").replace(/\|/g, "\\|"),
      );
      return `| ${cells.join(" | ")} |`;
    }),
  ].join("\n");

  if (pre.length) return `${pre.join("\n").trimEnd()}\n\n${table}`;

  // A table needs a blank line above it or the previous paragraph absorbs it.
  const cursor = editor.getCursor("from");
  const needsGap =
    cursor.line > 0 && editor.getLine(cursor.line - 1).trim() !== "";
  return needsGap ? `\n${table}` : table;
}

function selectSurroundingTable(editor: Editor): string | null {
  const selection = editor.getSelection();
  if (selection?.includes("|")) return selection;

  const cursor = editor.getCursor("from");
  let startLine = cursor.line;
  let endLine = cursor.line;

  while (startLine > 0 && editor.getLine(startLine - 1).includes("|")) {
    startLine--;
  }
  while (
    endLine < editor.lineCount() - 1 &&
    editor.getLine(endLine + 1).includes("|")
  ) {
    endLine++;
  }

  const tableLines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const line = editor.getLine(i);
    if (line.includes("|")) tableLines.push(line);
  }
  if (!tableLines.length) return null;

  editor.setSelection(
    { line: startLine, ch: 0 },
    { line: endLine, ch: editor.getLine(endLine).length },
  );
  return tableLines.join("\n");
}
