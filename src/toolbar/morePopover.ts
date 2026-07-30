import { ButtonComponent } from "obsidian";
import { MORE_CHEVRON_ICON } from "src/icons/inlineIcons";
import { anchorPopoverToButton } from "src/toolbar/geometry";
import { POPOVER_SELECTOR } from "src/toolbar/toolbarDom";
import { strings } from "src/translations/helper";

// A class rather than inline visibility: a hovered flyout inside the popover sets
// its own `visibility: visible` and would survive a hidden parent.
const OPEN_CLASS = "editing-toolbar-more-open";

// Menus, pickers, modals and suggesters render at the document root but belong to
// the popover, so a click inside them is not a click away.
const DETACHED_POPUP_SELECTOR =
  ".menu, .pcr-app, .modal-container, .suggestion-container";

const TOOLTIP_DELAY = 250;

// One live popover per popover bar. The bar outlives the » button across
// rebuilds, so keying on the bar is what lets a rebuild retire the old instance.
const popovers = new WeakMap<HTMLElement, MorePopover>();
const openPopovers = new Set<MorePopover>();

/**
 * The » overflow button and the popover it toggles. Owning open/close/reposition
 * on one object means a rebuilt bar simply drops the old instance — no bookkeeping
 * about whether a stored callback is still the current one.
 */
export class MorePopover {
  readonly el: HTMLElement;
  private readonly button: ButtonComponent;
  private readonly doc: Document;

  constructor(
    bar: HTMLElement,
    private readonly popoverBar: HTMLElement,
  ) {
    popovers.get(popoverBar)?.destroy();

    this.el = bar.createEl("span");
    this.el.addClass("more-menu");
    this.doc = this.el.ownerDocument;

    this.button = new ButtonComponent(this.el)
      .setClass("editingToolbarCommandItem")
      .setTooltip(strings.more, { delay: TOOLTIP_DELAY })
      .onClick(() => (this.isOpen ? this.close() : this.open()));
    this.button.buttonEl.innerHTML = MORE_CHEVRON_ICON;

    popovers.set(popoverBar, this);
  }

  get isOpen(): boolean {
    return this.popoverBar.hasClass(OPEN_CLASS);
  }

  open(): void {
    this.popoverBar.addClass(OPEN_CLASS);
    this.reposition();
    // Capture phase: a command button that stops propagation must not be able to
    // strand the popover open.
    this.doc.addEventListener("pointerdown", this.onPointerDown, true);
    this.doc.addEventListener("keydown", this.onKeyDown, true);
    openPopovers.add(this);
  }

  close(): void {
    this.popoverBar.removeClass(OPEN_CLASS);
    this.doc.removeEventListener("pointerdown", this.onPointerDown, true);
    this.doc.removeEventListener("keydown", this.onKeyDown, true);
    openPopovers.delete(this);
  }

  /** Placed by measurement, so anything that moves the » has to re-run this. */
  reposition(): void {
    anchorPopoverToButton(this.button.buttonEl, this.popoverBar);
  }

  destroy(): void {
    this.close();
    this.el.remove();
    if (popovers.get(this.popoverBar) === this) {
      popovers.delete(this.popoverBar);
    }
  }

  private onPointerDown = (evt: PointerEvent) => {
    const target = evt.target as Node | null;
    if (!target) return;
    if (
      this.popoverBar.contains(target) ||
      this.el.contains(target) || // re-click: onClick toggles it
      (target instanceof Element && target.closest(DETACHED_POPUP_SELECTOR))
    ) {
      return;
    }
    this.close();
  };

  private onKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === "Escape") this.close();
  };
}

export function morePopoverFor(popoverBar: HTMLElement): MorePopover | undefined {
  return popovers.get(popoverBar);
}

/**
 * The popover is a sibling of the bar, not a child, so hiding the bar would leave
 * it floating over the note. Called whenever a bar goes away or hides.
 */
export function closeMoreOverflowPopovers(root?: ParentNode): void {
  openPopovers.forEach((popover) => popover.close());
  // A bar rebuilt while open leaves the class on a popover whose instance is gone.
  (root ?? activeWindow.document)
    .querySelectorAll(`${POPOVER_SELECTOR}.${OPEN_CLASS}`)
    .forEach((el) => el.removeClass(OPEN_CLASS));
}
