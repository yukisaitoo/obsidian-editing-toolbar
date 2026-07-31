import {
  App,
  ButtonComponent,
  Command,
  Modal,
  Notice,
  Setting,
  TextAreaComponent,
} from "obsidian";
import { ConfirmModal } from "src/modals/ConfirmModal";
import type EditingToolbarPlugin from "src/plugin/main";
import type {
  EditingToolbarSettings,
  StyleAppearanceSettings,
  ToolbarStyleKey,
} from "src/settings/settingsData";
import { POSITION_STYLES } from "src/settings/settingsData";
import { strings } from "src/translations/helper";
import { parseCommandList } from "src/util/commandStorage";

// Import/export crosses a JSON boundary with no schema: every payload below is
// whatever the user's file happened to contain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonPayload = any;

// Every flat setting the payload carries. The per-style appearance buckets are
// nested, so they travel separately via importAppearance().
const GENERAL_SETTING_KEYS: (keyof EditingToolbarSettings)[] = [
  "positionStyle",
  "enableTopToolbar",
  "enableFollowingToolbar",
  "toolbarVisible",
  "lastFontColor",
  "lastHighlightColor",
  "custom_bg1",
  "custom_bg2",
  "custom_bg3",
  "custom_bg4",
  "custom_bg5",
  "custom_fc1",
  "custom_fc2",
  "custom_fc3",
  "custom_fc4",
  "custom_fc5",
];

const APPEARANCE_KEYS: (keyof StyleAppearanceSettings)[] = [
  "toolbarBackgroundColor",
  "toolbarIconColor",
  "toolbarIconSize",
];

const COMMAND_LIST_LABELS: Record<
  ToolbarStyleKey,
  { update: string; clear: string }
> = {
  top: {
    update: strings.updateTopStyleCommands,
    clear: strings.clearAllTopStyleCommands,
  },
  following: {
    update: strings.updateFollowingStyleCommands,
    clear: strings.clearAllFollowingStyleCommands,
  },
};

interface ImportedCommandList {
  style: ToolbarStyleKey;
  commands: Command[];
}

export class ImportExportModal extends Modal {
  plugin: EditingToolbarPlugin;
  mode: "import" | "export";
  importMode: "overwrite" | "update";
  textArea!: TextAreaComponent;
  importButton!: ButtonComponent;
  warningContent!: HTMLElement;

