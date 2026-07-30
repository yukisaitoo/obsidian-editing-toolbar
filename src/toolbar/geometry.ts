// Two facts from Obsidian's app.css drive every function here:
//  1. `.workspace-leaf` is `contain: strict`, so `position: fixed` inside a pane
//     resolves against the PANE and anything outside it is clipped, not just
//     off-centre. Read where offset 0,0 lands and convert against that.
//  2. Measure with getBoundingClientRect, never scrollWidth: submenu buttons hang
//     `visibility: hidden` flyouts that inflate scroll size by phantom pixels.

import { Editor } from "obsidian";
import { BAR_SELECTOR, POPOVER_SELECTOR } from "src/toolbar/toolbarDom";
import { windowOf } from "src/toolbar/toolbarHost";

const FLYOUT_SHIFT_VAR = "--flyout-shift";
const FLYOUT_EDGE_MARGIN = 6;
const POPOVER_EDGE_MARGIN = 12;
const POPOVER_GAP = 8;
const OVERFLOW_TOLERANCE = 1;

export function paneRelativeBounds(bar: HTMLElement | null, margin: number) {
  const win = bar ? windowOf(bar) : activeWindow;
  const host = bar?.parentElement?.getBoundingClientRect();
  return {
    left: Math.max(host?.left ?? 0, 0) + margin,
    right: Math.min(host?.right ?? win.innerWidth, win.innerWidth) - margin,
    top: Math.max(host?.top ?? 0, 0) + margin,
    bottom: Math.min(host?.bottom ?? win.innerHeight, win.innerHeight) - margin,
  };
}

export function anchorPopoverToButton(
  anchorEl: HTMLElement,
  popoverEl: HTMLElement,
): void {
  // Reset first: the bar is `width: fit-content`, so a leftover offset eats into
  // the width available to it and each re-open would drift further out.
  popoverEl.style.left = "0px";
  popoverEl.style.top = "0px";

  const origin = popoverEl.getBoundingClientRect();
  const anchor = anchorEl.getBoundingClientRect();
  const bounds = paneRelativeBounds(popoverEl, POPOVER_EDGE_MARGIN);

  const maxLeft = Math.max(bounds.left, bounds.right - origin.width);
  let left = origin.width > 0 ? anchor.right - origin.width : anchor.left;
  left = Math.min(Math.max(left, bounds.left), maxLeft);

  let top = anchor.bottom + POPOVER_GAP;
  if (origin.height > 0 && top + origin.height > bounds.bottom) {
    top = Math.max(bounds.top, anchor.top - origin.height - POPOVER_GAP);
  }

  popoverEl.style.left = `${left - origin.left}px`;
  popoverEl.style.top = `${top - origin.top}px`;
}

export function attachFlyoutClamp(button: HTMLElement): void {
  button.addEventListener("mouseenter", () => clampFlyoutToPane(button));
}

function clampFlyoutToPane(button: HTMLElement): void {
  const flyout = button.querySelector<HTMLElement>(":scope > .subitem");
  if (!flyout) return;

  // Colour pickers hang their real panel off a zero-width .subitem, so it is the
  // panel whose edges have to clear the pane.
  const panel =
    flyout.querySelector<HTMLElement>(".x-color-picker-wrapper") ?? flyout;

  button.style.removeProperty(FLYOUT_SHIFT_VAR);

  const bar = button.closest<HTMLElement>(
    `${BAR_SELECTOR}, ${POPOVER_SELECTOR}`,
  );
  const { left: min, right: max } = paneRelativeBounds(bar, FLYOUT_EDGE_MARGIN);
  if (max <= min) return;

  const rect = panel.getBoundingClientRect();
  let shift = 0;
  if (rect.right > max) shift = max - rect.right;
  // Left edge wins when the panel is wider than the pane: a right overhang can be
  // scrolled into view, a left one can't.
  if (rect.left + shift < min) shift = min - rect.left;

  if (shift) button.style.setProperty(FLYOUT_SHIFT_VAR, `${shift}px`);
}

