import Pickr from "@simonwep/pickr";
import {
  App,
  ButtonComponent,
  Command,
  debounce,
  Notice,
  PluginSettingTab,
  setIcon,
  Setting,
} from "obsidian";
import Sortable from "sortablejs";
import { ConfirmModal } from "src/modals/ConfirmModal";
import { ImportExportModal } from "src/modals/ImportExportModal";
import {
  ChangeCmdname,
  ChooseFromIconList,
  CommandPicker,
  openSlider,
} from "src/modals/suggesterModals";
import type EditingToolbarPlugin from "src/plugin/main";
import type {
  AppearanceByStyle,
  CustomColorKey,
  StyleAppearanceSettings,
  ToolbarStyleKey,
} from "src/settings/settingsData";
import {
  AESTHETIC_STYLES,
  getAppearanceValue,
  POSITION_STYLES,
  resolveNextPositionStyle,
} from "src/settings/settingsData";
import {
  checkHtml,
  editingToolbarPopover,
  selfDestruct,
} from "src/toolbar/editingToolbar";
import { strings, t } from "src/translations/helper";
import { GenNonDuplicateID } from "src/util/util";

const POSITION_STYLE_LABELS: Record<string, string> = {
  following: strings.followingToolbar,
  top: strings.topToolbar,
  fixed: strings.fixedToolbar,
};
const AESTHETIC_STYLE_LABELS: Record<string, string> = {
  default: strings.default,
  tiny: strings.tiny,
  glass: strings.glass,
  custom: strings.customTheme,
};

interface SubmenuCommand {
  id: string;
  name: string;
  icon: string;
  SubmenuCommands: Command[];
}

interface SettingTab {
  id: string;
  name: string;
  icon: string;
}

const SETTING_TABS: SettingTab[] = [
  {
    id: "general",
    name: strings.general,
    icon: "gear",
  },
  {
    id: "appearance",
    name: strings.appearance,
    icon: "brush",
  },
  {
    id: "commands",
    name: strings.toolbarCommands,
    icon: "lucide-command",
  },
  {
    id: "importexport",
    name: strings.importExport,
    icon: "lucide-import",
  },
];

function getPickrSettings(opts: {
  isView: boolean;
  el: HTMLElement;
  containerEl: HTMLElement;
  swatches: string[];
  opacity: boolean | undefined;
  defaultColor: string;
}): Pickr.Options {
  const { el, containerEl, swatches, opacity, defaultColor } = opts;

  return {
    el,
    container: containerEl,
    theme: "nano",
    swatches,
    lockOpacity: !opacity,
    default: defaultColor,
    position: "left-middle",
    components: {
      preview: true,
      hue: true,
      opacity: !!opacity,
      interaction: {
        hex: true,
        rgba: false,
        hsla: false,
        input: true,
        cancel: true,
        save: true,
      },
    },
  };
}

function getComandindex(item: string, arr: Command[]): number {
  if (!arr || !Array.isArray(arr)) {
    return -1;
  }
  const idx = arr.findIndex((el) => el?.id === item);
  return idx;
}

export class EditingToolbarSettingTab extends PluginSettingTab {
  plugin: EditingToolbarPlugin;
  pickrs: Pickr[] = [];
  activeTab: string = "general";
  private currentEditingConfig: string;

  private getLocalizedCommandName(name: string): string {
    return t(name);
  }

