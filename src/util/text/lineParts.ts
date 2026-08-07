// Blockquote and callout lead-in. Held aside and re-attached, so a heading change
// never rewrites it. `[!name]` requires the `!` so a top-level `[x] task` is not
// mistaken for a callout.
export const BLOCK_PREFIX = /^\s*(?:>\s*)*(?:\[!\w+\]\s*)?/;
// Heading, bullet, ordered and task markers all give way to a new heading.
export const LINE_MARKERS =
  /^(?:(?:#{1,6}\s+)|(?:[-+*]\s+)|(?:\d+\.\s+)|(?:\[[ xX]\]\s+))+/;

// Everything ahead of the line's own text: indent, blockquote or callout lead-in,
// and any heading, list or task marker.
export function linePrefix(line: string): string {
  const block = line.match(BLOCK_PREFIX)?.[0] ?? "";
  return block + (line.slice(block.length).match(LINE_MARKERS)?.[0] ?? "");
}
