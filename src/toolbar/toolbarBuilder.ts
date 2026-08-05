import { MarkdownView, View } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import {
  applyAppearanceVars,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import { reflowToolbarOverflow } from "src/toolbar/geometry";
import {
  closeMoreOverflowPopovers,
  MorePopover,
  morePopoverFor,
} from "src/toolbar/morePopover";
import { renderToolbarCommands } from "src/toolbar/toolbarCommands";
import {
  BAR_SELECTOR,
  POPOVER_SELECTOR,
  SHARED_BAR_CLASS,
} from "src/toolbar/toolbarDom";
import { toolbarDocuments, windowOf } from "src/toolbar/toolbarHost";
import {
  applyToolbarState,
  toolbarStateFor,
} from "src/toolbar/toolbarVisibility";

// Bars are per view, so each one needs its own observer.
const toolbarResizeObservers = new Map<HTMLElement, ResizeObserver>();

// Teardown sweeps every document, so restoration has to reach just as far: a bar
// belongs to its leaf, and its state is a function of that leaf's own mode.
export function syncToolbars(plugin: EditingToolbarPlugin): void {
  if (!plugin.settings.commands.length) {
    removeAllToolbars(plugin);
    return;
  }

  for (const leaf of plugin.app.workspace.getLeavesOfType("markdown")) {
    // A deferred leaf has no rendered view to mount into; loading it fires
    // layout-change, which brings us back here.
    if (leaf.isDeferred || !(leaf.view instanceof MarkdownView)) continue;

    const view = leaf.view;
    const state = toolbarStateFor(plugin, view);
    // Only build when visible: a reading-mode pane may not have a source view to
    // mount into yet.
    const bar =
      state === "visible" ? ensureToolbar(plugin, view) : toolbarIn(view);
    if (bar) applyToolbarState(bar, state);
  }
}

// One bar per pane, mounted inside the view it belongs to.
export function toolbarIn(view: View): HTMLElement | null {
  return view.containerEl.querySelector<HTMLElement>(BAR_SELECTOR);
}

// Idempotent: calling twice cannot produce a duplicate bar.
export function ensureToolbar(
  plugin: EditingToolbarPlugin,
  view: MarkdownView,
): HTMLElement | null {
  const existing = toolbarIn(view);
  if (existing) {
    applyAppearanceVars(existing, plugin.settings);
    return existing;
  }

  const bars = mountBars(plugin.settings, view);
  if (!bars) return null;

  renderToolbarCommands(
    { app: plugin.app, plugin, bar: bars.bar },
    plugin.settings.commands,
  );

  refreshOverflow(bars.bar, bars.popoverBar);
  observeToolbarResize(bars.bar, bars.popoverBar);

  return bars.bar;
}

export function removeAllToolbars(plugin: EditingToolbarPlugin): void {
  closeMoreOverflowPopovers();
  disconnectToolbarResizeObservers();

  toolbarDocuments(plugin.app).forEach((doc) =>
    doc
      .querySelectorAll(`${BAR_SELECTOR}, ${POPOVER_SELECTOR}`)
      .forEach((el) => el.remove()),
  );
}

interface MountedBars {
  bar: HTMLElement;
  popoverBar: HTMLElement;
}

function mountBars(
  settings: EditingToolbarSettings,
  view: View,
): MountedBars | null {
  // A note popped out into its own window has its own Document.
  const doc = view.containerEl.ownerDocument;

  const bar = createBarEl(doc, "editingToolbarModalBar");
  bar.addClass(SHARED_BAR_CLASS);

  const popoverBar = createBarEl(doc, "editingToolbarPopoverBar");

  applyAppearanceVars(bar, settings);
  applyAppearanceVars(popoverBar, settings);

  return mountInView(view, bar, popoverBar) ? { bar, popoverBar } : null;
}

function createBarEl(doc: Document, className: string): HTMLElement {
  const el = doc.createElement("div");
  el.addClass(className);
  el.addClass("editingToolbarDefaultAesthetic");
  return el;
}

function mountInView(
  view: View,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): boolean {
  const target = findMountTarget(view.containerEl);
  if (!target) return false;
  target.insertAdjacentElement("afterbegin", bar);

  bar.insertAdjacentElement("afterend", popoverBar);
  return true;
}

function findMountTarget(container: HTMLElement): HTMLElement | null {
  const target = container.querySelector<HTMLElement>(".markdown-source-view");
  if (target) return target;

  const viewContent = container.querySelector<HTMLElement>(".view-content");
  if (!viewContent) return null;
  return viewContent.querySelector<HTMLElement>(":scope > div") ?? viewContent;
}

function refreshOverflow(bar: HTMLElement, popoverBar: HTMLElement): void {
  const hasOverflow = reflowToolbarOverflow(
    bar,
    popoverBar,
    () => new MorePopover(bar, popoverBar).el,
  );

  // The pane grew and » went away; an open popover would have no dismiss button.
  if (!hasOverflow) morePopoverFor(popoverBar)?.close();
}

// Observe the PANE, not the bar: moving buttons resizes the bar, so observing the
// bar would feed its own reflow back into itself.
function observeToolbarResize(
  bar: HTMLElement,
  popoverBar: HTMLElement,
): void {
  // A bar removed with its tab never fires again, so nothing else retires its
  // observer.
  for (const [observedBar, stale] of toolbarResizeObservers) {
    if (observedBar.isConnected) continue;
    stale.disconnect();
    toolbarResizeObservers.delete(observedBar);
  }

  const parent = bar.parentElement;
  if (!parent) return;

  // A popped-out window has its own ResizeObserver constructor.
  const ObserverCtor = (windowOf(bar) as Window & typeof globalThis)
    .ResizeObserver;
  const observer = new ObserverCtor(() => {
    if (!bar.isConnected) {
      observer.disconnect();
      toolbarResizeObservers.delete(bar);
      return;
    }
    refreshOverflow(bar, popoverBar);
    const popover = morePopoverFor(popoverBar);
    if (popover?.isOpen) popover.reposition();
  });

  observer.observe(parent);
  toolbarResizeObservers.set(bar, observer);
}

function disconnectToolbarResizeObservers(): void {
  toolbarResizeObservers.forEach((observer) => observer.disconnect());
  toolbarResizeObservers.clear();
}
