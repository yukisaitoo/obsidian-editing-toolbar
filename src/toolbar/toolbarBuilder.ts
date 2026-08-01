import { App, ItemView } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import {
  applyAppearanceVars,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import { syncColorIcons } from "src/toolbar/colorPickerButton";
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
import { resolveToolbarDocument, windowOf } from "src/toolbar/toolbarHost";
import { isAllowedViewType } from "src/util/viewUtils";

const VIEW_TYPE_MOUNT_SELECTORS: Record<string, string> = {
  markdown: ".markdown-source-view",
  canvas: ".canvas-wrapper",
};

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

  const doc = resolveToolbarDocument(app);
  const commands = plugin.settings.commands;

  if (!commands.length) {
    disposeToolbar(app, doc);
    return null;
  }

  const existing = getExistingToolbar(app);
  if (existing) {
    applyAppearanceVars(existing, plugin.settings);
    return existing;
  }

  const bars = mountBars(app, plugin.settings, doc);
  if (!bars) return null;

  renderToolbarCommands({ app, plugin, bar: bars.bar }, commands);

  refreshOverflow(plugin, bars.bar, bars.popoverBar);
  observeToolbarResize(plugin, bars.bar, bars.popoverBar);

  syncColorIcons(doc, plugin.settings);
  return bars.bar;
}

function disposeToolbar(app: App, doc: Document): void {
  getExistingToolbar(app)?.remove();
  doc.querySelectorAll(POPOVER_SELECTOR).forEach((el) => el.remove());
}

export function selfDestruct(plugin: EditingToolbarPlugin): void {
  closeMoreOverflowPopovers();
  disconnectToolbarResizeObservers();

  const roots: ParentNode[] = [activeWindow.document];

  const rootSplit = plugin.app.workspace.rootSplit;
  if (rootSplit?.containerEl) roots.push(rootSplit.containerEl);

  plugin.app.workspace.floatingSplit?.children.forEach((child) => {
    if (child.containerEl) roots.push(child.containerEl);
  });

  roots.forEach((root) =>
    root
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
  const view = app.workspace.getActiveViewOfType(ItemView);
  const container = view?.containerEl;
  if (!view || !container) return false;

  const viewType = view.getViewType();

  // Canvas has no scrollable source view to sit inside, so the bar mounts as a
  // sibling above .view-content instead of within it.
  if (viewType === "canvas") {
    const viewContent = container.querySelector<HTMLElement>(".view-content");
    if (!viewContent) return false;
    viewContent.insertAdjacentElement("beforebegin", bar);
  } else {
    const target = findMountTarget(container, viewType);
    if (!target) return false;
    target.insertAdjacentElement("afterbegin", bar);
  }

  bar.insertAdjacentElement("afterend", popoverBar);
  return true;
}

function findMountTarget(
  container: HTMLElement,
  viewType: string,
): HTMLElement | null {
  const known = VIEW_TYPE_MOUNT_SELECTORS[viewType];
  const target = known ? container.querySelector<HTMLElement>(known) : null;
  if (target) return target;

  const viewContent = container.querySelector<HTMLElement>(".view-content");
  if (!viewContent) return null;
  return viewContent.querySelector<HTMLElement>(":scope > div") ?? viewContent;
}

function refreshOverflow(
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): void {
  const hasOverflow = reflowToolbarOverflow(bar, popoverBar, () => {
    if (
      !isAllowedViewType(plugin.app.workspace.getActiveViewOfType(ItemView))
    ) {
      return undefined;
    }
    return new MorePopover(bar, popoverBar).el;
  });

  // The pane grew and » went away; an open popover would have no dismiss button.
  if (!hasOverflow) morePopoverFor(popoverBar)?.close();
}

// Observe the PANE, not the bar: moving buttons resizes the bar, so observing the
// bar would feed its own reflow back into itself.
function observeToolbarResize(
  plugin: EditingToolbarPlugin,
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
    refreshOverflow(plugin, bar, popoverBar);
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
