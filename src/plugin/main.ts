import { Command, debounce, ItemView, Notice, Plugin } from "obsidian";
import { CommandsManager } from "src/commands/commands";
import addIcons from "src/icons/customIcons";
import type { AdmonitionDefinition } from "src/modals/callout/calloutTypes";
import { readAdmonitionDefinitions } from "src/plugin/admonitions";
import { registerEditorContextMenu } from "src/plugin/editorContextMenu";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import {
  applyAppearanceVars,
  createDefaultSettings,
  EditingToolbarSettings,
  POSITION_STYLES,
  resolveNextPositionStyle,
} from "src/settings/settingsData";
import {
  buildImportedSettings,
  parseImport,
} from "src/settings/settingsTransfer";
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
    this.app.workspace.onLayoutReady(() => {
      this.admonitionDefinitions = readAdmonitionDefinitions(this.app);
    });

    registerEditorContextMenu(this);
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

  async loadSettings(): Promise<void> {
    this.settings = createDefaultSettings();

    const loaded = await this.loadData();
    if (loaded == null) return;

    const parsed = parseImport(loaded);
    if (!parsed) {
      console.warn("editing-toolbar: unreadable data.json", loaded);
      new Notice(strings.unreadableSettingsFile);
      return;
    }

    this.settings = buildImportedSettings(this.settings, parsed, "overwrite");
  }

  public get liveStyle(): ToolbarStyleKey {
    return this.settings.positionStyle;
  }

  // While the settings tab is open this is the style being edited there, which can
  // differ from the one rendered in the workspace.
  public resolveActiveStyle(): ToolbarStyleKey {
    return this.appearanceEditStyle ?? this.liveStyle;
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

  // The live settings array — callers mutate in place, then saveSettings().
  getCurrentCommands(style: ToolbarStyleKey): Command[] {
    return this.settings[`${style}Commands`];
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async resetSettings(): Promise<void> {
    this.settings = createDefaultSettings();
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

    this.registerDomEvent(container, "wheel", () =>
      hideFollowingBar(this.app, this, container),
    );
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

  private handleTextSelection() {
    const editor = this.commandsManager.getActiveEditor();
    if (!this.isView() || !editor?.hasFocus()) return;
    updateFollowingBar(this.app, this, editor);
  }

  private onPositionStyleChange(newStyle: ToolbarStyleKey): void {
    this.settings.positionStyle = newStyle;
    this.rebuildToolbars();
  }
}