// Shuffles buttons between the bar and the » popover so the bar fits its pane.
// Available room is the PANE's width: the bar shrink-to-fits and so never reports
// overflow itself. Returns whether » is still needed.
export function reflowToolbarOverflow(
  bar: HTMLElement,
  popoverBar: HTMLElement | null,
  createMore: () => HTMLElement | undefined,
): boolean {
  if (!popoverBar || !bar.isConnected) return false;

  const available = availableWidth(bar);
  if (available <= 0) return popoverBar.firstElementChild !== null;

  const existingMore = bar.querySelector<HTMLElement>(":scope > .more-menu");
  const overflowing = () => visibleSpan(bar) > available + OVERFLOW_TOLERANCE;

  if (!existingMore && !popoverBar.firstElementChild && !overflowing()) {
    return false;
  }

  const more = existingMore ?? createMore();
  if (!more) return popoverBar.firstElementChild !== null;

  // » only earns its width while the popover holds something, so try the whole set
  // with it hidden first.
  more.style.display = "none";
  while (popoverBar.firstElementChild) {
    bar.insertBefore(popoverBar.firstElementChild, more);
  }
  if (!overflowing()) return false;

  // » stays last, so the button before it is always the next one to give up.
  more.style.display = "";
  while (overflowing()) {
    const last = more.previousElementSibling;
    if (!last) break;
    popoverBar.insertBefore(last, popoverBar.firstChild);
  }

  const hasOverflow = popoverBar.firstElementChild !== null;
  more.style.display = hasOverflow ? "" : "none";
  return hasOverflow;
}

function availableWidth(bar: HTMLElement): number {
  const parent = bar.parentElement;
  if (!parent) return bar.clientWidth;
  const cs = getComputedStyle(parent);
  const padX =
    (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  return parent.clientWidth - padX;
}

function visibleSpan(bar: HTMLElement): number {
  let left = Infinity;
  let right = -Infinity;
  for (const el of Array.from(bar.children) as HTMLElement[]) {
    if (el.style.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.left < left) left = r.left;
    if (r.right > right) right = r.right;
  }
  return right > left ? right - left : 0;
}

export function positionFollowingBar(
  toolbar: HTMLElement,
  editor: Editor,
  doc: Document,
): void {
  const editorRect = editor.containerEl.getBoundingClientRect();
  const windowWidth = windowOf(toolbar).innerWidth;
  const coords = editor.coordsAtPos(editor.getCursor("from"));

  const leftDockWidth =
    (doc.getElementsByClassName("mod-left-split")[0]?.clientWidth ?? 0) +
    (doc.getElementsByClassName("side-dock-ribbon mod-left")[0]?.clientWidth ?? 0);

  let left = coords.left - leftDockWidth - 28;
  if (left + toolbar.offsetWidth > windowWidth - leftDockWidth) {
    left = windowWidth - leftDockWidth - toolbar.offsetWidth - 12;
  }

  toolbar.style.left = `${Math.max(0, left)}px`;
  toolbar.style.top = `${Math.max(0, followingBarTop(editor, coords, editorRect, toolbar.offsetHeight))}px`;
}

function followingBarTop(
  editor: Editor,
  coords: { top: number; bottom: number },
  editorRect: { top: number; bottom: number },
  toolbarHeight: number,
): number {
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  const above = coords.top - toolbarHeight - 10;

  if (from.line === to.line) {
    return above > editorRect.top ? above : editor.coordsAtPos(to).bottom + 10;
  }

  // A selection dragged upwards keeps its head at the start, so the bar belongs
  // above it; dragged downwards, below.
  if (editor.getCursor("head").ch === from.ch) {
    return above > editorRect.top ? above : editorRect.top + 2 * toolbarHeight;
  }

  const cursorCoords = caretCoords(editor);
  if (!cursorCoords) return above;
  const below = cursorCoords.bottom + 10;
  return below < editorRect.bottom - toolbarHeight
    ? below
    : editorRect.bottom - 2 * toolbarHeight;
}

function caretCoords(editor: Editor) {
  const head = editor.getCursor("head");
  if (head.ch !== editor.getCursor("from").ch) {
    head.ch = Math.max(0, head.ch - 1);
  }

  if (editor.cursorCoords) return editor.cursorCoords(true, "window");
  if (!editor.coordsAtPos) return undefined;

  const offset = editor.posToOffset(head);
  return editor.cm.coordsAtPos?.(offset) ?? editor.coordsAtPos(offset);
}
