import { Editor } from "obsidian";

// Blockquote and callout lead-in. Held aside and re-attached, so a heading change
// never rewrites it. `[!name]` requires the `!` so a top-level `[x] task` is not
// mistaken for a callout.
const BLOCK_PREFIX = /^\s*(?:>\s*)*(?:\[!\w+\]\s*)?/;
// Heading, bullet, ordered and task markers all give way to a new heading.
const LINE_MARKERS =
  /^(?:(?:#{1,6}\s+)|(?:[-+*]\s+)|(?:\d+\.\s+)|(?:\[[ xX]\]\s+))+/;
const HEADING = /^#{1,6}\s+/;

function parseHeadingLine(lineText: string) {
  const prefix = lineText.match(BLOCK_PREFIX)?.[0] ?? "";
  const body = lineText.slice(prefix.length);
  return { prefix, body, heading: body.match(HEADING)?.[0].trim() ?? "" };
}

export function setHeader(marker: string, editor: Editor) {
  // Repeating a level clears it, but only where every line already has it. A mixed
  // selection levels up instead of half-clearing.
  let uniform = true;

  editor.processLines(
    (_line, lineText) => {
      if (parseHeadingLine(lineText).heading !== marker) uniform = false;
      return true;
    },
    (line, lineText) => {
      const { prefix, body } = parseHeadingLine(lineText);
      const removing = marker === "" || uniform;
      const stripped = removing
        ? (body.match(HEADING)?.[0].length ?? 0)
        : (body.match(LINE_MARKERS)?.[0].length ?? 0);

      return {
        from: { line, ch: prefix.length },
        to: { line, ch: prefix.length + stripped },
        text: removing ? "" : `${marker} `,
      };
    },
  );
}
