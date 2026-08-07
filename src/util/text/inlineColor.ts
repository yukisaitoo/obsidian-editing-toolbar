import { Editor } from "obsidian";
import { HTML_TAG, VOID_TAG } from "src/util/text/html";
import { linePrefix } from "src/util/text/lineParts";
import { replaceSelectionAndSelect } from "src/util/text/selection";

// A trailing hard break (two spaces, or a `\`) stays outside the tag, or it is
// silently destroyed.
const EDGE = /^(.*?)(\\?\s*)$/;

// Counts only; `</u>a<u>` reads as balanced. Ordering would only matter for a
// selection that starts mid-pair, which nothing here can fix anyway.
function balanced(line: string): boolean {
  const tags = (line.match(HTML_TAG) ?? []).filter(
    (tag) => !tag.endsWith("/>") && !VOID_TAG.test(tag),
  );
  const closes = tags.filter((tag) => tag.startsWith("</"));
  return tags.length === closes.length * 2;
}

// A pair spanning a newline comes back misnested when each line is wrapped alone, so
// a paragraph that has one is wrapped once instead.
function wrapLines(paragraph: string, open: string, close: string): string {
  const lines = paragraph.split("\n");
  if (!lines.every(balanced)) return `${open}${paragraph}${close}`;

  return lines
    .map((line) => {
      // The block marker stays outside the tag, or the line no longer starts with
      // one and the heading, list or quote is gone.
      const pre = linePrefix(line);
      const [, body, post] = EDGE.exec(line.slice(pre.length)) ?? [];
      return body ? `${pre}${open}${body}${close}${post}` : line;
    })
    .join("\n");
}

// Never across a blank line: markdown ends the paragraph there and the browser drops
// the close tag, losing the colour on everything after it.
function wrapParagraphs(text: string, open: string, close: string): string {
  return text
    .split(/(\n(?:[ \t]*\n)+)/)
    .map((part) => (part.trim() ? wrapLines(part, open, close) : part))
    .join("");
}

interface ColorTag {
  pair: RegExp;
  open: string;
  close: string;
}

function recolorSelection(editor: Editor, tag: ColorTag): void {
  const selectText = editor.getSelection();
  if (!selectText.trim()) return;

  const stripped = selectText.replace(tag.pair, "$1");
  const finalText = wrapParagraphs(stripped, tag.open, tag.close);

  if (finalText === selectText) return;

  replaceSelectionAndSelect(editor, finalText);
}

const FONT_PAIR = /<font\s+color=["']?[^"'>]+["']?>([\s\S]*?)<\/font>/gi;

export function setFontColor(color: string, editor: Editor) {
  recolorSelection(editor, {
    pair: FONT_PAIR,
    open: `<font color="${color}">`,
    close: "</font>",
  });
}

const COLOR_VALUE = String.raw`(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))`;
// The trailing `color:` is optional: marks written back when the text colour was
// derived still carry one, and a recolour has to match them to strip it.
const MARK_STYLE = String.raw`background:${COLOR_VALUE}(?:\s*;\s*color:[^"'>]*)?`;
// Marks the highlights as ours. styles.css hooks this to undo the `<mark>` user
// agent rule, which must not reach Obsidian's own `==highlight==` or a mark
// written by hand.
const HIGHLIGHT_CLASS = "editing-toolbar-highlight";
// The class is optional when matching so a recolour still finds marks written
// before it existed. Recognising them is what lets the rewrite upgrade them
// rather than nest a second mark inside.
const MARK_OPEN = String.raw`<mark\s+(?:class=["']?${HIGHLIGHT_CLASS}["']?\s+)?style=["']?${MARK_STYLE}["']?>`;
const MARK_PAIR = new RegExp(String.raw`${MARK_OPEN}([\s\S]*?)<\/mark>`, "gi");

export function setBackgroundColor(color: string, editor: Editor) {
  // Background only: the chosen colour goes in as-is and the text colour is left
  // to the theme. Deriving one would mean guessing, and a translucent fill has no
  // fixed luminance to guess from; it composites over whatever is behind it.
  recolorSelection(editor, {
    pair: MARK_PAIR,
    open: `<mark class="${HIGHLIGHT_CLASS}" style="background:${color}">`,
    close: "</mark>",
  });
}
