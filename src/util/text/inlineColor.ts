import { Editor } from "obsidian";
import { replaceSelectionAndSelect } from "src/util/text/selection";

function wrapEachLine(text: string, open: string, close: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `${open}${line}${close}` : line))
    .join("\n");
}

interface ColorTag {
  // One tag pair, capturing the inner text.
  pair: RegExp;
  open: string;
  close: string;
}

function recolorSelection(editor: Editor, tag: ColorTag): void {
  const selectText = editor.getSelection();
  if (!selectText.trim()) return;

  // Replacing via a function keeps `$` in a colour from being read as a backreference.
  const finalText = selectText.match(tag.pair)
    ? selectText.replace(tag.pair, (_match, inner: string) =>
        wrapEachLine(inner, tag.open, tag.close),
      )
    : wrapEachLine(selectText, tag.open, tag.close);

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
// before it existed — recognising them is what lets the rewrite upgrade them
// rather than nest a second mark inside.
const MARK_OPEN = String.raw`<mark\s+(?:class=["']?${HIGHLIGHT_CLASS}["']?\s+)?style=["']?${MARK_STYLE}["']?>`;
const MARK_PAIR = new RegExp(String.raw`${MARK_OPEN}([\s\S]*?)<\/mark>`, "gi");

export function setBackgroundColor(color: string, editor: Editor) {
  // Background only: the chosen colour goes in as-is and the text colour is left
  // to the theme. Deriving one would mean guessing, and a translucent fill has
  // no fixed luminance to guess from — it composites over whatever is behind it.
  recolorSelection(editor, {
    pair: MARK_PAIR,
    open: `<mark class="${HIGHLIGHT_CLASS}" style="background:${color}">`,
    close: "</mark>",
  });
}
