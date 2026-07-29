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
import { hideFollowingBar, updateFollowingBar } from "src/toolbar/followingBar";
import { closeMoreOverflowPopovers } from "src/toolbar/morePopover";
import {
  ensureToolbar,
  getExistingToolbar,
  selfDestruct,
} from "src/toolbar/toolbarBuilder";
import {
  applyToolbarState,
  resolveToolbarState,
} from "src/toolbar/toolbarVisibility";
import { strings } from "src/translations/helper";
import { ViewUtils } from "src/util/viewUtils";
import { EditingToolbarSettingTab } from "../settings/settingsTab";

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

const SELECTION_KEYS = new Set([
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
]);

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
  private rebuildListeners = new Set<() => void>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.initAppearanceStore();

    this.settingTab = new EditingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();

    this.registerSelectionEvents(activeWindow.document);
    this.registerEvent(
      this.app.workspace.on("window-open", (leaf) => {
        this.registerSelectionEvents(leaf.doc);
        ensureToolbar(this.app, this, "following", leaf.doc);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleEditingToolbar),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleEditingToolbar),
    );
    this.app.workspace.onLayoutReady(() => this.rebuildToolbars());
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
    this.applyRootAppearanceVars();
  }

  // Document-level fallback for anything outside a bar. Always the live style —
  // the settings tab's "style being edited" only governs its own preview.
  private applyRootAppearanceVars(): void {
    applyAppearanceVars(
      activeWindow.document.documentElement,
      this.settings,
      this.liveStyle,
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

  /**
   * Re-syncs every toolbar with what resolveToolbarState says it should be.
   * Safe to call as often as the workspace fires events — it builds only what is
   * missing and never has an opinion of its own about visibility.
   */
  handleEditingToolbar = () => {
    closeMoreOverflowPopovers();

    for (const style of POSITION_STYLES) {
      const state = resolveToolbarState(this, style);
      const bar =
        state === "visible"
          ? ensureToolbar(this.app, this, style)
          : getExistingToolbar(this.app, this, style);
      if (bar) applyToolbarState(bar, state);
    }
  };

  /** Tears every bar down and builds them again — for command or appearance edits. */
  rebuildToolbars(): void {
    selfDestruct(this);
    this.applyRootAppearanceVars();
    this.handleEditingToolbar();
    this.rebuildListeners.forEach((listener) => listener());
  }

  onRebuild(listener: () => void): () => void {
    this.rebuildListeners.add(listener);
    return () => this.rebuildListeners.delete(listener);
  }

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

  /** Middle-click summons the bar even without a selection. */
  private handleMiddleClickToolbar() {
    const editor = this.commandsManager.getActiveEditor();
    if (editor?.hasFocus()) {
      updateFollowingBar(this.app, this, editor, true);
    }
  }

  private handleKeyboardSelection = (e: KeyboardEvent) => {
    if (SELECTION_KEYS.has(e.code) || e.shiftKey) {
      this.handleTextSelection();
    } else {
      hideFollowingBar(this.app, this);
    }
  };

  private registerScrollAndBlurEvents(container: Document) {
    const hideOnScroll = throttle(
      () => hideFollowingBar(this.app, this, container),
      200,
    );

    this.registerDomEvent(container, "wheel", hideOnScroll);
    this.registerDomEvent(container, "blur", () =>
      hideFollowingBar(this.app, this, container),
    );
  }

  private handleTextSelection() {
    const editor = this.commandsManager.getActiveEditor();
    if (!this.isView() || !editor?.hasFocus()) return;
    updateFollowingBar(this.app, this, editor);
  }

  onPositionStyleChange(newStyle: string): void {
    this.positionStyle = newStyle;
    this.settings.positionStyle = newStyle;
    this.rebuildToolbars();
  }
}

function throttle(func: () => void, limit: number): () => void {
  let inThrottle = false;
  return () => {
    if (inThrottle) return;
    func();
    inThrottle = true;
    setTimeout(() => (inThrottle = false), limit);
  };
}
