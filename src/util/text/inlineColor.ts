import { Editor } from "obsidian";
import { replaceSelectionAndSelect } from "src/util/text/selection";

function wrapEachLine(text: string, open: string, close: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `${open}${line}${close}` : line))
    .join("\n");
}

interface ColorTag {
  // One tag pair, capturing the inner text. Kept as source and compiled per
  // call so a global regex never carries lastIndex between calls.
  pairSource: string;
  // The whole selection as a single tag, capturing what `identity` compares to.
  single: RegExp;
  open: string;
  close: string;
  identity: string;
}

function recolorSelection(editor: Editor, tag: ColorTag): void {
  const selectText = editor.getSelection();
  if (!selectText.trim()) return;

  if (selectText.trim().match(tag.single)?.[1] === tag.identity) return;

  const pair = new RegExp(tag.pairSource, "gi");

  // Replacing via a function keeps `$` in a colour from being read as a backreference.
  const finalText = pair.test(selectText)
    ? selectText.replace(pair, (_match, inner: string) =>
        wrapEachLine(inner, tag.open, tag.close),
      )
    : wrapEachLine(selectText, tag.open, tag.close);

  replaceSelectionAndSelect(editor, finalText);
}

const FONT_PAIR = String.raw`<font\s+color=["']?[^"'>]+["']?>([\s\S]*?)<\/font>`;
// One tag wrapping the whole selection, with its colour captured. Comparing that
// capture as a string keeps a colour containing regex syntax out of the pattern.
const SINGLE_FONT_TAG = /^<font\s+color=["']?([^"'>]+)["']?>[\s\S]+<\/font>$/i;

export function setFontColor(color: string, editor: Editor) {
  recolorSelection(editor, {
    pairSource: FONT_PAIR,
    single: SINGLE_FONT_TAG,
    open: `<font color="${color}">`,
    close: "</font>",
    identity: color,
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
const MARK_PAIR = String.raw`${MARK_OPEN}([\s\S]*?)<\/mark>`;
// One mark wrapping the whole selection, with its style captured. Requires the
// class, so a mark of the same colour that predates it still falls through to the
// rewrite and picks one up. Comparing the capture as a string keeps a colour
// containing regex syntax out of the pattern.
const SINGLE_MARK = new RegExp(
  String.raw`^<mark\s+class=["']?${HIGHLIGHT_CLASS}["']?\s+style=["']?(${MARK_STYLE})["']?>[\s\S]+<\/mark>$`,
  "i",
);

export function setBackgroundColor(color: string, editor: Editor) {
  // Background only: the chosen colour goes in as-is and the text colour is left
  // to the theme. Deriving one would mean guessing, and a translucent fill has
  // no fixed luminance to guess from — it composites over whatever is behind it.
  const style = `background:${color}`;

  recolorSelection(editor, {
    pairSource: MARK_PAIR,
    single: SINGLE_MARK,
    open: `<mark class="${HIGHLIGHT_CLASS}" style="${style}">`,
    close: "</mark>",
    identity: style,
  });
}
