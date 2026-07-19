import { App, ButtonComponent, Modal, Notice, Setting, TextAreaComponent } from "obsidian";
import { ConfirmModal } from "src/modals/ConfirmModal";
import type editingToolbarPlugin from "src/plugin/main";
import { text } from 'src/translations/helper';
export class ImportExportModal extends Modal {
  plugin: editingToolbarPlugin;
  mode: 'import' | 'export';
  exportType: 'all' | 'All commands' | 'custom' | 'following' | 'top' | 'fixed' | 'mobile';
  importMode: 'overwrite' | 'update';
  textArea: TextAreaComponent;
  importButton: ButtonComponent;
  warningContent: HTMLElement;

  constructor(app: App, plugin: editingToolbarPlugin, mode: 'import' | 'export') {
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
      text: this.mode === 'import' ? text('Import Configuration') : text('Export Configuration'),
      cls: 'import-export-title'
    });

    if (this.mode === 'export') {
      new Setting(contentEl)
        .setName(text('Export Type'))
        .setDesc(text('Choose what to export'))
        .addDropdown(dropdown => {
          dropdown
            .addOption('all', text('All Settings'))
            .addOption('All commands', text('All Toolbar Commands'))
            .addOption('custom', text('Custom Commands Only'))
          if (this.plugin.settings.enableMultipleConfig) {
            dropdown
              .addOption('following', text('Following Style Only'))
              .addOption('top', text('Top Style Only'))
              .addOption('fixed', text('Fixed Style Only'))
              .addOption('mobile', text('Mobile Style Only'))
          }

          dropdown.setValue(this.exportType)
            .onChange(value => {
              this.exportType = value as 'all' | 'All commands' | 'custom' | 'following' | 'top' | 'fixed' | 'mobile';
              this.updateExportContent();
            });
        });

      const exportContainer = contentEl.createDiv('export-container');

      exportContainer.style.border = '1px solid var(--background-modifier-border)';
      exportContainer.style.padding = '10px';
      exportContainer.style.borderRadius = '5px';

      this.textArea = new TextAreaComponent(exportContainer);
      this.textArea
        .setValue('')
        .setPlaceholder(text('Loading...'))
        .then(textArea => {
          textArea.inputEl.style.width = '100%';
          textArea.inputEl.style.height = '200px';
          textArea.inputEl.style.fontFamily = 'monospace';
          textArea.inputEl.style.fontSize = '12px';
          textArea.inputEl.style.padding = '8px';
          textArea.inputEl.style.border = '1px solid var(--background-modifier-border)';
          textArea.inputEl.style.borderRadius = '4px';
        });

      this.updateExportContent();
      ;

      const buttonContainer = contentEl.createDiv('import-export-button-container');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '16px';

      const copyButton = buttonContainer.createEl('button', {
        text: text('Copy to Clipboard'),
        cls: 'mod-cta'
      });

      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(this.textArea.getValue())
          .then(() => {
            new Notice(text('Configuration copied to clipboard'));
          })
          .catch(err => {
            console.error('Failed to copy: ', err);
            new Notice(text('Failed to copy configuration'));
          });
      });
    } else {

      const importModeSetting = new Setting(contentEl)
        .setName(text('Import Mode'))
        .setDesc(text('Choose how to import the configuration'))
        .addDropdown(dropdown => {
          dropdown
            .addOption('update', text('Update Mode (Add new items and update existing ones)'))
            .addOption('overwrite', text('Overwrite Mode (Replace settings with imported ones)'))
            .setValue(this.importMode)
            .onChange(value => {
              this.importMode = value as 'overwrite' | 'update';
              this.importButton.setButtonText(this.importMode === 'overwrite' ? text('Overwrite Import') : text('Update Import'));
              this.warningContent.setText(this.importMode === 'overwrite' ? text('Warning: Overwrite mode will replace existing settings with imported ones.') : text('Warning: Update mode will add new items and update existing ones.'));
            });
        });
      const importContainer = contentEl.createDiv('import-container');

      importContainer.style.border = '1px solid var(--background-modifier-border)';
      importContainer.style.padding = '10px';
      importContainer.style.borderRadius = '5px';

      this.textArea = new TextAreaComponent(importContainer);
      this.textArea
        .setValue('')
        .setPlaceholder(text('Paste configuration here...'))
        .then(textArea => {
          textArea.inputEl.style.width = '100%';
          textArea.inputEl.style.height = '200px';
          textArea.inputEl.style.fontFamily = 'monospace';
          textArea.inputEl.style.fontSize = '12px';
          textArea.inputEl.style.padding = '8px';
          textArea.inputEl.style.border = '1px solid var(--background-modifier-border)';
          textArea.inputEl.style.borderRadius = '4px';
        });




      const buttonContainer = contentEl.createDiv('import-export-button-container');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '16px';

      new Setting(buttonContainer)
        .addButton(button => {
          this.importButton = button
            .setIcon('import')
            .setButtonText(text('Import Configuration'))
            .onClick(() => {
              this.importConfiguration();
            });
        });


      const warningDiv = contentEl.createDiv('import-export-warning');
      warningDiv.style.marginTop = '16px';
      warningDiv.style.padding = '8px 12px';
      warningDiv.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)';
      warningDiv.style.borderRadius = '4px';
      warningDiv.style.border = '1px solid rgba(var(--color-red-rgb), 0.3)';

      const warningParagraph = warningDiv.createEl('p', {
        text: text('Warning: Update mode will add new items and update existing ones.'),
        cls: 'warning-text'
      });
      warningParagraph.style.margin = '0';
      this.warningContent = warningParagraph;
    }
  }

  updateExportContent() {
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
          mobileCommands: this.plugin.settings.mobileCommands || [],
          customCommands: this.plugin.settings.customCommands || [],
          enableMultipleConfig: this.plugin.settings.enableMultipleConfig,
          positionStyle: this.plugin.settings.positionStyle,
          aestheticStyle: this.plugin.settings.aestheticStyle,
          appendMethod: this.plugin.settings.appendMethod,
          autohide: this.plugin.settings.autohide,
          isLoadOnMobile: this.plugin.settings.isLoadOnMobile,
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
          fixedCommands: this.plugin.settings.fixedCommands || [],
          mobileCommands: this.plugin.settings.mobileCommands || [],
          enableMultipleConfig: this.plugin.settings.enableMultipleConfig
        };
        break;
      case 'custom':
        exportContent = {
          ...exportContent,
          customCommands: this.plugin.settings.customCommands || []
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
      case 'mobile':
        exportContent = {
          ...exportContent,
          mobileCommands: this.plugin.settings.mobileCommands || []
        };
        break;
    }

    this.validateExportContent(exportContent);

    this.textArea.setValue(JSON.stringify(exportContent, null, 2));
  }

  private validateExportContent(exportContent: any) {
    ['menuCommands', 'followingCommands', 'topCommands', 'fixedCommands', 'mobileCommands', 'customCommands'].forEach(key => {
      if (key in exportContent && !exportContent[key]) {
        exportContent[key] = [];
      }
    });

    if ('enableMultipleConfig' in exportContent && exportContent.enableMultipleConfig === undefined) {
      exportContent.enableMultipleConfig = false;
    }
    if ('autohide' in exportContent && exportContent.autohide === undefined) {
      exportContent.autohide = false;
    }
    if ('Iscentered' in exportContent && exportContent.Iscentered === undefined) {
      exportContent.Iscentered = false;
    }
    if ('isLoadOnMobile' in exportContent && exportContent.isLoadOnMobile === undefined) {
      exportContent.isLoadOnMobile = true;
    }

    if ('positionStyle' in exportContent && !exportContent.positionStyle) {
      exportContent.positionStyle = 'top';
    }
    if ('aestheticStyle' in exportContent && !exportContent.aestheticStyle) {
      exportContent.aestheticStyle = 'default';
    }
    if ('appendMethod' in exportContent && !exportContent.appendMethod) {
      exportContent.appendMethod = 'workspace';
    }

    if ('cMenuNumRows' in exportContent && exportContent.cMenuNumRows === undefined) {
      exportContent.cMenuNumRows = 1;
    }
  }

  async importConfiguration() {
    try {
      const importText = this.textArea.getValue();
      if (!importText.trim()) {
        new Notice(text('Please paste configuration data first'));
        return;
      }

      const importData = JSON.parse(importText);

      if (!importData || typeof importData !== 'object') {
        new Notice(text('Invalid import data format'));
        return;
      }

      const containsMenuCommands = 'menuCommands' in importData;
      const containsCustomCommands = 'customCommands' in importData;
      const containsFollowingCommands = 'followingCommands' in importData;
      const containsTopCommands = 'topCommands' in importData;
      const containsFixedCommands = 'fixedCommands' in importData;
      const containsMobileCommands = 'mobileCommands' in importData;
      const containsGeneralSettings = 'positionStyle' in importData || 'aestheticStyle' in importData;
      const containsEnableMultipleConfig = 'enableMultipleConfig' in importData;
      const positionStyle = importData.positionStyle;

      const hasMenuCommands = containsMenuCommands && Array.isArray(importData.menuCommands) && importData.menuCommands.length > 0;
      const hasCustomCommands = containsCustomCommands && Array.isArray(importData.customCommands) && importData.customCommands.length > 0;
      const hasFollowingCommands = containsFollowingCommands && Array.isArray(importData.followingCommands) && importData.followingCommands.length > 0;
      const hasTopCommands = containsTopCommands && Array.isArray(importData.topCommands) && importData.topCommands.length > 0;
      const hasFixedCommands = containsFixedCommands && Array.isArray(importData.fixedCommands) && importData.fixedCommands.length > 0;
      const hasMobileCommands = containsMobileCommands && Array.isArray(importData.mobileCommands) && importData.mobileCommands.length > 0;

      const emptyMenuCommands = containsMenuCommands && (!Array.isArray(importData.menuCommands) || importData.menuCommands.length === 0);
      const emptyCustomCommands = containsCustomCommands && (!Array.isArray(importData.customCommands) || importData.customCommands.length === 0);
      const emptyFollowingCommands = containsFollowingCommands && (!Array.isArray(importData.followingCommands) || importData.followingCommands.length === 0);
      const emptyTopCommands = containsTopCommands && (!Array.isArray(importData.topCommands) || importData.topCommands.length === 0);
      const emptyFixedCommands = containsFixedCommands && (!Array.isArray(importData.fixedCommands) || importData.fixedCommands.length === 0);
      const emptyMobileCommands = containsMobileCommands && (!Array.isArray(importData.mobileCommands) || importData.mobileCommands.length === 0);

      let importSummary = text('This import will:') + '\n';

      if (containsGeneralSettings) importSummary += '• ' + text('Update general settings') + '\n';
      if (hasMenuCommands) importSummary += '• ' + text('Update Main Menu Commands') + ' (' + importData.menuCommands.length + ' ' + ')\n';
      if (hasCustomCommands) importSummary += '• ' + text('Update Custom Commands') + ' (' + importData.customCommands.length + ' ' + ')\n';
      if (hasFollowingCommands) importSummary += '• ' + text('Update Following Style Commands') + ' (' + importData.followingCommands.length + ' ' + ')\n';
      if (hasTopCommands) importSummary += '• ' + text('Update Top Style Commands') + ' (' + importData.topCommands.length + ' ' + ')\n';
      if (hasFixedCommands) importSummary += '• ' + text('Update Fixed Style Commands') + ' (' + importData.fixedCommands.length + ' ' + ')\n';
      if (hasMobileCommands) importSummary += '• ' + text('Update Mobile Style Commands') + ' (' + importData.mobileCommands.length + ' ' + ')\n';
      if (this.importMode === 'overwrite') {
        if (emptyMenuCommands) importSummary += '• ' + text('Clear all Main Menu Commands') + ' ⚠️\n';
        if (emptyCustomCommands) importSummary += '• ' + text('Clear all Custom Commands') + ' ⚠️\n';
        if (emptyFollowingCommands) importSummary += '• ' + text('Clear all Following Style Commands') + ' ⚠️\n';
        if (emptyTopCommands) importSummary += '• ' + text('Clear all Top Style Commands') + ' ⚠️\n';
        if (emptyFixedCommands) importSummary += '• ' + text('Clear all Fixed Style Commands') + ' ⚠️\n';
        if (emptyMobileCommands) importSummary += '• ' + text('Clear all Mobile Style Commands') + ' ⚠️\n';
      }
      if (containsEnableMultipleConfig) {
        const multiConfigStatus = importData.enableMultipleConfig ? text('Enable') : text('Disable');
        importSummary += '• ' + text('Set Multiple Config to:') + ' ' + multiConfigStatus + '\n';
      }

      if (positionStyle) {
        importSummary += '• ' + text('Set Position Style to:') + ' ' + this.getPositionStyleName(positionStyle) + '\n';
      }

      if (!hasMenuCommands && !hasCustomCommands && !hasFollowingCommands &&
        !hasTopCommands && !hasFixedCommands && !hasMobileCommands &&
        !emptyMenuCommands && !emptyCustomCommands && !emptyFollowingCommands &&
        !emptyTopCommands && !emptyFixedCommands && !emptyMobileCommands &&
        !containsGeneralSettings && !containsEnableMultipleConfig) {
        new Notice(text('No valid configuration found in import data'));
        return;
      }

      if (this.importMode === 'overwrite') {
        importSummary += '\n' + text('⚠️ Overwrite mode will replace existing settings with imported ones.');
      } else {
        importSummary += '\n' + text('ℹ️ Update mode will merge imported settings with existing ones.');
      }

      ConfirmModal.show(this.app, {
        message: importSummary + '\n' + text('Do you want to continue?'),
        onConfirm: async () => {


          const backup = {
            positionStyle: this.plugin.settings.positionStyle,
            menuCommands: [...this.plugin.settings.menuCommands],
            customCommands: [...this.plugin.settings.customCommands],
            followingCommands: [...this.plugin.settings.followingCommands],
            topCommands: [...this.plugin.settings.topCommands],
            fixedCommands: [...this.plugin.settings.fixedCommands],
            mobileCommands: [...this.plugin.settings.mobileCommands]
          };

          try {
            if (this.importMode === 'overwrite') {
              this.performOverwriteImport(importData);
            } else {
              this.performUpdateImport(importData);
            }

            this.fixImportedCommandIds();

            await this.plugin.saveSettings();

            this.plugin.reloadCustomCommands();

            dispatchEvent(new Event("editingToolbar-NewCommand"));

            new Notice(text('Configuration imported successfully'));
            this.close();
          } catch (error) {
            this.restoreBackup(backup);
            throw error;
          }


        }
      });

    } catch (error) {
      console.error('Import error: ', error);
      new Notice(text('Error: ') + ' ' + error.message);
    }



  }

  performOverwriteImport(importData: any) {
    this.importGeneralSettings(importData);

    if (importData.menuCommands) {
      this.plugin.settings.menuCommands = importData.menuCommands;
    }

    if (importData.customCommands) {
      this.plugin.settings.customCommands = importData.customCommands;
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

    if (importData.mobileCommands) {
      this.plugin.settings.mobileCommands = importData.mobileCommands;
    }
  }

  performUpdateImport(importData: any) {
    this.importGeneralSettings(importData);

    if (importData.menuCommands) {
      this.updateCommandArray(this.plugin.settings.menuCommands, importData.menuCommands);
    }

    if (importData.customCommands) {
      this.updateCommandArray(this.plugin.settings.customCommands, importData.customCommands);
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

    if (importData.mobileCommands) {
      this.updateCommandArray(this.plugin.settings.mobileCommands, importData.mobileCommands);
    }
  }
  private updateCommandArray(targetArray: any[], sourceArray: any[]) {
    if (!targetArray) {
      return sourceArray.slice();
    }

    sourceArray.forEach((importedCommand: any) => {
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
          targetArray[existingCommandIndex].SubmenuCommands,
          importedCommand.SubmenuCommands
        );
      }
    });

    return targetArray;
  }
  importGeneralSettings(importData: any) {
    const generalSettings = [
      'positionStyle', 'aestheticStyle', 'appendMethod', 'autohide', 'Iscentered',
      'isLoadOnMobile', 'cMenuNumRows', 'enableMultipleConfig',
      'custom_bg1', 'custom_bg2', 'custom_bg3', 'custom_bg4', 'custom_bg5',
      'custom_fc1', 'custom_fc2', 'custom_fc3', 'custom_fc4', 'custom_fc5',
      'toolbarBackgroundColor', 'toolbarIconColor', 'toolbarIconSize'
    ];

    generalSettings.forEach(key => {
      if (importData[key] !== undefined) {
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

    const fixCommandsInArray = (commands: any[]) => {
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
    fixCommandsInArray(this.plugin.settings.customCommands);
    fixCommandsInArray(this.plugin.settings.followingCommands);
    fixCommandsInArray(this.plugin.settings.topCommands);
    fixCommandsInArray(this.plugin.settings.fixedCommands);
    fixCommandsInArray(this.plugin.settings.mobileCommands);
  }

  restoreBackup(backup: any) {
    this.plugin.settings.positionStyle = backup.positionStyle;
    this.plugin.settings.menuCommands = backup.menuCommands;
    this.plugin.settings.customCommands = backup.customCommands;
    this.plugin.settings.followingCommands = backup.followingCommands;
    this.plugin.settings.topCommands = backup.topCommands;
    this.plugin.settings.fixedCommands = backup.fixedCommands;
    this.plugin.settings.mobileCommands = backup.mobileCommands;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  getPositionStyleName(style: string): string {
    switch (style) {
      case 'following':
        return text('Following Style');
      case 'top':
        return text('Top Style');
      case 'fixed':
        return text('Fixed Style');
      default:
        return style;
    }
  }

} 
