import { App, ButtonComponent, Editor, ItemView, Menu, Notice, Platform, setIcon, WorkspaceItemExt, WorkspaceParent, WorkspaceParentExt, WorkspaceWindow } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import {
  AppearanceByStyle,
  editingToolbarSettings,
  getAppearanceValue,
  StyleAppearanceSettings,
  ToolbarStyleKey,
} from "src/settings/settingsData";
import { strings, t } from "src/translations/helper";
import { setBottomValue, setHorizontalValue } from "src/util/statusBarConstants";
import { backcolorpicker, colorpicker, setBackgroundcolor, setFontcolor } from "src/util/util";
import { ViewUtils } from 'src/util/viewUtils';

let activeDocument: Document;

const viewTypeToSelectorMap: { [key: string]: string } = {
  markdown: ".markdown-source-view",
  canvas: ".canvas-wrapper",
  excalidraw: ".view-header",
  image: ".image-container",
  pdf: ".view-content",
};

function getRootSplits(app: App): WorkspaceParentExt[] {

  const rootSplits: WorkspaceParentExt[] = [];

  // push the main window's root split to the list
  rootSplits.push(app.workspace.rootSplit as WorkspaceParent as WorkspaceParentExt)

  // @ts-expect-error floatingSplit is undocumented
  const floatingSplit = app.workspace.floatingSplit as WorkspaceParentExt;
  floatingSplit?.children.forEach((child: WorkspaceItemExt) => {
    // if this is a window, push it to the list
    if (child instanceof WorkspaceWindow) {
      rootSplits.push(child as unknown as WorkspaceParentExt);
    }
  });

  return rootSplits;
}

export function resetToolbar(plugin?: EditingToolbarPlugin) {
  activeDocument = activeWindow.document;

  const currentDoc = activeDocument;

  const toolbars = currentDoc.querySelectorAll(".editingToolbarModalBar");
  const popovers = currentDoc.querySelectorAll(".editingToolbarPopoverBar");

  toolbars.forEach((element) => {
    if (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.remove();
  });

  popovers.forEach((element) => {
    if (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.remove();
  });

  if (plugin) {
    plugin.clearToolbarCache();
  }
}

export function selfDestruct(plugin: EditingToolbarPlugin) {
  activeDocument = activeWindow.document;

  const rootSplits = getRootSplits(plugin.app);

  const clearToolbar = (root: ParentNode) => {
    const toolbars = root.querySelectorAll(".editingToolbarModalBar");
    const popovers = root.querySelectorAll(".editingToolbarPopoverBar");

    toolbars.forEach((element) => {
      if (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.remove();
    });

    popovers.forEach((element) => {
      if (element.firstChild) {
        element.removeChild(element.firstChild);
      }
      element.remove();
    });
  };

  clearToolbar(activeDocument);

  if (rootSplits) {
    rootSplits.forEach((rootSplit: WorkspaceParentExt) => {
      if (rootSplit?.containerEl) {
        clearToolbar(rootSplit.containerEl);
      }
    });
  }

  if (plugin) {
    plugin.clearToolbarCache();
  }
}

export function isExistoolbar(
  app: App,
  plugin: EditingToolbarPlugin,
  style?: ToolbarStyleKey,
  hostDocument?: Document
): HTMLElement | null {
  const targetDocument =
    hostDocument ||
    app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
    activeWindow.document;

  activeDocument = targetDocument;

  const targetStyle: ToolbarStyleKey =
    (style ||
      (plugin.positionStyle as ToolbarStyleKey) ||
      (plugin.settings.positionStyle as ToolbarStyleKey) ||
      "top") as ToolbarStyleKey;

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
        selector
      ) as HTMLElement) || null;
  } else {
    container = targetDocument.querySelector(selector) as HTMLElement;
  }

  if (container && targetStyle !== "top") {
    plugin.setCachedToolbar(targetStyle, container);
  }

  return container ? (container as HTMLElement) : null;
}

