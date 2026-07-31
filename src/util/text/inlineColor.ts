import { Editor } from "obsidian";
import { replaceSelectionAndSelect } from "src/util/text/selection";

function wrapEachLine(text: string, open: string, close: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `${open}${line}${close}` : line))
    .join("\n");
}

// One tag wrapping the whole selection, with its colour captured. Comparing that
// capture as a string keeps a colour containing regex syntax out of the pattern.
const SINGLE_FONT_TAG = /^<font\s+color=["']?([^"'>]+)["']?>[\s\S]+<\/font>$/;

export function setFontColor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  const fontColorRegex = /<font\s+color=["']?[^"'>]+["']?>(.*?)<\/font>/ms;
  const hasColorTag = fontColorRegex.test(selectText);

  if (selectText.trim().match(SINGLE_FONT_TAG)?.[1] === color) {
    return;
  }

  const open = `<font color="${color}">`;
  const close = "</font>";

  const finalText = hasColorTag
    ? selectText.replace(
        new RegExp(fontColorRegex.source, "gms"),
        (_match, inner: string) => wrapEachLine(inner, open, close),
      )
    : wrapEachLine(selectText, open, close);

  replaceSelectionAndSelect(editor, finalText);
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
// One mark wrapping the whole selection, with its style captured. Requires the
// class, so a mark of the same colour that predates it still falls through to the
// rewrite and picks one up. Comparing the capture as a string keeps a colour
// containing regex syntax out of the pattern.
const SINGLE_MARK = new RegExp(
  String.raw`^<mark\s+class=["']?${HIGHLIGHT_CLASS}["']?\s+style=["']?(${MARK_STYLE})["']?>[\s\S]+<\/mark>$`,
);

export function setBackgroundColor(color: string, editor: Editor) {
  const selectText = editor.getSelection();

  if (!selectText || selectText.trim() === "") {
    return;
  }

  // Background only: the chosen colour goes in as-is and the text colour is left
  // to the theme. Deriving one would mean guessing, and a translucent fill has
  // no fixed luminance to guess from — it composites over whatever is behind it.
  const style = `background:${color}`;
  const open = `<mark class="${HIGHLIGHT_CLASS}" style="${style}">`;

  const hasColorTag = new RegExp(String.raw`${MARK_OPEN}[\s\S]*?<\/mark>`).test(
    selectText,
  );

  if (selectText.trim().match(SINGLE_MARK)?.[1] === style) {
    return;
  }

  // The whole opening tag is replaced rather than just the colour, so a mark ends
  // up with one set of attributes: a stale `color:` goes and a missing class
  // arrives. Replacing via a function keeps `$` in the colour from being read as
  // a backreference.
  const finalText = hasColorTag
    ? selectText.replace(new RegExp(MARK_OPEN, "gi"), () => open)
    : wrapEachLine(selectText, open, "</mark>");

  replaceSelectionAndSelect(editor, finalText);
}
