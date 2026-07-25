import { App, MarkdownView } from "obsidian";

// Vendor-prefixed fullscreen APIs are accessed via dynamic property names, so
// these element/document views expose an index signature.
interface FullscreenElement extends HTMLElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vendor-prefixed fullscreen API access
  [key: string]: any;
}

interface FullscreenDocument extends Document {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vendor-prefixed fullscreen API access
  [key: string]: any;
}

export function workplacefullscreenMode(app: App) {
  const activeDoc = activeWindow.document;

  if (app.workspace.leftSplit.collapsed && app.workspace.rightSplit.collapsed) {
    app.commands.executeCommandById("app:toggle-right-sidebar");
    app.commands.executeCommandById("app:toggle-left-sidebar");
    app.workspace.leftRibbon.show();
    activeDoc.body.classList.remove("auto-hide-header");
  } else {
    activeDoc.body.classList.add("auto-hide-header");
    app.workspace.leftRibbon.hide();
    if (!app.workspace.leftSplit.collapsed) {
      app.commands.executeCommandById("app:toggle-left-sidebar");
    }
    if (!app.workspace.rightSplit.collapsed) {
      app.commands.executeCommandById("app:toggle-right-sidebar");
    }
  }
}

export function fullscreenMode(app: App) {
  const DOC_EL = document.documentElement;

  let TYPE_REQUEST_FULL_SCREEN = "requestFullscreen";
  let TYPE_EXIT_FULL_SCREEN = "exitFullscreen";
  let TYPE_FULL_SCREEN_ELEMENT = "fullscreenElement";
  if ("webkitRequestFullScreen" in DOC_EL) {
    TYPE_REQUEST_FULL_SCREEN = "webkitRequestFullScreen";
    TYPE_EXIT_FULL_SCREEN = "webkitExitFullscreen";
    TYPE_FULL_SCREEN_ELEMENT = "webkitFullscreenElement";
  } else if ("msRequestFullscreen" in DOC_EL) {
    TYPE_REQUEST_FULL_SCREEN = "msRequestFullscreen";
    TYPE_EXIT_FULL_SCREEN = "msExitFullscreen";
    TYPE_FULL_SCREEN_ELEMENT = "msFullscreenElement";
  } else if ("mozRequestFullScreen" in DOC_EL) {
    TYPE_REQUEST_FULL_SCREEN = "mozRequestFullScreen";
    TYPE_EXIT_FULL_SCREEN = "mozCancelFullScreen";
    TYPE_FULL_SCREEN_ELEMENT = "mozFullScreenElement";
  } else if (!("requestFullscreen" in DOC_EL)) {
    console.warn("editing-toolbar: the current browser does not support the Fullscreen API");
  }

  const leaf = app.workspace.getActiveViewOfType(MarkdownView);
  if (!leaf) return;
  const el = leaf.containerEl;
  const modroot = document.body?.querySelector(
    ".mod-vertical.mod-root .workspace-tab-container"
  ) as HTMLElement;

  const isFull = (element: HTMLElement) =>
    (element as FullscreenElement) ===
    (document as FullscreenDocument)[TYPE_FULL_SCREEN_ELEMENT];
  const beFull = (element: HTMLElement) =>
    (element as FullscreenElement)[TYPE_REQUEST_FULL_SCREEN]();
  const exitFull = () =>
    (document as FullscreenDocument)[TYPE_EXIT_FULL_SCREEN]();

  const fullscreenMutationObserver = new MutationObserver((mutationRecords) => {
    mutationRecords.forEach((mutationRecord) => {
      mutationRecord.addedNodes.forEach((node) => {
        if (!isFull(modroot)) return;
        try {
          document.body.removeChild(node);
          el.appendChild(node);
        } catch (error) {
          console.log(error instanceof Error ? error.message : String(error));
        }
      });
    });
  });

  modroot.addEventListener("fullscreenchange", () => {
    if (!isFull(modroot)) {
      fullscreenMutationObserver.disconnect();
    }
  });

  if (isFull(modroot)) {
    fullscreenMutationObserver.disconnect();
    exitFull();
  } else {
    beFull(modroot);
    fullscreenMutationObserver.observe(document.body, { childList: true });
  }
}
