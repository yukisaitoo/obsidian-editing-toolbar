import {
  Command,
  debounce,
  Editor,
  ItemView,
  MarkdownFileInfo,
  MarkdownView,
  Menu,
  Platform,
  Plugin,
} from "obsidian";
import { CommandsManager } from "src/commands/commands";
import addIcons from "src/icons/customIcons";
import { InsertLinkModal } from "src/modals/insertLinkModal";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import {
  applyAppearanceVars,
  DEFAULT_COMMANDS_BY_STYLE,
  DEFAULT_SETTINGS,
  EditingToolbarSettings,
  POSITION_STYLES,
  resolveNextPositionStyle,
} from "src/settings/settingsData";
import {
  closeMoreOverflowPopovers,
  createFollowingBar,
  editingToolbarPopover,
  getExistingToolbar,
  selfDestruct,
} from "src/toolbar/editingToolbar";
import { strings } from "src/translations/helper";
import { ViewUtils } from "src/util/viewUtils";
import { EditingToolbarSettingTab } from "../settings/settingsTab";

let activeDocument: Document;

export interface AdmonitionDefinition {
  type: string;
  title?: string;
  icon: string;
  color: string;
  command: boolean;
  injectColor?: boolean;
  noTitle: boolean;
  copy?: boolean;
}

interface EditorContextMenuAction {
  title: string;
  commandId?: string;
  callback?: () => void;
  disabled?: boolean;
}

const ADMONITION_PLUGIN_ID = "obsidian-admonition";

export default class EditingToolbarPlugin extends Plugin {
  settings!: EditingToolbarSettings;
  public positionStyle!: string;

  public appearanceEditStyle: ToolbarStyleKey | null = null;

  commandsManager!: CommandsManager;
  public admonitionDefinitions: Record<string, AdmonitionDefinition> | null =
    null;

  topToolbarResizeObserver: ResizeObserver | null = null;

  settingTab!: EditingToolbarSettingTab;

  private toolbarCache: Map<ToolbarStyleKey, HTMLElement> = new Map();

