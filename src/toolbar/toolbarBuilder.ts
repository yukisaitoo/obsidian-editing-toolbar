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
import {
  applyToolbarState,
  toolbarStateFor,
} from "src/toolbar/toolbarVisibility";

// Bars are per view, so each one needs its own observer.
const toolbarResizeOwners = new Map<MarkdownView, Component>();

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
function toolbarIn(view: MarkdownView): HTMLElement | null {
  return view.containerEl.querySelector<HTMLElement>(BAR_SELECTOR);
}

// Idempotent: calling twice cannot produce a duplicate bar.
function ensureToolbar(
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
  // Pressing a button would take focus off the editor, which every command here acts
  // on. Nothing in the bar is focusable, so refusing focus outright beats handing it
  // back afterwards — that lands mid-command and fights anything that opens a modal.
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

// Observe the PANE, not the bar: moving buttons resizes the bar, so observing the
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

  // The view owns the bar, so it owns the observer: closing the tab, or the window it
  // was popped out into, unloads the view and its children. register() alone would do
  // that too, but only addChild has a counterpart a rebuild can call.
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
