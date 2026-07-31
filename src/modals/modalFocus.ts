/**
 * Obsidian's Modal.open() focuses the first focusable descendant right after onOpen()
 * returns, overriding anything onOpen focused itself. One microtask lands after open()
 * has finished — no delay to guess at.
 */
export function focusAfterOpen(el: HTMLElement): void {
  void Promise.resolve().then(() => el.focus());
}