  async onload(): Promise<void> {
    activeDocument = activeWindow.document;

    await this.loadSettings();

    this.initAppearanceStore();

    this.settingTab = new EditingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();
    this.app.workspace.onLayoutReady(() => {
      // Delay lets Settings Search finish scanning tabs before we apply visibility
      setTimeout(() => {
        if (!this.settings.cMenuVisibility) {
          this.handleEditingToolbar();
        }
      }, 100);
    });
    this.registerSelectionEvents(activeDocument);
    this.registerEvent(
      this.app.workspace.on("window-open", (leaf) => {
        this.registerSelectionEvents(leaf.doc);
        setTimeout(() => {
          if (!this.settings.cMenuVisibility) {
            return;
          }

          if (this.isToolbarStyleEnabled("following")) {
            editingToolbarPopover(this.app, this, "following", leaf.doc);
          }
        }, 50);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleEditingToolbar),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleEditingToolbar),
    );
    if (this.settings.cMenuVisibility == true) {
      setTimeout(() => {
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100);
    }
    this.app.workspace.onLayoutReady(async () => {
      await this.tryGetAdmonitionTypes();
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", this.handleEditorContextMenu),
    );
    this.registerEvent(
      this.app.workspace.on(
        "url-menu",
        (menu: Menu, _url: string, _view: MarkdownView) => {
          menu.addItem((item) =>
            item
              .setTitle("Edit link…")
              .setSection("info")
              .setIcon("link")
              .onClick(() => {
                new InsertLinkModal(this).open();
              }),
          );
        },
      ),
    );
    addIcons();
    this.positionStyle = this.settings.positionStyle;
    applyAppearanceVars(
      activeDocument.documentElement,
      this.settings,
      this.resolveActiveStyle(),
    );
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    for (const key of Object.keys(
      DEFAULT_SETTINGS,
    ) as (keyof EditingToolbarSettings)[]) {
      if (this.settings[key] === undefined || this.settings[key] === null) {
        (this.settings[key] as unknown) = DEFAULT_SETTINGS[key];
      }
    }

    // Seed only when never persisted, so a list the user cleared stays empty.
    // Deep-copy so the default constants are never aliased by persisted objects.
    for (const style of POSITION_STYLES) {
      const key = `${style}Commands` as const;
      if (!loadedData || loadedData[key] === undefined) {
        this.settings[key] = structuredClone(DEFAULT_COMMANDS_BY_STYLE[style]);
      }
    }
  }

  // Empty buckets fall back to the global fields via getAppearanceValue().
  private initAppearanceStore(): void {
    // Deep-copy: the settings tab writes to and deletes from these in place.
    if (this.settings.appearanceByStyle === DEFAULT_SETTINGS.appearanceByStyle) {
      this.settings.appearanceByStyle = structuredClone(
        DEFAULT_SETTINGS.appearanceByStyle,
      );
    }

    const store = (this.settings.appearanceByStyle ??= {});
    for (const style of POSITION_STYLES) {
      store[style] ??= {};
    }
  }

  public get liveStyle(): ToolbarStyleKey {
    const raw = this.positionStyle || this.settings.positionStyle;
    return POSITION_STYLES.includes(raw as ToolbarStyleKey)
      ? (raw as ToolbarStyleKey)
      : "top";
  }

  // While the settings tab is open this is the style being edited there, which
  // can differ from the one rendered in the workspace.
  public resolveActiveStyle(): ToolbarStyleKey {
    return this.appearanceEditStyle ?? this.liveStyle;
  }

  private getPluginCommandId(commandId: string): string {
    return `${this.manifest.id}:${commandId}`;
  }

  private executePluginCommand(commandId: string): void {
    this.app.commands.executeCommandById(this.getPluginCommandId(commandId));
  }

  private addEditorContextAction(
    menu: Menu,
    action: EditorContextMenuAction,
  ): void {
    menu.addItem((item) => {
      item.setTitle(action.title);

      if (action.disabled) {
        item.setDisabled(true);
        return;
      }

      item.onClick(() => {
        if (action.callback) {
          action.callback();
          return;
        }

        if (action.commandId) {
          this.executePluginCommand(action.commandId);
        }
      });
    });
  }

  private addEditorContextSubmenu(
    menu: Menu,
    title: string,
    icon: string,
    actions: EditorContextMenuAction[],
  ): void {
    if (!actions.length) {
      return;
    }

    menu.addItem((item) => {
      item.setTitle(title).setIcon(icon);
      item.setSection("info");

      const submenu = item.setSubmenu();
      actions.forEach((action) => this.addEditorContextAction(submenu, action));
    });
  }

  private buildTextContextActions(editor: Editor): EditorContextMenuAction[] {
    const actions: EditorContextMenuAction[] = [];
    const hasSelection = editor.somethingSelected();
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    const isOrderedListLine = /^\d+\.\s/.test(lineText);
    const isTableContext = lineText.includes("|");

    if (hasSelection) {
      actions.push(
        { title: strings.splitLines, commandId: "split-lines" },
        { title: strings.mergeLines, commandId: "merge-lines" },
        { title: strings.fullHalfConverter, commandId: "smart-symbols" },
        { title: strings.dedupeLines, commandId: "dedupe-lines" },
        { title: strings.addPrefixSuffix, commandId: "add-wrap" },
        { title: strings.numberLinesCustom, commandId: "number-lines" },
        { title: strings.trimLineEnds, commandId: "remove-whitespace-trim" },
        {
          title: strings.shrinkExtraSpaces,
          commandId: "remove-whitespace-compress",
        },
        {
          title: strings.removeAllWhitespace,
          commandId: "remove-whitespace-all",
        },
        { title: strings.extractBetweenStrings, commandId: "extract-between" },
        { title: strings.listTable, commandId: "list-to-table" },
        { title: strings.tableList, commandId: "table-to-list" },
      );
    }

    if (!hasSelection) {
      actions.push(
        { title: strings.addPrefixSuffix, commandId: "add-wrap" },
        { title: strings.insertBlankLines, commandId: "insert-blank-lines" },
        { title: strings.extractBetweenStrings, commandId: "extract-between" },
      );
    }

    if (isOrderedListLine) {
      actions.push({
        title: strings.renumberList,
        commandId: "renumber-ordered-list",
      });
    }

    if (!hasSelection && isTableContext) {
      actions.push({ title: strings.tableList, commandId: "table-to-list" });
    }

    if (!actions.length) {
      actions.push({ title: strings.selectTextSeeMoreTools, disabled: true });
    }

    return actions;
  }

  private handleEditorContextMenu = (
    menu: Menu,
    editor: Editor,
    _view: MarkdownView | MarkdownFileInfo,
  ): void => {
    this.addEditorContextSubmenu(
      menu,
      strings.textTools,
      "whole-word",
      this.buildTextContextActions(editor),
    );
  };

  async tryGetAdmonitionTypes(): Promise<void> {
    const admonitionPluginInstance =
      this.app.plugins?.getPlugin(ADMONITION_PLUGIN_ID);
    if (admonitionPluginInstance) {
      this.processAdmonitionTypes(admonitionPluginInstance);
    }
  }

  processAdmonitionTypes(pluginInstance: unknown) {
    const admonitionPlugin = pluginInstance as {
      admonitions?: Record<string, AdmonitionDefinition>;
    };

    if (
      admonitionPlugin.admonitions &&
      typeof admonitionPlugin.admonitions === "object" &&
      !Array.isArray(admonitionPlugin.admonitions) &&
      Object.keys(admonitionPlugin.admonitions).length > 0
    ) {
      this.admonitionDefinitions = admonitionPlugin.admonitions;
    } else {
      console.warn(
        "Could not read types from admonitionPlugin.admonitions (as object).",
      );
      this.admonitionDefinitions = null;
    }
  }

  isDesktop() {
    return !Platform.isMobileApp;
  }

  onunload(): void {
    this.app.workspace.off("active-leaf-change", this.handleEditingToolbar);
    this.app.workspace.off("layout-change", this.handleEditingToolbar);

    this.topToolbarResizeObserver?.disconnect();
    this.topToolbarResizeObserver = null;

    selfDestruct(this);
  }

  isView() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return ViewUtils.isAllowedViewType(view);
  }

  // Judged from the main area, not the focused pane: getMostRecentLeaf() skips
  // sidebars, so clicking one doesn't flicker the bar, while switching the main
  // pane to a PDF/graph does hide it.
  private isMainAreaEditable(): boolean {
    const view = this.app.workspace.getMostRecentLeaf()?.view ?? null;
    const type = view?.getViewType();
    return (
      type === "canvas" ||
      (type === "markdown" && ViewUtils.isSourceMode(view))
    );
  }

  handleEditingToolbar = () => {
    closeMoreOverflowPopovers();

    if (!this.settings.cMenuVisibility) {
      POSITION_STYLES.forEach((style) => {
        const el = getExistingToolbar(this.app, this, style);
        if (el) el.style.display = "none";
      });
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(ItemView);

    // Focus moved off the note — into a sidebar, or onto a non-editor view.
    if (!ViewUtils.isAllowedViewType(view)) {
      const following = getExistingToolbar(this.app, this, "following");
      if (following) following.style.visibility = "hidden";

      if (!this.isMainAreaEditable()) {
        const el = getExistingToolbar(this.app, this, "top");
        if (el) el.style.visibility = "hidden";
      }
      return;
    }

    const viewType = view?.getViewType();
    const isMarkdownView = viewType === "markdown";
    const inSourceMode = isMarkdownView && ViewUtils.isSourceMode(view);

    // Reading mode hides everything; non-markdown views (Canvas, …) handled below.
    if (isMarkdownView && !inSourceMode) {
      POSITION_STYLES.forEach((style) => {
        const el = getExistingToolbar(this.app, this, style);
        if (el) el.style.visibility = "hidden";
      });
      return;
    }

    // The enable flags are the single source of truth. Never fall back to
    // positionStyle: it still points at a toolbar the user just toggled off.
    for (const style of POSITION_STYLES) {
      const existing = getExistingToolbar(this.app, this, style);

      if (!this.isToolbarStyleEnabled(style)) {
        if (existing) existing.style.visibility = "hidden";
        continue;
      }

      if (!existing) {
        editingToolbarPopover(this.app, this, style);
      }

      const toolbar = getExistingToolbar(this.app, this, style);
      if (!toolbar) continue;

      // The following bar stays hidden until a selection reveals it.
      toolbar.style.visibility = style === "following" ? "hidden" : "visible";
    }
  };

  getCurrentCommands(style: ToolbarStyleKey): Command[] {
    return this.settings[`${style}Commands`];
  }

  updateCurrentCommands(commands: Command[], style: ToolbarStyleKey): void {
    this.settings[`${style}Commands`] = commands;
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Seeds the per-style command lists the way loadSettings() does, since
  // DEFAULT_SETTINGS keeps them empty.
  async resetSettings(): Promise<void> {
    this.settings = structuredClone(DEFAULT_SETTINGS);
    for (const style of POSITION_STYLES) {
      this.settings[`${style}Commands`] = structuredClone(
        DEFAULT_COMMANDS_BY_STYLE[style],
      );
    }

    this.initAppearanceStore();
    this.appearanceEditStyle = null;

    await this.saveSettings();

    // onPositionStyleChange re-applies the appearance vars and fires the rebuild.
    selfDestruct(this);
    this.onPositionStyleChange(this.settings.positionStyle);
  }

  async setToolbarStyleEnabled(
    style: ToolbarStyleKey,
    enabled: boolean,
  ): Promise<void> {
    const previousStyle = this.positionStyle;
    this.settings[
      style === "top" ? "enableTopToolbar" : "enableFollowingToolbar"
    ] = enabled;

    const nextStyle = resolveNextPositionStyle(
      this.settings,
      style,
      enabled,
      previousStyle,
    );
    if (nextStyle && nextStyle !== previousStyle) {
      this.onPositionStyleChange(nextStyle);
    }

    await this.saveSettings();
    this.handleEditingToolbar();
  }

  registerSelectionEvents(container: Document) {
    const debouncedHandleTextSelection = debounce(() => {
      this.handleTextSelection();
    }, 100);

    this.registerDomEvent(container, "mousedown", (e: MouseEvent) => {
      if (!this.isView() || !this.commandsManager.getActiveEditor()) return;

      const mouseDownTime = Date.now();
      if (e.button === 1) {
        this.registerDomEvent(container, "mouseup", (e2: MouseEvent) => {
          const mouseUpTime = Date.now();
          if (mouseUpTime - mouseDownTime < 300 && e2.button === 1) {
            this.handleMiddleClickToolbar();
          }
        });
      }
    });

    this.registerDomEvent(container, "mouseup", (e) => {
      if (e.button !== 1) {
        debouncedHandleTextSelection();
      }
    });

    this.registerDomEvent(container, "keyup", this.handleKeyboardSelection);

    this.registerScrollAndBlurEvents(container);
  }

  public getCachedToolbar(style: ToolbarStyleKey): HTMLElement | null {
    const cached = this.toolbarCache.get(style);
    if (cached && cached.isConnected) {
      return cached;
    }
    if (cached) {
      this.toolbarCache.delete(style);
    }

    return null;
  }

  public setCachedToolbar(style: ToolbarStyleKey, element: HTMLElement): void {
    this.toolbarCache.set(style, element);
  }

  public clearToolbarCache(style?: ToolbarStyleKey): void {
    if (style) {
      this.toolbarCache.delete(style);
    } else {
      this.toolbarCache.clear();
    }
  }

  public isToolbarStyleEnabled(style: ToolbarStyleKey): boolean {
    return style === "top"
      ? this.settings.enableTopToolbar
      : this.settings.enableFollowingToolbar;
  }

  private handleMiddleClickToolbar() {
    const cmEditor = this.commandsManager.getActiveEditor();
    if (this.isToolbarStyleEnabled("following") && cmEditor?.hasFocus()) {
      this.showFollowingToolbar(cmEditor);
    }
  }

  private handleKeyboardSelection = (e: KeyboardEvent) => {
    const selectionKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "ShiftLeft",
      "ShiftRight",
    ];

    if (selectionKeys.includes(e.code) || e.shiftKey) {
      this.handleTextSelection();
    } else if (!e.shiftKey && this.isToolbarStyleEnabled("following")) {
      this.hideToolbarIfNotSelected();
    }
  };

  private getToolbarHostDocument(editor?: Editor | null): Document {
    return (
      editor?.cm?.dom?.ownerDocument ||
      editor?.cm?.contentDOM?.ownerDocument ||
      this.app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
      activeWindow.document
    );
  }

  private registerScrollAndBlurEvents(container: Document) {
    const hideToolbar = this.throttle(() => {
      if (!this.isToolbarStyleEnabled("following")) return;
      this.hideToolbarIfNotSelected(container);
    }, 200);

    this.registerDomEvent(container, "wheel", hideToolbar);
    this.registerDomEvent(container, "blur", () => {
      this.hideToolbarIfNotSelected(container);
    });
  }

  private hideToolbarIfNotSelected(hostDocument?: Document) {
    const followingToolbar = getExistingToolbar(
      this.app,
      this,
      "following",
      hostDocument ||
        this.getToolbarHostDocument(this.commandsManager.getActiveEditor()),
    );
    if (followingToolbar && this.isToolbarStyleEnabled("following")) {
      followingToolbar.style.visibility = "hidden";
    }
  }

  private handleTextSelection() {
    if (!this.isView()) return;

    const cmEditor = this.commandsManager.getActiveEditor();
    if (!cmEditor?.hasFocus()) return;

    if (cmEditor.somethingSelected()) {
      this.showFollowingToolbar(cmEditor);
    } else {
      this.hideToolbarIfNotSelected(this.getToolbarHostDocument(cmEditor));
    }
  }

  private throttle(func: () => void, limit: number = 100): () => void {
    let inThrottle = false;
    return () => {
      if (!inThrottle) {
        func();
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  private showFollowingToolbar(editor: Editor) {
    if (!this.isToolbarStyleEnabled("following")) return;

    const targetDocument = this.getToolbarHostDocument(editor);
    const followingToolbar = getExistingToolbar(
      this.app,
      this,
      "following",
      targetDocument,
    );

    if (followingToolbar) {
      followingToolbar.style.visibility = "visible";
      followingToolbar.classList.add("editingToolbarFlex");
    }

    createFollowingBar(this.app, this, editor, true, targetDocument);
  }

  onPositionStyleChange(newStyle: string): void {
    // Ignore any "editing style" override while updating the live toolbar.
    const previousEditStyle = this.appearanceEditStyle;
    this.appearanceEditStyle = null;

    this.positionStyle = newStyle;
    this.settings.positionStyle = newStyle;

    const activeStyle = this.resolveActiveStyle();
    const doc = activeDocument ?? document;
    if (doc?.documentElement) {
      applyAppearanceVars(doc.documentElement, this.settings, activeStyle);
    }

    dispatchEvent(new Event("editingToolbar-NewCommand"));

    this.appearanceEditStyle = previousEditStyle;
  }
}
