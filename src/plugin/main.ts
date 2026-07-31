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
import type { AdmonitionDefinition } from "src/modals/callout/calloutTypes";
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
  resolveToolbarDecision,
} from "src/toolbar/toolbarVisibility";
import { strings } from "src/translations/helper";
import { isAllowedViewType } from "src/util/viewUtils";
import { EditingToolbarSettingTab } from "../settings/settingsTab";

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

  public appearanceEditStyle: ToolbarStyleKey | null = null;

  commandsManager!: CommandsManager;
  public admonitionDefinitions: Record<string, AdmonitionDefinition> | null =
    null;

  settingTab!: EditingToolbarSettingTab;

  private toolbarCache: Map<ToolbarStyleKey, HTMLElement> = new Map();
  private rebuildListeners = new Set<() => void>();
  private cssReady?: Promise<void>;

  // Obsidian injects styles.css only after onload() resolves, so a bar built during
  // onload paints unstyled — flyouts open.
  override loadCSS(): Promise<void> {
    return (this.cssReady ??= super.loadCSS());
  }

  async onload(): Promise<void> {
    addIcons();
    await this.loadCSS();
    await this.loadSettings();

    this.settingTab = new EditingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();

    this.registerSelectionEvents(activeWindow.document);
    this.registerEvent(
      this.app.workspace.on("window-open", (leaf) => {
        this.registerSelectionEvents(leaf.doc);
        updateFollowingBar(this.app, this, null, leaf.doc);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleEditingToolbar),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleEditingToolbar),
    );
    this.applyRootAppearanceVars();
    this.app.workspace.onLayoutReady(() => this.rebuildToolbars());
    this.app.workspace.onLayoutReady(async () => {
      await this.tryGetAdmonitionTypes();
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", this.handleEditorContextMenu),
    );
  }

  // Document-level fallback for anything outside a bar, always on the live style:
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

    // Seed only when never persisted, so a list the user cleared stays empty. The
    // clone keeps DEFAULT_COMMANDS_BY_STYLE from being edited in place later.
    for (const style of POSITION_STYLES) {
      const key = `${style}Commands` as const;
      if (!loadedData || loadedData[key] === undefined) {
        this.settings[key] = structuredClone(DEFAULT_COMMANDS_BY_STYLE[style]);
      }
    }
  }

  public get liveStyle(): ToolbarStyleKey {
    const raw = this.settings.positionStyle;
    return POSITION_STYLES.includes(raw as ToolbarStyleKey)
      ? (raw as ToolbarStyleKey)
      : "top";
  }

  // While the settings tab is open this is the style being edited there, which can
  // differ from the one rendered in the workspace.
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
    selfDestruct(this);
  }

  isView() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return isAllowedViewType(view);
  }

  // Safe to call as often as the workspace fires events: builds only what is
  // missing, and defers to resolveToolbarDecision for every visibility decision.
  handleEditingToolbar = () => {
    closeMoreOverflowPopovers();

    for (const style of POSITION_STYLES) {
      if (style === "following") {
        updateFollowingBar(this.app, this, null);
        continue;
      }

      const decision = resolveToolbarDecision(this, style);
      if (decision === "leave") continue;

      const bar =
        decision === "visible"
          ? ensureToolbar(this.app, this, style)
          : getExistingToolbar(this.app, this, style);
      if (bar) applyToolbarState(bar, decision);
    }
  };

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

  async resetSettings(): Promise<void> {
    this.settings = structuredClone(DEFAULT_SETTINGS);
    for (const style of POSITION_STYLES) {
      this.settings[`${style}Commands`] = structuredClone(
        DEFAULT_COMMANDS_BY_STYLE[style],
      );
    }

    this.appearanceEditStyle = null;

    await this.saveSettings();
    this.rebuildToolbars();
  }

  async setToolbarStyleEnabled(
    style: ToolbarStyleKey,
    enabled: boolean,
  ): Promise<void> {
    const previousStyle = this.settings.positionStyle;
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

    this.registerDomEvent(container, "mouseup", () => {
      debouncedHandleTextSelection();
    });

    this.registerDomEvent(container, "keyup", this.handleKeyboardSelection);

    this.registerScrollEvents(container);
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

  private handleKeyboardSelection = (e: KeyboardEvent) => {
    if (SELECTION_KEYS.has(e.code) || e.shiftKey) {
      this.handleTextSelection();
    } else {
      hideFollowingBar(this.app, this);
    }
  };

  private registerScrollEvents(container: Document) {
    const hideOnScroll = throttle(
      () => hideFollowingBar(this.app, this, container),
      200,
    );

    this.registerDomEvent(container, "wheel", hideOnScroll);
  }

  private handleTextSelection() {
    const editor = this.commandsManager.getActiveEditor();
    if (!this.isView() || !editor?.hasFocus()) return;
    updateFollowingBar(this.app, this, editor);
  }

  private onPositionStyleChange(newStyle: string): void {
    this.settings.positionStyle = newStyle;
    this.rebuildToolbars();
  }
}

// Fires immediately, then ignores calls for `limit` ms. The pending timer only
// resets a local flag, so it is safe to leave running past unload.
function throttle(func: () => void, limit: number): () => void {
  let inThrottle = false;
  return () => {
    if (inThrottle) return;
    func();
    inThrottle = true;
    setTimeout(() => (inThrottle = false), limit);
  };
}
