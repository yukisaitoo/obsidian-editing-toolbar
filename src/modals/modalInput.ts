/**
 * Obsidian's Modal.open() focuses the first focusable descendant right after onOpen()
 * returns, overriding anything onOpen focused itself. One microtask lands after open()
 * has finished, with no delay to guess at.
 */
export function focusAfterOpen(el: HTMLElement): void {
  void Promise.resolve().then(() => el.focus());
}

/**
 * Enter submits, except mid-IME-composition, where Enter confirms the candidate
 * and must reach the IME instead.
 */
export function submitOnEnter(el: HTMLElement, submit: () => void): void {
  el.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" || ev.isComposing) return;
    ev.preventDefault();
    submit();
  });
}
