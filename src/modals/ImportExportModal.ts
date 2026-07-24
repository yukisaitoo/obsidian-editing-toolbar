import { App, ButtonComponent, Command, Modal, Notice, Setting, TextAreaComponent } from "obsidian";
import { ConfirmModal } from "src/modals/ConfirmModal";
import type EditingToolbarPlugin from "src/plugin/main";
import { strings } from 'src/translations/helper';
export class ImportExportModal extends Modal {
  plugin: EditingToolbarPlugin;
  mode: 'import' | 'export';
  exportType: 'all' | 'All commands' | 'following' | 'top' | 'fixed';
  importMode: 'overwrite' | 'update';
  textArea!: TextAreaComponent;
  importButton!: ButtonComponent;
  warningContent!: HTMLElement;

  constructor(app: App, plugin: EditingToolbarPlugin, mode: 'import' | 'export') {
    super(app);
    this.plugin = plugin;
    this.mode = mode;
    this.exportType = 'all';
    this.importMode = 'update';
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.addClass('editing-toolbar-import-export-modal');

    contentEl.createEl('h2', {
      text: this.mode === 'import' ? strings.importConfiguration : strings.exportConfiguration,
      cls: 'import-export-title'
    });

    if (this.mode === 'export') {
      new Setting(contentEl)
        .setName(strings.exportType)
        .setDesc(strings.chooseWhatExport)
        .addDropdown(dropdown => {
          dropdown
            .addOption('all', strings.allSettings)
            .addOption('All commands', strings.allToolbarCommands)
            .addOption('following', strings.followingStyleOnly)
            .addOption('top', strings.topStyleOnly)
            .addOption('fixed', strings.fixedStyleOnly)

          dropdown.setValue(this.exportType)
            .onChange(value => {
              this.exportType = value as 'all' | 'All commands' | 'following' | 'top' | 'fixed';
              this.updateExportContent();
            });
        });

      const exportContainer = contentEl.createDiv('export-container');

      this.textArea = new TextAreaComponent(exportContainer);
      this.textArea
        .setValue('')
        .setPlaceholder(strings.loading)
        .then(textArea => {
          textArea.inputEl.addClass('import-export-textarea');
        });

      this.updateExportContent();
      ;

      const buttonContainer = contentEl.createDiv('import-export-button-container');

      const copyButton = buttonContainer.createEl('button', {
        text: strings.copyClipboard,
        cls: 'mod-cta'
      });

      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(this.textArea.getValue())
          .then(() => {
            new Notice(strings.configurationCopiedClipboard);
          })
          .catch(err => {
            console.error('Failed to copy: ', err);
            new Notice(strings.failedCopyConfiguration);
          });
      });
    } else {

      new Setting(contentEl)
        .setName(strings.importMode)
        .setDesc(strings.chooseHowImportConfiguration)
        .addDropdown(dropdown => {
          dropdown
            .addOption('update', strings.updateModeAddNewItems)
            .addOption('overwrite', strings.overwriteModeReplaceSettingsImported)
            .setValue(this.importMode)
            .onChange(value => {
              this.importMode = value as 'overwrite' | 'update';
              this.importButton.setButtonText(this.importMode === 'overwrite' ? strings.overwriteImport : strings.updateImport);
              this.warningContent.setText(this.importMode === 'overwrite' ? strings.warningOverwriteModeReplaceExisting : strings.warningUpdateModeAddNew);
            });
        });
      const importContainer = contentEl.createDiv('import-container');

      this.textArea = new TextAreaComponent(importContainer);
      this.textArea
        .setValue('')
        .setPlaceholder(strings.pasteConfigurationHere)
        .then(textArea => {
          textArea.inputEl.addClass('import-export-textarea');
        });




      const buttonContainer = contentEl.createDiv('import-export-button-container');

      new Setting(buttonContainer)
        .addButton(button => {
          this.importButton = button
            .setIcon('import')
            .setButtonText(strings.importConfiguration)
            .onClick(() => {
              this.importConfiguration();
            });
        });


      const warningDiv = contentEl.createDiv('import-export-warning');

      const warningParagraph = warningDiv.createEl('p', {
        text: strings.warningUpdateModeAddNew,
        cls: 'warning-text'
      });
      this.warningContent = warningParagraph;
    }
  }

  updateExportContent() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous export payload assembled dynamically
    let exportContent: any = {
      _exportInfo: {
        version: this.plugin.manifest.version,
        exportType: this.exportType,
        exportTime: new Date().toISOString(),
        pluginId: this.plugin.manifest.id
      }
    };

    switch (this.exportType) {
      case 'all':
        exportContent = {
          ...exportContent,
          menuCommands: this.plugin.settings.menuCommands || [],
          followingCommands: this.plugin.settings.followingCommands || [],
          topCommands: this.plugin.settings.topCommands || [],
          fixedCommands: this.plugin.settings.fixedCommands || [],
          positionStyle: this.plugin.settings.positionStyle,
          aestheticStyle: this.plugin.settings.aestheticStyle,
          cMenuNumRows: this.plugin.settings.cMenuNumRows,
          custom_bg1: this.plugin.settings.custom_bg1,
          custom_bg2: this.plugin.settings.custom_bg2,
          custom_bg3: this.plugin.settings.custom_bg3,
          custom_bg4: this.plugin.settings.custom_bg4,
          custom_bg5: this.plugin.settings.custom_bg5,
          custom_fc1: this.plugin.settings.custom_fc1,
          custom_fc2: this.plugin.settings.custom_fc2,
          custom_fc3: this.plugin.settings.custom_fc3,
          custom_fc4: this.plugin.settings.custom_fc4,
          custom_fc5: this.plugin.settings.custom_fc5,
          toolbarBackgroundColor: this.plugin.settings.toolbarBackgroundColor,
          toolbarIconColor: this.plugin.settings.toolbarIconColor,
          toolbarIconSize: this.plugin.settings.toolbarIconSize,
        };
        break;
      case 'All commands':
        exportContent = {
          ...exportContent,
          menuCommands: this.plugin.settings.menuCommands || [],
          followingCommands: this.plugin.settings.followingCommands || [],
          topCommands: this.plugin.settings.topCommands || [],
          fixedCommands: this.plugin.settings.fixedCommands || []
        };
        break;
      case 'following':
        exportContent = {
          ...exportContent,
          followingCommands: this.plugin.settings.followingCommands || []
        };
        break;
      case 'top':
        exportContent = {
          ...exportContent,
          topCommands: this.plugin.settings.topCommands || []
        };
        break;
      case 'fixed':
        exportContent = {
          ...exportContent,
          fixedCommands: this.plugin.settings.fixedCommands || []
        };
        break;
    }

    this.validateExportContent(exportContent);

    this.textArea.setValue(JSON.stringify(exportContent, null, 2));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- validates untyped parsed JSON
  private validateExportContent(exportContent: any) {
    ['menuCommands', 'followingCommands', 'topCommands', 'fixedCommands'].forEach(key => {
      if (key in exportContent && !exportContent[key]) {
        exportContent[key] = [];
      }
    });


    if ('positionStyle' in exportContent && !exportContent.positionStyle) {
      exportContent.positionStyle = 'top';
    }
    if ('aestheticStyle' in exportContent && !exportContent.aestheticStyle) {
      exportContent.aestheticStyle = 'default';
    }
    if ('cMenuNumRows' in exportContent && exportContent.cMenuNumRows === undefined) {
      exportContent.cMenuNumRows = 1;
    }
  }

  async importConfiguration() {
    try {
      const importText = this.textArea.getValue();
      if (!importText.trim()) {
        new Notice(strings.pleasePasteConfigurationDataFirst);
        return;
      }

      const importData = JSON.parse(importText);

      if (!importData || typeof importData !== 'object') {
        new Notice(strings.invalidImportDataFormat);
        return;
      }

      const containsMenuCommands = 'menuCommands' in importData;
      const containsFollowingCommands = 'followingCommands' in importData;
      const containsTopCommands = 'topCommands' in importData;
      const containsFixedCommands = 'fixedCommands' in importData;
      const containsGeneralSettings = 'positionStyle' in importData || 'aestheticStyle' in importData;
      const positionStyle = importData.positionStyle;

      const hasMenuCommands = containsMenuCommands && Array.isArray(importData.menuCommands) && importData.menuCommands.length > 0;
      const hasFollowingCommands = containsFollowingCommands && Array.isArray(importData.followingCommands) && importData.followingCommands.length > 0;
      const hasTopCommands = containsTopCommands && Array.isArray(importData.topCommands) && importData.topCommands.length > 0;
      const hasFixedCommands = containsFixedCommands && Array.isArray(importData.fixedCommands) && importData.fixedCommands.length > 0;

      const emptyMenuCommands = containsMenuCommands && (!Array.isArray(importData.menuCommands) || importData.menuCommands.length === 0);
      const emptyFollowingCommands = containsFollowingCommands && (!Array.isArray(importData.followingCommands) || importData.followingCommands.length === 0);
      const emptyTopCommands = containsTopCommands && (!Array.isArray(importData.topCommands) || importData.topCommands.length === 0);
      const emptyFixedCommands = containsFixedCommands && (!Array.isArray(importData.fixedCommands) || importData.fixedCommands.length === 0);

      let importSummary = strings.import3 + '\n';

      if (containsGeneralSettings) importSummary += '• ' + strings.updateGeneralSettings + '\n';
      if (hasMenuCommands) importSummary += '• ' + strings.updateMainMenuCommands + ' (' + importData.menuCommands.length + ' ' + ')\n';
      if (hasFollowingCommands) importSummary += '• ' + strings.updateFollowingStyleCommands + ' (' + importData.followingCommands.length + ' ' + ')\n';
      if (hasTopCommands) importSummary += '• ' + strings.updateTopStyleCommands + ' (' + importData.topCommands.length + ' ' + ')\n';
      if (hasFixedCommands) importSummary += '• ' + strings.updateFixedStyleCommands + ' (' + importData.fixedCommands.length + ' ' + ')\n';
      if (this.importMode === 'overwrite') {
        if (emptyMenuCommands) importSummary += '• ' + strings.clearAllMainMenuCommands + ' ⚠️\n';
        if (emptyFollowingCommands) importSummary += '• ' + strings.clearAllFollowingStyleCommands + ' ⚠️\n';
        if (emptyTopCommands) importSummary += '• ' + strings.clearAllTopStyleCommands + ' ⚠️\n';
        if (emptyFixedCommands) importSummary += '• ' + strings.clearAllFixedStyleCommands + ' ⚠️\n';
      }

      if (positionStyle) {
        importSummary += '• ' + strings.setPositionStyle + ' ' + this.getPositionStyleName(positionStyle) + '\n';
      }

      if (!hasMenuCommands && !hasFollowingCommands &&
        !hasTopCommands && !hasFixedCommands &&
        !emptyMenuCommands && !emptyFollowingCommands &&
        !emptyTopCommands && !emptyFixedCommands &&
        !containsGeneralSettings) {
        new Notice(strings.validConfigurationFoundImportData);
        return;
      }

      if (this.importMode === 'overwrite') {
        importSummary += '\n' + strings.overwriteModeReplaceExistingSettings;
      } else {
        importSummary += '\n' + strings.updateModeMergeImportedSettings;
      }

      ConfirmModal.show(this.app, {
        message: importSummary + '\n' + strings.doWantContinue,
        onConfirm: async () => {


          const backup = {
            positionStyle: this.plugin.settings.positionStyle,
            menuCommands: [...this.plugin.settings.menuCommands],
            followingCommands: [...this.plugin.settings.followingCommands],
            topCommands: [...this.plugin.settings.topCommands],
            fixedCommands: [...this.plugin.settings.fixedCommands]
          };

          try {
            if (this.importMode === 'overwrite') {
              this.performOverwriteImport(importData);
            } else {
              this.performUpdateImport(importData);
            }

            this.fixImportedCommandIds();

            await this.plugin.saveSettings();

            dispatchEvent(new Event("editingToolbar-NewCommand"));

            new Notice(strings.configurationImportedSuccessfully);
            this.close();
          } catch (error) {
            this.restoreBackup(backup);
            throw error;
          }


        }
      });

    } catch (error) {
      console.error('Import error: ', error);
      new Notice(strings.error + ' ' + (error instanceof Error ? error.message : String(error)));
    }



  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped external import JSON
  performOverwriteImport(importData: any) {
    this.importGeneralSettings(importData);

    if (importData.menuCommands) {
      this.plugin.settings.menuCommands = importData.menuCommands;
    }

    if (importData.followingCommands) {
      this.plugin.settings.followingCommands = importData.followingCommands;
    }

    if (importData.topCommands) {
      this.plugin.settings.topCommands = importData.topCommands;
    }

    if (importData.fixedCommands) {
      this.plugin.settings.fixedCommands = importData.fixedCommands;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped external import JSON
  performUpdateImport(importData: any) {
    this.importGeneralSettings(importData);

    if (importData.menuCommands) {
      this.updateCommandArray(this.plugin.settings.menuCommands, importData.menuCommands);
    }

    if (importData.followingCommands) {
      this.updateCommandArray(this.plugin.settings.followingCommands, importData.followingCommands);
    }

    if (importData.topCommands) {
      this.updateCommandArray(this.plugin.settings.topCommands, importData.topCommands);
    }

    if (importData.fixedCommands) {
      this.updateCommandArray(this.plugin.settings.fixedCommands, importData.fixedCommands);
    }
  }
  private updateCommandArray(targetArray: Command[], sourceArray: Command[]) {
    if (!targetArray) {
      return sourceArray.slice();
    }

    sourceArray.forEach((importedCommand: Command) => {
      const existingCommandIndex = targetArray.findIndex(
        cmd => cmd.id === importedCommand.id
      );

      if (existingCommandIndex >= 0) {
        targetArray[existingCommandIndex] = importedCommand;
      } else {
        targetArray.push(importedCommand);
      }

      if (importedCommand.SubmenuCommands && targetArray[existingCommandIndex]?.SubmenuCommands) {
        this.updateCommandArray(
          targetArray[existingCommandIndex].SubmenuCommands!,
          importedCommand.SubmenuCommands
        );
      }
    });

    return targetArray;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped external import JSON
  importGeneralSettings(importData: any) {
    const generalSettings = [
      'positionStyle', 'aestheticStyle',
      'cMenuNumRows',
      'custom_bg1', 'custom_bg2', 'custom_bg3', 'custom_bg4', 'custom_bg5',
      'custom_fc1', 'custom_fc2', 'custom_fc3', 'custom_fc4', 'custom_fc5',
      'toolbarBackgroundColor', 'toolbarIconColor', 'toolbarIconSize'
    ];

    generalSettings.forEach(key => {
      if (importData[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic settings-key write from imported data
        (this.plugin.settings as any)[key] = importData[key];
      }
    });
  }

  fixImportedCommandIds() {
    const commandMappings: { [key: string]: string } = {
      'editor:toggle-numbered-list': 'editing-toolbar:toggle-numbered-list',
      'editor:toggle-bullet-list': 'editing-toolbar:toggle-bullet-list',
      'editor:toggle-highlight': 'editing-toolbar:toggle-highlight',
      'toggle-highlight': 'editing-toolbar:toggle-highlight',
      'editing-toolbar:editor:toggle-bold': 'editing-toolbar:toggle-bold',
      'editing-toolbar:editor:toggle-italics': 'editing-toolbar:toggle-italics',
      'editing-toolbar:editor:toggle-strikethrough': 'editing-toolbar:toggle-strikethrough',
      'editing-toolbar:editor:toggle-inline-math': 'editing-toolbar:toggle-inline-math',
      'editing-toolbar:editor:insert-callout': 'editing-toolbar:insert-callout',
      'editing-toolbar:editor:insert-link': 'editing-toolbar:insert-link',
      'cMenuToolbar-Divider-Line': 'editingToolbar-Divider-Line',
    };

    const fixCommandsInArray = (commands: Command[]) => {
      if (!commands || !Array.isArray(commands)) return;

      commands.forEach(cmd => {
        if (cmd.id && commandMappings[cmd.id]) {
          cmd.id = commandMappings[cmd.id];
        }

        if (cmd.SubmenuCommands && Array.isArray(cmd.SubmenuCommands)) {
          fixCommandsInArray(cmd.SubmenuCommands);
        }
      });
    };

    fixCommandsInArray(this.plugin.settings.menuCommands);
    fixCommandsInArray(this.plugin.settings.followingCommands);
    fixCommandsInArray(this.plugin.settings.topCommands);
    fixCommandsInArray(this.plugin.settings.fixedCommands);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped backup JSON snapshot
  restoreBackup(backup: any) {
    this.plugin.settings.positionStyle = backup.positionStyle;
    this.plugin.settings.menuCommands = backup.menuCommands;
    this.plugin.settings.followingCommands = backup.followingCommands;
    this.plugin.settings.topCommands = backup.topCommands;
    this.plugin.settings.fixedCommands = backup.fixedCommands;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  getPositionStyleName(style: string): string {
    switch (style) {
      case 'following':
        return strings.followingStyle;
      case 'top':
        return strings.topStyle;
      case 'fixed':
        return strings.fixedStyle;
      default:
        return style;
    }
  }

} 
