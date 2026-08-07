import { Component, MarkdownView } from "obsidian";
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

const toolbarResizeOwners = new Map<MarkdownView, Component>();

export function syncToolbars(plugin: EditingToolbarPlugin): void {
  if (!plugin.settings.commands.length) {
    removeAllToolbars(plugin);
    return;
  }

  for (const leaf of plugin.app.workspace.getLeavesOfType("markdown")) {
    // A deferred leaf has no rendered view to mount into; loading it fires
    // layout-change, which brings us back here.
    if (leaf.isDeferred || !(leaf.view instanceof MarkdownView)) continue;

    if (shouldShowToolbar(plugin, leaf.view)) ensureToolbar(plugin, leaf.view);
  }
}

function shouldShowToolbar(
  plugin: EditingToolbarPlugin,
  view: MarkdownView,
): boolean {
  return plugin.settings.toolbarVisible && view.getMode() !== "preview";
}

function findToolbar(view: MarkdownView): HTMLElement | null {
  return view.containerEl.querySelector<HTMLElement>(BAR_SELECTOR);
}

function ensureToolbar(
  plugin: EditingToolbarPlugin,
  view: MarkdownView,
): HTMLElement | null {
  const existing = findToolbar(view);
  if (existing) return existing;

  const bars = mountBars(plugin.settings, view);
  if (!bars) return null;

  renderToolbarCommands(
    { app: plugin.app, plugin, bar: bars.bar },
    plugin.settings.commands,
  );

  refreshOverflow(bars.bar, bars.popoverBar);
  observeToolbarResize(view, bars.bar, bars.popoverBar);

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
  view: MarkdownView,
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
  // Nothing in the bar needs focus, and refusing it beats restoring it afterwards:
  // a restore lands mid-command and fights anything opening a modal.
  el.addEventListener("mousedown", (event) => event.preventDefault());
  return el;
}

// The bar rides mode switches for free by living inside the source view: Obsidian
// display:none's that whole element in reading mode. It is built in the MarkdownView
// constructor, so it is there whenever the view is.
function mountInView(
  view: MarkdownView,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): boolean {
  const target =
    view.contentEl.querySelector<HTMLElement>(".markdown-source-view");
  if (!target) return false;
  target.insertAdjacentElement("afterbegin", bar);

  bar.insertAdjacentElement("afterend", popoverBar);
  return true;
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

// Observe the pane, not the bar: moving buttons resizes the bar, so observing the
// bar would feed its own reflow back into itself.
function observeToolbarResize(
  view: MarkdownView,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): void {
  stopObservingToolbarResize(view);

  const parent = bar.parentElement;
  if (!parent) return;

  // A popped-out window has its own ResizeObserver constructor.
  const ObserverCtor = (windowOf(bar) as Window & typeof globalThis)
    .ResizeObserver;
  const observer = new ObserverCtor(() => {
    refreshOverflow(bar, popoverBar);
    const popover = morePopoverFor(popoverBar);
    if (popover?.isOpen) popover.reposition();
  });

  observer.observe(parent);

  // The view owns the observer: closing its tab or window unloads the view and its
  // children. A Component, not a bare register(), so a rebuild can retire one early.
  const owner = new Component();
  owner.register(() => {
    observer.disconnect();
    toolbarResizeOwners.delete(view);
  });
  toolbarResizeOwners.set(view, owner);
  view.addChild(owner);
}

function stopObservingToolbarResize(view: MarkdownView): void {
  const owner = toolbarResizeOwners.get(view);
  if (owner) view.removeChild(owner);
}

// A rebuild throws every bar away while the views stay loaded, so nothing else
// retires their observers.
function disconnectToolbarResizeObservers(): void {
  toolbarResizeOwners.forEach((_, view) => stopObservingToolbarResize(view));
}
