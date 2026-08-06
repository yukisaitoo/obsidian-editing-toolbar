import Pickr from "@simonwep/pickr";
import {
  App,
  ButtonComponent,
  debounce,
  PluginSettingTab,
  setIcon,
} from "obsidian";
import Sortable from "sortablejs";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ColorPickrOptions } from "src/settings/pickr";
import { createColorPickr } from "src/settings/pickr";
import { renderAppearanceTab } from "src/settings/tabs/appearanceTab";
import { renderCommandsTab } from "src/settings/tabs/commandsTab";
import { renderGeneralTab } from "src/settings/tabs/generalTab";
import { renderImportExportTab } from "src/settings/tabs/importExportTab";
import { strings } from "src/translations/helper";

const DELETE_CONFIRM_TIMEOUT = 3500;

const RERENDER_DELAY = 100;

type TabId = "general" | "appearance" | "commands" | "importexport";

const SETTING_TABS: { id: TabId; name: string; icon: string }[] = [
  { id: "general", name: strings.general, icon: "gear" },
  { id: "appearance", name: strings.appearance, icon: "brush" },
  { id: "commands", name: strings.toolbarCommands, icon: "lucide-command" },
  { id: "importexport", name: strings.importExport, icon: "lucide-import" },
];

export interface SettingsTabContext {
  app: App;
  plugin: EditingToolbarPlugin;
  applyChanges(): void;
  createPickr(options: ColorPickrOptions): Pickr;
  createSortable(el: HTMLElement, options: Sortable.Options): void;
  // Arms on the first click, deletes on the second.
  createDeleteButton(
    button: ButtonComponent,
    onDelete: () => Promise<void>,
    tooltip?: string,
  ): void;
}

export class EditingToolbarSettingTab extends PluginSettingTab {
  plugin: EditingToolbarPlugin;
  private activeTab: TabId = "general";
  private isOpen = false;
  private pickrs: Pickr[] = [];
  private sortables: Sortable[] = [];

  constructor(app: App, plugin: EditingToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;

    this.plugin.register(this.plugin.onRebuild(() => this.scheduleRerender()));
  }

  setActiveTab(tab: TabId): void {
    this.activeTab = tab;
    this.display();
  }

  display(): void {
    this.isOpen = true;
    this.scheduleRerender.cancel();
    this.destroyTabResources();

    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("editing-toolbar-settings");

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
        renderCommandsTab(ctx, contentEl);
        break;
      case "importexport":
        renderImportExportTab(ctx, contentEl);
        break;
    }
  }

  hide(): void {
    this.isOpen = false;
    this.destroyTabResources();
    this.plugin.rebuildToolbars();
  }

  private tabContext(): SettingsTabContext {
    return {
      app: this.app,
      plugin: this.plugin,
      applyChanges: () => this.plugin.rebuildToolbars(),
      createPickr: (options) => {
        const pickr = createColorPickr(options);
        this.pickrs.push(pickr);
        return pickr;
      },
      createSortable: (el, options) => {
        this.sortables.push(Sortable.create(el, options));
      },
      createDeleteButton: (button, onDelete, tooltip = strings.delete) =>
        this.createDeleteButton(button, onDelete, tooltip),
    };
  }

  // A rebuild re-renders this pane in place, tearing down the Pickr/Sortable whose
  // own callback asked for it — so defer past the current event, and coalesce bursts.
  private readonly scheduleRerender = debounce(
    () => {
      if (!this.isOpen) return;
      // Keep the reader where they were.
      const { scrollTop } = this.containerEl;
      this.display();
      this.containerEl.scrollTop = scrollTop;
    },
    RERENDER_DELAY,
    true,
  );

  private createDeleteButton(
    button: ButtonComponent,
    onDelete: () => Promise<void>,
    tooltip: string,
  ): void {
    let confirmTimeout: ReturnType<typeof setTimeout> | undefined;

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

  // Both hold references that outlive the DOM they were built on, so they are torn
  // down before every re-render — while their elements are still attached.
  private destroyTabResources(): void {
    this.pickrs.forEach((pickr) => pickr?.destroyAndRemove());
    this.pickrs = [];
    this.sortables.forEach((sortable) => sortable.destroy());
    this.sortables = [];
  }
}