  constructor(
    app: App,
    plugin: EditingToolbarPlugin,
    mode: "import" | "export",
  ) {
    super(app);
    this.plugin = plugin;
    this.mode = mode;
    this.importMode = "update";
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.addClass("editing-toolbar-import-export-modal");

    contentEl.createEl("h2", {
      text:
        this.mode === "import"
          ? strings.importConfiguration
          : strings.exportConfiguration,
    });

    if (this.mode === "export") {
      const exportContainer = contentEl.createDiv("export-container");

      this.textArea = new TextAreaComponent(exportContainer);
      this.textArea
        .setValue("")
        .setPlaceholder(strings.loading)
        .then((textArea) => {
          textArea.inputEl.addClass("import-export-textarea");
        });

      this.updateExportContent();
      const buttonContainer = contentEl.createDiv(
        "import-export-button-container",
      );

      const copyButton = buttonContainer.createEl("button", {
        text: strings.copyClipboard,
        cls: "mod-cta",
      });

      copyButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(this.textArea.getValue())
          .then(() => {
            new Notice(strings.configurationCopiedClipboard);
          })
          .catch((err) => {
            console.error("editing-toolbar: failed to copy configuration", err);
            new Notice(strings.failedCopyConfiguration);
          });
      });
    } else {
      new Setting(contentEl)
        .setName(strings.importMode)
        .setDesc(strings.chooseHowImportConfiguration)
        .addDropdown((dropdown) => {
          dropdown
            .addOption("update", strings.updateModeAddNewItems)
            .addOption(
              "overwrite",
              strings.overwriteModeReplaceSettingsImported,
            )
            .setValue(this.importMode)
            .onChange((value) => {
              this.importMode = value as "overwrite" | "update";
              this.importButton.setButtonText(
                this.importMode === "overwrite"
                  ? strings.overwriteImport
                  : strings.updateImport,
              );
              this.warningContent.setText(
                this.importMode === "overwrite"
                  ? strings.warningOverwriteModeReplaceExisting
                  : strings.warningUpdateModeAddNew,
              );
            });
        });
      const importContainer = contentEl.createDiv("import-container");

      this.textArea = new TextAreaComponent(importContainer);
      this.textArea
        .setValue("")
        .setPlaceholder(strings.pasteConfigurationHere)
        .then((textArea) => {
          textArea.inputEl.addClass("import-export-textarea");
        });

      const buttonContainer = contentEl.createDiv(
        "import-export-button-container",
      );

      new Setting(buttonContainer).addButton((button) => {
        this.importButton = button
          .setIcon("import")
          .setButtonText(strings.importConfiguration)
          .onClick(() => {
            this.importConfiguration();
          });
      });

      const warningDiv = contentEl.createDiv("import-export-warning");

      const warningParagraph = warningDiv.createEl("p", {
        text: strings.warningUpdateModeAddNew,
        cls: "warning-text",
      });
      this.warningContent = warningParagraph;
    }
  }

  updateExportContent() {
    const settings = this.plugin.settings;

    const exportContent: JsonPayload = {
      _exportInfo: {
        version: this.plugin.manifest.version,
        exportType: "all",
        exportTime: new Date().toISOString(),
        pluginId: this.plugin.manifest.id,
      },
      followingCommands: settings.followingCommands ?? [],
      topCommands: settings.topCommands ?? [],
      appearanceByStyle: settings.appearanceByStyle ?? {},
    };

    GENERAL_SETTING_KEYS.forEach((key) => {
      exportContent[key] = settings[key];
    });

    if (!exportContent.positionStyle) {
      exportContent.positionStyle = "top";
    }

    this.textArea.setValue(JSON.stringify(exportContent, null, 2));
  }

  async importConfiguration() {
    try {
      const importText = this.textArea.getValue();
      if (!importText.trim()) {
        new Notice(strings.pleasePasteConfigurationDataFirst);
        return;
      }

      const importData = JSON.parse(importText);

      if (!importData || typeof importData !== "object") {
        new Notice(strings.invalidImportDataFormat);
        return;
      }

      const containsGeneralSettings = "positionStyle" in importData;
      const positionStyle = importData.positionStyle;

      const lists: ImportedCommandList[] = [];
      for (const style of POSITION_STYLES) {
        const key = `${style}Commands` as const;
        if (!(key in importData)) continue;

        const commands = parseCommandList(importData[key]);
        if (!commands) {
          new Notice(strings.invalidImportDataFormat);
          return;
        }
        lists.push({ style, commands });
      }

      if (!lists.length && !containsGeneralSettings) {
        new Notice(strings.validConfigurationFoundImportData);
        return;
      }

      const isOverwrite = this.importMode === "overwrite";
      const summary = [strings.import3];

      if (containsGeneralSettings) {
        summary.push(`• ${strings.updateGeneralSettings}`);
      }
      for (const { style, commands } of lists) {
        const labels = COMMAND_LIST_LABELS[style];
        if (commands.length) {
          summary.push(`• ${labels.update} (${commands.length})`);
        } else if (isOverwrite) {
          summary.push(`• ${labels.clear} ⚠️`);
        }
      }
      if (positionStyle) {
        const name = this.getPositionStyleName(positionStyle);
        summary.push(`• ${strings.setPositionStyle} ${name}`);
      }

      summary.push(
        "",
        isOverwrite
          ? strings.overwriteModeReplaceExistingSettings
          : strings.updateModeMergeImportedSettings,
        strings.doWantContinue,
      );

      ConfirmModal.show(this.app, {
        message: summary.join("\n"),
        confirmWarning: true,
        onConfirm: async () => {
          const backup = this.snapshotSettings();

          try {
            this.applyImport(importData, lists);

            this.plugin.rebuildToolbars();

            await this.plugin.saveSettings();

            new Notice(strings.configurationImportedSuccessfully);
          } catch (error) {
            // Saving last keeps a failed import off disk, so restoring the
            // snapshot and rebuilding again undoes it completely. ConfirmModal
            // awaits this callback without a catch, so nothing is rethrown.
            this.plugin.settings = backup;
            this.plugin.rebuildToolbars();
            console.error("editing-toolbar: import failed", error);
            new Notice(
              strings.error +
                " " +
                (error instanceof Error ? error.message : String(error)),
            );
          }
          this.close();
        },
      });
    } catch (error) {
      console.error("Import error: ", error);
      new Notice(
        strings.error +
          " " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  // Not structuredClone: CommandPicker stores live Obsidian Command objects whose
  // callbacks would throw DataCloneError. The JSON round trip drops them, which is
  // what saveSettings() persists anyway — dispatch goes by command id.
  private snapshotSettings(): EditingToolbarSettings {
    return JSON.parse(JSON.stringify(this.plugin.settings));
  }

  private applyImport(
    importData: JsonPayload,
    lists: ImportedCommandList[],
  ): void {
    this.importGeneralSettings(importData);

    for (const { style, commands } of lists) {
      const key = `${style}Commands` as const;
      if (this.importMode === "overwrite") {
        this.plugin.settings[key] = commands;
      } else {
        this.updateCommandArray(this.plugin.settings[key], commands);
      }
    }
  }

  // Merges in place: known ids are replaced, new ones appended. Submenus recurse, so
  // one the payload does not mention keeps the entries it had.
  private updateCommandArray(
    targetArray: Command[],
    sourceArray: Command[],
  ): void {
    for (const imported of sourceArray) {
      const index = targetArray.findIndex((cmd) => cmd.id === imported.id);
      if (index < 0) {
        targetArray.push(imported);
        continue;
      }

      const existingSubmenu = targetArray[index].SubmenuCommands;
      if (existingSubmenu && imported.SubmenuCommands) {
        // Merge into the existing submenu before it is overwritten below —
        // assigning first would leave both sides pointing at the same array.
        this.updateCommandArray(existingSubmenu, imported.SubmenuCommands);
        targetArray[index] = { ...imported, SubmenuCommands: existingSubmenu };
      } else {
        targetArray[index] = imported;
      }
    }
  }
  importGeneralSettings(importData: JsonPayload) {
    GENERAL_SETTING_KEYS.forEach((key) => {
      if (importData[key] !== undefined) {
        (this.plugin.settings as JsonPayload)[key] = importData[key];
      }
    });

    this.importAppearance(importData.appearanceByStyle);
  }

  // Overwrite replaces the bucket outright, so a swatch the payload cleared stays
  // cleared; update merges its keys over what is there. Unknown keys are ignored.
  private importAppearance(imported: JsonPayload) {
    if (!imported || typeof imported !== "object") return;

    const store = (this.plugin.settings.appearanceByStyle ??= {});

    for (const style of POSITION_STYLES) {
      const source = imported[style];
      if (!source || typeof source !== "object") continue;

      const bucket: StyleAppearanceSettings =
        this.importMode === "overwrite" ? {} : (store[style] ??= {});

      APPEARANCE_KEYS.forEach((key) => {
        if (source[key] !== undefined) {
          (bucket as JsonPayload)[key] = source[key];
        }
      });

      store[style] = bucket;
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  getPositionStyleName(style: string): string {
    switch (style) {
      case "following":
        return strings.followingToolbar;
      case "top":
        return strings.topToolbar;
      default:
        return style;
    }
  }
}
