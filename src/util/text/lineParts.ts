// Obsidian's own callout syntax, read from the text after the blockquote markers.
const CALLOUT = String.raw`\[![^\]]+\][-+]?(?=\s|$)`;
// Blockquote and callout lead-in. Held aside and re-attached, so a line change never
// rewrites it.
export const BLOCK_PREFIX = new RegExp(
  String.raw`^\s*(?:(?:>\s*)+(?:${CALLOUT}\s*)?)?`,
);
// A callout title renders as inline markdown, so it can never hold a heading.
export const CALLOUT_TITLE = new RegExp(String.raw`^\s*(?:>\s*)+${CALLOUT}`);
// Heading, bullet, ordered and task markers all give way to a new heading.
export const LINE_MARKERS =
  /^(?:(?:#{1,6}\s+)|(?:[-+*]\s+)|(?:\d+\.\s+)|(?:\[[ xX]\]\s+))+/;

// Everything ahead of the line's own text: indent, blockquote or callout lead-in,
// and any heading, list or task marker.
export function linePrefix(line: string): string {
  const block = line.match(BLOCK_PREFIX)?.[0] ?? "";
  return block + (line.slice(block.length).match(LINE_MARKERS)?.[0] ?? "");
}
