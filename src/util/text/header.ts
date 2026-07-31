import { Editor } from "obsidian";

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
