import { Notice, Plugin } from "obsidian";
import { CommandsManager } from "src/commands/commands";
import addIcons from "src/icons/customIcons";
import {
  applyLastColorVars,
  createDefaultSettings,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import {
  buildImportedSettings,
  parseImport,
} from "src/settings/settingsTransfer";
import { closeMoreOverflowPopovers } from "src/toolbar/morePopover";
import { removeAllToolbars, syncToolbars } from "src/toolbar/toolbarBuilder";
import { toolbarDocuments } from "src/toolbar/toolbarHost";
import { strings } from "src/translations/helper";
import { EditingToolbarSettingTab } from "../settings/settingsTab";

export default class EditingToolbarPlugin extends Plugin {
  settings!: EditingToolbarSettings;

  commandsManager!: CommandsManager;

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
    // A window born after the last rebuild has none of the root colour vars yet.
    this.registerEvent(
      this.app.workspace.on("window-open", (win) =>
        applyLastColorVars(win.doc.documentElement, this.settings),
      ),
    );
    this.applyRootColorVars();
    this.app.workspace.onLayoutReady(() => this.rebuildToolbars());
  }

  applyRootColorVars(): void {
    toolbarDocuments(this.app).forEach((doc) =>
      applyLastColorVars(doc.documentElement, this.settings),
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

    if (parsed.skipped.length) {
      console.warn("editing-toolbar: skipped unreadable settings", parsed.skipped);
      new Notice(strings.skippedSettingsValues);
    }
  }

  onunload(): void {
    removeAllToolbars(this);
  }

  // Safe to call as often as the workspace fires events: builds only what is missing.
  // A layout change can move the pane out from under an open popover, so close first.
  handleEditingToolbar = () => {
    closeMoreOverflowPopovers();
    syncToolbars(this);
  };

  rebuildToolbars(): void {
    removeAllToolbars(this);
    this.applyRootColorVars();
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
