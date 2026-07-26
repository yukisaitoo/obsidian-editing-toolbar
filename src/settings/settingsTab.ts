import Pickr from "@simonwep/pickr";
import { App, ButtonComponent, PluginSettingTab, setIcon } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ColorPickrOptions } from "src/settings/pickr";
import { createColorPickr } from "src/settings/pickr";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { renderAppearanceTab } from "src/settings/tabs/appearanceTab";
import { renderCommandsTab } from "src/settings/tabs/commandsTab";
import { renderGeneralTab } from "src/settings/tabs/generalTab";
import { renderImportExportTab } from "src/settings/tabs/importExportTab";
import { editingToolbarPopover, selfDestruct } from "src/toolbar/editingToolbar";
import { strings } from "src/translations/helper";

const DELETE_CONFIRM_TIMEOUT = 3500;

// Waiting a tick lets a suggester/modal finish writing its change before the
// toolbar is rebuilt from settings.
const REBUILD_DELAY = 100;

type TabId = "general" | "appearance" | "commands" | "importexport";

const SETTING_TABS: { id: TabId; name: string; icon: string }[] = [
  { id: "general", name: strings.general, icon: "gear" },
  { id: "appearance", name: strings.appearance, icon: "brush" },
  { id: "commands", name: strings.toolbarCommands, icon: "lucide-command" },
  { id: "importexport", name: strings.importExport, icon: "lucide-import" },
];

/**
 * What a tab renderer is allowed to do: read the plugin, re-render the settings
 * pane, rebuild the live toolbar, and create widgets whose lifetime the shell
 * manages.
 */
export interface SettingsTabContext {
  app: App;
  plugin: EditingToolbarPlugin;
  /** Re-render the whole settings pane. */
  refresh(): void;
  /** Rebuild the live toolbars from the current settings. */
  rebuildToolbar(): void;
  /** Create a colour picker that the shell destroys on the next render. */
  createPickr(options: ColorPickrOptions): Pickr;
  /** A delete button that arms on first click and acts on the second. */
  createDeleteButton(
    button: ButtonComponent,
    onDelete: () => Promise<void>,
    tooltip?: string,
  ): void;
}

export class EditingToolbarSettingTab extends PluginSettingTab {
  plugin: EditingToolbarPlugin;
  private activeTab: TabId = "general";
  private pickrs: Pickr[] = [];
  private commandStyle: ToolbarStyleKey;

  constructor(app: App, plugin: EditingToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.commandStyle = plugin.liveStyle;

    const handleNewCommand = () => {
      selfDestruct(this.plugin);
      editingToolbarPopover(app, this.plugin);
      this.display();
    };

    window.addEventListener("editingToolbar-NewCommand", handleNewCommand);
    this.plugin.register(() =>
      window.removeEventListener("editingToolbar-NewCommand", handleNewCommand),
    );
  }

  display(): void {
    this.destroyPickrs();

    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("editing-toolbar-settings");

    containerEl
      .createEl("div", { cls: "editing-toolbar-header" })
      .createEl("div", { cls: "editing-toolbar-title-container" })
      .createEl("h1", {
        text: "Obsidian Editing Toolbar: " + this.plugin.manifest.version,
        cls: "editing-toolbar-title",
      });

    const tabContainer = containerEl.createEl("div", {
      cls: "editing-toolbar-tabs",
    });
    SETTING_TABS.forEach((tab) => {
      const tabButton = tabContainer.createEl("div", {
        cls: `editing-toolbar-tab ${this.activeTab === tab.id ? "active" : ""}`,
      });
      setIcon(tabButton, tab.icon);
      tabButton.createEl("span", { text: tab.name });
      tabButton.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.display();
      });
    });

    const contentEl = containerEl.createEl("div", {
      cls: "editing-toolbar-content",
    });
    const ctx = this.tabContext();

    switch (this.activeTab) {
      case "general":
        renderGeneralTab(ctx, contentEl);
        break;
      case "appearance":
        renderAppearanceTab(ctx, contentEl);
        break;
      case "commands":
        renderCommandsTab(ctx, contentEl, {
          style: this.commandStyle,
          onStyleChange: (style) => {
            this.commandStyle = style;
            this.display();
          },
        });
        break;
      case "importexport":
        renderImportExportTab(ctx, contentEl);
        break;
    }
  }

  hide(): void {
    this.destroyPickrs();
    this.rebuildToolbar();
  }

  private tabContext(): SettingsTabContext {
    return {
      app: this.app,
      plugin: this.plugin,
      refresh: () => this.display(),
      rebuildToolbar: () => this.rebuildToolbar(),
      createPickr: (options) => {
        const pickr = createColorPickr(options);
        this.pickrs.push(pickr);
        return pickr;
      },
      createDeleteButton: (button, onDelete, tooltip = strings.delete) =>
        this.createDeleteButton(button, onDelete, tooltip),
    };
  }

  private rebuildToolbar(): void {
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, REBUILD_DELAY);
  }

  private createDeleteButton(
    button: ButtonComponent,
    onDelete: () => Promise<void>,
    tooltip: string,
  ): void {
    let confirmTimeout: NodeJS.Timeout;

    const disarm = () => {
      clearTimeout(confirmTimeout);
      button.setIcon("editingToolbarDelete").setTooltip(tooltip);
      button.buttonEl.removeClass("mod-warning");
    };

    button
      .setIcon("editingToolbarDelete")
      .setTooltip(tooltip)
      .onClick(async () => {
        if (button.buttonEl.hasClass("mod-warning")) {
          disarm();
          await onDelete();
          return;
        }

        button
          .setTooltip(strings.confirmDelete)
          .setButtonText(strings.confirmDelete);
        button.buttonEl.addClass("mod-warning");
        confirmTimeout = setTimeout(disarm, DELETE_CONFIRM_TIMEOUT);
      });
  }

  private destroyPickrs(): void {
    this.pickrs.forEach((pickr) => pickr?.destroyAndRemove());
    this.pickrs = [];
  }
}
