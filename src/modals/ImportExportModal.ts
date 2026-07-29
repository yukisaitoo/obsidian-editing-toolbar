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
} from "src/settings/settingsData";
import { POSITION_STYLES } from "src/settings/settingsData";
import { strings } from "src/translations/helper";

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
  "cMenuVisibility",
  "cMenuFontColor",
  "cMenuBackgroundColor",
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
      cls: "import-export-title",
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
            console.error("Failed to copy: ", err);
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
      // The real appearance state. The global toolbar* fields are only a fallback
      // for cleared buckets and no UI ever writes them, so they stay out.
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

      const containsFollowingCommands = "followingCommands" in importData;
      const containsTopCommands = "topCommands" in importData;
      const containsGeneralSettings = "positionStyle" in importData;
      const positionStyle = importData.positionStyle;

      // Reject non-array command lists here, before anything is mutated — the
      // import path below assumes it can iterate them.
      if (
        (containsFollowingCommands &&
          !Array.isArray(importData.followingCommands)) ||
        (containsTopCommands && !Array.isArray(importData.topCommands))
      ) {
        new Notice(strings.invalidImportDataFormat);
        return;
      }

      const hasFollowingCommands =
        containsFollowingCommands && importData.followingCommands.length > 0;
      const hasTopCommands =
        containsTopCommands && importData.topCommands.length > 0;

      const emptyFollowingCommands =
        containsFollowingCommands && importData.followingCommands.length === 0;
      const emptyTopCommands =
        containsTopCommands && importData.topCommands.length === 0;

      let importSummary = strings.import3 + "\n";

      if (containsGeneralSettings)
        importSummary += "• " + strings.updateGeneralSettings + "\n";
      if (hasFollowingCommands)
        importSummary +=
          "• " +
          strings.updateFollowingStyleCommands +
          " (" +
          importData.followingCommands.length +
          " " +
          ")\n";
      if (hasTopCommands)
        importSummary +=
          "• " +
          strings.updateTopStyleCommands +
          " (" +
          importData.topCommands.length +
          " " +
          ")\n";
      if (this.importMode === "overwrite") {
        if (emptyFollowingCommands)
          importSummary +=
            "• " + strings.clearAllFollowingStyleCommands + " ⚠️\n";
        if (emptyTopCommands)
          importSummary += "• " + strings.clearAllTopStyleCommands + " ⚠️\n";
      }

      if (positionStyle) {
        importSummary +=
          "• " +
          strings.setPositionStyle +
          " " +
          this.getPositionStyleName(positionStyle) +
          "\n";
      }

      if (
        !hasFollowingCommands &&
        !hasTopCommands &&
        !emptyFollowingCommands &&
        !emptyTopCommands &&
        !containsGeneralSettings
      ) {
        new Notice(strings.validConfigurationFoundImportData);
        return;
      }

      if (this.importMode === "overwrite") {
        importSummary += "\n" + strings.overwriteModeReplaceExistingSettings;
      } else {
        importSummary += "\n" + strings.updateModeMergeImportedSettings;
      }

      ConfirmModal.show(this.app, {
        message: importSummary + "\n" + strings.doWantContinue,
        confirmWarning: true,
        onConfirm: async () => {
          const backup = this.snapshotSettings();

          try {
            if (this.importMode === "overwrite") {
              this.performOverwriteImport(importData);
            } else {
              this.performUpdateImport(importData);
            }

            await this.plugin.saveSettings();

            // Syncs the runtime position style before rebuilding, so an imported
            // positionStyle takes effect without a reload.
            this.plugin.onPositionStyleChange(
              this.plugin.settings.positionStyle,
            );

            new Notice(strings.configurationImportedSuccessfully);
          } catch (error) {
            // ConfirmModal awaits this callback without a catch, so rethrowing
            // would strand the user with silently half-imported settings.
            this.plugin.settings = backup;
            console.error("Import error: ", error);
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

  // Rollback snapshot. Not structuredClone: CommandPicker stores live Obsidian
  // Command objects, whose callbacks would throw DataCloneError. A JSON round
  // trip drops them, which is exactly what saveSettings() persists anyway — the
  // toolbar dispatches by command id, never through a stored callback.
  private snapshotSettings(): EditingToolbarSettings {
    return JSON.parse(JSON.stringify(this.plugin.settings));
  }

  performOverwriteImport(importData: JsonPayload) {
    this.importGeneralSettings(importData);

    if (importData.followingCommands) {
      this.plugin.settings.followingCommands = importData.followingCommands;
    }

    if (importData.topCommands) {
      this.plugin.settings.topCommands = importData.topCommands;
    }
  }

  performUpdateImport(importData: JsonPayload) {
    this.importGeneralSettings(importData);

    if (importData.followingCommands) {
      this.updateCommandArray(
        this.plugin.settings.followingCommands,
        importData.followingCommands,
      );
    }

    if (importData.topCommands) {
      this.updateCommandArray(
        this.plugin.settings.topCommands,
        importData.topCommands,
      );
    }
  }
  private updateCommandArray(targetArray: Command[], sourceArray: Command[]) {
    if (!targetArray) {
      return sourceArray.slice();
    }

    sourceArray.forEach((importedCommand: Command) => {
      const existingCommandIndex = targetArray.findIndex(
        (cmd) => cmd.id === importedCommand.id,
      );

      if (existingCommandIndex >= 0) {
        targetArray[existingCommandIndex] = importedCommand;
      } else {
        targetArray.push(importedCommand);
      }

      if (
        importedCommand.SubmenuCommands &&
        targetArray[existingCommandIndex]?.SubmenuCommands
      ) {
        this.updateCommandArray(
          targetArray[existingCommandIndex].SubmenuCommands!,
          importedCommand.SubmenuCommands,
        );
      }
    });

    return targetArray;
  }
  importGeneralSettings(importData: JsonPayload) {
    GENERAL_SETTING_KEYS.forEach((key) => {
      if (importData[key] !== undefined) {
        (this.plugin.settings as JsonPayload)[key] = importData[key];
      }
    });

    this.importAppearance(importData.appearanceByStyle);
  }

  // Overwrite replaces a style's bucket outright, so a swatch the payload cleared
  // stays cleared; update merges the payload's keys over what's already there.
  // Styles and keys the plugin doesn't know about are ignored.
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
