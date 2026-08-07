import { Editor } from "obsidian";

// Emphasis bodies are lazy, or `**A** and **B**` closes on the last delimiter and
// swallows the gap. They hug non-space so `a * b` survives, and only the `_` forms
// sit on word boundaries, or `snake_case` and underscored URLs get eaten.
const MARKDOWN_STRIPPERS: [RegExp, string][] = [
  // Ahead of the block rules, which are anchored at `^ {0,3}` and would otherwise
  // miss the marker on a list nested four spaces deep.
  [/^[ \t]+/gm, ""],
  [/^ {0,3}```.*$/gm, ""],
  [/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, ""],
  [/^ {0,3}(?:> ?)+\[![\w\s-]*\][+-]?[ \t]*/gm, ""],
  [/^ {0,3}(?:#{1,6} +|> ?|- \[[ x]\] +|[-*+] +|\d+\. +)+/gm, ""],
  // Autolinks unwrap rather than vanish, or the URL goes with the brackets.
  [/<([a-z][\w+.-]*:[^<>\s]+|[^<>\s@]+@[^<>\s]+)>/gi, "$1"],
  // Attributes need an `=`, or `a<b and c>d` and `Map<K, V>` read as tags. `!` stays
  // out so `<!-- -->` survives, as `%%…%%` does: comments are hidden text, not
  // formatting.
  [/<\/?[A-Za-z][\w-]*(?:\s[^<>]*=[^<>]*)?\s*\/?>/g, ""],
  [/!?\[\[[^[\]]*\|([^[\]|]+)\]\]/g, "$1"],
  [/!?\[\[([^[\]|]+)\]\]/g, "$1"],
  [/!?\[([^[\]]*)\]\([^()]*\)/g, "$1"],
  [/`([^`\n]+)`/g, "$1"],
  // A tag needs at least one non-digit, so `#1` in prose survives.
  [/(?<=^|\s)#([\w/-]*[A-Za-z_/-][\w/-]*)/g, "$1"],
  [/\*\*\*(\S(?:.*?\S)??)\*\*\*/g, "$1"],
  [/\*\*(\S(?:.*?\S)??)\*\*/g, "$1"],
  // A lone `*` keeps the word boundaries, or `5*3*2` collapses to `532`.
  [/(?<!\w)\*(\S(?:.*?\S)??)\*(?!\w)/g, "$1"],
  [/(?<!\w)___(\S(?:.*?\S)??)___(?!\w)/g, "$1"],
  [/(?<!\w)__(\S(?:.*?\S)??)__(?!\w)/g, "$1"],
  [/(?<!\w)_(\S(?:.*?\S)??)_(?!\w)/g, "$1"],
  [/==(\S(?:.*?\S)??)==/g, "$1"],
  [/~~(\S(?:.*?\S)??)~~/g, "$1"],
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
