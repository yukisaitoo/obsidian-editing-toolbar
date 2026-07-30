import { App, ItemView } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import {
  applyAppearanceVars,
  EditingToolbarSettings,
  ToolbarStyleKey,
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
import { applyToolbarState } from "src/toolbar/toolbarVisibility";
import { ViewUtils } from "src/util/viewUtils";

const VIEW_TYPE_MOUNT_SELECTORS: Record<string, string> = {
  markdown: ".markdown-source-view",
  canvas: ".canvas-wrapper",
};

export function getExistingToolbar(
  app: App,
  plugin: EditingToolbarPlugin,
  style: ToolbarStyleKey,
  hostDocument?: Document,
): HTMLElement | null {
  const doc = hostDocument ?? resolveToolbarDocument(app);
  const selector = `${BAR_SELECTOR}[data-toolbar-style="${style}"]`;

  // One top bar per pane, so it is found by walking the active leaf rather than
  // cached; every other style has a single bar per window.
  if (style === "top") {
    return (
      app.workspace
        .getActiveViewOfType(ItemView)
        ?.containerEl?.querySelector<HTMLElement>(selector) ?? null
    );
  }

  const cached = plugin.getCachedToolbar(style);
  if (cached && cached.ownerDocument === doc) return cached;

  const found = doc.querySelector<HTMLElement>(selector);
  if (found) plugin.setCachedToolbar(style, found);
  return found;
}

// Idempotent: calling twice cannot produce a duplicate bar. Null means this style
// has nothing to show (mobile, disallowed view, or an empty command list).
export function ensureToolbar(
  app: App,
  plugin: EditingToolbarPlugin,
  style: ToolbarStyleKey,
  hostDocument?: Document,
): HTMLElement | null {
  if (!plugin.isDesktop()) return null;
  if (!ViewUtils.isAllowedViewType(app.workspace.getActiveViewOfType(ItemView))) {
    return null;
  }

  const doc = hostDocument ?? resolveToolbarDocument(app);
  const commands = plugin.getCurrentCommands(style);

  if (!commands?.length) {
    disposeToolbar(app, plugin, style, doc);
    return null;
  }

  const existing = getExistingToolbar(app, plugin, style, doc);
  if (existing) {
    applyAppearanceVars(existing, plugin.settings, style);
    return existing;
  }

  const bars = mountBars(app, plugin.settings, style, doc);
  if (!bars) return null;

  renderToolbarCommands(
    { app, plugin, bar: bars.bar, style },
    commands,
  );

  refreshOverflow(plugin, bars.bar, bars.popoverBar);
  if (style === "top") {
    observeToolbarResize(plugin, bars.bar, bars.popoverBar);
  } else {
    plugin.setCachedToolbar(style, bars.bar);
  }

  syncColorIcons(doc, plugin.settings);
  return bars.bar;
}

export function disposeToolbar(
  app: App,
  plugin: EditingToolbarPlugin,
  style: ToolbarStyleKey,
  hostDocument?: Document,
): void {
  const doc = hostDocument ?? resolveToolbarDocument(app);
  getExistingToolbar(app, plugin, style, doc)?.remove();
  doc
    .querySelectorAll(`${POPOVER_SELECTOR}[data-toolbar-style="${style}"]`)
    .forEach((el) => el.remove());
  plugin.clearToolbarCache(style);
}

export function selfDestruct(plugin: EditingToolbarPlugin): void {
  const roots: ParentNode[] = [activeWindow.document];

  const rootSplit = plugin.app.workspace.rootSplit as unknown as {
    containerEl?: HTMLElement;
  };
  if (rootSplit?.containerEl) roots.push(rootSplit.containerEl);

  plugin.app.workspace.floatingSplit?.children.forEach((child) => {
    const containerEl = (child as unknown as { containerEl?: HTMLElement })
      .containerEl;
    if (containerEl) roots.push(containerEl);
  });

  roots.forEach((root) =>
    root
      .querySelectorAll(`${BAR_SELECTOR}, ${POPOVER_SELECTOR}`)
      .forEach((el) => el.remove()),
  );

  plugin.clearToolbarCache();
}

interface MountedBars {
  bar: HTMLElement;
  popoverBar: HTMLElement;
}

function mountBars(
  app: App,
  settings: EditingToolbarSettings,
  style: ToolbarStyleKey,
  doc: Document,
): MountedBars | null {
  const bar = createBarEl(doc, "editingToolbarModalBar", style);
  bar.addClass(SHARED_BAR_CLASS);
  bar.addClass(style === "top" ? "top" : "editingToolbarFlex");

  // No offsets until positionFollowingBar runs, so mounting it visible would park
  // it at the pane's top-left; the caller reveals it once anchored.
  if (style !== "top") applyToolbarState(bar, "hidden");

  const popoverBar = createBarEl(doc, "editingToolbarPopoverBar", style);

  applyAppearanceVars(bar, settings, style);
  applyAppearanceVars(popoverBar, settings, style);

  const mounted =
    style === "top"
      ? mountInActiveView(app, bar, popoverBar)
      : mountInWorkspaceRoot(doc, bar, popoverBar);

  return mounted ? { bar, popoverBar } : null;
}

function createBarEl(
  doc: Document,
  className: string,
  style: ToolbarStyleKey,
): HTMLElement {
  const el = doc.createElement("div");
  el.addClass(className);
  el.addClass("editingToolbarDefaultAesthetic");
  el.setAttribute("data-toolbar-style", style);
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
  const target = known
    ? container.querySelector<HTMLElement>(known)
    : null;
  if (target) return target;

  const viewContent = container.querySelector<HTMLElement>(".view-content");
  if (!viewContent) return null;
  return (
    viewContent.querySelector<HTMLElement>(":scope > div") ?? viewContent
  );
}

function mountInWorkspaceRoot(
  doc: Document,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): boolean {
  const workspaceRoot = doc.body?.querySelector<HTMLElement>(
    ".mod-vertical.mod-root",
  );
  if (!workspaceRoot) return false;

  workspaceRoot.insertAdjacentElement("afterbegin", popoverBar);
  workspaceRoot.insertAdjacentElement("afterbegin", bar);
  return true;
}

function refreshOverflow(
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
  popoverBar: HTMLElement,
): void {
  const hasOverflow = reflowToolbarOverflow(bar, popoverBar, () => {
    if (!ViewUtils.isAllowedViewType(
      plugin.app.workspace.getActiveViewOfType(ItemView),
    )) {
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
  plugin.topToolbarResizeObserver?.disconnect();
  plugin.topToolbarResizeObserver = null;

  const parent = bar.parentElement;
  if (!parent) return;

  // A popped-out window has its own ResizeObserver constructor.
  const ObserverCtor = (windowOf(bar) as Window & typeof globalThis)
    .ResizeObserver;
  const observer = new ObserverCtor(() => {
    if (!bar.isConnected) {
      observer.disconnect();
      if (plugin.topToolbarResizeObserver === observer) {
        plugin.topToolbarResizeObserver = null;
      }
      return;
    }
    refreshOverflow(plugin, bar, popoverBar);
    const popover = morePopoverFor(popoverBar);
    if (popover?.isOpen) popover.reposition();
  });

  observer.observe(parent);
  plugin.topToolbarResizeObserver = observer;
}

export { closeMoreOverflowPopovers };
