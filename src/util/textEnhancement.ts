import { Editor, Notice } from "obsidian";
import { text } from "src/translations/helper";

export class TextEnhancement {
  static getPlainText(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice(text("Please select text first"));
      return;
    }

    const mdPattern =
      /(^#+\s|(?<=^|\s*)#|^>|^\- \[( |x)\]|^\+ |<[^<>]+>|^1\. |^\-+$|^\*+$|==|\*+|~~|```|!*\[\[|\]\])/gm;
    let plainText = selection
      .replace(/\[([^\[\]]*)\]\([^\(\)]+\)/gim, "$1")
      .replace(mdPattern, "")
      .replace(/^[ ]+|[ ]+$/gm, "")
      .replace(/(\r\n|\n)+/gm, "\n");

    navigator.clipboard.writeText(plainText);
    new Notice(text("Plain text copied to clipboard"));
  }

  static insertBlankLines(editor: Editor): void {
    const text = editor.getValue();
    if (!text) return;

    const result = text.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");
    editor.setValue(result);
  }


  static processWhitespace(
    editor: Editor,
    options: {
      trim?: boolean;
      compress?: boolean;
      all?: boolean;
      tabs?: boolean;
      removeEmptyLines?: boolean;
      compactEmptyLines?: boolean;
    } = {}
  ): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice(text("Please select text first"));
      return;
    }

    let result = selection;

    if (options.all) {
      result = result.replace(/[ \u3000\t]+/g, "");
    } else {
      if (options.tabs) result = result.replace(/\t/g, "");
      if (options.compress) result = result.replace(/[ \u3000]+/g, " ");
    }

    let lines = result.split(/\r?\n/);

    if (options.trim) {
      lines = lines.map((line) => line.trim());
    }

    if (options.removeEmptyLines) {
      lines = lines.filter((line) => line.length > 0);
    } else if (options.compactEmptyLines) {
      const newLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length === 0 && i > 0 && lines[i - 1].length === 0) {
          continue;
        }
        newLines.push(lines[i]);
      }
      lines = newLines;
    }

    result = lines.join("\n");

    if (options.removeEmptyLines) {
      result = result.trim();
    }

    editor.replaceSelection(result);
    new Notice(text("Whitespace cleaning completed"));
  }
  static splitLines(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice(text("Please select text first"));
      return;
    }

    const listPattern = this.detectPattern(selection);

    let result: string[];

    if (listPattern) {
      result = selection
        .split(listPattern)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      new Notice(text("List pattern detected, auto-split"));
    } else {
      const sep = this.detectSeparator(selection);
      if (!sep) {
        new Notice(text("No obvious separator or list pattern detected"));
        return;
      }
      result = this.smartSplit(selection, sep);
      new Notice(`${text("Merged with")} '${sep}' ${text("Merge completed")}`);
    }

    editor.replaceSelection(result.join("\n"));
  }

  private static detectPattern(text: string): RegExp | null {
    const numberedList = /\s?\d+[\.、]\s?/g;

    const arrowSymbol = /\s?[→=>]\s?/g;

    if ((text.match(numberedList) || []).length > 1) return numberedList;
    if ((text.match(arrowSymbol) || []).length > 1) return arrowSymbol;

    return null;
  }
  private static smartSplit(text: string, separator: string): string[] {
    const parts: string[] = [];
    let current = "";
    let inQuote: string | null = null;

    const pairs: Record<string, string> = {
      '"': '"',
      "'": "'",
      "“": "”",
      "‘": "’",
      "(": ")",
      "（": "）",
      "《": "》",
      "[": "]",
      "[[": "]]",
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (!inQuote) {
        if (pairs[char]) {
          inQuote = pairs[char];
          current += char;
        } else if (char === separator) {
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      } else {
        current += char;
        if (char === inQuote) {
          inQuote = null;
        }
      }
    }

    if (current) parts.push(current.trim());

    return parts.filter((p) => p.length > 0);
  }

  private static detectSeparator(text: string): string | null {
    const candidates = ["、", "，", ",", ";", "；", "|", "·"];
    let maxCount = 0;
    let bestSeparator = null;

    candidates.forEach((sep) => {
      const count = text.split(sep).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestSeparator = sep;
      }
    });

    return bestSeparator;
  }
  static async smartPaste(editor: Editor): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      let processed = text.replace(/(\r\n|\n){3,}/g, "\n\n");
      processed = processed.replace(/[ \t]+$/gm, "");

      editor.replaceSelection(processed);
    } catch (err) {
      new Notice(text("Paste failed"));
    }
  }

  static smartTypography(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection || selection.trim().length === 0) {
      new Notice(text("Please select text first"));
      return;
    }

    const cjkRegex = /[\u4e00-\u9fa5]/g;
    const cjkCount = (selection.match(cjkRegex) || []).length;
    const isChineseContext = cjkCount / selection.length > 0.1;

    let result = selection;

    const placeholders: string[] = [];
    const protectedPatterns = [
      /`[^`]+`/g,
      /\$[^$]+\$/g,
      /https?:\/\/[^\s)]+/g,
      /!\[.*?\]\(.*?\)/g,
      /\[.*?\]\(.*?\)/g,
    ];

    protectedPatterns.forEach((reg) => {
      result = result.replace(reg, (match) => {
        placeholders.push(match);
        return `__PROTECTED_${placeholders.length - 1}__`;
      });
    });

    if (isChineseContext) {
      result = result
        .replace(/,/g, "，")
        .replace(/\.(?!\d)/g, "。")
        .replace(/;/g, "；")
        .replace(/:/g, "：")
        .replace(/\?/g, "？")
        .replace(/!/g, "！")
        .replace(/\(/g, "（")
        .replace(/\)/g, "）")
        .replace(/"([^"]*)"/g, "\u201c$1\u201d")
        .replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, "$1 $2")
        .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, "$1 $2");

      new Notice(text("Detected Chinese context: converted to full-width symbols"));
    } else {
      result = result
        .replace(/，/g, ", ")
        .replace(/。/g, ". ")
        .replace(/；/g, "; ")
        .replace(/：/g, ": ")
        .replace(/？/g, "? ")
        .replace(/！/g, "! ")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/[""]/g, '"')
        .replace(/ {2,}/g, " ");

      new Notice(text("Detected code/English context: converted to half-width symbols"));
    }

    placeholders.forEach((val, index) => {
      result = result.replace(`__PROTECTED_${index}__`, val);
    });

    editor.replaceSelection(result);
  }
  static dedupe(
    editor: Editor,
    options: {
      includeEmpty?: boolean;
      trimBeforeCompare?: boolean;
      sort?: boolean;
    } = {}
  ): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice(text("Please select text to dedupe first"));
      return;
    }

    const lines = selection.split(/\r?\n/);
    const seen = new Set<string>();
    const result: string[] = [];

    for (const line of lines) {
      const content = options.trimBeforeCompare ? line.trim() : line;

      if (content === "") {
        if (options.includeEmpty) {
          if (!seen.has("")) {
            seen.add("");
            result.push(line);
          }
        } else {
          result.push(line);
        }
        continue;
      }

      if (!seen.has(content)) {
        seen.add(content);
        result.push(line);
      }
    }

    if (options.sort) {
      result.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
    }

    editor.replaceSelection(result.join("\n"));
    new Notice(`${text("Deduplication completed, remaining")} ${result.length} ${text("lines")}`);
  }

  static addWrap(
    editor: Editor,
    prefix: string = "",
    suffix: string = "",
    excludeEmpty: boolean = true
  ): void {
    const selection = editor.getSelection();
    const useSelection = selection && selection.trim() !== "";
    const text = useSelection ? selection : editor.getValue();

    if (!text) return;

    const lines = text.split("\n");
    const result = lines
      .map((line) => {
        if (excludeEmpty && line.trim().length === 0) {
          return line;
        }
        return `${prefix}${line}${suffix}`;
      })
      .join("\n");

    if (useSelection) {
      editor.replaceSelection(result);
    } else {
      editor.setValue(result);
    }
    new Notice(text("Prefix/suffix added"));
  }

  static numberList(
    editor: Editor,
    startNumber: number = 1,
    stepNumber: number = 1,
    separator: string = ". ",
    prefix: string = ""
  ): void {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice(text("Please select text to number first"));
      return;
    }

    const lines = selection.split("\n");
    let currentNum = startNumber;

    const result = lines
      .map((line) => {
        if (line.trim() === "") return line;

        const cleanLine = line.replace(/^\s*\d+[\.\)）、]?\s*/, "");

        const numberedLine = `${prefix}${currentNum}${separator}${cleanLine}`;
        currentNum += stepNumber;
        return numberedLine;
      })
      .join("\n");

    editor.replaceSelection(result);
    new Notice(`${text("Numbering completed: starting from")} ${startNumber}`);
  }

  static extractBetween(
    editor: Editor,
    startStr: string,
    endStr: string
  ): void {
    if (!startStr && !endStr) {
      new Notice(text("Please specify start or end string"));
      return;
    }

    const text = editor.getValue();
    if (!text) return;

    try {
      const escapeRegExp = (str: string) =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const s = escapeRegExp(startStr);
      const e = escapeRegExp(endStr);
      const pattern = new RegExp(`${s}(.*?)${e}`, "g");

      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] !== undefined) {
          matches.push(match[1]);
        }
      }

      if (matches.length > 0) {
        editor.setValue(matches.join("\n"));
        new Notice(`${text("Extracted")} ${matches.length} ${text("matches")}`);
      } else {
        new Notice(text("No matches found"));
      }
    } catch (e) {
      new Notice(text("Extraction failed"));
    }
  }

  static mergeLines(
    editor: Editor,
    options: {
      separator?: string;
      preserveParagraphs?: boolean;
      trimLines?: boolean;
    }
  ): void {
    const selection = editor.getSelection();
    if (!selection || selection.trim() === "") {
      new Notice(text("Please select lines to merge first"));
      return;
    }

    const lines = selection.split(/\r?\n/);
    const hasCustomSep = options.separator !== "";
    let result = "";

    for (let i = 0; i < lines.length; i++) {
      let currentLine = options.trimLines ? lines[i].trim() : lines[i];

      if (currentLine === "") {
        if (options.preserveParagraphs && !hasCustomSep) {
          result += "\n\n";
        }
        continue;
      }

      if (result !== "" && !result.endsWith("\n")) {
        if (hasCustomSep) {
          result += options.separator;
        } else {
          const lastChar = result.slice(-1);
          const firstChar = currentLine.charAt(0);
          const isCjkConnection =
            /[\u4e00-\u9fa5]/.test(lastChar) &&
            /[\u4e00-\u9fa5]/.test(firstChar);
          if (!isCjkConnection) result += " ";
        }
      }

      result += currentLine;
    }

    result = result.replace(/[ ]{2,}/g, " ").trim();

    editor.replaceSelection(result);
    new Notice(
      hasCustomSep ? `${text("Merged with")} '${options.separator}'` : text("Merge completed")
    );
  }

  static convertListToTableMultiDim(editor: Editor): void {
    const selection = editor.getSelection();
    if (!selection || selection.trim() === "") return;

    const lines = selection.split(/\r?\n/);
    const listRegex = /^((\s*)(?:[-*+]|\d+\.)\s+)(.*)/;

    let maxLevel = 0;
    const indents = lines
      .map((l) => l.match(listRegex))
      .filter((m) => m && m[2].length > 0)
      .map((m) => {
        const len = m![2].replace(/\t/g, "    ").length;
        return len;
      });
    const finalTabSize = indents.length > 0 ? Math.min(...indents) : 4;

    lines.forEach((line) => {
      const m = line.match(listRegex);
      if (m) {
        const level = Math.round(
          m[2].replace(/\t/g, " ".repeat(finalTabSize)).length / finalTabSize
        );
        if (level > maxLevel) maxLevel = level;
      }
    });

    let preText: string[] = [];
    let tableRows: string[][] = [];
    let currentRow: string[] = [];
    let isInsideTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(listRegex);

      if (match) {
        isInsideTable = true;
        const content = match[3].trim();
        const level = Math.round(
          (match[2] || "").replace(/\t/g, " ".repeat(finalTabSize)).length /
            finalTabSize
        );

        if (maxLevel === 1) {
          if (level === 0) {
            if (currentRow.length > 0) tableRows.push([...currentRow]);
            currentRow = [content, ""];
          } else {
            currentRow[1] = currentRow[1]
              ? currentRow[1] + "<br>" + content
              : content;
          }
        } else {
          if (currentRow[level] !== undefined) {
            tableRows.push([...currentRow]);
            currentRow = currentRow.slice(0, level);
          }
          currentRow[level] = content;
        }
      } else {
        if (!isInsideTable) {
          preText.push(line);
        } else if (line.trim() !== "") {
          const lastIdx = currentRow.length - 1;
          if (lastIdx >= 0) currentRow[lastIdx] += "<br>" + line.trim();
        }
      }
    }
    if (currentRow.length > 0) tableRows.push(currentRow);

    const finalizedRows =
      maxLevel === 1 ? tableRows : this.applyVisualMerge(tableRows);
    this.renderFinalResult(editor, preText, finalizedRows, [], maxLevel + 1);
  }
  private static applyVisualMerge(tableRows: string[][]): string[][] {
    let lastPushedRow: string[] = [];
    return tableRows.map((row, rowIndex) => {
      if (rowIndex === 0) {
        lastPushedRow = [...row];
        return row;
      }
      const processedRow = row.map((cell, colIndex) => {
        const isPathSame = row
          .slice(0, colIndex)
          .every((c, i) => c === lastPushedRow[i] || c === "");
        if (isPathSame && cell === lastPushedRow[colIndex]) return "";
        return cell;
      });
      lastPushedRow = [...row];
      return processedRow;
    });
  }

  private static renderFinalResult(
    editor: Editor,
    pre: string[],
    rows: string[][],
    post: string[],
    maxCols: number
  ) {
    const header =
      "| " +
      Array.from({ length: maxCols }, (_, i) =>
        i === 0 ? text("Item") : `${text("Content")} ${i}`
      ).join(" | ") +
      " |\n";
    const sep =
      "| " + Array.from({ length: maxCols }, () => "---").join(" | ") + " |\n";
    const body = rows
      .map((row) => {
        const fullRow = Array.from({ length: maxCols }, (_, i) =>
          (row[i] || "").replace(/\|/g, "\\|")
        );
        return `| ${fullRow.join(" | ")} |`;
      })
      .join("\n");

    let tableMarkdown = header + sep + body;

    let finalContent = "";

    if (pre.length > 0) {
      finalContent += pre.join("\n").trimEnd() + "\n\n";
    }

    finalContent += tableMarkdown;

    if (post.length > 0) {
      finalContent += "\n\n" + post.join("\n").trimStart();
    }

    const cursor = editor.getCursor("from");
    if (cursor.line > 0 && pre.length === 0) {
      const prevLine = editor.getLine(cursor.line - 1);
      if (prevLine.trim() !== "") {
        finalContent = "\n" + finalContent;
      }
    }

    editor.replaceSelection(finalContent);
    new Notice(text("Super conversion completed: context preserved and layout optimized"));
  }

  static convertTableToList(editor: Editor): void {
    let selection = editor.getSelection();

    if (!selection || !selection.includes("|")) {
      const cursor = editor.getCursor("from");
      const totalLines = editor.lineCount();

      let startLine = cursor.line;
      while (startLine > 0) {
        const line = editor.getLine(startLine - 1);
        if (line.includes("|")) {
          startLine--;
        } else {
          break;
        }
      }

      let endLine = cursor.line;
      while (endLine < totalLines - 1) {
        const line = editor.getLine(endLine + 1);
        if (line.includes("|")) {
          endLine++;
        } else {
          break;
        }
      }

      if (startLine <= endLine) {
        const tableLines: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
          const line = editor.getLine(i);
          if (line.includes("|")) {
            tableLines.push(line);
          }
        }

        if (tableLines.length > 0) {
          selection = tableLines.join("\n");
          editor.setSelection(
            { line: startLine, ch: 0 },
            { line: endLine, ch: editor.getLine(endLine).length }
          );
        }
      }
    }

    if (!selection || !selection.includes("|")) {
      new Notice(text("Please select a valid Markdown table"));
      return;
    }

    const lines = selection.split(/\r?\n/);
    const result: string[] = [];

    for (const line of lines) {
      if (line.match(/^\s*\|?[\s\-:|]+\|?\s*$/) || line.trim() === "") continue;

      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());

      cells.forEach((cell, index) => {
        if (cell !== "" && cell !== text("Item") && !cell.startsWith(text("Content"))) {
          const indent = "  ".repeat(index);
          result.push(`${indent}- ${cell}`);
        }
      });
    }

    editor.replaceSelection(result.join("\n"));
    new Notice(text("Table converted to multi-level list"));
  }
}