const getNestedObject = (nestedObj: any, pathArr: any[]) => {
  return pathArr.reduce((obj, key) =>
    (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
}

function setHilite(keys: any, how: string) {
  // need to check if existing key combo is overridden by undefining it
  if (keys && keys[1][0] !== undefined) {
    return how + keys.flat(2).join('+').replace('Mod', 'Ctrl') + how;
  } else {
    return how + '–' + how;
  }
}

function getHotkey(app: App, cmdid: string, highlight = false) {
  // @ts-expect-error untyped API access
  const arr = app.commands.findCommand(cmdid)
  const hi = highlight ? '*' : '';
  if (arr) {
    const defkeys = arr.hotkeys ? [[getNestedObject(arr.hotkeys, [0, 'modifiers'])],
    [getNestedObject(arr.hotkeys, [0, 'key'])]] : undefined;
    // @ts-expect-error untyped API access
    const ck = app.hotkeyManager.customKeys[arr.id];
    const hotkeys = ck ? [[getNestedObject(ck, [0, 'modifiers'])], [getNestedObject(ck, [0, 'key'])]] : undefined;
    return hotkeys ? setHilite(hotkeys, hi) : setHilite(defkeys, '');
  } else
    return "–"
}



const getCoords = (editor: any) => {
  const cursorFrom = editor.getCursor("head");
  if (editor.getCursor("head").ch !== editor.getCursor("from").ch) cursorFrom.ch = Math.max(0, cursorFrom.ch - 1);

  let coords;
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

function applyMenuItemIcon(menuItem: any, icon: string) {
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

function syncToolbarVisibilityAfterAction(
  editingToolbar: HTMLElement,
  settings: editingToolbarSettings,
  effectiveStyle: ToolbarStyleKey | string,
  plugin: EditingToolbarPlugin
) {
  const editor = plugin.commandsManager.getActiveEditor();
  const hasSelection = editor && editor.somethingSelected();

  if (settings.cMenuVisibility == false) {
    editingToolbar.style.visibility = "hidden";
  } else if (effectiveStyle === "following") {
    if (!hasSelection) {
      editingToolbar.style.visibility = "hidden";
    }
  } else {
    editingToolbar.style.visibility = "visible";
  }
}

function shouldMoveButtonToMoreMenu(
  currentWidth: number,
  nextWidth: number,
  leafwidth: number,
  buttonWidth: number,
  toolbarStyle?: ToolbarStyleKey | string,
): boolean {
  if (leafwidth <= 100) {
    return false;
  }

  const estimatedButtonCount = Math.max(1, Math.round(currentWidth / Math.max(buttonWidth, 1)));
  const estimatedGapWidth = estimatedButtonCount * 6;
  const reservedMoreButtonWidth = buttonWidth + 12;
  const reservedFollowingBufferWidth = toolbarStyle === "following" ? buttonWidth + 10 : 0;
  const shouldReserveExtraTouchSpace = Platform.isMobileApp || toolbarStyle === "mobile";
  const reservedTouchBufferWidth = shouldReserveExtraTouchSpace ? 14 : 0;
  const availableWidth = Math.max(leafwidth - 16, buttonWidth * 2);

  return currentWidth + nextWidth + estimatedGapWidth + reservedMoreButtonWidth + reservedFollowingBufferWidth + reservedTouchBufferWidth >= availableWidth;
}

export function createDiv(selector: string) {
  const div = createEl("div");
  div.addClass(selector);
  return div;
}


function createTablecell(app: App, plugin: EditingToolbarPlugin, el: string, root?: ParentNode) {
  activeDocument = activeWindow.document;

  const container = root || (isExistoolbar(app, plugin) as HTMLElement | null);
  const tab = container?.querySelector('#' + el);
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
          let backcolor = (event.currentTarget as HTMLElement).style.backgroundColor;
          if (backcolor != "") {
            backcolor = setcolorHex(backcolor);
            if (el == "x-color-picker-table") {
              plugin.settings.cMenuFontColor = backcolor;
              setFontcolor(backcolor, editor);
              const font_colour_dom = activeDocument.querySelectorAll("#change-font-color-icon")
              font_colour_dom.forEach(element => {
                const ele = element as HTMLElement
                ele.style.fill = backcolor;
              });

            } else if (el == "x-backgroundcolor-picker-table") {
              plugin.settings.cMenuBackgroundColor = backcolor;
              setBackgroundcolor(backcolor, editor);
              const background_colour_dom = activeDocument.querySelectorAll("#change-background-color-icon")
              background_colour_dom.forEach(element => {
                const ele = element as HTMLElement
                ele.style.fill = backcolor;
              });


              //  background_colour_dom.style.fill = plugin.settings.cMenuBackgroundColor;
            }
            plugin.saveSettings();
          }
        };

      }
    }
  }
}


