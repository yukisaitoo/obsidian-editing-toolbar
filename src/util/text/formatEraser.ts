import { Editor } from "obsidian";

// Emphasis delimiters have to hug non-space and sit on a word boundary, or
// `snake_case`, `a * b` and underscored URLs get eaten.
const MARKDOWN_STRIPPERS: [RegExp, string][] = [
  // Ahead of the block rules, which are anchored at `^ {0,3}` and would otherwise
  // miss the marker on a list nested four spaces deep.
  [/^[ \t]+/gm, ""],
  [/^ {0,3}```.*$/gm, ""],
  [/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, ""],
  [/^ {0,3}(?:> ?)+\[![\w\s-]*\][+-]?[ \t]*/gm, ""],
  [/^ {0,3}(?:#{1,6} +|> ?|- \[[ x]\] +|[-*+] +|\d+\. +)+/gm, ""],
  // A tag name has to follow the bracket, or `a < b > c` loses its middle. `!` stays
  // out so `<!-- -->` survives, as `%%…%%` does: comments are hidden text, not
  // formatting.
  [/<\/?[A-Za-z][^<>]*>/g, ""],
  [/!?\[\[[^[\]]*\|([^[\]|]+)\]\]/g, "$1"],
  [/!?\[\[([^[\]|]+)\]\]/g, "$1"],
  [/!?\[([^[\]]*)\]\([^()]*\)/g, "$1"],
  [/`([^`\n]+)`/g, "$1"],
  // A tag needs at least one non-digit, so `#1` in prose survives.
  [/(?<=^|\s)#([\w/-]*[A-Za-z_/-][\w/-]*)/g, "$1"],
  [/(?<!\w)(\*\*\*|___)(\S(?:.*?\S)?)\1(?!\w)/g, "$2"],
  [/(?<!\w)(\*\*|__)(\S(?:.*?\S)?)\1(?!\w)/g, "$2"],
  [/(?<!\w)([*_])(\S(?:.*?\S)?)\1(?!\w)/g, "$2"],
  [/==(\S(?:.*?\S)?)==/g, "$1"],
  [/~~(\S(?:.*?\S)?)~~/g, "$1"],
  [/^[ \t]+|[ \t]+$/gm, ""],
];

export function setFormatEraser(editor: Editor): void {
  const selection = editor.getSelection();
  if (!selection.trim()) return;

  editor.replaceSelection(stripInlineMarkdown(selection));
}

function stripInlineMarkdown(text: string): string {
  return MARKDOWN_STRIPPERS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text,
  );
}
