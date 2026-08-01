import { Notice, Plugin } from "obsidian";
import { CommandsManager } from "src/commands/commands";
import addIcons from "src/icons/customIcons";
import type { AdmonitionDefinition } from "src/modals/callout/calloutTypes";
import { readAdmonitionDefinitions } from "src/plugin/admonitions";
import { registerEditorContextMenu } from "src/plugin/editorContextMenu";
import {
  applyAppearanceVars,
  createDefaultSettings,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import {
  buildImportedSettings,
  parseImport,
} from "src/settings/settingsTransfer";
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
import { EditingToolbarSettingTab } from "../settings/settingsTab";

export default class EditingToolbarPlugin extends Plugin {
  settings!: EditingToolbarSettings;

  commandsManager!: CommandsManager;
  public admonitionDefinitions: Record<string, AdmonitionDefinition> | null =
    null;

  settingTab!: EditingToolbarSettingTab;

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

  // Document-level fallback for anything outside a bar.
  private applyRootAppearanceVars(): void {
    applyAppearanceVars(activeWindow.document.documentElement, this.settings);
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

    if (parsed.skipped.length) {
      console.warn("editing-toolbar: skipped unreadable settings", parsed.skipped);
      new Notice(strings.skippedSettingsValues);
    }
  }

  onunload(): void {
    selfDestruct(this);
  }

  // Safe to call as often as the workspace fires events: builds only what is
  // missing, and defers to resolveToolbarDecision for every visibility decision.
  handleEditingToolbar = () => {
    closeMoreOverflowPopovers();

    const decision = resolveToolbarDecision(this);
    if (decision === "leave") return;

    const bar =
      decision === "visible"
        ? ensureToolbar(this.app, this)
        : getExistingToolbar(this.app);
    if (bar) applyToolbarState(bar, decision);
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

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async resetSettings(): Promise<void> {
    this.settings = createDefaultSettings();

    await this.saveSettings();
    this.rebuildToolbars();
  }
}