const setcolorHex = function (color: string) {
  const that = color;

  const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  if (/^(rgb|RGB)/.test(that)) {
    const aColor = that.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(",");
    let strHex = "#";
    for (let i = 0; i < aColor.length; i++) {
      let hex = Number(aColor[i]).toString(16);
      if (hex === "0") {
        hex += hex;
      }
      if (hex.length == 1) {
        hex = '0' + hex;
      }
      strHex += hex;
    }
    if (strHex.length !== 7) {
      strHex = that;
    }
    return strHex;
  } else if (reg.test(that)) {
    const aNum = that.replace(/#/, "").split("");
    if (aNum.length === 6) {
      return that;
    } else if (aNum.length === 3) {
      let numHex = "#";
      for (let i = 0; i < aNum.length; i += 1) {
        numHex += aNum[i] + aNum[i];
      }
      return numHex;
    }
  } else {
    return that;
  }
  return that;
};

function createMoremenu(app: App, plugin: EditingToolbarPlugin, selector: HTMLDivElement) {
  const view = app.workspace.getActiveViewOfType(ItemView);
  if (!view || !ViewUtils.isAllowedViewType(view)) return;

  if (!plugin.isMoreButton) return;

  const toolbarStyle = selector.getAttribute("data-toolbar-style");
  const Morecontainer = (toolbarStyle
    ? selector.ownerDocument?.querySelector(`.editingToolbarPopoverBar[data-toolbar-style="${toolbarStyle}"]`)
    : view.containerEl.querySelector("#editingToolbarPopoverBar")) as HTMLElement | null;

  if (!Morecontainer) {
    plugin.setIsMoreButton(false);
    return;
  }

  const resetMorePopoverPosition = (popoverEl: HTMLElement) => {
    popoverEl.style.removeProperty("left");
    popoverEl.style.removeProperty("top");
    popoverEl.style.removeProperty("right");
    popoverEl.style.removeProperty("bottom");
    popoverEl.style.removeProperty("transform");
    popoverEl.style.removeProperty("margin");
    popoverEl.style.removeProperty("position");
  };

  const positionMorePopover = (anchorEl: HTMLElement, popoverEl: HTMLElement, currentToolbarStyle?: string | null) => {
    if (currentToolbarStyle !== "following") {
      resetMorePopoverPosition(popoverEl);
      return;
    }

    const ownerWindow = popoverEl.ownerDocument.defaultView ?? window;
    const anchorRect = anchorEl.getBoundingClientRect();
    const popoverWidth = Math.max(popoverEl.offsetWidth, popoverEl.scrollWidth);
    const popoverHeight = Math.max(popoverEl.offsetHeight, popoverEl.scrollHeight);
    const horizontalPadding = 12;
    const verticalGap = 8;
    const maxLeft = Math.max(horizontalPadding, ownerWindow.innerWidth - popoverWidth - horizontalPadding);

    let left = anchorRect.right - popoverWidth;
    if (popoverWidth <= 0) {
      left = anchorRect.left;
    }
    left = Math.min(Math.max(left, horizontalPadding), maxLeft);

    let top = anchorRect.bottom + verticalGap;
    if (popoverHeight > 0 && top + popoverHeight > ownerWindow.innerHeight - horizontalPadding) {
      top = Math.max(horizontalPadding, anchorRect.top - popoverHeight - verticalGap);
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
  const morebutton = new ButtonComponent(cMoreMenu);
  morebutton
    .setClass("editingToolbarCommandItem")
    .setTooltip(strings.more)
    .onClick(() => {
      if (Morecontainer.style.visibility == "hidden") {
        Morecontainer.style.visibility = "visible";
        Morecontainer.style.height = "32px";
        positionMorePopover(morebutton.buttonEl, Morecontainer, toolbarStyle);
      } else {
        Morecontainer.style.visibility = "hidden";
        Morecontainer.style.height = "0";
      }
    });
  morebutton.buttonEl.innerHTML = `<svg  width="14" height="14"  version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" enable-background="new 0 0 1024 1024" xml:space="preserve"><path fill="#666" d="M510.29 14.13 q17.09 -15.07 40.2 -14.07 q23.12 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.1 q-23.62 2.01 -41.71 -13.07 q-18.08 -15.08 -20.09 -38.19 q-2.01 -23.12 13.06 -41.21 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.67 -386.92 q-15.07 -17.09 -13.56 -40.7 q1.51 -23.62 19.59 -38.7 ZM81.17 14.13 q17.08 -15.07 40.19 -14.07 q23.11 1 39.2 18.08 l334.66 385.92 q25.12 30.15 34.16 66.83 q9.04 36.68 0.5 73.87 q-8.54 37.19 -32.66 67.34 l-335.67 390.94 q-15.07 18.09 -38.69 20.6 q-23.61 2.51 -41.7 -12.57 q-18.09 -15.08 -20.1 -38.69 q-2.01 -23.62 13.06 -41.71 l334.66 -390.94 q11.06 -13.06 11.56 -29.65 q0.5 -16.58 -10.55 -29.64 l-334.66 -386.92 q-15.08 -17.09 -13.57 -40.7 q1.51 -23.62 19.6 -38.7 Z"/></svg>`;
  plugin.setIsMoreButton(false);
  return cMoreMenu;
}

export function quiteFormatbrushes(plugin: EditingToolbarPlugin) {
  plugin.quiteAllFormatBrushes();
}


export function setFormateraser(plugin: EditingToolbarPlugin, editor: Editor) {
  let selectText = editor.getSelection();
  if (!selectText || selectText.trim() === "") {
    return;
  }
  if (selectText.match(/^>\s*\[![\w\s]*\]/m)) {
    const lines = selectText.split('\n');
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
          const newLine = line.replace(new RegExp(`^>{${calloutLevel}}\\s*`), '');

          result.push(newLine);
        } else {
          inCallout = false;
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }

    editor.replaceSelection(result.join('\n'));
    return;
  }

  const mdText = /(^#+\s|^#(?=\s)|^>|^- \[( |x)\]|^\+ |<[^<>]+?>|^1\. |^\s*- |^-+$|^\*+$)/mg;
  selectText = selectText.replace(mdText, "");
  selectText = selectText.replace(/^[ ]+|[ ]+$/mg, "");
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

export function createFollowingbar(
  app: App,
  iconSize: number,
  plugin: EditingToolbarPlugin,
  editor: Editor,
  forceShow: boolean = false,
  hostDocument?: Document
) {
  const targetDocument =
    hostDocument ||
    (editor as any)?.cm?.dom?.ownerDocument ||
    (editor as any)?.cm?.contentDOM?.ownerDocument ||
    app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
    activeWindow.document;

  let editingToolbarModalBar = isExistoolbar(app, plugin, "following", targetDocument);

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
    editingToolbarModalBar = isExistoolbar(app, plugin, "following", targetDocument);
  }

  const viewType = view?.getViewType();
  const isMarkdownView = viewType === "markdown";

  const height =
    getAppearanceValue(plugin.settings, "aestheticStyle", plugin.resolveActiveStyle()) === "tiny"
      ? 30
      : iconSize + 14;

  if (isMarkdownView) {
    if (ViewUtils.isSourceMode(view)) {
      if (editingToolbarModalBar) {
        const shouldShow = forceShow || editor.somethingSelected();
        editingToolbarModalBar.style.visibility = shouldShow ? "visible" : "hidden";

        if (editingToolbarModalBar.style.visibility === "visible") {
          editingToolbarModalBar.style.height = height + "px";
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
      editingToolbarModalBar.style.height = height + "px";
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
  const windowWidth = toolbar.ownerDocument.defaultView?.innerWidth ?? window.innerWidth;

  const from = editor.getCursor("from");
  //@ts-expect-error untyped API access
  const coords = editor.coordsAtPos(from);

  const sideDockWidth = activeDocument.getElementsByClassName("mod-left-split")[0]?.clientWidth ?? 0;
  const sideDockRibbonWidth = activeDocument.getElementsByClassName("side-dock-ribbon mod-left")[0]?.clientWidth ?? 0;
  const leftSideDockWidth = sideDockWidth + sideDockRibbonWidth;

  let leftPosition = coords.left - leftSideDockWidth - 28;

  const rightEdge = leftPosition + toolbarWidth;
  if (rightEdge > windowWidth - leftSideDockWidth) {

    leftPosition = windowWidth - leftSideDockWidth - toolbarWidth - rightMargin;

  }

  leftPosition = Math.max(0, leftPosition);

  let topPosition = calculateTopPosition(editor, coords, editorRect, toolbarHeight);

  topPosition = Math.max(0, topPosition);


  toolbar.style.left = `${leftPosition}px`;
  toolbar.style.top = `${topPosition}px`;
}

function calculateTopPosition(
  editor: Editor,
  coords: { top: number; left: number; bottom: number; },
  editorRect: { top: number; left: number; bottom: number; },
  toolbarHeight: number
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
    const isSelectionFromBottomToTop = editor.getCursor("head").ch == editor.getCursor("from").ch;

    if (isSelectionFromBottomToTop) {
      topPosition = coords.top - toolbarHeight - 10;
      if (topPosition <= editorRect.top) topPosition = editorRect.top + 2 * toolbarHeight;
    } else {
      const cursorCoords = getCoords(editor);
      topPosition = cursorCoords.bottom + 10;
      if (topPosition >= editorRect.bottom - toolbarHeight) topPosition = editorRect.bottom - 2 * toolbarHeight;
    }
  }
  return topPosition;
}


export function editingToolbarPopover(
  app: App,
  plugin: EditingToolbarPlugin,
  style?: ToolbarStyleKey,
  hostDocument?: Document
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
    if (settings.enableFixedToolbar) stylesToRender.push("fixed");

    stylesToRender.forEach((styleKey) => {
      // Each call below runs the rest of this function with an explicit style.
      editingToolbarPopover(app, plugin, styleKey, targetDocument);
    });

    return;
  }

  // From here on, we are rendering a single toolbar instance for a specific style
  const effectiveStyle: ToolbarStyleKey = style as ToolbarStyleKey;

  // If toolbar visibility is disabled globally, hide any existing toolbars and return early
  // This prevents toolbars from being created when they should be hidden
  if (!settings.cMenuVisibility) {
    const existingToolbar = isExistoolbar(app, plugin, effectiveStyle, targetDocument);
    if (existingToolbar) {
      existingToolbar.style.display = "none";
    }
    return; // Don't create new toolbars when visibility is disabled
  }

  // Per-style appearance for this toolbar instance
  const appearanceStore = (settings.appearanceByStyle || {}) as AppearanceByStyle;
  const appearanceForStyle =
    (appearanceStore[effectiveStyle] || {}) as StyleAppearanceSettings;

  const resolvedIconSize =
    appearanceForStyle.toolbarIconSize ?? plugin.toolbarIconSize ?? 18;

  const resolvedAestheticStyle: string =
    (appearanceForStyle.aestheticStyle as string) ??
    settings.aestheticStyle ??
    "default";

  // Only use explicit colours when the style is "custom".
  // For "default", "tiny" and "glass", let the CSS classes define colours.
  const resolvedBgColor =
    resolvedAestheticStyle === "custom"
      ? appearanceForStyle.toolbarBackgroundColor ?? settings.toolbarBackgroundColor
      : undefined;

  const resolvedIconColor =
    resolvedAestheticStyle === "custom"
      ? appearanceForStyle.toolbarIconColor ?? settings.toolbarIconColor
      : undefined;

  const aestheticStyleMap: { [key: string]: string } = {
    default: "editingToolbarDefaultAesthetic",
    tiny: "editingToolbarTinyAesthetic",
    glass: "editingToolbarGlassAesthetic",
    custom: "editingToolbarCustomAesthetic",
  };

  function createMenu() {
    function applyAestheticStyle(element: HTMLElement, style: string) {
      Object.values(aestheticStyleMap).forEach(className => {
        element.removeClass(className);
      });

      const selectedClass = aestheticStyleMap[style] || aestheticStyleMap.default;
      element.addClass(selectedClass);
    }

    const generateMenu = () => {
      let btnwidth = 0;
      let leafwidth = 0;
      const buttonWidth = resolvedIconSize + 8;
    
      const editingToolbar = createEl("div");
      if (editingToolbar) {
        editingToolbar.addClass("editingToolbarModalBar");
        editingToolbar.setAttribute("data-toolbar-style", effectiveStyle);
    
        // Note: cMenuVisibility is already checked at function start, so we don't need to check here
        // Toolbars should only be created when cMenuVisibility is true
        
        if (effectiveStyle === "top") {
          editingToolbar.className += " top";
          if (settings.autohide) {
            editingToolbar.className += " autohide";
          }
          if (settings.Iscentered) {
            editingToolbar.className += " centered";
          }
          // If cMenuVisibility is false, visibility is already set to hidden above
        } else if (effectiveStyle === "following") {
          editingToolbar.style.visibility = "hidden";
        } else if (effectiveStyle === "fixed") {
          const Rowsize = resolvedIconSize || 18;
          const baseStyle = `left: calc(50% - calc(${settings.cMenuNumRows * (Rowsize + 10)}px / 2));
           bottom: 4.25em; 
           grid-template-columns: repeat(${settings.cMenuNumRows}, ${Rowsize + 10}px);
           gap: ${(Rowsize - 18) / 4}px`;
          // Set the base style (cMenuVisibility is already checked at function start)
          editingToolbar.setAttribute("style", baseStyle);
        }
      }
      editingToolbar.setAttribute("id", "editingToolbarModalBar");
    
      const PopoverMenu = createEl("div");
      PopoverMenu.addClass("editingToolbarpopover");
      PopoverMenu.addClass("editingToolbarTinyAesthetic");
    
      PopoverMenu.addClass("editingToolbarPopoverBar");
      PopoverMenu.setAttribute("data-toolbar-style", effectiveStyle);
    
      PopoverMenu.setAttribute("id", "editingToolbarPopoverBar");
    
      PopoverMenu.style.visibility = "hidden";
      PopoverMenu.style.height = "0";
    
      // Apply per-style aesthetic
      applyAestheticStyle(editingToolbar, resolvedAestheticStyle);
      applyAestheticStyle(PopoverMenu, resolvedAestheticStyle);

      // Apply per-style colors and icon size via CSS variables on each toolbar
      if (resolvedBgColor) {
        editingToolbar.style.setProperty(
          "--editing-toolbar-background-color",
          resolvedBgColor
        );
        PopoverMenu.style.setProperty(
          "--editing-toolbar-background-color",
          resolvedBgColor
        );
      }
      if (resolvedIconColor) {
        editingToolbar.style.setProperty(
          "--editing-toolbar-icon-color",
          resolvedIconColor
        );
        PopoverMenu.style.setProperty(
          "--editing-toolbar-icon-color",
          resolvedIconColor
        );
      }
      if (resolvedIconSize) {
        editingToolbar.style.setProperty(
          "--toolbar-icon-size",
          `${resolvedIconSize}px`
        );
        PopoverMenu.style.setProperty(
          "--toolbar-icon-size",
          `${resolvedIconSize}px`
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
          const viewContent = currentleaf?.querySelector<HTMLElement>(".view-content");
          if (viewContent) {
            const childDivs = viewContent.querySelectorAll<HTMLElement>(":scope > div");
            targetDom = childDivs.length > 0 ? childDivs[0] : viewContent;
          }
        }

        if (!targetDom) {
          console.log("Editing Toolbar: Failed to find target DOM element for toolbar insertion");
          return;
        }

        const canvasToolbarAnchor =
          viewType === "canvas"
            ? currentleaf?.querySelector<HTMLElement>(".view-content")
            : null;

        if (viewType === "canvas" && canvasToolbarAnchor) {
          canvasToolbarAnchor.insertAdjacentElement("beforebegin", editingToolbar);

          if (!currentleaf?.querySelector("#editingToolbarPopoverBar")) {
            canvasToolbarAnchor.insertAdjacentElement("beforebegin", PopoverMenu);
          }
        } else {
          if (!currentleaf?.querySelector("#editingToolbarPopoverBar")) {
           if (viewType == "excalidraw") {
            targetDom.insertAdjacentElement("afterend", PopoverMenu);
           } else {
            targetDom.insertAdjacentElement("afterbegin", PopoverMenu);
           }
          }

         if (viewType == "excalidraw") {
          targetDom.insertAdjacentElement("afterend", editingToolbar);
         } else {
          targetDom.insertAdjacentElement("afterbegin", editingToolbar);
         }
        }

        const targetWidth = targetDom?.clientWidth || targetDom?.offsetWidth || 0;
        const leafWidth = currentleaf?.clientWidth || currentleaf?.getBoundingClientRect().width || 0;
        const viewportWidth = targetDocument.defaultView?.innerWidth || 0;
        const widthCandidates = [targetWidth, leafWidth, viewportWidth].filter((width) => width > 0);
        leafwidth = widthCandidates.length > 0 ? Math.min(...widthCandidates) : 0;

      } else if (settings.appendMethod == "body") {
        const existingPopover = targetDocument.querySelector(
          `.editingToolbarPopoverBar[data-toolbar-style="${effectiveStyle}"]`
        ) as HTMLElement | null;
        if (!existingPopover) {
          targetDocument.body.appendChild(PopoverMenu);
        }
        targetDocument.body.appendChild(editingToolbar);
        leafwidth = targetDocument.defaultView?.innerWidth || targetDocument.body?.clientWidth || 0;
      } else if (settings.appendMethod == "workspace") {
        const workspaceRoot = targetDocument.body
          ?.querySelector(".mod-vertical.mod-root") as HTMLElement | null;

        if (!workspaceRoot) {
          return;
        }

        const existingPopover = workspaceRoot.querySelector(
          `.editingToolbarPopoverBar[data-toolbar-style="${effectiveStyle}"]`
        ) as HTMLElement | null;
        if (!existingPopover) {
          workspaceRoot.insertAdjacentElement("afterbegin", PopoverMenu);
        }

        workspaceRoot.insertAdjacentElement("afterbegin", editingToolbar);
        const workspaceWidth = targetDocument.body?.clientWidth || 0;
        const viewportWidth = targetDocument.defaultView?.innerWidth || 0;
        const widthCandidates = [workspaceWidth, viewportWidth].filter((width) => width > 0);
        leafwidth = widthCandidates.length > 0 ? Math.min(...widthCandidates) : 0;
      }

      const editingToolbarPopoverBar = effectiveStyle === "top"
        ? app.workspace.activeLeaf?.view?.containerEl?.querySelector("#editingToolbarPopoverBar") as HTMLElement
        : targetDocument.querySelector(
            `.editingToolbarPopoverBar[data-toolbar-style="${effectiveStyle}"]`
          ) as HTMLElement | null;

      const resolveButtonHost = (shouldUseMoreMenu: boolean): HTMLElement => {
        if (!shouldUseMoreMenu) {
          return editingToolbar;
        }

        if (editingToolbarPopoverBar) {
          return editingToolbarPopoverBar;
        }

        console.warn(`Editing Toolbar: missing popover host for style "${effectiveStyle}", falling back to toolbar host.`);
        return editingToolbar;
      };

      // Use per-style commands based on the toolbar we are rendering
      const currentCommands = plugin.getCurrentCommands(effectiveStyle);
      const getLocalizedLabel = (label: string): string => t(label as any);
      const getLocalizedTooltip = (label: string, hotkey: string): string => {
        const localizedLabel = getLocalizedLabel(label);
        return hotkey === "–" ? localizedLabel : `${localizedLabel}(${hotkey})`;
      };

      currentCommands.forEach((item, index) => {
        let tip;
        if ("SubmenuCommands" in item) {
          let _btn: any;

          if (shouldMoveButtonToMoreMenu(btnwidth, buttonWidth, leafwidth, buttonWidth, effectiveStyle)) {
            plugin.setIsMoreButton(true);
            _btn = new ButtonComponent(resolveButtonHost(true));
          } else _btn = new ButtonComponent(editingToolbar);

          _btn.setClass("editingToolbarCommandsubItem" + index);
          if (index >= settings.cMenuNumRows) {
            _btn.setClass("editingToolbarSecond");
          }
          else {
            if (effectiveStyle !== "top")
              _btn.buttonEl.setAttribute('aria-label-position', 'top')
          }

          checkHtml(item.icon)
            ? (_btn.buttonEl.innerHTML = item.icon)
            : _btn.setIcon(item.icon);

          btnwidth += buttonWidth + 2;

          const menuType = item.menuType || 'submenu';

          if (menuType === 'dropdown') {
            _btn.setClass("editingToolbarDropdownButton");
            const hotkey = getHotkey(app, item.id);
            tip = getLocalizedTooltip(item.name, hotkey);
            _btn.setTooltip(tip);

            _btn.onClick((evt: MouseEvent) => {
              const menu = new Menu();

              item.SubmenuCommands.forEach((subitem: { name: string; id: any; icon: string }) => {
                if (subitem.id === "editingToolbar-Divider-Line") {
                  menu.addSeparator();
                  menu.addItem((menuItem) => {
                    menuItem
                      .setTitle(t(subitem.name as any))
                      .setDisabled(true);

                    applyMenuItemIcon(menuItem, "");
                  });
                } else {
                  menu.addItem((menuItem) => {
                    const hotkey = getHotkey(app, subitem.id, false);
                    const title = t(subitem.name as any);

                    const displayTitle = hotkey !== "–" ? `${title}` : title;

                    menuItem
                      .setTitle(displayTitle)
                      .onClick(() => {
                        app.commands.executeCommandById(subitem.id);
                        syncToolbarVisibilityAfterAction(editingToolbar, settings, effectiveStyle, plugin);
                      });

                    applyMenuItemIcon(menuItem, subitem.icon);

                    if (hotkey !== "—") {
                      const hotkeyEl = menuItem.dom.createSpan({ cls: "menu-item-hotkey" });
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
              item.SubmenuCommands.forEach(
                (subitem: { name: string; id: any; icon: string }) => {
                  const hotkey = getHotkey(app, subitem.id);
                  tip = getLocalizedTooltip(subitem.name, hotkey);
                  const sub_btn = new ButtonComponent(submenu)
                    .setTooltip(tip)
                    .setClass("menu-item")
                    .onClick(() => {

                      app.commands.executeCommandById(subitem.id);
                      syncToolbarVisibilityAfterAction(editingToolbar, settings, effectiveStyle, plugin);

                    });
                  if (index < settings.cMenuNumRows) {
                    if (effectiveStyle !== "top")
                      sub_btn.buttonEl.setAttribute('aria-label-position', 'top')
                  }
                  if (subitem.id == "editingToolbar-Divider-Line") {
                    sub_btn.setClass("editingToolbar-Divider-Line");
                    
                    sub_btn.buttonEl.setAttribute('aria-label', getLocalizedLabel(subitem.name));
                  }
                  checkHtml(subitem.icon)
                    ? (sub_btn.buttonEl.innerHTML = subitem.icon)
                    : sub_btn.setIcon(subitem.icon);

                  _btn.buttonEl.insertAdjacentElement("afterbegin", submenu);
                }
              );
            }
          }
        } else {
          if (item.id == "editing-toolbar:change-font-color") {
            const button2 = new ButtonComponent(editingToolbar);
            button2
              .setClass("editingToolbarCommandsubItem-font-color")
              .setTooltip(strings.fontColors)
              .onClick((event: MouseEvent) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest(".x-color-picker-wrapper") || target?.closest(".subitem")) {
                  return;
                }

                app.commands.executeCommandById(item.id);
                syncToolbarVisibilityAfterAction(editingToolbar, settings, effectiveStyle, plugin);

              });
            checkHtml(item.icon)
              ? (button2.buttonEl.innerHTML = item.icon)
              : button2.setIcon(item.icon);

            btnwidth += buttonWidth;
            const submenu2 = createEl("div");
            submenu2.addClass("subitem");

            if (submenu2) {
              submenu2.innerHTML = colorpicker(plugin);

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              createTablecell(app, plugin, "x-color-picker-table", submenu2);
              const el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              const button3 = new ButtonComponent(el);
              button3
                .setIcon("paintbrush")
                .setTooltip(strings.formatBrush)
                .onClick(() => {
                  quiteFormatbrushes(plugin);
                  plugin.setFontColorFormatBrushActive(true);
                  plugin.tempNotice = new Notice(
                    strings.fontColorFormattingBrush,
                    0
                  );

                });
              const button4 = new ButtonComponent(el);
              button4
                .setIcon("palette")
                .setTooltip(strings.customFontColor)
                .onClick(() => {
                  app.setting.open();
                  app.setting.openTabById("editing-toolbar");
                  setTimeout(() => {
                    const tabsContainer = app.setting.activeTab?.containerEl.querySelector(".editing-toolbar-tabs");
                    if (tabsContainer) {
                      const appearanceTab = tabsContainer.children[0] as HTMLElement;
                      appearanceTab?.click();

                      setTimeout(() => {
                        const settingEI = app.setting.activeTab?.containerEl.querySelector(".custom_font");
                        if (settingEI) { settingEI.addClass?.("toolbar-cta"); }
                      }, 100);
                    }
                  }, 200);

                });
            }
          } else if (item.id == "editing-toolbar:change-background-color") {
            const button2 = new ButtonComponent(editingToolbar);
            button2
              .setClass("editingToolbarCommandsubItem-font-color")
              .setTooltip(strings.backgroundColor)
              .onClick((event: MouseEvent) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest(".x-color-picker-wrapper") || target?.closest(".subitem")) {
                  return;
                }

                app.commands.executeCommandById(item.id);
                syncToolbarVisibilityAfterAction(editingToolbar, settings, effectiveStyle, plugin);

              });
            checkHtml(item.icon)
              ? (button2.buttonEl.innerHTML = item.icon)
              : button2.setIcon(item.icon);

            btnwidth += buttonWidth;
            const submenu2 = createEl("div");
            submenu2.addClass("subitem");
            if (submenu2) {
              submenu2.innerHTML = backcolorpicker(plugin);

              button2.buttonEl.insertAdjacentElement("afterbegin", submenu2);
              createTablecell(app, plugin, "x-backgroundcolor-picker-table", submenu2);
              const el = submenu2.querySelector(
                ".x-color-picker-wrapper"
              ) as HTMLElement;

              const button3 = new ButtonComponent(el);
              button3
                .setIcon("paintbrush")
                .setTooltip(strings.formatBrush)
                .onClick(() => {
                  quiteFormatbrushes(plugin);
                  plugin.setBgFormatBrushActive(true);
                  plugin.tempNotice = new Notice(
                    strings.fontColorFormattingBrush,
                    0
                  );

                });
              const button4 = new ButtonComponent(el);
              button4
                .setIcon("palette")
                .setTooltip(strings.customBackgroudColor)
                .onClick(() => {
                  app.setting.open();
                  app.setting.openTabById("editing-toolbar");
                  setTimeout(() => {
                    const tabsContainer = app.setting.activeTab?.containerEl.querySelector(".editing-toolbar-tabs");
                    if (tabsContainer) {
                      const appearanceTab = tabsContainer.children[0] as HTMLElement;
                      appearanceTab?.click();

                      setTimeout(() => {
                        const settingEI = app.setting.activeTab?.containerEl.querySelector(".custom_bg");
                        if (settingEI) { settingEI.addClass?.("toolbar-cta"); }
                      }, 100);
                    }
                  }, 200);

                });

            }
          } else {
            let button;
            if (shouldMoveButtonToMoreMenu(btnwidth, buttonWidth, leafwidth, buttonWidth, effectiveStyle)) {
              plugin.setIsMoreButton(true);
              button = new ButtonComponent(resolveButtonHost(true));
            } else button = new ButtonComponent(editingToolbar);
            const hotkey = getHotkey(app, item.id);
 
            tip = getLocalizedTooltip(item.name, hotkey);
            button.setTooltip(tip).onClick(() => {
              app.commands.executeCommandById(item.id);
              syncToolbarVisibilityAfterAction(editingToolbar, settings, effectiveStyle, plugin);

            });

            button.setClass("editingToolbarCommandItem");
            if (index >= settings.cMenuNumRows) {

              button.setClass("editingToolbarSecond");
            } else {
              if (effectiveStyle !== "top") {
                button.buttonEl.setAttribute("aria-label-position", "top");
              }
            }
            if (item.id == "editingToolbar-Divider-Line")
              button.setClass("editingToolbar-Divider-Line");

            checkHtml(item.icon)
              ? (button.buttonEl.innerHTML = item.icon)
              : button.setIcon(item.icon);

            btnwidth += buttonWidth;
          }
        }
      });

      createMoremenu(app, plugin, editingToolbar);
      if (Math.abs(plugin.settings.cMenuWidth - Number(btnwidth)) > (btnwidth + 4)) {
        plugin.settings.cMenuWidth = Number(btnwidth);
        setTimeout(() => {
          plugin.saveSettings();
        }, 100);
      }
    };
    if (!plugin.isLoadMobile()) return;
    const view = app.workspace.getActiveViewOfType(ItemView);
    if (ViewUtils.isAllowedViewType(view)) {
      const existingToolbar = isExistoolbar(app, plugin, effectiveStyle, targetDocument);
      if (existingToolbar && effectiveStyle !== "top") {
        // Check cMenuVisibility first - if disabled, hide all toolbars with display: none
        if (!settings.cMenuVisibility) {
          existingToolbar.style.display = "none";
        } else if (effectiveStyle === "following") {
          existingToolbar.style.visibility = "hidden";
          existingToolbar.style.display = ""; // Reset display to allow visibility to work
        } else {
          existingToolbar.style.visibility = "visible";
          existingToolbar.style.display = ""; // Reset display to allow visibility to work
        }

        if (resolvedBgColor) {
          existingToolbar.style.setProperty(
            "--editing-toolbar-background-color",
            resolvedBgColor
          );
        }
        if (resolvedIconColor) {
          existingToolbar.style.setProperty(
            "--editing-toolbar-icon-color",
            resolvedIconColor
          );
        }
        if (resolvedIconSize) {
          existingToolbar.style.setProperty(
            "--toolbar-icon-size",
            `${resolvedIconSize}px`
          );
        }

        return;
      }

  
      generateMenu();
     

  

      // Note: cMenuVisibility is already checked at function start, so toolbars are only created when visible
      if (effectiveStyle !== "top") {
        const newToolbar = isExistoolbar(app, plugin, effectiveStyle, targetDocument);
        if (newToolbar) {
          plugin.setCachedToolbar(effectiveStyle, newToolbar);
        }
      }

      setHorizontalValue(plugin.settings);
      setBottomValue(plugin.settings);
      setsvgColor(settings.cMenuFontColor, settings.cMenuBackgroundColor);

    } else {
      return;
    }
  }
  createMenu();
}

function setsvgColor(fontcolor: string, bgcolor: string) {
  activeDocument = activeWindow.document;

  const fontColorIcons = activeDocument.querySelectorAll("#change-font-color-icon");
  const bgColorIcons = activeDocument.querySelectorAll("#change-background-color-icon");

  if (fontColorIcons.length > 0) {
    fontColorIcons.forEach(element => {
      (element as HTMLElement).style.fill = fontcolor;
    });
  }

  if (bgColorIcons.length > 0) {
    bgColorIcons.forEach(element => {
      (element as HTMLElement).style.fill = bgcolor;
    });
  }
}
