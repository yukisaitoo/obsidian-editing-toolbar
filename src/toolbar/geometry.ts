// Everything here works around two things in Obsidian's app.css. `.workspace-leaf`
// is `contain: strict`, so `position: fixed` inside a pane resolves against the
// pane and anything outside it is clipped: read where offset 0,0 lands and convert
// against that. And submenu buttons hang `visibility: hidden` flyouts that inflate
// scroll sizes, so measure with getBoundingClientRect, never scrollWidth.

import { BAR_SELECTOR, POPOVER_SELECTOR } from "src/toolbar/toolbarDom";
import { windowOf } from "src/toolbar/toolbarHost";

const FLYOUT_SHIFT_VAR = "--flyout-shift";
const FLYOUT_EDGE_MARGIN = 6;
const POPOVER_EDGE_MARGIN = 12;
const POPOVER_GAP = 8;
const OVERFLOW_TOLERANCE = 1;

// `min` wins when an element is larger than its bounds, so the overhang lands on
// the end that can be scrolled back into view.
function clamp(value: number, min: number, max: number): number {
  if (max < min) max = min;
  return Math.min(Math.max(value, min), max);
}

function paneRelativeBounds(bar: HTMLElement | null, margin: number) {
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

  const wanted = origin.width > 0 ? anchor.right - origin.width : anchor.left;
  const left = clamp(wanted, bounds.left, bounds.right - origin.width);

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

// Shuffles buttons between the bar and the » popover until the bar fits its pane,
// moving only as many as the size change asks for. Available room is the pane's
// width: the bar shrink-to-fits and so never reports overflow itself. Returns
// whether » is still needed.
export function reflowToolbarOverflow(
  bar: HTMLElement,
  popoverBar: HTMLElement | null,
  createMore: () => HTMLElement,
): boolean {
  if (!popoverBar || !bar.isConnected) return false;

  const available = availableWidth(bar);
  if (available <= 0) return popoverBar.firstElementChild !== null;

  // Each call forces a layout, so take one reading up front to pick a direction
  // rather than testing both.
  const fits = () => visibleSpan(bar) <= available + OVERFLOW_TOLERANCE;
  const fitsNow = fits();

  let more = bar.querySelector<HTMLElement>(":scope > .more-menu");
  if (!more) {
    if (fitsNow) return false;
    more = createMore();
  }

  // » stays last, so the button before it is always the next one to give up and
  // the popover's first is always the next one to take back.
  if (fitsNow) {
    while (popoverBar.firstElementChild) {
      const button = popoverBar.firstElementChild;
      bar.insertBefore(button, more);
      syncMore(more, popoverBar);
      if (fits()) continue;
      popoverBar.insertBefore(button, popoverBar.firstChild);
      break;
    }
  } else {
    do {
      const button = more.previousElementSibling;
      if (!button) break;
      popoverBar.insertBefore(button, popoverBar.firstChild);
      syncMore(more, popoverBar);
    } while (!fits());
  }

  syncMore(more, popoverBar);
  return popoverBar.firstElementChild !== null;
}

function syncMore(more: HTMLElement, popoverBar: HTMLElement): void {
  more.style.display = popoverBar.firstElementChild ? "" : "none";
}

function availableWidth(bar: HTMLElement): number {
  const parent = bar.parentElement;
  if (!parent) return bar.clientWidth;
  const style = getComputedStyle(parent);
  const padX =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
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
