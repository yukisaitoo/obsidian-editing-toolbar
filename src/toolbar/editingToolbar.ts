import {
  App,
  ButtonComponent,
  Command,
  Editor,
  ItemView,
  Menu,
  MenuItem,
  setIcon,
  WorkspaceItemExt,
  WorkspaceParent,
  WorkspaceParentExt,
  WorkspaceWindow,
} from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import {
  AppearanceByStyle,
  editingToolbarSettings,
  StyleAppearanceSettings,
  ToolbarStyleKey,
} from "src/settings/settingsData";
import { strings, t } from "src/translations/helper";
import {
  backcolorpicker,
  colorpicker,
  setBackgroundcolor,
  setFontcolor,
} from "src/util/util";
import { ViewUtils } from "src/util/viewUtils";

let activeDocument: Document;

const TOOLTIP_DELAY = 250;

// Open/closed state for the » overflow popover. It lives in a class (CSS hides
// the bar with display:none when the class is absent) rather than in an inline
// visibility, because a hovered submenu flyout inside the popover sets
// `visibility: visible` on itself and would survive a hidden parent — which is
// why closing used to leave commands on screen until the pointer moved away.
const MORE_POPOVER_OPEN_CLASS = "editing-toolbar-more-open";

// Popups that live outside the popover's subtree but logically belong to it:
// dropdown menus, the pickr colour picker, modals and suggesters all render at
// the document root, so a click inside them must not count as "clicked away".
const DETACHED_POPUP_SELECTOR =
  ".menu, .pcr-app, .modal-container, .suggestion-container";

// Close callback of each currently open » popover, keyed by the popover bar, so
// closing from outside its » button also takes the dismissal listeners back off
// the document instead of just dropping the open class.
const openMorePopoverClosers = new Map<HTMLElement, () => void>();

const viewTypeToSelectorMap: { [key: string]: string } = {
  markdown: ".markdown-source-view",
  canvas: ".canvas-wrapper",
  excalidraw: ".view-header",
  image: ".image-container",
  pdf: ".view-content",
};

function getRootSplits(app: App): WorkspaceParentExt[] {
  const rootSplits: WorkspaceParentExt[] = [];

  rootSplits.push(
    app.workspace.rootSplit as WorkspaceParent as WorkspaceParentExt,
  );

  // @ts-expect-error floatingSplit is undocumented
  const floatingSplit = app.workspace.floatingSplit as WorkspaceParentExt;
  floatingSplit?.children.forEach((child: WorkspaceItemExt) => {
    if (child instanceof WorkspaceWindow) {
      rootSplits.push(child as unknown as WorkspaceParentExt);
    }
  });

  return rootSplits;
}

