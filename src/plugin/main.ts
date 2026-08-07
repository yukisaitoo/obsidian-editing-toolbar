import { Plugin } from "obsidian";
import { registerCommands } from "src/commands/registerCommands";
import addIcons from "src/icons/customIcons";
import {
  applyLastColorVars,
  clearLastColorVars,
  createDefaultSettings,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import { closeMoreOverflowPopovers } from "src/toolbar/morePopover";
import { removeAllToolbars, syncToolbars } from "src/toolbar/toolbarBuilder";
import { toolbarDocuments } from "src/toolbar/toolbarHost";
import { EditingToolbarSettingTab } from "src/settings/settingsTab";

export default class EditingToolbarPlugin extends Plugin {
  settings!: EditingToolbarSettings;

  settingTab!: EditingToolbarSettingTab;

  private cssReady?: Promise<void>;

  // Obsidian injects styles.css only after onload() resolves, so a bar built during
  // onload paints unstyled, with every flyout hanging open.
  override loadCSS(): Promise<void> {
    return (this.cssReady ??= super.loadCSS());
  }

  async onload(): Promise<void> {
    addIcons();
    await this.loadCSS();
    await this.loadSettings();

    // Registered before anything reads settings.commands: a hand-broken data.json that
    // throws during a toolbar build then still leaves Reset configuration reachable.
    this.settingTab = new EditingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    registerCommands(this);

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleLayoutChange),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleLayoutChange),
    );
    // A window born after the last rebuild has none of the root colour vars yet.
    this.registerEvent(
      this.app.workspace.on("window-open", (win) =>
        applyLastColorVars(win.doc.documentElement, this.settings),
      ),
    );
    this.applyRootColorVars();

    // onLayoutReady hands back no canceller, and layout-ready can land after an
    // unload, so the guard has to live inside the callback.
    let unloaded = false;
    this.register(() => {
      unloaded = true;
    });
    this.app.workspace.onLayoutReady(() => {
      if (!unloaded) this.rebuildToolbars();
    });
  }

  applyRootColorVars(): void {
    toolbarDocuments(this.app).forEach((doc) =>
      applyLastColorVars(doc.documentElement, this.settings),
    );
  }

  // data.json is trusted: nothing but this plugin writes it, and hand-breaking one is
  // a Reset away. Spreading over complete defaults still fills in whatever the file
  // omits. Spread rather than Object.assign, which would run a `__proto__` key from
  // the file through Object.prototype's setter; both no-op on the first-run null.
  async loadSettings(): Promise<void> {
    this.settings = { ...createDefaultSettings(), ...(await this.loadData()) };
  }

  onunload(): void {
    removeAllToolbars(this);
    toolbarDocuments(this.app).forEach((doc) =>
      clearLastColorVars(doc.documentElement),
    );
  }

  // Safe to call as often as the workspace fires events: builds only what is missing.
  // A layout change can move the pane out from under an open popover, so close first.
  handleLayoutChange = () => {
    closeMoreOverflowPopovers();
    syncToolbars(this);
  };

  rebuildToolbars(): void {
    removeAllToolbars(this);
    this.applyRootColorVars();
    this.handleLayoutChange();
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