  constructor(app: App, plugin: EditingToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.currentEditingConfig = this.plugin.settings.positionStyle;

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
    this.createHeader(containerEl);

    const tabContainer = containerEl.createEl("div", {
      cls: "editing-toolbar-tabs",
    });

    const visibleTabs = SETTING_TABS;

    visibleTabs.forEach((tab) => {
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
    const contentContainer = containerEl.createEl("div", {
      cls: "editing-toolbar-content",
    });
    switch (this.activeTab) {
      case "general":
        this.displayGeneralSettings(contentContainer);
        break;
      case "appearance":
        this.displayAppearanceSettings(contentContainer);
        break;
      case "commands":
        this.displayCommandSettings(contentContainer);
        break;
      case "importexport":
        this.displayImportExportSettings(contentContainer);
        break;
    }
  }
  private createDeleteButton(
    button: ButtonComponent,
    deleteAction: () => Promise<void>,
    tooltip: string = strings.delete,
  ) {
    let isConfirming = false;
    let confirmTimeout: NodeJS.Timeout;

    button
      .setIcon("editingToolbarDelete")
      .setTooltip(tooltip)
      .onClick(async () => {
        if (isConfirming) {
          clearTimeout(confirmTimeout);
          button.setIcon("editingToolbarDelete").setTooltip(tooltip);
          button.buttonEl.removeClass("mod-warning");
          isConfirming = false;

          await deleteAction();
        } else {
          isConfirming = true;
          button
            .setTooltip(strings.confirmDelete)
            .setButtonText(strings.confirmDelete);
          button.buttonEl.addClass("mod-warning");

          confirmTimeout = setTimeout(() => {
            button.setIcon("editingToolbarDelete").setTooltip(tooltip);
            button.buttonEl.removeClass("mod-warning");
            isConfirming = false;
          }, 3500);
        }
      });
  }
  private displayGeneralSettings(containerEl: HTMLElement): void {
    const generalSettingContainer = containerEl.createDiv(
      "generalSetting-container",
    );
    // Top toolbar toggle
    new Setting(generalSettingContainer)
      .setName(strings.topToolbar)
      .setDesc(strings.enableToolbarPositionedTop)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableTopToolbar || false)
          .onChange(async (value) => {
            const s = this.plugin.settings;
            const prevStyle = this.plugin.positionStyle;
            // Update only the Top toolbar flag
            s.enableTopToolbar = value;
            const nextStyle = resolveNextPositionStyle(
              s,
              "top",
              value,
              prevStyle,
            );
            if (nextStyle && nextStyle !== prevStyle) {
              this.plugin.onPositionStyleChange(nextStyle);
            }
            await this.plugin.saveSettings();
            // Immediately refresh toolbars to reflect this toggle
            this.plugin.handleEditingToolbar();
            this.display();
          });
      });
    // Following toolbar toggle
    new Setting(generalSettingContainer)
      .setName(strings.followingToolbar)
      .setDesc(strings.enableToolbarAppearsUponText)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableFollowingToolbar || false)
          .onChange(async (value) => {
            const s = this.plugin.settings;
            const prevStyle = this.plugin.positionStyle;
            // Update only the Following toolbar flag
            s.enableFollowingToolbar = value;
            const nextStyle = resolveNextPositionStyle(
              s,
              "following",
              value,
              prevStyle,
            );
            if (nextStyle && nextStyle !== prevStyle) {
              this.plugin.onPositionStyleChange(nextStyle);
            }
            await this.plugin.saveSettings();
            this.plugin.handleEditingToolbar();
            this.display();
          });
      });
    // Fixed toolbar toggle
    new Setting(generalSettingContainer)
      .setName(strings.fixedToolbar)
      .setDesc(strings.enableToolbarWhosePositionMay)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableFixedToolbar || false)
          .onChange(async (value) => {
            const s = this.plugin.settings;
            const prevStyle = this.plugin.positionStyle;
            // Update only the Fixed toolbar flag
            s.enableFixedToolbar = value;
            const nextStyle = resolveNextPositionStyle(
              s,
              "fixed",
              value,
              prevStyle,
            );
            if (nextStyle && nextStyle !== prevStyle) {
              this.plugin.onPositionStyleChange(nextStyle);
            }
            await this.plugin.saveSettings();
            this.plugin.handleEditingToolbar();
            this.display();
          });
      });
    // Custom background and font color settings
    const paintbrushContainer = containerEl.createDiv(
      "custom-paintbrush-container",
    );
    new Setting(paintbrushContainer)
      .setName(strings.setCustomBackground)
      .setDesc(strings.clickPickerAdjustColor)
      .setClass("custom_bg")
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({
          cls: "pickr-container",
        });

        for (let i = 0; i < 5; i++) {
          const pickerEl = pickerContainer.createDiv({ cls: "picker" });

          const pickr = Pickr.create(
            getPickrSettings({
              isView: false,
              el: pickerEl,
              containerEl: pickerContainer,
              swatches: [
                "#FFB78B8C",
                "#CDF4698C",
                "#A0CCF68C",
                "#F0A7D88C",
                "#ADEFEF8C",
              ],
              opacity: true,
              defaultColor:
                this.plugin.settings[`custom_bg${i + 1}` as CustomColorKey] ||
                "#000000",
            }),
          );
          this.setupPickrEvents(pickr, `custom_bg${i + 1}`, "background-color");
          this.pickrs.push(pickr);
        }
      });
    new Setting(paintbrushContainer)
      .setName(strings.setCustomFontColor)
      .setDesc(strings.clickPickerAdjustColor)
      .setClass("custom_font")
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({
          cls: "pickr-container",
        });

        for (let i = 0; i < 5; i++) {
          const pickerEl = pickerContainer.createDiv({ cls: "picker" });

          const pickr = Pickr.create(
            getPickrSettings({
              isView: false,
              el: pickerEl,
              containerEl: pickerContainer,
              swatches: ["#D83931", "#DE7802", "#245BDB", "#6425D0", "#646A73"],
              opacity: true,
              defaultColor:
                this.plugin.settings[`custom_fc${i + 1}` as CustomColorKey] ||
                "#000000",
            }),
          );
          this.setupPickrEvents(pickr, `custom_fc${i + 1}`, "color");
          this.pickrs.push(pickr);
        }
      });
  }
  private displayAppearanceSettings(containerEl: HTMLElement): void {
    const appearanceSettingContainer = containerEl.createDiv(
      "appearanceSetting-container",
    );
    // Aesthetic style setting

    // Decide which style we are editing in this tab
    const editingStyle = this.resolveEditingStyle();
    this.plugin.appearanceEditStyle = editingStyle;

    // Style picker – only controls which style's settings you edit
    new Setting(appearanceSettingContainer)
      .setName(strings.toolbarSettings)
      .setDesc(strings.chooseWhichToolbarStyleS)
      .addDropdown((dropdown) => {
        const positions: Record<string, string> = {};
        POSITION_STYLES.map(
          (position) => (positions[position] = POSITION_STYLE_LABELS[position]),
        );
        dropdown
          .addOptions(positions)
          .setValue(editingStyle)
          .onChange(async (value) => {
            const style = value as ToolbarStyleKey;
            this.plugin.appearanceEditStyle = style; // which style we edit
            this.plugin.settings.positionStyle = style; // persist choice
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (editingStyle === "fixed") {
      new Setting(appearanceSettingContainer)
        .setName(strings.editingToolbarColumns)
        .setDesc(strings.chooseNumberColumnsPerRow)
        .addSlider((slider) => {
          slider
            .setLimits(1, 32, 1)
            .setValue(this.plugin.settings.cMenuNumRows)
            .onChange(
              debounce(
                async (value: number) => {
                  this.plugin.settings.cMenuNumRows = value;
                  await this.plugin.saveSettings();
                  this.triggerRefresh();
                },
                100,
                true,
              ),
            )
            .setDynamicTooltip();
        });
      new Setting(appearanceSettingContainer)
        .setName(strings.fixedPositionOffset)
        .setDesc(strings.chooseOffsetEditingToolbarFixed)
        .addButton((button) =>
          button.setButtonText(strings.settings).onClick(() => {
            new openSlider(this.app, this.plugin).open();
          }),
        );
    }
    // Color settings
    this.createColorSettings(containerEl);
  }
  private displayCommandSettings(containerEl: HTMLElement): void {
    const commandSettingContainer = containerEl.createDiv(
      "commandSetting-container",
    );
    new Setting(commandSettingContainer)
      .setName(strings.currentConfiguration)
      .setDesc(strings.switchBetweenDifferentCommandConfigurations)
      .addDropdown((dropdown) => {
        dropdown.addOption("top", strings.topStyle);
        dropdown.addOption("fixed", strings.fixedStyle);
        dropdown.addOption("following", strings.followingStyle);

        dropdown.setValue(this.currentEditingConfig);

        dropdown.onChange(async (value) => {
          this.currentEditingConfig = value;
          this.display();
        });
      });

    const currentConfigType = this.currentEditingConfig;
    const buttonContainer = containerEl.createDiv("command-buttons-container");

    const importSetting = new Setting(buttonContainer)
      .setName(strings.import2)
      .setDesc(strings.copyCommandsAnotherStyleConfiguration);

    let selectedSourceStyle = "Main menu";
    const configSwitcher = new Setting(buttonContainer);

    configSwitcher.addDropdown((dropdown) => {
      dropdown.addOption("Main menu", "Main Menu Commands");

      if (currentConfigType !== "following") {
        dropdown.addOption("following", strings.followingStyle);
      }
      if (currentConfigType !== "top") {
        dropdown.addOption("top", strings.topStyle);
      }
      if (currentConfigType !== "fixed") {
        dropdown.addOption("fixed", strings.fixedStyle);
      }

      dropdown.setValue(selectedSourceStyle).onChange((value) => {
        selectedSourceStyle = value;
      });
    });
    configSwitcher.addExtraButton((button) => button.setIcon("arrow-right"));
    configSwitcher.addButton((button) =>
      button
        .setButtonText(this.currentEditingConfig + " " + strings.import)
        .setTooltip(strings.copyCommandsSelectedStyle)
        .onClick(async () => {
          const sourceCommands =
            this.getCommandsArrayByType(selectedSourceStyle);

          if (!sourceCommands || sourceCommands.length === 0) {
            new Notice(strings.selectedStyleNoCommandsImport);
            return;
          }

          const confirmMessage = `${strings.importCommandsFrom} "${selectedSourceStyle}" ${strings.toLabel} "${this.currentEditingConfig}" ${strings.configuration}?`;
          ConfirmModal.show(this.app, {
            message: confirmMessage,
            onConfirm: async () => {
              this.setCommandsArrayByType(currentConfigType, [
                ...sourceCommands,
              ]);
              await this.plugin.saveSettings();
              new Notice(
                `${strings.commandsImportedFrom} "${selectedSourceStyle}" ${strings.toLabel} "${this.currentEditingConfig}" ${strings.configuration}`,
              );
              this.display();
            },
          });
        }),
    );
    importSetting.addButton((button) =>
      button
        .setButtonText(strings.clear + " " + `${this.currentEditingConfig}`)
        .setTooltip(strings.removeAllCommandsConfiguration)
        .setWarning()
        .onClick(async () => {
          ConfirmModal.show(this.app, {
            message: strings.sureWantClearAllCommands,
            onConfirm: async () => {
              this.setCommandsArrayByType(currentConfigType, []);
              await this.plugin.saveSettings();
              new Notice(strings.allCommandsHaveBeenRemoved);
              this.display();
            },
          });
        }),
    );
    const commandListContainer = containerEl.createDiv(
      "command-lists-container",
    );
    commandListContainer.addClass(`${this.currentEditingConfig}`);
    commandListContainer.createEl("div", {
      cls: `position-style-info ${this.currentEditingConfig}`,
      text:
        strings.currentlyEditingCommands +
        ` "${this.currentEditingConfig} Style" ` +
        strings.configuration,
    });
    new Setting(commandListContainer)
      .setName(strings.editingToolbarCommands)
      .setDesc(strings.addCommandOntoEditingToolbar)
      .addButton((addButton) => {
        addButton
          .setIcon("plus")
          .setTooltip(strings.add)
          .onClick(() => {
            new CommandPicker(this.plugin, this.currentEditingConfig).open();
            this.triggerRefresh();
          });
      });
    this.createCommandList(commandListContainer);
  }
  private triggerRefresh(): void {
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }
  private createHeader(containerEl: HTMLElement): void {
    const headerContainer = containerEl.createEl("div", {
      cls: "editing-toolbar-header",
    });
    const titleContainer = headerContainer.createEl("div", {
      cls: "editing-toolbar-title-container",
    });
    titleContainer.createEl("h1", {
      text: "Obsidian Editing Toolbar: " + this.plugin.manifest.version,
      cls: "editing-toolbar-title",
    });
  }
  private getAppearanceBucket(style: ToolbarStyleKey): StyleAppearanceSettings {
    const settings = this.plugin.settings;

    if (
      !settings.appearanceByStyle ||
      typeof settings.appearanceByStyle !== "object"
    ) {
      settings.appearanceByStyle = {} as AppearanceByStyle;
    }
    const store = settings.appearanceByStyle as AppearanceByStyle;
    if (!store[style] || typeof store[style] !== "object") {
      store[style] = {};
    }
    return store[style]!;
  }

  /** The toolbar style whose appearance is currently being edited in this tab. */
  private resolveEditingStyle(): ToolbarStyleKey {
    return (
      (this.plugin.appearanceEditStyle as ToolbarStyleKey) ||
      (this.plugin.settings.positionStyle as ToolbarStyleKey) ||
      "top"
    );
  }
  private createColorSettings(containerEl: HTMLElement): void {
    const editingStyle = this.resolveEditingStyle();
    const appearanceBucket = this.getAppearanceBucket(editingStyle);

    const toolbarContainer = containerEl.createDiv("custom-toolbar-container");
    new Setting(toolbarContainer)
      .setName(strings.toolbarTheme)
      .setDesc(strings.selectPresetToolbarThemeAutomatically)
      .addDropdown((dropdown) => {
        const aesthetics: Record<string, string> = {};
        AESTHETIC_STYLES.forEach((aesthetic) => {
          aesthetics[aesthetic] = AESTHETIC_STYLE_LABELS[aesthetic];
        });
        dropdown.addOptions(aesthetics);
        dropdown.selectEl.options[3].disabled = true; // disable the raw "custom" option
        dropdown.addOption("light", strings.light);
        dropdown.addOption("dark", strings.dark);
        dropdown.addOption("vibrant", strings.vibrant);
        dropdown.addOption("minimal", strings.minimal);
        dropdown.addOption("elegant", strings.elegant);
        // Use the bucket for the currently edited style
        dropdown.setValue(
          (appearanceBucket.aestheticStyle as string) ??
            this.plugin.settings.aestheticStyle,
        );
        dropdown.onChange(async (value) => {
          const style = this.resolveEditingStyle();
          const bucket = this.getAppearanceBucket(style);

          if (value in aesthetics) {
            bucket.aestheticStyle = value;
            bucket.toolbarIconSize = 18;
          } else {
            // custom presets all map to "custom" aestheticStyle
            bucket.aestheticStyle = "custom";
          }
          // Set colours/sizes in the per-style bucket
          switch (value) {
            case "light":
              bucket.toolbarBackgroundColor = "#F5F8FA";
              bucket.toolbarIconColor = "#4A5568";
              bucket.toolbarIconSize = 18;
              break;
            case "dark":
              bucket.toolbarBackgroundColor = "#2D3033";
              bucket.toolbarIconColor = "#E2E8F0";
              bucket.toolbarIconSize = 18;
              break;
            case "vibrant":
              bucket.toolbarBackgroundColor = "#7E57C2";
              bucket.toolbarIconColor = "#FFFFFF";
              bucket.toolbarIconSize = 20;
              break;
            case "minimal":
              bucket.toolbarBackgroundColor = "#F8F9FA";
              bucket.toolbarIconColor = "#6B7280";
              bucket.toolbarIconSize = 16;
              break;
            case "elegant":
              bucket.toolbarBackgroundColor = "#1A2F28";
              bucket.toolbarIconColor = "#D4AF37";
              bucket.toolbarIconSize = 19;
              break;
          }
          // Push the current style's values into the global CSS vars
          const bg =
            bucket.toolbarBackgroundColor ??
            this.plugin.settings.toolbarBackgroundColor;
          const icon =
            bucket.toolbarIconColor ?? this.plugin.settings.toolbarIconColor;
          const size = bucket.toolbarIconSize ?? 18;

          document.documentElement.style.setProperty(
            "--editing-toolbar-background-color",
            bg,
          );
          document.documentElement.style.setProperty(
            "--editing-toolbar-icon-color",
            icon,
          );
          document.documentElement.style.setProperty(
            "--toolbar-icon-size",
            `${size}px`,
          );

          this.plugin.toolbarIconSize = size;
          this.destroyPickrs();
          this.display();
          await this.plugin.saveSettings();
          this.triggerRefresh();
        });
      });
    new Setting(toolbarContainer)
      .setName(strings.toolbarBackgroundColor)
      .setDesc(strings.setBackgroundColorToolbar)
      .setClass("toolbar_background")
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({
          cls: "pickr-container",
        });
        const pickerEl = pickerContainer.createDiv({ cls: "picker" });
        const pickr = Pickr.create(
          getPickrSettings({
            isView: false,
            el: pickerEl,
            containerEl: pickerContainer,
            swatches: ["#F5F8FA", "#F4F1E8", "#2D3033", "#1A2F28", "#2A1D3B"],
            opacity: true,
            defaultColor:
              appearanceBucket.toolbarBackgroundColor ??
              this.plugin.settings.toolbarBackgroundColor,
          }),
        );
        this.setupPickrEvents(
          pickr,
          "toolbarBackgroundColor",
          "background-color",
        );
        this.pickrs.push(pickr);
      });
    new Setting(toolbarContainer)
      .setName(strings.toolbarIconColor)
      .setDesc(strings.setColorToolbarIcon)
      .setClass("toolbar_icon")
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({
          cls: "pickr-container",
        });
        const pickerEl = pickerContainer.createDiv({ cls: "picker" });
        const pickr = Pickr.create(
          getPickrSettings({
            isView: false,
            el: pickerEl,
            containerEl: pickerContainer,
            swatches: ["#4A5568", "#D4AF37", "#2D3033", "#6D5846", "#4C2A55"],
            opacity: false,
            defaultColor: getAppearanceValue(
              this.plugin.settings,
              "toolbarIconColor",
              this.plugin.resolveActiveStyle(),
            ),
          }),
        );
        this.pickrs.push(pickr);
        this.setupPickrEvents(pickr, "toolbarIconColor", "icon-color");
      });
    new Setting(toolbarContainer)
      .setName(strings.toolbarIconSize)
      .setDesc(strings.setSizeToolbarIconPx)
      .addSlider((slider) => {
        const initialSize =
          appearanceBucket.toolbarIconSize ??
          this.plugin.settings.toolbarIconSize;

        slider
          .setValue(initialSize)
          .setLimits(12, 32, 1)
          .setDynamicTooltip()
          .onChange(async (value) => {
            const activeStyle = this.plugin.positionStyle;
            const style = this.resolveEditingStyle();
            const bucket = this.getAppearanceBucket(style);
            // Per-style value
            bucket.toolbarIconSize = value;
            bucket.aestheticStyle = "custom";
            // Only touch the live toolbar when editing the active style
            if (activeStyle === style) {
              this.plugin.toolbarIconSize = value;
              document.documentElement.style.setProperty(
                "--toolbar-icon-size",
                `${value}px`,
              );
            }
            await this.plugin.saveSettings();
            // Rebuild the settings UI and live toolbar so the preview
            // and the real toolbar both pick up the new size.
            this.display();
            this.triggerRefresh();
          });
      });
    const previewContainer = toolbarContainer.createDiv(
      "toolbar-preview-container",
    );
    previewContainer.addClass("toolbar-preview-section");
    previewContainer.createEl("h3", {
      text: strings.toolbarPreviewHypotheticalCommandConfigurati,
      cls: "toolbar-preview-label",
    });
    const wrapper = previewContainer.createDiv();
    wrapper.classList.add("preview-toolbar-wrapper");
    wrapper.classList.add(`preview-${editingStyle}`);
    const editingToolbar = wrapper.createDiv();
    editingToolbar.classList.add("editing-toolbar-preview");
    editingToolbar.classList.add(`preview-${editingStyle}`);
    editingToolbar.setAttribute("id", "editingToolbarModalBar");
    // Use the per-style aesthetic if set; fall back to the global one
    const previewAestheticStyle =
      (appearanceBucket.aestheticStyle as string) ??
      this.plugin.settings.aestheticStyle ??
      "default";
    this.applyAestheticStyle(
      editingToolbar,
      previewAestheticStyle,
      editingStyle,
    );
    if (editingStyle === "fixed") {
      const icon =
        getAppearanceValue(
          this.plugin.settings,
          "toolbarIconSize",
          this.plugin.resolveActiveStyle(),
        ) || 18;
      const cols = this.plugin.settings.cMenuNumRows || 6;
      editingToolbar.style.display = "grid";
      editingToolbar.style.gridTemplateColumns = `repeat(${cols}, ${icon + 10}px)`;
      editingToolbar.style.gap = `${Math.max((icon - 18) / 4, 2)}px`;
      editingToolbar.style.margin = "0 auto"; // centers the grid like top/following
    }
    const previewCommands = [
      { id: "bold", name: "Bold", icon: "bold" },
      { id: "italics", name: "Italics", icon: "italic" },
      { id: "trikethrough", name: "Strikethrough", icon: "strikethrough" },
      { id: "code", name: "Code", icon: "code" },
      { id: "blockquote", name: "Blockquote", icon: "quote-glyph" },
      { id: "insert-link", name: "Link", icon: "link" },
      { id: "left-sidebar", name: "Left sidebar", icon: "lucide-panel-left" },
      {
        id: "editor:insert-embed",
        name: "Add embed",
        icon: "note-glyph",
      },
      {
        id: "editor:insert-link",
        name: "Insert markdown link",
        icon: "link-glyph",
      },
      {
        id: "editor:insert-tag",
        name: "Add tag",
        icon: "price-tag-glyph",
      },
      {
        id: "editor:insert-wikilink",
        name: "Add internal link",
        icon: "bracket-glyph",
      },
      {
        id: "editor:toggle-code",
        name: "Code",
        icon: "code-glyph",
      },
      {
        id: "editor:toggle-blockquote",
        name: "Blockquote",
        icon: "lucide-text-quote",
      },
      {
        id: "editor:toggle-checklist-status",
        name: "Checklist status",
        icon: "checkbox-glyph",
      },
      {
        id: "editor:toggle-comments",
        name: "Comment",
        icon: "percent-sign-glyph",
      },

      {
        id: "editor:insert-callout",
        name: "Insert Callout",
        icon: "lucide-quote",
      },
      {
        id: "editor:insert-mathblock",
        name: "MathBlock",
        icon: "lucide-sigma-square",
      },
      {
        id: "editor:insert-table",
        name: "Insert Table",
        icon: "lucide-table",
      },
    ];
    previewCommands.forEach((item) => {
      const button = new ButtonComponent(editingToolbar);
      button.setClass("editingToolbarCommandItem");
      button.buttonEl.classList.add("preview-button");
      button.setTooltip(t(item.name));

      if (item.icon) {
        setIcon(button.buttonEl, item.icon);
      }
    });
    // Apply the current style's colours and icon size directly to the preview.
    // Only override colours when we're using a custom theme; for the built-in
    // "default", "tiny" and "glass" styles we rely on the CSS classes instead.
    const usesCustomColours = previewAestheticStyle === "custom";
    const bg =
      appearanceBucket.toolbarBackgroundColor ??
      this.plugin.settings.toolbarBackgroundColor;
    const iconColor =
      appearanceBucket.toolbarIconColor ??
      this.plugin.settings.toolbarIconColor;
    const size =
      appearanceBucket.toolbarIconSize ??
      this.plugin.settings.toolbarIconSize ??
      18;
    if (usesCustomColours && bg) {
      editingToolbar.style.backgroundColor = bg;
    } else {
      editingToolbar.style.removeProperty("background-color");
    }
    const iconSvgs = editingToolbar.querySelectorAll<SVGElement>("svg");
    iconSvgs.forEach((svg) => {
      if (usesCustomColours && iconColor) {
        svg.style.color = iconColor;
      } else {
        svg.style.removeProperty("color");
      }
      svg.style.width = `${size}px`;
      svg.style.height = `${size}px`;
    });
  }
  private createCommandList(containerEl: HTMLElement): void {
    const commandsToEdit: Command[] = this.getCommandsArrayByType(
      this.currentEditingConfig,
    );
    const editingToolbarCommandsContainer = containerEl.createEl("div", {
      cls: "editingToolbarSettingsTabsContainer",
    });
    let dragele = "";
    Sortable.create(editingToolbarCommandsContainer, {
      group: "item",
      animation: 500,
      draggable: ".setting-item",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      dragoverBubble: false,
      forceFallback: true,
      fallbackOnBody: true,
      swapThreshold: 0.7,
      fallbackClass: "sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      delay: 800,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      filter:
        ".setting-item-control button, .dropdown, .editingToolbarMenuTypeDropdown",
      preventOnFilter: false,
      onChoose: function (evt) {
        const item = evt.item;
        item.classList.add("sortable-chosen-feedback");
      },
      onUnchoose: function (evt) {
        const item = evt.item;
        item.classList.remove("sortable-chosen-feedback");
      },
      onSort: (command) => {
        if (command.oldIndex == null || command.newIndex == null) return;
        if (command.from.className === command.to.className) {
          const arrayResult = commandsToEdit;
          const [removed] = arrayResult.splice(command.oldIndex, 1);
          arrayResult.splice(command.newIndex, 0, removed);
          this.setCommandsArrayByType(this.currentEditingConfig, arrayResult);
          this.plugin.saveSettings();
        }
        this.triggerRefresh();
      },
      onStart: function (evt) {
        dragele = evt.item.className;
      },
    });
    const currentCommands = commandsToEdit;
    currentCommands.forEach((newCommand: Command, index: number) => {
      const setting = new Setting(editingToolbarCommandsContainer);
      if ("SubmenuCommands" in newCommand) {
        setting.settingEl.setAttribute("data-id", newCommand.id);
        setting
          .setClass("editingToolbarCommandItem")
          .setClass("editingToolbarCommandsubItem")
          .setName(this.getLocalizedCommandName(newCommand.name))
          .addButton((addicon) => {
            addicon.setClass("editingToolbarSettingsIcon").onClick(async () => {
              new ChooseFromIconList(
                this.plugin,
                newCommand,
                false,
                undefined,
                this.currentEditingConfig,
              ).open();
            });
            checkHtml(newCommand.icon ?? "")
              ? (addicon.buttonEl.innerHTML = newCommand.icon ?? "")
              : addicon.setIcon(newCommand.icon ?? "");
          })
          .addButton((changename) => {
            changename
              .setIcon("pencil")
              .setTooltip(strings.changeSubmenuName)
              .setClass("editingToolbarSettingsButton")
              .onClick(async () => {
                new ChangeCmdname(
                  this.app,
                  this.plugin,
                  newCommand,
                  false,
                  this.currentEditingConfig,
                ).open();
              });
          })
          .addDropdown((dropdown) => {
            dropdown
              .addOption("submenu", strings.buttonSubmenu)
              .addOption("dropdown", strings.dropdownMenu)
              .setValue(newCommand.menuType || "submenu")
              .onChange(async (value: string) => {
                newCommand.menuType = value as "submenu" | "dropdown";
                this.plugin.updateCurrentCommands(
                  currentCommands,
                  this.currentEditingConfig,
                );
                await this.plugin.saveSettings();
                this.triggerRefresh();
                new Notice(
                  strings.menuTypeChanged +
                    ": " +
                    (value === "dropdown"
                      ? strings.dropdownMenu
                      : strings.buttonSubmenu),
                );
              });
            dropdown.selectEl.addClass("editingToolbarMenuTypeDropdown");
          })
          .addButton((deleteButton) =>
            this.createDeleteButton(deleteButton, async () => {
              currentCommands.remove(newCommand);
              this.plugin.updateCurrentCommands(
                currentCommands,
                this.currentEditingConfig,
              );
              await this.plugin.saveSettings();
              this.display();
              this.triggerRefresh();
              console.log(
                `%cCommand '${newCommand.name}' was removed from editingToolbar`,
                "color: #989cab",
              );
            }),
          );

        if (newCommand.id == "editingToolbar-plugin:change-font-color") return;
        if (newCommand.id == "editingToolbar-plugin:change-background-color")
          return;

        const editingToolbarCommandsContainer_sub = setting.settingEl.createEl(
          "div",
          {
            cls: "editingToolbarSettingsTabsContainer_sub",
          },
        );
        Sortable.create(editingToolbarCommandsContainer_sub, {
          group: {
            name: "item",
            pull: true,
            put: function () {
              if (dragele.includes("editingToolbarCommandsubItem"))
                return false;
              else return true;
            },
          },
          draggable: ".setting-item",
          animation: 150,
          ghostClass: "sortable-ghost",
          chosenClass: "sortable-chosen",
          dragClass: "sortable-drag",
          dragoverBubble: false,
          fallbackOnBody: true,
          swapThreshold: 0.7,
          forceFallback: true,
          delay: 800,
          delayOnTouchOnly: true,
          touchStartThreshold: 5,
          fallbackClass: "sortable-fallback",
          easing: "cubic-bezier(1, 0, 0, 1)",
          onStart: function () {},
          onSort: (command) => {
            if (command.oldIndex == null || command.newIndex == null) return;

            if (command.from.className === command.to.className) {
              const arrayResult = commandsToEdit;
              const subresult = arrayResult[index]?.SubmenuCommands;

              if (subresult) {
                const [removed] = subresult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
                this.plugin.updateCurrentCommands(
                  arrayResult,
                  this.currentEditingConfig,
                );
                this.plugin.saveSettings();
              }
            } else if (
              command.to.className === "editingToolbarSettingsTabsContainer"
            ) {
              const arrayResult = commandsToEdit;
              const datasetId = command.target.parentElement?.dataset?.["id"];

              if (!datasetId) {
                console.error("Cannot find parent dataset id");
                return;
              }

              const cmdindex = getComandindex(datasetId, arrayResult);

              if (cmdindex === -1 || !arrayResult[cmdindex]) {
                console.error("Cannot find parent command:", datasetId);
                return;
              }

              const subresult = arrayResult[cmdindex].SubmenuCommands;

              if (
                !subresult ||
                !Array.isArray(subresult) ||
                command.oldIndex < 0 ||
                command.oldIndex >= subresult.length
              ) {
                console.error("Invalid drag operation");
                return;
              }

              const [removed] = subresult.splice(command.oldIndex, 1);
              arrayResult.splice(command.newIndex, 0, removed);
              this.plugin.updateCurrentCommands(
                arrayResult,
                this.currentEditingConfig,
              );
              this.plugin.saveSettings();
            } else if (
              command.from.className === "editingToolbarSettingsTabsContainer"
            ) {
              const arrayResult = commandsToEdit;
              const fromDatasetId =
                command.target.parentElement?.dataset?.["id"];

              if (!fromDatasetId) {
                console.error("Cannot find target dataset id");
                return;
              }

              const cmdindex = getComandindex(fromDatasetId, arrayResult);

              if (cmdindex === -1 || !arrayResult[cmdindex]) {
                console.error("Cannot find target command:", fromDatasetId);
                return;
              }

              const subresult = arrayResult[cmdindex].SubmenuCommands;

              if (
                !subresult ||
                !Array.isArray(subresult) ||
                command.oldIndex < 0 ||
                command.oldIndex >= arrayResult.length
              ) {
                console.error("Invalid drag operation");
                return;
              }

              const [removed] = arrayResult.splice(command.oldIndex, 1);
              subresult.splice(command.newIndex, 0, removed);
              this.plugin.updateCurrentCommands(
                arrayResult,
                this.currentEditingConfig,
              );
              this.plugin.saveSettings();
            }
            this.triggerRefresh();
          },
        });
        newCommand.SubmenuCommands!.forEach((subCommand: Command) => {
          const subsetting = new Setting(editingToolbarCommandsContainer_sub);
          subsetting
            .setClass("editingToolbarCommandItem")
            .addButton((addicon) => {
              addicon
                .setClass("editingToolbarSettingsIcon")
                .onClick(async () => {
                  new ChooseFromIconList(
                    this.plugin,
                    subCommand,
                    true,
                    undefined,
                    this.currentEditingConfig,
                  ).open();
                });
              checkHtml(subCommand?.icon ?? "")
                ? (addicon.buttonEl.innerHTML = subCommand.icon ?? "")
                : addicon.setIcon(subCommand.icon ?? "");
            })
            .setName(this.getLocalizedCommandName(subCommand.name))
            .addButton((changename) => {
              changename
                .setIcon("pencil")
                .setTooltip(strings.changeCommandName)
                .setClass("editingToolbarSettingsButton")
                .onClick(async () => {
                  new ChangeCmdname(
                    this.app,
                    this.plugin,
                    subCommand,
                    true,
                    this.currentEditingConfig,
                  ).open();
                });
            })
            .addButton((deleteButton) =>
              this.createDeleteButton(deleteButton, async () => {
                newCommand.SubmenuCommands!.remove(subCommand);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
                console.log(
                  `%cCommand '${newCommand.name}' was removed from editingToolbar`,
                  "color: #989cab",
                );
              }),
            );
        });
      } else {
        setting.addButton((addicon) => {
          addicon
            //    .setIcon(newCommand.icon)
            .setClass("editingToolbarSettingsIcon")
            .onClick(async () => {
              new ChooseFromIconList(
                this.plugin,
                newCommand,
                false,
                undefined,
                this.currentEditingConfig,
              ).open();
            });
          checkHtml(newCommand.icon ?? "")
            ? (addicon.buttonEl.innerHTML = newCommand.icon ?? "")
            : addicon.setIcon(newCommand.icon ?? "");
        });
        if (newCommand.id == "editingToolbar-Divider-Line")
          setting.setClass("editingToolbar-Divider-Line");
        setting
          .setClass("editingToolbarCommandItem")
          .setName(this.getLocalizedCommandName(newCommand.name))
          .addButton((changename) => {
            changename
              .setIcon("pencil")
              .setTooltip(strings.changeCommandName)
              .setClass("editingToolbarSettingsButton")
              .onClick(async () => {
                new ChangeCmdname(
                  this.app,
                  this.plugin,
                  newCommand,
                  false,
                  this.currentEditingConfig,
                ).open();
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("editingToolbarSub")
              .setTooltip(strings.addSubmenu)
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonaddsub")
              .onClick(async () => {
                const submenuCommand: SubmenuCommand = {
                  id: "SubmenuCommands-" + GenNonDuplicateID(1),
                  name: "submenu",
                  icon: "remix-Filter3Line",
                  SubmenuCommands: [],
                };
                const currentCommands = commandsToEdit;
                currentCommands.splice(index + 1, 0, submenuCommand);
                this.plugin.updateCurrentCommands(
                  currentCommands,
                  this.currentEditingConfig,
                );
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
                console.log(
                  `%cCommand '${submenuCommand.id}' add `,
                  "color: #989cab",
                );
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("vertical-split")
              .setTooltip(strings.addSeparator)
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonaddsub")
              .onClick(async () => {
                const dividermenu = {
                  id: "editingToolbar-Divider-Line",
                  name: strings.verticalSplit,
                  icon: "vertical-split",
                };
                const currentCommands = commandsToEdit;
                currentCommands.splice(index + 1, 0, dividermenu);
                this.plugin.updateCurrentCommands(
                  currentCommands,
                  this.currentEditingConfig,
                );
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
              });
          })
          .addButton((deleteButton) =>
            this.createDeleteButton(deleteButton, async () => {
              currentCommands.remove(newCommand);
              this.plugin.updateCurrentCommands(
                currentCommands,
                this.currentEditingConfig,
              );
              await this.plugin.saveSettings();
              this.display();
              this.triggerRefresh();
              console.log(
                `%cCommand '${newCommand.name}' was removed from editingToolbar`,
                "color: #989cab",
              );
            }),
          );
      }
    });
  }
  private setupPickrEvents(
    pickr: Pickr,
    settingKey: string,
    cssProperty: string,
  ) {
    pickr.on("save", (color: Pickr.HSVaColor) => {
      const hexColor = color.toHEXA().toString();

      const activeStyle = this.plugin.positionStyle;
      const editingStyle =
        (this.plugin.appearanceEditStyle as ToolbarStyleKey) ||
        (this.plugin.settings.positionStyle as ToolbarStyleKey) ||
        activeStyle ||
        "top";
      // For the main toolbar colour fields, use the per-style bucket.
      if (
        settingKey === "toolbarBackgroundColor" ||
        settingKey === "toolbarIconColor"
      ) {
        const bucket = this.getAppearanceBucket(
          editingStyle as ToolbarStyleKey,
        );
        bucket[settingKey] = hexColor;
        // Only push CSS variables if we're editing the active style
        if (activeStyle === editingStyle) {
          document.documentElement.style.setProperty(
            `--editing-toolbar-${cssProperty}`,
            hexColor,
          );
        }
        // Changing a colour implies a custom aesthetic for this style
        if (bucket.aestheticStyle !== "custom") {
          bucket.aestheticStyle = "custom";
        }
        // Immediately refresh the settings UI and live toolbar so the
        // preview and real toolbar both match the new colour.
        this.display();
        this.triggerRefresh();
      } else {
        // All other keys (custom_bgX/custom_fcX) stay as global settings
        this.plugin.settings[settingKey as CustomColorKey] = hexColor;
      }
      this.plugin.saveSettings();
    });
  }
  private destroyPickrs() {
    this.pickrs.forEach((pickr) => {
      if (pickr) {
        pickr.destroyAndRemove();
      }
    });
    this.pickrs = [];
  }
  hide(): void {
    this.destroyPickrs();
    this.triggerRefresh();
  }
  private removeCommandFromConfig(commands: Command[], commandId: string) {
    if (!commands) return;
    for (let i = commands.length - 1; i >= 0; i--) {
      if (commands[i].id === commandId) {
        commands.splice(i, 1);
        continue;
      }
      const submenu = commands[i].SubmenuCommands;
      if (submenu) {
        this.removeCommandFromConfig(submenu, commandId);
      }
    }
  }

  private displayImportExportSettings(containerEl: HTMLElement): void {
    const importExportContainer = containerEl.createDiv(
      "import-export-container",
    );
    new Setting(importExportContainer)
      .setName(strings.exportConfiguration)
      .setDesc(strings.exportToolbarConfigurationShareOthers)
      .addButton((button) =>
        button
          .setButtonText(strings.export)
          .setCta()
          .onClick(() => {
            new ImportExportModal(this.app, this.plugin, "export").open();
          }),
      );
    new Setting(importExportContainer)
      .setName(strings.importConfiguration)
      .setDesc(strings.importToolbarConfigurationJson)
      .addButton((button) =>
        button
          .setButtonText(strings.import)
          .setCta()
          .onClick(() => {
            new ImportExportModal(this.app, this.plugin, "import").open();
          }),
      );
    const infoDiv = containerEl.createDiv("import-export-info");
    infoDiv.createEl("h3", {
      text: strings.usageInstructions,
      cls: "import-export-heading",
    });

    const ul = infoDiv.createEl("ul");
    ul.createEl("li", { text: strings.exportGenerateJsonConfigurationCan });
    ul.createEl("li", { text: strings.importPastePreviouslyExportedJson });
    const warningDiv = containerEl.createDiv("import-export-warning");
    warningDiv.createEl("p", {
      text: strings.warningImportingConfigurationOverwriteCurren,
      cls: "warning-text",
    });
  }
  private aestheticStyleMap: { [key: string]: string } = {
    default: "editingToolbarDefaultAesthetic",
    tiny: "editingToolbarTinyAesthetic",
    glass: "editingToolbarGlassAesthetic",
    custom: "editingToolbarCustomAesthetic",
    top: "top",
    following: "editingToolbarFlex",
    fixed: "fixed",
  };
  private applyAestheticStyle(
    element: HTMLElement,
    aestheticStyle: string,
    positionStyle: string,
  ) {
    Object.values(this.aestheticStyleMap).forEach((className) => {
      element.removeClass(className);
    });
    const selectedAestheticClass =
      this.aestheticStyleMap[aestheticStyle] || this.aestheticStyleMap.default;
    element.addClass(selectedAestheticClass);
    const positionClass =
      this.aestheticStyleMap[positionStyle] || this.aestheticStyleMap.top;
    element.addClass(positionClass);
  }
  private getCommandsArrayByType(type: string): Command[] {
    switch (type) {
      case "following":
        return this.plugin.settings.followingCommands;
      case "top":
        return this.plugin.settings.topCommands;
      case "fixed":
        return this.plugin.settings.fixedCommands;
      default:
        return this.plugin.settings.menuCommands;
    }
  }
  private setCommandsArrayByType(type: string, commands: Command[]): void {
    switch (type) {
      case "following":
        this.plugin.settings.followingCommands = commands;
        break;
      case "top":
        this.plugin.settings.topCommands = commands;
        break;
      case "fixed":
        this.plugin.settings.fixedCommands = commands;
        break;
      default:
        this.plugin.settings.menuCommands = commands;
    }
  }
}
