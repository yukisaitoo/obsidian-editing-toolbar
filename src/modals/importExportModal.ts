import {
  App,
  ButtonComponent,
  Modal,
  Notice,
  Setting,
  TextAreaComponent,
} from "obsidian";
import { ConfirmModal } from "src/modals/confirmModal";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { STYLE_LABELS } from "src/settings/settingsData";
import type { ImportMode, JsonPayload } from "src/settings/settingsTransfer";
import {
  buildImportedSettings,
  GENERAL_SETTING_KEYS,
  parseImport,
} from "src/settings/settingsTransfer";
import { strings } from "src/translations/helper";

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

export class ImportExportModal extends Modal {
  plugin: EditingToolbarPlugin;
  mode: "import" | "export";
  importMode: ImportMode;
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
              this.importMode = value as ImportMode;
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

      const parsed = parseImport(JSON.parse(importText));
      if (!parsed) {
        new Notice(strings.invalidImportDataFormat);
        return;
      }

      const { general, appearance, lists } = parsed;
      const containsGeneralSettings = Object.keys(general).length > 0;
      const positionStyle = general.positionStyle;

      if (
        !lists.length &&
        !containsGeneralSettings &&
        !Object.keys(appearance).length
      ) {
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
        summary.push(
          `• ${strings.setPositionStyle} ${STYLE_LABELS[positionStyle]}`,
        );
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
          const previous = this.plugin.settings;

          try {
            this.plugin.settings = buildImportedSettings(
              previous,
              parsed,
              this.importMode,
            );

            this.plugin.rebuildToolbars();

            // Saving last keeps a failed import off disk.
            await this.plugin.saveSettings();

            new Notice(strings.configurationImportedSuccessfully);
          } catch (error) {
            this.plugin.settings = previous;
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

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