// Detach every toolbar and popover bar found under `root`, emptying each before
// removing it so no stale child nodes linger.
function clearToolbarsIn(root: ParentNode) {
  const bars = root.querySelectorAll(
    ".editingToolbarModalBar, .editingToolbarPopoverBar",
  );
  bars.forEach((element) => {
    if (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.remove();
  });
}

export function resetToolbar(plugin?: EditingToolbarPlugin) {
  activeDocument = activeWindow.document;

  clearToolbarsIn(activeDocument);

  if (plugin) {
    plugin.clearToolbarCache();
  }
}

export function selfDestruct(plugin: EditingToolbarPlugin) {
  activeDocument = activeWindow.document;

  const rootSplits = getRootSplits(plugin.app);

  clearToolbarsIn(activeDocument);

  if (rootSplits) {
    rootSplits.forEach((rootSplit: WorkspaceParentExt) => {
      if (rootSplit?.containerEl) {
        clearToolbarsIn(rootSplit.containerEl);
      }
    });
  }

  if (plugin) {
    plugin.clearToolbarCache();
  }
}

export function getExistingToolbar(
  app: App,
  plugin: EditingToolbarPlugin,
  style?: ToolbarStyleKey,
  hostDocument?: Document,
): HTMLElement | null {
  const targetDocument =
    hostDocument ||
    app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
    activeWindow.document;

  activeDocument = targetDocument;

  const targetStyle: ToolbarStyleKey =
    style ||
    (plugin.positionStyle as ToolbarStyleKey) ||
    (plugin.settings.positionStyle as ToolbarStyleKey) ||
    "top";

  if (targetStyle !== "top") {
    const cached = plugin.getCachedToolbar(targetStyle);
    if (cached && cached.ownerDocument === targetDocument) {
      return cached;
    }
  }

  const selector = `.editingToolbarModalBar[data-toolbar-style="${targetStyle}"]`;

  let container: HTMLElement | null;

  if (targetStyle === "top") {
    container =
      (app.workspace.activeLeaf?.view.containerEl?.querySelector(
        selector,
      ) as HTMLElement) || null;
  } else {
    container = targetDocument.querySelector(selector) as HTMLElement;
  }

  if (container && targetStyle !== "top") {
    plugin.setCachedToolbar(targetStyle, container);
  }

  return container;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- walks arbitrary nested hotkey structures
const getNestedObject = (nestedObj: any, pathArr: (string | number)[]) => {
  return pathArr.reduce(
    (obj, key) => (obj && obj[key] !== "undefined" ? obj[key] : undefined),
    nestedObj,
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped hotkey key-combo structure
function setHilite(keys: any, how: string) {
  if (keys && keys[1][0] !== undefined) {
    return how + keys.flat(2).join("+").replace("Mod", "Ctrl") + how;
  } else {
    return how + "–" + how;
  }
}

function getHotkey(app: App, cmdId: string, highlight = false) {
  // @ts-expect-error untyped API access
  const arr = app.commands.findCommand(cmdId);
  const hi = highlight ? "*" : "";
  if (arr) {
    const defkeys = arr.hotkeys
      ? [
          [getNestedObject(arr.hotkeys, [0, "modifiers"])],
          [getNestedObject(arr.hotkeys, [0, "key"])],
        ]
      : undefined;
    // @ts-expect-error untyped API access
    const ck = app.hotkeyManager.customKeys[arr.id];
    const hotkeys = ck
      ? [
          [getNestedObject(ck, [0, "modifiers"])],
          [getNestedObject(ck, [0, "key"])],
        ]
      : undefined;
    return hotkeys ? setHilite(hotkeys, hi) : setHilite(defkeys, "");
  } else return "–";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- uses undocumented editor coord methods (cursorCoords/coordsAtPos)
const getCoords = (editor: any) => {
  const cursorFrom = editor.getCursor("head");
  if (editor.getCursor("head").ch !== editor.getCursor("from").ch)
    cursorFrom.ch = Math.max(0, cursorFrom.ch - 1);

  let coords: { top: number; left: number; bottom: number } | undefined;
  if (editor.cursorCoords) coords = editor.cursorCoords(true, "window");
  else if (editor.coordsAtPos) {
    const offset = editor.posToOffset(cursorFrom);
    coords = editor.cm.coordsAtPos?.(offset) ?? editor.coordsAtPos(offset);
  } else return;

  return coords;
};

export function checkHtml(htmlStr: string) {
  const reg = /<[^>]+>/g;
  return reg.test(htmlStr);
}

function applyMenuItemIcon(menuItem: MenuItem, icon: string = "") {
  if (!icon) {
    menuItem.setIcon("");
    if (menuItem.iconEl) {
      menuItem.iconEl.empty();
    }
    return;
  }

  if (checkHtml(icon)) {
    menuItem.setIcon("lucide-square");
    if (menuItem.iconEl) {
      menuItem.iconEl.empty();
      menuItem.iconEl.innerHTML = icon;
    }
    return;
  }

  menuItem.setIcon(icon);

  if (menuItem.iconEl && menuItem.iconEl.childElementCount === 0) {
    setIcon(menuItem.iconEl, icon);
  }
}

// Render a command's icon onto a toolbar button: raw HTML icons go into the
// button element, named icons through setIcon. Missing icons fall back to "".
function applyButtonIcon(btn: ButtonComponent, icon?: string) {
  const iconStr = icon ?? "";
  if (checkHtml(iconStr)) {
    btn.buttonEl.innerHTML = iconStr;
  } else {
    btn.setIcon(iconStr);
  }
}

// Close any open » popover. The popover is a sibling of the bar, not a child,
// so hiding the bar (reading mode, a different view, the visibility toggle)
// would otherwise leave it floating over the note.
export function closeMoreOverflowPopovers(root?: ParentNode): void {
  Array.from(openMorePopoverClosers.values()).forEach((close) => close());
  // Defensive: a bar rebuilt while open leaves the class on a popover whose
  // closer is already gone.
  const scope = root ?? activeWindow.document;
  scope
    .querySelectorAll(`.editingToolbarPopoverBar.${MORE_POPOVER_OPEN_CLASS}`)
    .forEach((el) => el.removeClass(MORE_POPOVER_OPEN_CLASS));
}

function syncToolbarVisibilityAfterAction(
  editingToolbar: HTMLElement,
  settings: editingToolbarSettings,
  effectiveStyle: ToolbarStyleKey | string,
  plugin: EditingToolbarPlugin,
) {
  const editor = plugin.commandsManager.getActiveEditor();
  const hasSelection = editor && editor.somethingSelected();

  if (!settings.cMenuVisibility) {
    editingToolbar.style.visibility = "hidden";
  } else if (effectiveStyle === "following") {
    if (!hasSelection) {
      editingToolbar.style.visibility = "hidden";
    }
  } else {
    editingToolbar.style.visibility = "visible";
  }
}

// Reflow the toolbar to the current pane width by shuffling buttons between the
// bar and the "more" (») popover — moving overflow out when it's too narrow and
// pulling buttons back in when there's room again. This is a pure DOM move (no
// teardown/rebuild), so it's cheap enough to run live on every resize frame.
//
// It measures real laid-out geometry rather than estimating from icon-size /
// padding constants, so it stays correct for any button count and any CSS.
// Available room = the pane's content width (the bar's containing block), NOT
// the bar's own box, which can shrink-to-fit its content and never report
// overflow. Needed width = the rendered span of the visible buttons, which
// captures the real gaps/padding the browser applied.
function reflowToolbarOverflow(
  app: App,
  editingToolbar: HTMLElement,
  popoverBar: HTMLElement | null,
): void {
  if (!popoverBar || !editingToolbar.isConnected) return;

  const OVERFLOW_TOLERANCE = 1;

  const parent = editingToolbar.parentElement;
  let available: number;
  if (parent) {
    const cs = getComputedStyle(parent);
    const padX =
      (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    available = parent.clientWidth - padX;
  } else {
    available = editingToolbar.clientWidth;
  }
  if (available <= 0) return; // not laid out yet — a later resize tick retries

  // The » button is kept as the last child of the bar and toggled via display,
  // so a hidden one contributes no width. Everything else is a real button.
  const moreOf = (): HTMLElement | null =>
    editingToolbar.querySelector<HTMLElement>(":scope > .more-menu");
  const visibleSpan = (): number => {
    let left = Infinity;
    let right = -Infinity;
    for (const el of Array.from(editingToolbar.children) as HTMLElement[]) {
      if (el.style.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.left < left) left = r.left;
      if (r.right > right) right = r.right;
    }
    return right > left ? right - left : 0;
  };
  const overflowing = (): boolean =>
    visibleSpan() > available + OVERFLOW_TOLERANCE;

  // Nothing stored in the popover and the bar already fits → no » needed at all.
  if (!moreOf() && !popoverBar.firstElementChild && !overflowing()) return;

  const more = moreOf() ?? createMoreMenu(app, editingToolbar, popoverBar);
  if (!more) return; // view not allowed / no host

  // Expansion: pull buttons back from the popover while they still fit. The »
  // only costs width while the popover keeps at least one item, so drop it from
  // the measurement when the button we're testing would empty the popover.
  while (popoverBar.firstElementChild) {
    more.style.display = popoverBar.childElementCount === 1 ? "none" : "";
    const candidate = popoverBar.firstElementChild as HTMLElement;
    editingToolbar.insertBefore(candidate, more);
    if (overflowing()) {
      popoverBar.insertBefore(candidate, popoverBar.firstChild); // revert
      break;
    }
  }

  // Collapse: push trailing buttons into the popover until the bar fits.
  if (overflowing()) {
    more.style.display = ""; // » is about to be shown; reserve its width.
    let guard = editingToolbar.children.length;
    while (overflowing() && guard-- > 0) {
      const movable = (Array.from(editingToolbar.children) as HTMLElement[]).filter(
        (el) => el !== more,
      );
      const last = movable[movable.length - 1];
      if (!last) break;
      // Prepend so the popover reads left-to-right in original command order.
      popoverBar.insertBefore(last, popoverBar.firstChild);
    }
  }

  const hasOverflow = popoverBar.firstElementChild !== null;
  more.style.display = hasOverflow ? "" : "none";
  // The » button just went away (the pane grew) — an open popover would be left
  // on screen with no way to dismiss it from the bar.
  if (!hasOverflow) {
    openMorePopoverClosers.get(popoverBar)?.();
    popoverBar.removeClass(MORE_POPOVER_OPEN_CLASS);
  }
}

// Keep the top toolbar reflowing as its pane resizes, without rebuilding it.
// Observe the PANE (parent), not the bar — moving buttons changes the bar's
// size, so observing the bar would feed back into itself; the pane's width is
// unaffected by our moves, so there's no observer loop.
export function observeToolbarResize(
  plugin: EditingToolbarPlugin,
  app: App,
  editingToolbar: HTMLElement,
  popoverBar: HTMLElement | null,
): void {
  plugin.topToolbarResizeObserver?.disconnect();
  plugin.topToolbarResizeObserver = null;

  const parent = editingToolbar.parentElement;
  if (!parent || !popoverBar) return;

  const ownerWindow = editingToolbar.ownerDocument.defaultView ?? window;
  const observer = new ownerWindow.ResizeObserver(() => {
    if (!editingToolbar.isConnected) {
      observer.disconnect();
      if (plugin.topToolbarResizeObserver === observer) {
        plugin.topToolbarResizeObserver = null;
      }
      return;
    }
    reflowToolbarOverflow(app, editingToolbar, popoverBar);
  });
  observer.observe(parent);
  plugin.topToolbarResizeObserver = observer;
}

export function createDiv(selector: string) {
  const div = createEl("div");
  div.addClass(selector);
  return div;
}

function createTableCell(
  app: App,
  plugin: EditingToolbarPlugin,
  el: string,
  root?: ParentNode,
) {
  activeDocument = activeWindow.document;

  const container =
    root || (getExistingToolbar(app, plugin) as HTMLElement | null);
  const tab = container?.querySelector("#" + el);
  if (tab) {
    // @ts-expect-error untyped API access
    const rows = tab.rows;
    const rlen = rows.length;
    for (let i = 1; i < rlen; i++) {
      const cells = rows[i].cells;
      for (let j = 0; j < cells.length; j++) {
        cells[j].onclick = function (event: MouseEvent) {
          event.preventDefault();
          event.stopPropagation();
          const editor = plugin.commandsManager.getActiveEditor();
          if (!editor) return;
          let backcolor = (event.currentTarget as HTMLElement).style
            .backgroundColor;
          if (backcolor !== "") {
            backcolor = setColorHex(backcolor);
            if (el === "x-color-picker-table") {
              plugin.settings.cMenuFontColor = backcolor;
              setFontcolor(backcolor, editor);
              const fontColorDom = activeDocument.querySelectorAll(
                "#change-font-color-icon",
              );
              fontColorDom.forEach((element) => {
                const ele = element as HTMLElement;
                ele.style.fill = backcolor;
              });
            } else if (el === "x-backgroundcolor-picker-table") {
              plugin.settings.cMenuBackgroundColor = backcolor;
              setBackgroundcolor(backcolor, editor);
              const backgroundColorDom = activeDocument.querySelectorAll(
                "#change-background-color-icon",
              );
              backgroundColorDom.forEach((element) => {
                const ele = element as HTMLElement;
                ele.style.fill = backcolor;
              });
            }
            plugin.saveSettings();
          }
        };
      }
    }
  }
}

function setColorHex(color: string) {
  const reg = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (/^(rgb|RGB)/.test(color)) {
    const aColor = color.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(",");
    let strHex = "#";
    for (let i = 0; i < aColor.length; i++) {
      let hex = Number(aColor[i]).toString(16);
      if (hex === "0") {
        hex += hex;
      }
      if (hex.length === 1) {
        hex = "0" + hex;
      }
      strHex += hex;
    }
    if (strHex.length !== 7) {
      strHex = color;
    }
    return strHex;
  } else if (reg.test(color)) {
    const aNum = color.replace(/#/, "").split("");
    if (aNum.length === 6) {
      return color;
    } else if (aNum.length === 3) {
      let numHex = "#";
      for (let i = 0; i < aNum.length; i += 1) {
        numHex += aNum[i] + aNum[i];
      }
      return numHex;
    }
  } else {
    return color;
  }
  return color;
}

function createMoreMenu(
  app: App,
  selector: HTMLElement,
  moreContainer: HTMLElement,
): HTMLElement | undefined {
  const view = app.workspace.getActiveViewOfType(ItemView);
  if (!view || !ViewUtils.isAllowedViewType(view)) return;

  const toolbarStyle = selector.getAttribute("data-toolbar-style");

  const resetMorePopoverPosition = (popoverEl: HTMLElement) => {
    popoverEl.style.removeProperty("left");
    popoverEl.style.removeProperty("top");
    popoverEl.style.removeProperty("right");
    popoverEl.style.removeProperty("bottom");
    popoverEl.style.removeProperty("transform");
    popoverEl.style.removeProperty("margin");
    popoverEl.style.removeProperty("position");
  };

  const positionMorePopover = (
    anchorEl: HTMLElement,
    popoverEl: HTMLElement,
    currentToolbarStyle?: string | null,
  ) => {
    if (currentToolbarStyle !== "following") {
      resetMorePopoverPosition(popoverEl);
      return;
    }

    const ownerWindow = popoverEl.ownerDocument.defaultView ?? window;
    const anchorRect = anchorEl.getBoundingClientRect();
    const popoverWidth = Math.max(popoverEl.offsetWidth, popoverEl.scrollWidth);
    const popoverHeight = Math.max(
      popoverEl.offsetHeight,
      popoverEl.scrollHeight,
    );
    const horizontalPadding = 12;
    const verticalGap = 8;
    const maxLeft = Math.max(
      horizontalPadding,
      ownerWindow.innerWidth - popoverWidth - horizontalPadding,
    );

    let left = anchorRect.right - popoverWidth;
    if (popoverWidth <= 0) {
      left = anchorRect.left;
    }
    left = Math.min(Math.max(left, horizontalPadding), maxLeft);

    let top = anchorRect.bottom + verticalGap;
    if (
      popoverHeight > 0 &&
      top + popoverHeight > ownerWindow.innerHeight - horizontalPadding
    ) {
      top = Math.max(
        horizontalPadding,
        anchorRect.top - popoverHeight - verticalGap,
      );
    }

    popoverEl.style.position = "fixed";
    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
    popoverEl.style.right = "auto";
    popoverEl.style.bottom = "auto";
    popoverEl.style.transform = "none";
    popoverEl.style.margin = "0";
  };

  const cMoreMenu = selector.createEl("span");
  cMoreMenu.addClass("more-menu");
  const moreButton = new ButtonComponent(cMoreMenu);

  // Dismissal listeners only exist while the popover is open, so there is
  // nothing to unregister when the toolbar is torn down: closing (which a stray
  // click on a detached popover still does) takes them off the document.
  const ownerDocument = cMoreMenu.ownerDocument;

  const onPointerDown = (evt: PointerEvent) => {
    const target = evt.target as Node | null;
    if (!target) return;
    if (
      moreContainer.contains(target) ||
      cMoreMenu.contains(target) || // re-click: the click handler below toggles
      (target instanceof Element && target.closest(DETACHED_POPUP_SELECTOR))
    ) {
      return;
    }
    close();
  };

  const onKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === "Escape") close();
  };

  function close() {
    moreContainer.removeClass(MORE_POPOVER_OPEN_CLASS);
    ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
    ownerDocument.removeEventListener("keydown", onKeyDown, true);
    // A rebuilt bar can hand a second » button the same popover; only retract
    // the entry if it is still ours.
    if (openMorePopoverClosers.get(moreContainer) === close) {
      openMorePopoverClosers.delete(moreContainer);
    }
  }

  const open = () => {
    moreContainer.addClass(MORE_POPOVER_OPEN_CLASS);
    positionMorePopover(moreButton.buttonEl, moreContainer, toolbarStyle);
    // Capture phase: a command button that stops propagation must not be able
    // to strand the popover open.
    ownerDocument.addEventListener("pointerdown", onPointerDown, true);
    ownerDocument.addEventListener("keydown", onKeyDown, true);
    openMorePopoverClosers.set(moreContainer, close);
  };

  moreButton
    .setClass("editingToolbarCommandItem")
    .setTooltip(strings.more, { delay: TOOLTIP_DELAY })
    .onClick(() => {
      if (moreContainer.hasClass(MORE_POPOVER_OPEN_CLASS)) close();
      else open();
    });
  moreButton.buttonEl.innerHTML = `<svg  width="14" height="14"  version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" enable-background="new 0 0 1024 1024" xml:space="preserve"><path fill="#666" d="M510.29 14.13 q17.09 -15.07 40.2 -14.07 q23.12 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.1 q-23.62 2.01 -41.71 -13.07 q-18.08 -15.08 -20.09 -38.19 q-2.01 -23.12 13.06 -41.21 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.67 -386.92 q-15.07 -17.09 -13.56 -40.7 q1.51 -23.62 19.59 -38.7 ZM81.17 14.13 q17.08 -15.07 40.19 -14.07 q23.11 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.6 q-23.61 2.51 -41.7 -12.57 q-18.09 -15.08 -20.1 -38.69 q-2.01 -23.62 13.06 -41.71 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.66 -386.92 q-15.08 -17.09 -13.57 -40.7 q1.51 -23.62 19.6 -38.7 Z"/></svg>`;
  return cMoreMenu;
}

export function setFormatEraser(plugin: EditingToolbarPlugin, editor: Editor) {
  let selectText = editor.getSelection();
  if (!selectText || selectText.trim() === "") {
    return;
  }
  if (selectText.match(/^>\s*\[![\w\s]*\]/m)) {
    const lines = selectText.split("\n");
    const result = [];
    let inCallout = false;
    let calloutLevel = 0;
    let foundFirstCallout = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const calloutMatch = line.match(/^(>+)\s*\[!([\w\s]*)\]\s*(.*?)$/);
      if (calloutMatch && !foundFirstCallout) {
        calloutLevel = calloutMatch[1].length;
        foundFirstCallout = true;

        if (calloutMatch[3].trim()) {
          result.push(calloutMatch[3].trim());
        }

        inCallout = true;
        continue;
      }

      if (inCallout) {
        const linePrefix = line.match(/^(>+)\s*/);
        if (linePrefix && linePrefix[1].length >= calloutLevel) {
          const newLine = line.replace(
            new RegExp(`^>{${calloutLevel}}\\s*`),
            "",
          );

          result.push(newLine);
        } else {
          inCallout = false;
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }

    editor.replaceSelection(result.join("\n"));
    return;
  }

  const mdText =
    /(^#+\s|^#(?=\s)|^>|^- \[( |x)\]|^\+ |<[^<>]+?>|^1\. |^\s*- |^-+$|^\*+$)/gm;
  selectText = selectText.replace(mdText, "");
  selectText = selectText.replace(/^[ ]+|[ ]+$/gm, "");
  selectText = selectText.replace(/!?\[\[([^[\]|]*\|)*([^()[\]]+)\]\]/g, "$2");
  selectText = selectText.replace(/!?\[+([^[\]()]+)\]+\(([^()]+)\)/g, "$1");
  selectText = selectText.replace(/`([^`]+)`/g, "$1");
  selectText = selectText.replace(/_([^_]+)_/g, "$1");
  selectText = selectText.replace(/==([^=]+)==/g, "$1");
  selectText = selectText.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  selectText = selectText.replace(/\*\*?([^*]+)\*\*?/g, "$1");
  selectText = selectText.replace(/~~([^~]+)~~/g, "$1");

  editor.replaceSelection(selectText);
}

export function createFollowingBar(
  app: App,
  plugin: EditingToolbarPlugin,
  editor: Editor,
  forceShow: boolean = false,
  hostDocument?: Document,
) {
  const targetDocument =
    hostDocument ||
    editor?.cm?.dom?.ownerDocument ||
    editor?.cm?.contentDOM?.ownerDocument ||
    app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
    activeWindow.document;

  let editingToolbarModalBar = getExistingToolbar(
    app,
    plugin,
    "following",
    targetDocument,
  );

  const view = app.workspace.getActiveViewOfType(ItemView);
  if (!ViewUtils.isAllowedViewType(view)) {
    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "hidden";
    }
    return;
  }

  // The explicit enable flag is the source of truth; legacy positionStyle-only
  // configs are migrated into it in loadSettings().
  if (!plugin.settings.enableFollowingToolbar) return;

  if (!editingToolbarModalBar) {
    editingToolbarPopover(app, plugin, "following", targetDocument);
    editingToolbarModalBar = getExistingToolbar(
      app,
      plugin,
      "following",
      targetDocument,
    );
  }

  const viewType = view?.getViewType();
  const isMarkdownView = viewType === "markdown";

  if (isMarkdownView) {
    if (ViewUtils.isSourceMode(view)) {
      if (editingToolbarModalBar) {
        const shouldShow = forceShow || editor.somethingSelected();
        editingToolbarModalBar.style.visibility = shouldShow
          ? "visible"
          : "hidden";

        if (editingToolbarModalBar.style.visibility === "visible") {
          editingToolbarModalBar.addClass("editingToolbarFlex");
          editingToolbarModalBar.removeClass("editingToolbarGrid");

          positionToolbar(editingToolbarModalBar, editor);
        }
      }
    } else {
      if (editingToolbarModalBar) {
        editingToolbarModalBar.style.visibility = "hidden";
      }
    }
  } else {
    if (editingToolbarModalBar) {
      editingToolbarModalBar.style.visibility = "visible";
      editingToolbarModalBar.addClass("editingToolbarFlex");
      editingToolbarModalBar.removeClass("editingToolbarGrid");
    }
  }
}

function positionToolbar(toolbar: HTMLElement, editor: Editor) {
  const editorRect = editor.containerEl.getBoundingClientRect();
  const toolbarWidth = toolbar.offsetWidth;
  const toolbarHeight = toolbar.offsetHeight;

  const rightMargin = 12;
  const windowWidth =
    toolbar.ownerDocument.defaultView?.innerWidth ?? window.innerWidth;

  const from = editor.getCursor("from");
  //@ts-expect-error untyped API access
  const coords = editor.coordsAtPos(from);

  const sideDockWidth =
    activeDocument.getElementsByClassName("mod-left-split")[0]?.clientWidth ??
    0;
  const sideDockRibbonWidth =
    activeDocument.getElementsByClassName("side-dock-ribbon mod-left")[0]
      ?.clientWidth ?? 0;
  const leftSideDockWidth = sideDockWidth + sideDockRibbonWidth;

  let leftPosition = coords.left - leftSideDockWidth - 28;

  const rightEdge = leftPosition + toolbarWidth;
  if (rightEdge > windowWidth - leftSideDockWidth) {
    leftPosition = windowWidth - leftSideDockWidth - toolbarWidth - rightMargin;
  }

  leftPosition = Math.max(0, leftPosition);

  let topPosition = calculateTopPosition(
    editor,
    coords,
    editorRect,
    toolbarHeight,
  );

  topPosition = Math.max(0, topPosition);

  toolbar.style.left = `${leftPosition}px`;
  toolbar.style.top = `${topPosition}px`;
}

function calculateTopPosition(
  editor: Editor,
  coords: { top: number; left: number; bottom: number },
  editorRect: { top: number; left: number; bottom: number },
  toolbarHeight: number,
) {
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  //@ts-expect-error untyped API access
  const coordsTO = editor.coordsAtPos(to);

  const isSingleLineSelection = from.line === to.line;
  let topPosition = coords.top - toolbarHeight - 10;
  if (isSingleLineSelection) {
    if (topPosition <= editorRect.top) {
      topPosition = coordsTO.bottom + 10;
    }
  } else {
    const isSelectionFromBottomToTop =
      editor.getCursor("head").ch === editor.getCursor("from").ch;

    if (isSelectionFromBottomToTop) {
      topPosition = coords.top - toolbarHeight - 10;
      if (topPosition <= editorRect.top)
        topPosition = editorRect.top + 2 * toolbarHeight;
    } else {
      const cursorCoords = getCoords(editor);
      if (cursorCoords) {
        topPosition = cursorCoords.bottom + 10;
        if (topPosition >= editorRect.bottom - toolbarHeight)
          topPosition = editorRect.bottom - 2 * toolbarHeight;
      }
    }
  }
  return topPosition;
}

interface ColorPickerButtonConfig {
  tooltip: string;
  pickerHtml: string;
  // Wired up by createTableCell for click-to-apply
  tableId: string;
  customColorTooltip: string;
}

// Builds a colour-swatch submenu button with a custom-colour shortcut.
// Font- and background-colour share it, differing only via `config`.
function createColorPickerButton(
  app: App,
  plugin: EditingToolbarPlugin,
  editingToolbar: HTMLElement,
  settings: editingToolbarSettings,
  effectiveStyle: ToolbarStyleKey,
  item: Command,
  config: ColorPickerButtonConfig,
) {
  const button = new ButtonComponent(editingToolbar);
  button
    .setClass("editingToolbarCommandsubItem-font-color")
    .setTooltip(config.tooltip, { delay: TOOLTIP_DELAY })
    .onClick((event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(".x-color-picker-wrapper") ||
        target?.closest(".subitem")
      ) {
        return;
      }

      app.commands.executeCommandById(item.id);
      syncToolbarVisibilityAfterAction(
        editingToolbar,
        settings,
        effectiveStyle,
        plugin,
      );
    });
  applyButtonIcon(button, item.icon);

  const submenu = createEl("div");
  submenu.addClass("subitem");
  submenu.innerHTML = config.pickerHtml;

  button.buttonEl.insertAdjacentElement("afterbegin", submenu);
  createTableCell(app, plugin, config.tableId, submenu);

  const wrapper = submenu.querySelector(
    ".x-color-picker-wrapper",
  ) as HTMLElement;

  new ButtonComponent(wrapper)
    .setIcon("palette")
    .setTooltip(config.customColorTooltip, { delay: TOOLTIP_DELAY })
    .onClick(() => {
      app.setting.open();
      app.setting.openTabById("editing-toolbar");
      setTimeout(() => {
        const tabsContainer = app.setting.activeTab?.containerEl.querySelector(
          ".editing-toolbar-tabs",
        );
        if (tabsContainer) {
          const appearanceTab = tabsContainer.children[0] as HTMLElement;
          appearanceTab?.click();
        }
      }, 200);
    });
}

export function editingToolbarPopover(
  app: App,
  plugin: EditingToolbarPlugin,
  style?: ToolbarStyleKey,
  hostDocument?: Document,
): void {
  const settings = plugin.settings;
  const targetDocument =
    hostDocument ||
    app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
    activeWindow.document;

  activeDocument = targetDocument;

  // If no explicit style is provided, render toolbars for all enabled styles.
  if (!style) {
    const stylesToRender: ToolbarStyleKey[] = [];

    if (settings.enableTopToolbar) stylesToRender.push("top");
    if (settings.enableFollowingToolbar) stylesToRender.push("following");

    stylesToRender.forEach((styleKey) => {
      editingToolbarPopover(app, plugin, styleKey, targetDocument);
    });

    return;
  }

  const effectiveStyle: ToolbarStyleKey = style as ToolbarStyleKey;

  if (!settings.cMenuVisibility) {
    const existingToolbar = getExistingToolbar(
      app,
      plugin,
      effectiveStyle,
      targetDocument,
    );
    if (existingToolbar) {
      existingToolbar.style.display = "none";
    }
    return;
  }

  const commandsForStyle = plugin.getCurrentCommands(effectiveStyle);
  if (!commandsForStyle || commandsForStyle.length === 0) {
    getExistingToolbar(app, plugin, effectiveStyle, targetDocument)?.remove();
    plugin.clearToolbarCache(effectiveStyle);
    return;
  }

  const appearanceStore = (settings.appearanceByStyle ||
    {}) as AppearanceByStyle;
  const appearanceForStyle = (appearanceStore[effectiveStyle] ||
    {}) as StyleAppearanceSettings;

  const resolvedIconSize =
    appearanceForStyle.toolbarIconSize ?? plugin.toolbarIconSize ?? 18;

  const resolvedBgColor =
    appearanceForStyle.toolbarBackgroundColor ??
    settings.toolbarBackgroundColor;

  const resolvedIconColor =
    appearanceForStyle.toolbarIconColor ?? settings.toolbarIconColor;

  const generateMenu = () => {
    const editingToolbar = createEl("div");
    if (editingToolbar) {
      editingToolbar.addClass("editingToolbarModalBar");
      editingToolbar.setAttribute("data-toolbar-style", effectiveStyle);

      if (effectiveStyle === "top") {
        editingToolbar.className += " top";
      } else if (effectiveStyle === "following") {
        editingToolbar.style.visibility = "hidden";
      }
    }
    editingToolbar.setAttribute("id", "editingToolbarModalBar");

    const popoverMenu = createEl("div");
    popoverMenu.addClass("editingToolbarpopover");
    popoverMenu.addClass("editingToolbarPopoverBar");
    popoverMenu.setAttribute("data-toolbar-style", effectiveStyle);

    popoverMenu.setAttribute("id", "editingToolbarPopoverBar");

    editingToolbar.addClass("editingToolbarDefaultAesthetic");
    popoverMenu.addClass("editingToolbarDefaultAesthetic");

    if (resolvedBgColor) {
      editingToolbar.style.setProperty(
        "--editing-toolbar-background-color",
        resolvedBgColor,
      );
      popoverMenu.style.setProperty(
        "--editing-toolbar-background-color",
        resolvedBgColor,
      );
    }
    if (resolvedIconColor) {
      editingToolbar.style.setProperty(
        "--editing-toolbar-icon-color",
        resolvedIconColor,
      );
      popoverMenu.style.setProperty(
        "--editing-toolbar-icon-color",
        resolvedIconColor,
      );
    }
    if (resolvedIconSize) {
      editingToolbar.style.setProperty(
        "--toolbar-icon-size",
        `${resolvedIconSize}px`,
      );
      popoverMenu.style.setProperty(
        "--toolbar-icon-size",
        `${resolvedIconSize}px`,
      );
    }

    if (effectiveStyle === "top") {
      const activeLeaf = app.workspace.activeLeaf;
      if (!activeLeaf) return;
      const currentleaf = activeLeaf.view.containerEl;

      let targetDom: HTMLElement | null = null;

      const viewType = activeLeaf.view.getViewType();

      const selector = viewTypeToSelectorMap[viewType];
      if (selector) {
        targetDom = currentleaf?.querySelector<HTMLElement>(selector);
      }

      if (!targetDom) {
        const viewContent =
          currentleaf?.querySelector<HTMLElement>(".view-content");
        if (viewContent) {
          const childDivs =
            viewContent.querySelectorAll<HTMLElement>(":scope > div");
          targetDom = childDivs.length > 0 ? childDivs[0] : viewContent;
        }
      }

      if (!targetDom) {
        console.error(
          "Editing Toolbar: Failed to find target DOM element for toolbar insertion",
        );
        return;
      }

      const canvasToolbarAnchor =
        viewType === "canvas"
          ? currentleaf?.querySelector<HTMLElement>(".view-content")
          : null;

      if (viewType === "canvas" && canvasToolbarAnchor) {
        canvasToolbarAnchor.insertAdjacentElement(
          "beforebegin",
          editingToolbar,
        );

        if (!currentleaf?.querySelector("#editingToolbarPopoverBar")) {
          canvasToolbarAnchor.insertAdjacentElement("beforebegin", popoverMenu);
        }
      } else {
        if (!currentleaf?.querySelector("#editingToolbarPopoverBar")) {
          if (viewType === "excalidraw") {
            targetDom.insertAdjacentElement("afterend", popoverMenu);
          } else {
            targetDom.insertAdjacentElement("afterbegin", popoverMenu);
          }
        }

        if (viewType === "excalidraw") {
          targetDom.insertAdjacentElement("afterend", editingToolbar);
        } else {
          targetDom.insertAdjacentElement("afterbegin", editingToolbar);
        }
      }
    } else {
      const workspaceRoot = targetDocument.body?.querySelector(
        ".mod-vertical.mod-root",
      ) as HTMLElement | null;

      if (!workspaceRoot) {
        return;
      }

      const existingPopover = workspaceRoot.querySelector(
        `.editingToolbarPopoverBar[data-toolbar-style="${effectiveStyle}"]`,
      ) as HTMLElement | null;
      if (!existingPopover) {
        workspaceRoot.insertAdjacentElement("afterbegin", popoverMenu);
      }

      workspaceRoot.insertAdjacentElement("afterbegin", editingToolbar);
    }

    const editingToolbarPopoverBar =
      effectiveStyle === "top"
        ? (app.workspace.activeLeaf?.view?.containerEl?.querySelector(
            "#editingToolbarPopoverBar",
          ) as HTMLElement)
        : (targetDocument.querySelector(
            `.editingToolbarPopoverBar[data-toolbar-style="${effectiveStyle}"]`,
          ) as HTMLElement | null);

    const currentCommands = plugin.getCurrentCommands(effectiveStyle);
    const getLocalizedLabel = (label: string): string => t(label);
    const getLocalizedTooltip = (label: string, hotkey: string): string => {
      const localizedLabel = getLocalizedLabel(label);
      return hotkey === "–" ? localizedLabel : `${localizedLabel}(${hotkey})`;
    };

    currentCommands.forEach((item, index) => {
      let tip: string | undefined;
      if ("SubmenuCommands" in item) {
        // Build every button into the main bar; overflow is resolved by
        // measurement after the bar is laid out (see reflowToolbarOverflow).
        const parentBtn = new ButtonComponent(editingToolbar);

        parentBtn.setClass("editingToolbarCommandsubItem" + index);
        if (index >= settings.cMenuNumRows) {
          parentBtn.setClass("editingToolbarSecond");
        } else {
          if (effectiveStyle !== "top")
            parentBtn.buttonEl.setAttribute("aria-label-position", "top");
        }

        applyButtonIcon(parentBtn, item.icon);

        const menuType = item.menuType || "submenu";

        if (menuType === "dropdown") {
          parentBtn.setClass("editingToolbarDropdownButton");
          const hotkey = getHotkey(app, item.id);
          tip = getLocalizedTooltip(item.name, hotkey);
          parentBtn.setTooltip(tip, { delay: TOOLTIP_DELAY });

          parentBtn.onClick((evt: MouseEvent) => {
            const menu = new Menu();

            item.SubmenuCommands?.forEach((subitem: Command) => {
              if (subitem.id === "editingToolbar-Divider-Line") {
                menu.addSeparator();
                menu.addItem((menuItem) => {
                  menuItem.setTitle(t(subitem.name)).setDisabled(true);

                  applyMenuItemIcon(menuItem, "");
                });
              } else {
                menu.addItem((menuItem) => {
                  const hotkey = getHotkey(app, subitem.id, false);
                  const title = t(subitem.name);

                  const displayTitle = hotkey !== "–" ? `${title}` : title;

                  menuItem.setTitle(displayTitle).onClick(() => {
                    app.commands.executeCommandById(subitem.id);
                    syncToolbarVisibilityAfterAction(
                      editingToolbar,
                      settings,
                      effectiveStyle,
                      plugin,
                    );
                  });

                  applyMenuItemIcon(menuItem, subitem.icon);

                  if (hotkey !== "—") {
                    const hotkeyEl = menuItem.dom.createSpan({
                      cls: "menu-item-hotkey",
                    });
                    hotkeyEl.setText(hotkey);
                  }
                });
              }
            });

            menu.dom.addClass("editing-toolbar-dropdown-menu");

            menu.showAtMouseEvent(evt);
          });
        } else {
          const submenu = createDiv("subitem");
          if (submenu) {
            item.SubmenuCommands?.forEach((subitem: Command) => {
              const hotkey = getHotkey(app, subitem.id);
              tip = getLocalizedTooltip(subitem.name, hotkey);
              const subBtn = new ButtonComponent(submenu)
                .setTooltip(tip, { delay: TOOLTIP_DELAY })
                .setClass("menu-item")
                .onClick(() => {
                  app.commands.executeCommandById(subitem.id);
                  syncToolbarVisibilityAfterAction(
                    editingToolbar,
                    settings,
                    effectiveStyle,
                    plugin,
                  );
                });
              if (index < settings.cMenuNumRows) {
                if (effectiveStyle !== "top")
                  subBtn.buttonEl.setAttribute("aria-label-position", "top");
              }
              if (subitem.id === "editingToolbar-Divider-Line") {
                // The tooltip set above already resolves to the plain label for
                // dividers (getHotkey returns "–" for non-commands), so no extra
                // aria-label override is needed here.
                subBtn.setClass("editingToolbar-Divider-Line");
              }
              applyButtonIcon(subBtn, subitem.icon);

              parentBtn.buttonEl.insertAdjacentElement("afterbegin", submenu);
            });
          }
        }
      } else {
        if (item.id === "editing-toolbar:change-font-color") {
          createColorPickerButton(
            app,
            plugin,
            editingToolbar,
            settings,
            effectiveStyle,
            item,
            {
              tooltip: strings.fontColors,
              pickerHtml: colorpicker(plugin),
              tableId: "x-color-picker-table",
              customColorTooltip: strings.customFontColor,
            },
          );
        } else if (item.id === "editing-toolbar:change-background-color") {
          createColorPickerButton(
            app,
            plugin,
            editingToolbar,
            settings,
            effectiveStyle,
            item,
            {
              tooltip: strings.backgroundColor,
              pickerHtml: backcolorpicker(plugin),
              tableId: "x-backgroundcolor-picker-table",
              customColorTooltip: strings.customBackgroundColor,
            },
          );
        } else {
          const button = new ButtonComponent(editingToolbar);
          const hotkey = getHotkey(app, item.id);

          tip = getLocalizedTooltip(item.name, hotkey);
          button.setTooltip(tip, { delay: TOOLTIP_DELAY }).onClick(() => {
            app.commands.executeCommandById(item.id);
            syncToolbarVisibilityAfterAction(
              editingToolbar,
              settings,
              effectiveStyle,
              plugin,
            );
          });

          button.setClass("editingToolbarCommandItem");
          if (index >= settings.cMenuNumRows) {
            button.setClass("editingToolbarSecond");
          } else {
            if (effectiveStyle !== "top") {
              button.buttonEl.setAttribute("aria-label-position", "top");
            }
          }
          if (item.id === "editingToolbar-Divider-Line")
            button.setClass("editingToolbar-Divider-Line");

          applyButtonIcon(button, item.icon);
        }
      }
    });

    // Initial fit (synchronous, no flash), then keep it reflowing live as the
    // pane resizes — top style only; the following/menu bars wrap instead.
    reflowToolbarOverflow(app, editingToolbar, editingToolbarPopoverBar);
    if (effectiveStyle === "top") {
      observeToolbarResize(plugin, app, editingToolbar, editingToolbarPopoverBar);
    }
  };
  if (!plugin.isLoadMobile()) return;
  const view = app.workspace.getActiveViewOfType(ItemView);
  if (!ViewUtils.isAllowedViewType(view)) return;

  const existingToolbar = getExistingToolbar(
    app,
    plugin,
    effectiveStyle,
    targetDocument,
  );
  if (existingToolbar && effectiveStyle !== "top") {
    if (!settings.cMenuVisibility) {
      existingToolbar.style.display = "none";
    } else if (effectiveStyle === "following") {
      existingToolbar.style.visibility = "hidden";
      existingToolbar.style.display = ""; // clear display:none so visibility can take over
    } else {
      existingToolbar.style.visibility = "visible";
      existingToolbar.style.display = "";
    }

    if (resolvedBgColor) {
      existingToolbar.style.setProperty(
        "--editing-toolbar-background-color",
        resolvedBgColor,
      );
    }
    if (resolvedIconColor) {
      existingToolbar.style.setProperty(
        "--editing-toolbar-icon-color",
        resolvedIconColor,
      );
    }
    if (resolvedIconSize) {
      existingToolbar.style.setProperty(
        "--toolbar-icon-size",
        `${resolvedIconSize}px`,
      );
    }

    return;
  }

  generateMenu();

  if (effectiveStyle !== "top") {
    const newToolbar = getExistingToolbar(
      app,
      plugin,
      effectiveStyle,
      targetDocument,
    );
    if (newToolbar) {
      plugin.setCachedToolbar(effectiveStyle, newToolbar);
    }
  }

  setsvgColor(settings.cMenuFontColor, settings.cMenuBackgroundColor);
}

function setsvgColor(fontcolor: string, bgcolor: string) {
  activeDocument = activeWindow.document;

  const fontColorIcons = activeDocument.querySelectorAll(
    "#change-font-color-icon",
  );
  const bgColorIcons = activeDocument.querySelectorAll(
    "#change-background-color-icon",
  );

  if (fontColorIcons.length > 0) {
    fontColorIcons.forEach((element) => {
      (element as HTMLElement).style.fill = fontcolor;
    });
  }

  if (bgColorIcons.length > 0) {
    bgColorIcons.forEach((element) => {
      (element as HTMLElement).style.fill = bgcolor;
    });
  }
}
