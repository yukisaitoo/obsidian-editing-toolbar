import { App, ItemView } from "obsidian";
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
import {
  resolveToolbarDocument,
  toolbarDocuments,
  windowOf,
} from "src/toolbar/toolbarHost";
import { isAllowedViewType } from "src/util/viewUtils";

// Bars are per view, so each one needs its own observer.
const toolbarResizeObservers = new Map<HTMLElement, ResizeObserver>();

// One bar per pane, so it is found by walking the active leaf.
export function getExistingToolbar(app: App): HTMLElement | null {
  return (
    app.workspace
      .getActiveViewOfType(ItemView)
      ?.containerEl?.querySelector<HTMLElement>(BAR_SELECTOR) ?? null
  );
}

// Idempotent: calling twice cannot produce a duplicate bar. Null means there is
// nothing to show (disallowed view or an empty command list).
export function ensureToolbar(
  app: App,
  plugin: EditingToolbarPlugin,
): HTMLElement | null {
  if (!isAllowedViewType(app.workspace.getActiveViewOfType(ItemView))) {
    return null;
  }

  const commands = plugin.settings.commands;

  if (!commands.length) {
    removeAllToolbars(plugin);
    return null;
  }

  const existing = getExistingToolbar(app);
  if (existing) {
    applyAppearanceVars(existing, plugin.settings);
    return existing;
  }

  const doc = resolveToolbarDocument(app);
  const bars = mountBars(app, plugin.settings, doc);
  if (!bars) return null;

  renderToolbarCommands({ app, plugin, bar: bars.bar }, commands);

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
  app: App,
  settings: EditingToolbarSettings,
  doc: Document,
): MountedBars | null {
  const bar = createBarEl(doc, "editingToolbarModalBar");
  bar.addClass(SHARED_BAR_CLASS);

  const popoverBar = createBarEl(doc, "editingToolbarPopoverBar");

  applyAppearanceVars(bar, settings);
  applyAppearanceVars(popoverBar, settings);

  return mountInActiveView(app, bar, popoverBar) ? { bar, popoverBar } : null;
}

function createBarEl(doc: Document, className: string): HTMLElement {
  const el = doc.createElement("div");
  el.addClass(className);
  el.addClass("editingToolbarDefaultAesthetic");
  return el;
}

function mountInActiveView(
  app: App,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): boolean {
  const container = app.workspace.getActiveViewOfType(ItemView)?.containerEl;
  if (!container) return false;

  const target = findMountTarget(container);
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
