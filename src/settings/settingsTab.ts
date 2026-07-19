import Pickr from "@simonwep/pickr";
import '@simonwep/pickr/dist/themes/nano.min.css';
import { App, ButtonComponent, Command, debounce, Modal, Notice, PluginSettingTab, setIcon, Setting } from "obsidian";
import Sortable from "sortablejs";
import { ConfirmModal } from "src/modals/ConfirmModal";
import { CustomCommandModal } from "src/modals/CustomCommandModal";
import { DeployCommandModal } from "src/modals/DeployCommand";
import { checkHtml, editingToolbarPopover, selfDestruct } from "src/modals/editingToolbarModal";
import { ImportExportModal } from "src/modals/ImportExportModal";
import { RegexCommandModal } from "src/modals/RegexCommandModal";
import { ChangeCmdname, ChooseFromIconList, CommandPicker, openSlider } from "src/modals/suggesterModals";
import type editingToolbarPlugin from "src/plugin/main";
import type { AppearanceByStyle, StyleAppearanceSettings, ToolbarStyleKey } from "src/settings/settingsData";
import { AESTHETIC_STYLES, APPEND_METHODS, POSITION_STYLES } from "src/settings/settingsData";
import { text } from 'src/translations/helper';
import { GenNonDuplicateID } from "src/util/util";
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
    id: 'general',
    name: text('General'),
    icon: 'gear'
  },
  {
    id: 'appearance',
    name: text('Appearance'),
    icon: 'brush'
  },
  {
    id: 'customcommands',
    name: text('Custom Commands'),
    icon: 'lucide-rectangle-ellipsis'
  },
  {
    id: 'commands',
    name: text('Toolbar Commands'),
    icon: 'lucide-command'
  },
  {
    id: 'importexport',
    name: text('Import/Export'),
    icon: 'lucide-import'
  },
];

export function getPickrSettings(opts: {
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
    theme: 'nano',
    swatches,
    lockOpacity: !opacity,
    default: defaultColor,
    position: 'left-middle',
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
export function getComandindex(item: any, arr: any[]): number {
  if (!arr || !Array.isArray(arr)) {
    return -1;
  }
  const idx = arr.findIndex((el) => el?.id === item);
  return idx;
}
export class editingToolbarSettingTab extends PluginSettingTab {
  plugin: editingToolbarPlugin;
  appendMethod: string;
  pickrs: Pickr[] = [];
  activeTab: string = 'general';
  private currentEditingConfig: string;

  private getLocalizedCommandName(name: string): string {
    return text(name as any);
  }
  constructor(app: App, plugin: editingToolbarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.currentEditingConfig = this.plugin.settings.positionStyle;

    const handleNewCommand = () => {
      selfDestruct(this.plugin);
      editingToolbarPopover(app, this.plugin);
      this.display();
    };
    window.addEventListener("editingToolbar-NewCommand", handleNewCommand);
    this.plugin.register(() => window.removeEventListener("editingToolbar-NewCommand", handleNewCommand));
  }

  display(): void {
    this.destroyPickrs();
    const { containerEl } = this;
    containerEl.empty();
    this.createHeader(containerEl);

    const tabContainer = containerEl.createEl('div', {
      cls: 'editing-toolbar-tabs'
    });

    const visibleTabs = SETTING_TABS;

    visibleTabs.forEach(tab => {
      const tabButton = tabContainer.createEl('div', {
        cls: `editing-toolbar-tab ${this.activeTab === tab.id ? 'active' : ''}`
      });
      setIcon(tabButton, tab.icon);
      tabButton.createEl('span', { text: tab.name });

      tabButton.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.display();
      });
    });
    const contentContainer = containerEl.createEl('div', {
      cls: 'editing-toolbar-content'
    });
    switch (this.activeTab) {
      case 'general':
        this.displayGeneralSettings(contentContainer);
        break;
      case 'appearance':
        this.displayAppearanceSettings(contentContainer);
        break;
      case 'customcommands':
        this.displayCustomCommandSettings(contentContainer);
        break;
      case 'commands':
        this.displayCommandSettings(contentContainer);
        break;
      case 'importexport':
        this.displayImportExportSettings(contentContainer);
        break;
    }
  }
  private createDeleteButton(
    button: any,
    deleteAction: () => Promise<void>,
    tooltip: string = text('Delete')
  ) {
    let isConfirming = false;
    let confirmTimeout: NodeJS.Timeout;

    button
      .setIcon('editingToolbarDelete')
      .setTooltip(tooltip)
      .onClick(async () => {
        if (isConfirming) {
          clearTimeout(confirmTimeout);
          button
            .setIcon('editingToolbarDelete')
            .setTooltip(tooltip);
          button.buttonEl.removeClass('mod-warning');
          isConfirming = false;

          await deleteAction();
        } else {
          isConfirming = true;
          button
            .setTooltip(text('Confirm Delete?'))
            .setButtonText(text('Confirm Delete?'));
          button.buttonEl.addClass('mod-warning');

          confirmTimeout = setTimeout(() => {
            button
              .setIcon('editingToolbarDelete')
              .setTooltip(tooltip);
            button.buttonEl.removeClass('mod-warning');
            isConfirming = false;
          }, 3500);
        }
      });
  }
  private displayGeneralSettings(containerEl: HTMLElement): void {
    const generalSettingContainer = containerEl.createDiv('generalSetting-container');
    generalSettingContainer.style.padding = '16px';
    generalSettingContainer.style.borderRadius = '8px';
    generalSettingContainer.style.backgroundColor = 'var(--background-secondary)';
    generalSettingContainer.style.marginBottom = '20px';
    new Setting(generalSettingContainer)
      .setName(text('Editing Toolbar Append Method'))
      .setDesc(text('Choose where Editing Toolbar will append upon regeneration.'))
      .addDropdown((dropdown) => {
        let methods: Record<string, string> = {};
        APPEND_METHODS.map((method) => (methods[method] = text(method)));
        dropdown.addOptions(methods);
        dropdown
          .setValue(this.plugin.settings.appendMethod)
          .onChange((appendMethod) => {
            this.plugin.settings.appendMethod = appendMethod;
            this.plugin.saveSettings();
          });
      });
    new Setting(generalSettingContainer)
      .setName(text('Enable Multiple Configurations'))
      .setDesc(text('Enable different command configurations for each position style (following, top, fixed).'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableMultipleConfig || false)
        .onChange(async (value) => {
          this.plugin.settings.enableMultipleConfig = value;
          this.plugin.onPositionStyleChange(this.plugin.positionStyle);

          await this.plugin.saveSettings();
          this.display();
        })
      );
    // Top toolbar toggle
    new Setting(generalSettingContainer)
      .setName(text('Top Toolbar'))
      .setDesc(text('Enable the toolbar positioned at the top.'))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.enableTopToolbar || false)
          .onChange(async (value) => {
            const s = this.plugin.settings;
            const prevStyle = this.plugin.positionStyle;
            // Update only the Top toolbar flag
            s.enableTopToolbar = value;
            let nextStyle: string | null = null;
            if (value) {
              // Turning Top ON: make it the primary style for configuration/appearance.
              nextStyle = 'top';
            } else if (prevStyle === 'top') {
              // Turning Top OFF and it was the primary style → choose another enabled style as primary.
              if (s.enableFollowingToolbar) nextStyle = 'following';
              else if (s.enableFixedToolbar) nextStyle = 'fixed';
              else nextStyle = null; // no other toolbar is enabled
            }
            if (nextStyle && nextStyle !== prevStyle) {
              this.plugin.onPositionStyleChange(nextStyle);
            }
            await this.plugin.saveSettings();
            // Immediately refresh toolbars to reflect this toggle
            this.plugin.handleeditingToolbar();
            this.display();
          });
      });
    // Following toolbar toggle
    new Setting(generalSettingContainer)
      .setName(text('Following Toolbar'))
      .setDesc(text('Enable the toolbar that appears upon text selection.'))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.enableFollowingToolbar || false)
          .onChange(async (value) => {
            const s = this.plugin.settings;
            const prevStyle = this.plugin.positionStyle;
            // Update only the Following toolbar flag
            s.enableFollowingToolbar = value;
            let nextStyle: string | null = null;
            if (value) {
              // Turning Following ON: make it the primary style for configuration/appearance.
              nextStyle = 'following';
            } else if (prevStyle === 'following') {
              // Turning Following OFF and it was the primary style → choose another enabled style as primary.
              if (s.enableTopToolbar) nextStyle = 'top';
              else if (s.enableFixedToolbar) nextStyle = 'fixed';
              else nextStyle = null;
            }
            if (nextStyle && nextStyle !== prevStyle) {
              this.plugin.onPositionStyleChange(nextStyle);
            }
            await this.plugin.saveSettings();
            this.plugin.handleeditingToolbar();
            this.display();
          });
      });
    // Fixed toolbar toggle
    new Setting(generalSettingContainer)
      .setName(text('Fixed Toolbar'))
      .setDesc(text('Enable the toolbar whose position may be fixed where you please.'))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.enableFixedToolbar || false)
          .onChange(async (value) => {
            const s = this.plugin.settings;
            const prevStyle = this.plugin.positionStyle;

            // Update only the Fixed toolbar flag
            s.enableFixedToolbar = value;

            let nextStyle: string | null = null;

            if (value) {
              // Turning Fixed ON: make it the primary style for configuration/appearance.
              nextStyle = 'fixed';
            } else if (prevStyle === 'fixed') {
              // Turning Fixed OFF and it was the primary style → choose another enabled style as primary.
              if (s.enableTopToolbar) nextStyle = 'top';
              else if (s.enableFollowingToolbar) nextStyle = 'following';
              else nextStyle = null;
            }
            if (nextStyle && nextStyle !== prevStyle) {
              this.plugin.onPositionStyleChange(nextStyle);
            }
            await this.plugin.saveSettings();
            this.plugin.handleeditingToolbar();
            this.display();
          });
      });
    // Mobile setting
    new Setting(generalSettingContainer)
      .setName(text('Mobile Enabled or Not'))
      .setDesc(text("Whether to enable on mobile devices with device width less than 768px."))
      .addToggle(toggle => toggle.setValue(this.plugin.settings?.isLoadOnMobile ?? false)
        .onChange((value) => {
          this.plugin.settings.isLoadOnMobile = value;
          this.plugin.saveSettings();
          this.triggerRefresh();
        }));

    // Custom background and font color settings
    const paintbrushContainer = containerEl.createDiv('custom-paintbrush-container');
    paintbrushContainer.style.padding = '16px';
    paintbrushContainer.style.borderRadius = '8px';
    paintbrushContainer.style.backgroundColor = 'var(--background-secondary)';
    paintbrushContainer.style.marginBottom = '20px';
    new Setting(paintbrushContainer)
      .setName(text('🎨 Set Custom Background'))
      .setDesc(text('Click on the picker to adjust the color'))
      .setClass('custom_bg')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });

        for (let i = 0; i < 5; i++) {
          const pickerEl = pickerContainer.createDiv({ cls: "picker" });

          const pickr = Pickr.create(
            getPickrSettings({
              isView: false,
              el: pickerEl,
              containerEl: pickerContainer,
              swatches: [
                '#FFB78B8C',
                '#CDF4698C',
                '#A0CCF68C',
                '#F0A7D88C',
                '#ADEFEF8C',
              ],
              opacity: true,
              defaultColor: (this.plugin.settings as any)[`custom_bg${i + 1}`] || '#000000'
            })
          );
          this.setupPickrEvents(pickr, `custom_bg${i + 1}`, 'background-color');
          this.pickrs.push(pickr);
        }
      });
    new Setting(paintbrushContainer)
      .setName(text('🖌️ Set Custom Font Color'))
      .setDesc(text('Click on the picker to adjust the color'))
      .setClass('custom_font')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });

        for (let i = 0; i < 5; i++) {
          const pickerEl = pickerContainer.createDiv({ cls: "picker" });

          const pickr = Pickr.create(
            getPickrSettings({
              isView: false,
              el: pickerEl,
              containerEl: pickerContainer,
              swatches: [
                '#D83931',
                '#DE7802',
                '#245BDB',
                '#6425D0',
                '#646A73',
              ],
              opacity: true,
              defaultColor: (this.plugin.settings as any)[`custom_fc${i + 1}`] || '#000000'
            })
          );
          this.setupPickrEvents(pickr, `custom_fc${i + 1}`, 'color');
          this.pickrs.push(pickr);
        }
      });

  }
  private displayAppearanceSettings(containerEl: HTMLElement): void {

    const appearanceSettingContainer = containerEl.createDiv('appearanceSetting-container');
    appearanceSettingContainer.style.padding = '16px';
    appearanceSettingContainer.style.borderRadius = '8px';
    appearanceSettingContainer.style.backgroundColor = 'var(--background-secondary)';
    appearanceSettingContainer.style.marginBottom = '20px';
    // Aesthetic style setting

    // Decide which style we are editing in this tab
    const editingStyle: ToolbarStyleKey =
      (this.plugin.appearanceEditStyle as ToolbarStyleKey) ||
      (this.plugin.settings.positionStyle as ToolbarStyleKey) ||
      "top";
    this.plugin.appearanceEditStyle = editingStyle;

    // Style picker – only controls which style's settings you edit
    new Setting(appearanceSettingContainer)
      .setName(text('Toolbar Settings'))
      .setDesc(text("Choose which toolbar style's appearance you want to edit."))
      .addDropdown((dropdown) => {
        const positions: Record<string, string> = {};
        POSITION_STYLES.map((position) => (positions[position] = text(position)));
        dropdown
          .addOptions(positions)
          .setValue(editingStyle)
          .onChange(async (value) => {
            const style = value as ToolbarStyleKey;
            this.plugin.appearanceEditStyle = style;     // which style we edit
            this.plugin.settings.positionStyle = style;  // persist choice
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (editingStyle === "top") {

      new Setting(appearanceSettingContainer)
        .setName(text('Editing Toolbar Auto-hide'))
        .setDesc(
          text('The toolbar is displayed when the mouse moves over it, otherwise it is automatically hidden')
        )
        .addToggle(toggle => toggle.setValue(this.plugin.settings?.autohide)
          .onChange((value) => {
            this.plugin.settings.autohide = value;
            this.plugin.saveSettings();
            this.triggerRefresh();
          }));

      new Setting(appearanceSettingContainer)
        .setName(text('Editing Toolbar Centred Display'))
        .setDesc(
          text('Whether the toolbar is centred or full-width, the default is full-width.')
        )
        .addToggle(toggle => toggle.setValue(this.plugin.settings?.Iscentered)
          .onChange((value) => {
            this.plugin.settings.Iscentered = value;
            this.plugin.saveSettings();
            this.triggerRefresh();
          }));
    }
    if (editingStyle === "fixed") {
      new Setting(appearanceSettingContainer)
        .setName(text('Editing Toolbar Columns'))
        .setDesc(
          text('Choose the number of columns per row to display on Editing Toolbar.')
        )
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
                true
              )
            )
            .setDynamicTooltip();
        });
      new Setting(appearanceSettingContainer)
        .setName(text('Fixed Position Offset'))
        .setDesc(text('Choose the offset of the Editing Toolbar in the fixed position.'))
        .addButton(button => button
          .setButtonText(text('Settings'))
          .onClick(() => {
            new openSlider(this.app, this.plugin).open();
          }));
    }
    // Color settings
    this.createColorSettings(containerEl);
  }
  private displayCommandSettings(containerEl: HTMLElement): void {
    const commandSettingContainer = containerEl.createDiv('commandSetting-container');
    commandSettingContainer.style.padding = '16px';
    commandSettingContainer.style.borderRadius = '8px';
    commandSettingContainer.style.backgroundColor = 'var(--background-secondary)';
    commandSettingContainer.style.marginBottom = '20px';
    if (this.plugin.settings.enableMultipleConfig) {
      const configSwitcher = new Setting(commandSettingContainer)
        .setName(text('Current Configuration'))
        .setDesc(text('Switch between different command configurations.'))
        .addDropdown(dropdown => {
          dropdown.addOption('top', text('Top Style'));
          dropdown.addOption('fixed', text('Fixed Style'));
          dropdown.addOption('following', text('Following Style'));

          if (this.plugin.settings.isLoadOnMobile) {
            dropdown.addOption('mobile', text('Mobile Style'));
          }

          dropdown.setValue(this.currentEditingConfig);

          dropdown.onChange(async (value) => {
            this.currentEditingConfig = value;
            this.display();
          });
        });
    }
    if (this.plugin.settings.enableMultipleConfig) {
      const currentConfigType = this.currentEditingConfig;

      const commandsArray = this.getCommandsArrayByType(currentConfigType);
      const buttonContainer = containerEl.createDiv('command-buttons-container');

      buttonContainer.style.display = 'flex';
      buttonContainer.style.flexDirection = 'column';
      buttonContainer.style.gap = '10px';

      buttonContainer.style.padding = '16px';
      buttonContainer.style.borderRadius = '8px';
      buttonContainer.style.backgroundColor = 'var(--background-secondary)';

      const importSetting = new Setting(buttonContainer)
        .setName(text('Import From'))
        .setDesc(text('Copy commands from another style configuration.'));

      let selectedSourceStyle = 'Main menu';
      const configSwitcher = new Setting(buttonContainer)

      configSwitcher.addDropdown(dropdown => {
        dropdown.addOption('Main menu', 'Main Menu Commands');

        if (currentConfigType !== 'following' && this.plugin.settings.followingCommands) {
          dropdown.addOption('following', text('Following Style'));
        }

        if (currentConfigType !== 'top' && this.plugin.settings.topCommands) {
          dropdown.addOption('top', text('Top Style'));
        }

        if (currentConfigType !== 'fixed' && this.plugin.settings.fixedCommands) {
          dropdown.addOption('fixed', text('Fixed Style'));
        }

        if (currentConfigType !== 'mobile' && this.plugin.settings.mobileCommands) {
          dropdown.addOption('mobile', text('Mobile Style'));
        }

        dropdown.setValue(selectedSourceStyle)
          .onChange(value => {
            selectedSourceStyle = value;
          });
      });
      configSwitcher.addExtraButton(button => button
        .setIcon('arrow-right')
      );
      configSwitcher.addButton(button => button
        .setButtonText(this.currentEditingConfig + ' ' + text('Import'))
        .setTooltip(text('Copy commands from selected style.'))
        .onClick(async () => {
          const sourceCommands = this.getCommandsArrayByType(selectedSourceStyle);

          if (!sourceCommands || sourceCommands.length === 0) {
            new Notice('The selected style has no commands to import.');
            return;
          }

          const confirmMessage =
            'Import commands from' + ' ' + `"${selectedSourceStyle}"` + ' to ' + `"${this.currentEditingConfig}" ` + text(`configuration`) + '?'
            ;
          ConfirmModal.show(this.app, {
            message: confirmMessage,
            onConfirm: async () => {
              switch (currentConfigType) {
                case 'Main menu':
                  this.plugin.settings.menuCommands = [...sourceCommands];
                  break;
                case 'following':
                  this.plugin.settings.followingCommands = [...sourceCommands];
                  break;
                case 'top':
                  this.plugin.settings.topCommands = [...sourceCommands];
                  break;
                case 'fixed':
                  this.plugin.settings.fixedCommands = [...sourceCommands];
                  break;
                case 'mobile':
                  this.plugin.settings.mobileCommands = [...sourceCommands];
                  break;
              }
              await this.plugin.saveSettings();
              new Notice('Commands imported successfully from' + ' ' + `"${selectedSourceStyle}"` + ' to ' + `"${this.currentEditingConfig}" ` + text(`configuration`));
              this.display();
            }
          })
        })
      );
      importSetting.addButton(button => button
        .setButtonText(text('Clear') + ' ' + `${this.currentEditingConfig}`)
        .setTooltip(text('Remove all commands from this configuration.'))
        .setWarning()
        .onClick(async () => {
          ConfirmModal.show(this.app, {
            message: text('Are you sure you want to clear all commands under the current style?'),
            onConfirm: async () => {
              switch (currentConfigType) {
                case 'following':
                  this.plugin.settings.followingCommands = [];
                  break;
                case 'top':
                  this.plugin.settings.topCommands = [];
                  break;
                case 'fixed':
                  this.plugin.settings.fixedCommands = [];
                  break;
                case 'mobile':
                  this.plugin.settings.mobileCommands = [];
                  break;
              }
              await this.plugin.saveSettings();
              new Notice('All commands have been removed.');
              this.display();
            }
          })
        })
      );
    } else {
      const buttonContainer = commandSettingContainer.createDiv('command-buttons-container');

      const clearButton = buttonContainer.createEl('button', {
        text: text('One-click Clear'),
        cls: 'mod-warning'
      });
      clearButton.addEventListener('click', async () => {
        ConfirmModal.show(this.app, {
          message: text('Are you sure you want to clear all commands under the current style?'),
          onConfirm: async () => {
            this.plugin.settings.menuCommands = [];
            await this.plugin.saveSettings();
            new Notice(text('All commands have been removed.'));
            this.display();
          }
        })
      });
    }
    const commandListContainer = containerEl.createDiv('command-lists-container');
    commandListContainer.style.padding = '16px';
    commandListContainer.style.borderRadius = '8px';
    commandListContainer.addClass(`${this.currentEditingConfig}`);
    if (this.plugin.settings.enableMultipleConfig) {
      const positionStyleInfo = commandListContainer.createEl('div', {
        cls: `position-style-info ${this.currentEditingConfig}`,
        text: text(`Currently editing commands for`) + ` "${this.currentEditingConfig} Style" ` + text(`configuration`)
      });
    }
    new Setting(commandListContainer)
      .setName(text('Editing Toolbar Commands'))
      .setDesc(text("Add a command onto Editing Toolbar from Obsidian's commands library. To reorder the commands, drag and drop the command items. To delete them, use the delete buttom to the right of the command item. Editing Toolbar will not automaticaly refresh after reordering commands. Use the refresh button above."))
      .addButton((addButton) => {
        addButton
          .setIcon("plus")
          .setTooltip(text("Add"))
          .onClick(() => {
            new CommandPicker(this.plugin, this.currentEditingConfig).open();
            this.triggerRefresh();
          });
      });
    this.createCommandList(commandListContainer);
  }
  private displayCustomCommandSettings(containerEl: HTMLElement): void {
    containerEl.empty();

    const customCommandsContainer = containerEl.createDiv('custom-commands-container');
    const descriptionEl = customCommandsContainer.createEl('p', {
      text: text('Add, edit or delete custom format commands.')
    });
    // Regex command behavior setting
    new Setting(customCommandsContainer)
      .setName(text('Use current line for regex commands'))
      .setDesc(text('When no text is selected, regex commands will use the current line instead of clipboard content'))
      .addToggle(toggle => toggle.setValue(this.plugin.settings?.useCurrentLineForRegex ?? false)
        .onChange(async (value) => {
          this.plugin.settings.useCurrentLineForRegex = value;
          await this.plugin.saveSettings();
        }));
    const commandListContainer = customCommandsContainer.createDiv('command-list-container');
    commandListContainer.style.padding = '16px';
    commandListContainer.style.borderRadius = '8px';
    commandListContainer.style.backgroundColor = 'var(--background-secondary)';
    commandListContainer.style.marginBottom = '20px';
    commandListContainer.style.marginTop = '20px';
    const addButtonContainer = customCommandsContainer.createDiv('add-command-button-container');
    addButtonContainer.style.padding = '16px';
    addButtonContainer.style.borderRadius = '8px';
    addButtonContainer.style.backgroundColor = 'var(--background-secondary)';
    addButtonContainer.style.marginBottom = '20px';
    addButtonContainer.style.marginTop = '20px';
    addButtonContainer.style.display = 'flex';
    addButtonContainer.style.gap = '10px';
    const addFormatButton = addButtonContainer.createEl('button', {
      text: text('Add Format Command')
    });
    addFormatButton.addClass('mod-cta');
    addFormatButton.addEventListener('click', () => {
      new CustomCommandModal(this.app, this.plugin, null).open();
    });
    const addRegexButton = addButtonContainer.createEl('button', {
      text: text('Add Regex Command')
    });
    addRegexButton.addClass('mod-cta');
    addRegexButton.addEventListener('click', () => {
      new RegexCommandModal(this.app, this.plugin, null).open();
    });
    this.plugin.settings.customCommands.forEach((command, index) => {
      const commandSetting = new Setting(commandListContainer)
        .setName(command.name);
      const descEl = createFragment();
      let desc = `${text('ID')}: ${command.id}`;
      if (command.useRegex) {
        desc += `, ${text('Pattern')}: ${command.regexPattern}`;
      } else {
        desc += `, ${text('Prefix')}: ${command.prefix}, ${text('Suffix')}: ${command.suffix}`;
      }
      descEl.createSpan({ text: desc });
      const typeBadge = descEl.createSpan({ cls: 'command-type-badge' });
      if (command.useRegex) {
        typeBadge.addClass('regex');
        typeBadge.setText(text('Regex'));
      } else {
        typeBadge.setText(text('Prefix/Suffix'));
      }
      commandSetting.descEl.appendChild(descEl);
      commandSetting.addButton(button => button
        .setButtonText(text('Add to Toolbar'))
        .setTooltip(text('Add this command to the toolbar.'))
        .setButtonText(text('Add to Toolbar'))
        .setTooltip(text('Add this command to the toolbar.'))
        .onClick(() => {
          if (this.plugin.settings.enableMultipleConfig) {
            new DeployCommandModal(this.app, this.plugin, command).open();
          } else {
            const isInToolbar = this.plugin.settings.menuCommands.some(
              cmd => cmd.id === `editing-toolbar:${command.id}`
            );
            if (isInToolbar) {
              new Notice(text('This command is already in the toolbar.'));
              return;
            }
            const toolbarCommand = {
              id: `editing-toolbar:${command.id}`,
              name: command.name,
              icon: command.icon || 'obsidian-new'
            };
            this.plugin.settings.menuCommands.push(toolbarCommand);
            this.plugin.saveSettings().then(() => {
              new Notice(text('Command added to toolbar'));
              dispatchEvent(new Event("editingToolbar-NewCommand"));
              this.plugin.reloadCustomCommands();
            });
          }
        })
      )
        .addExtraButton(button => {
          button
            .setIcon("pencil")
            .setTooltip(text("Edit"))
            .onClick(() => {
              if (command.useRegex) {

                new RegexCommandModal(this.app, this.plugin, index).open();
              } else {
                new CustomCommandModal(this.app, this.plugin, index).open();
              }
            });
        })
        .addButton(button => this.createDeleteButton(button, async () => {
          const customCommandId = `editing-toolbar:${this.plugin.settings.customCommands[index].id}`;
          this.removeCommandFromConfig(this.plugin.settings.menuCommands, customCommandId);

          if (this.plugin.settings.enableMultipleConfig) {
            this.removeCommandFromConfig(this.plugin.settings.followingCommands, customCommandId);
            this.removeCommandFromConfig(this.plugin.settings.topCommands, customCommandId);
            this.removeCommandFromConfig(this.plugin.settings.fixedCommands, customCommandId);

            if (this.plugin.settings.isLoadOnMobile) {
              this.removeCommandFromConfig(this.plugin.settings.mobileCommands, customCommandId);
            }
          }
          this.plugin.settings.customCommands.splice(index, 1);
          await this.plugin.saveSettings();
          this.plugin.reloadCustomCommands();
          this.display();
          new Notice(text('Command Deleted'));
        }))
      if (command.icon) {
        try {
          const iconContainer = commandSetting.nameEl.createSpan({
            cls: "editingToolbarSettingsIcon"
          });
          iconContainer.style.marginRight = "8px";
          checkHtml(command.icon) ? iconContainer.innerHTML = command.icon : setIcon(iconContainer, command.icon)
        } catch (e) {
          console.error("Failed to set icon:", e);
        }
      }
    });
  }
  private triggerRefresh(): void {
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }
  private createHeader(containerEl: HTMLElement): void {
    const headerContainer = containerEl.createEl("div", {
      cls: "editing-toolbar-header"
    });
    const titleContainer = headerContainer.createEl("div", {
      cls: "editing-toolbar-title-container"
    });
    titleContainer.createEl("h1", {
      text: "Obsidian Editing Toolbar: " + this.plugin.manifest.version,
      cls: "editing-toolbar-title"
    });
  }
  private getAppearanceBucket(style: ToolbarStyleKey): StyleAppearanceSettings {
    const settings = this.plugin.settings;

    if (!settings.appearanceByStyle || typeof settings.appearanceByStyle !== "object") {
      settings.appearanceByStyle = {} as AppearanceByStyle;
    }
    const store = settings.appearanceByStyle as AppearanceByStyle;
    if (!store[style] || typeof store[style] !== "object") {
      store[style] = {};
    }
    return store[style]!;
  }
  private createColorSettings(containerEl: HTMLElement): void {
    const editingStyle: ToolbarStyleKey =
      (this.plugin.appearanceEditStyle as ToolbarStyleKey) ||
      (this.plugin.settings.positionStyle as ToolbarStyleKey) ||
      "top";
    const appearanceBucket = this.getAppearanceBucket(editingStyle);


    const toolbarContainer = containerEl.createDiv('custom-toolbar-container');
    toolbarContainer.style.padding = '16px';
    toolbarContainer.style.borderRadius = '8px';
    toolbarContainer.style.backgroundColor = 'var(--background-secondary)';
    new Setting(toolbarContainer)
      .setName(text("Toolbar Theme"))
      .setDesc(text("Select a preset toolbar theme, automatically setting the background color, icon color, and size for the selected style."))
      .addDropdown((dropdown) => {
        const aesthetics: Record<string, string> = {};
        AESTHETIC_STYLES.forEach((aesthetic) => {
          aesthetics[aesthetic] =
            aesthetic === "custom" ? text("Custom Theme") : text(aesthetic);
        });
        dropdown.addOptions(aesthetics);
        dropdown.selectEl.options[3].disabled = true; // disable the raw "custom" option
        dropdown.addOption("light", text("┌ Light"));
        dropdown.addOption("dark", text("├ Dark"));
        dropdown.addOption("vibrant", text("├ Vibrant"));
        dropdown.addOption("minimal", text("├ Minimal"));
        dropdown.addOption("elegant", text("└ Elegant"));
        // Use the bucket for the currently edited style
        dropdown.setValue(
          (appearanceBucket.aestheticStyle as string) ??
          this.plugin.settings.aestheticStyle
        );
        dropdown.onChange(async (value) => {
          const style =
            (this.plugin.appearanceEditStyle as ToolbarStyleKey) ||
            (this.plugin.settings.positionStyle as ToolbarStyleKey) ||
            "top";
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
            bucket.toolbarIconColor ??
            this.plugin.settings.toolbarIconColor;
          const size = bucket.toolbarIconSize ?? 18;

          document.documentElement.style.setProperty(
            "--editing-toolbar-background-color",
            bg
          );
          document.documentElement.style.setProperty(
            "--editing-toolbar-icon-color",
            icon
          );
          document.documentElement.style.setProperty(
            "--toolbar-icon-size",
            `${size}px`
          );

          this.plugin.toolbarIconSize = size;
          this.destroyPickrs();
          this.display();
          await this.plugin.saveSettings();
          this.triggerRefresh();
        });
      });
    new Setting(toolbarContainer)
      .setName(text("Toolbar Background Color"))
      .setDesc(text("Set the background color of the toolbar."))
      .setClass('toolbar_background')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });
        const pickerEl = pickerContainer.createDiv({ cls: "picker" });
        const pickr = Pickr.create(
          getPickrSettings({
            isView: false,
            el: pickerEl,
            containerEl: pickerContainer,
            swatches: ['#F5F8FA', '#F4F1E8', '#2D3033', '#1A2F28', '#2A1D3B'],
            opacity: true,
            defaultColor:
              appearanceBucket.toolbarBackgroundColor ??
              this.plugin.settings.toolbarBackgroundColor,
          })
        );
        this.setupPickrEvents(pickr, 'toolbarBackgroundColor', 'background-color');
        this.pickrs.push(pickr);
      });
    new Setting(toolbarContainer)
      .setName(text("Toolbar Icon Color"))
      .setDesc(text("Set the color of the toolbar icon."))
      .setClass('toolbar_icon')
      .then((setting) => {
        const pickerContainer = setting.controlEl.createDiv({ cls: "pickr-container" });
        const pickerEl = pickerContainer.createDiv({ cls: "picker" });
        const pickr = Pickr.create(
          getPickrSettings({
            isView: false,
            el: pickerEl,
            containerEl: pickerContainer,
            swatches: [
              '#4A5568',
              '#D4AF37',
              '#2D3033',
              '#6D5846',
              '#4C2A55',
            ],
            opacity: false,
            defaultColor: this.plugin.settings.toolbarIconColor
          })
        );
        this.pickrs.push(pickr);
        this.setupPickrEvents(pickr, 'toolbarIconColor', 'icon-color');
      });
    new Setting(toolbarContainer)
      .setName(text("Toolbar Icon Size"))
      .setDesc(text("Set the size of the toolbar icon (px); default: 18px"))
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
            const style =
              (this.plugin.appearanceEditStyle as ToolbarStyleKey) ||
              (this.plugin.settings.positionStyle as ToolbarStyleKey) ||
              "top";
            const bucket = this.getAppearanceBucket(style);
            // Per-style value
            bucket.toolbarIconSize = value;
            bucket.aestheticStyle = "custom";
            // Only touch the live toolbar when editing the active style
            if (activeStyle === style) {
              this.plugin.toolbarIconSize = value;
              document.documentElement.style.setProperty(
                "--toolbar-icon-size",
                `${value}px`
              );
            }
            await this.plugin.saveSettings();
            // Rebuild the settings UI and live toolbar so the preview
            // and the real toolbar both pick up the new size.
            this.display();
            this.triggerRefresh();
          });
      });
    const previewContainer = toolbarContainer.createDiv('toolbar-preview-container');
    previewContainer.addClass('toolbar-preview-section');
    previewContainer.style.marginTop = '20px';
    const previewLabel = previewContainer.createEl('h3', {
      text: text(`Toolbar Preview (With a hypothetical command configuration.)`)
    });
    previewLabel.style.marginBottom = '10px';
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
      editingStyle
    );
    if (editingStyle === "fixed") {
      const icon = this.plugin.settings.toolbarIconSize || 18;
      const cols = this.plugin.settings.cMenuNumRows || 6;
      editingToolbar.style.display = "grid";
      editingToolbar.style.gridTemplateColumns = `repeat(${cols}, ${icon + 10}px)`;
      editingToolbar.style.gap = `${Math.max((icon - 18) / 4, 2)}px`;
      editingToolbar.style.margin = "0 auto";  // centers the grid like top/following
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
    previewCommands.forEach(item => {
      const button = new ButtonComponent(editingToolbar);
      button.setClass("editingToolbarCommandItem");
      button.buttonEl.classList.add("preview-button");
      button.setTooltip(text(item.name as any));

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
    let commandsToEdit: Command[] = [];
    if (this.plugin.settings.enableMultipleConfig) {
      switch (this.currentEditingConfig) {
        case 'mobile':
          commandsToEdit = this.plugin.settings.mobileCommands;
          break;
        case 'following':
          commandsToEdit = this.plugin.settings.followingCommands;
          break;
        case 'top':
          commandsToEdit = this.plugin.settings.topCommands;
          break;
        case 'fixed':
          commandsToEdit = this.plugin.settings.fixedCommands;
          break;
        default:
          commandsToEdit = this.plugin.settings.menuCommands;
      }
    } else {
      commandsToEdit = this.plugin.settings.menuCommands;
    }
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
      filter: ".setting-item-control button, .dropdown, .editingToolbarMenuTypeDropdown",
      preventOnFilter: false,
      onChoose: function (evt) {
        const item = evt.item;
        item.classList.add('sortable-chosen-feedback');
      },
      onUnchoose: function (evt) {
        const item = evt.item;
        item.classList.remove('sortable-chosen-feedback');
      },
      onSort: (command) => {
        if (command.from.className === command.to.className) {
          const arrayResult = commandsToEdit;
          const [removed] = arrayResult.splice(command.oldIndex, 1)
          arrayResult.splice(command.newIndex, 0, removed);
          if (this.plugin.settings.enableMultipleConfig) {
            switch (this.currentEditingConfig) {
              case 'mobile':
                this.plugin.settings.mobileCommands = arrayResult;
                break;
              case 'following':
                this.plugin.settings.followingCommands = arrayResult;
                break;
              case 'top':
                this.plugin.settings.topCommands = arrayResult;
                break;
              case 'fixed':
                this.plugin.settings.fixedCommands = arrayResult;
                break;
            }
          } else {
            this.plugin.settings.menuCommands = arrayResult;
          }
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
      const setting = new Setting(editingToolbarCommandsContainer)
      if ("SubmenuCommands" in newCommand) {
        setting.settingEl.setAttribute("data-id", newCommand.id)
        setting
          .setClass("editingToolbarCommandItem")
          .setClass("editingToolbarCommandsubItem")
          .setName(this.getLocalizedCommandName(newCommand.name))
          .addButton((addicon) => {
            addicon
              .setClass("editingToolbarSettingsIcon")
              .onClick(async () => {
                new ChooseFromIconList(this.plugin, newCommand, false, null, this.currentEditingConfig).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })
          .addButton((changename) => {
            changename
              .setIcon("pencil")
              .setTooltip(text("Change Submenu Name"))
              .setClass("editingToolbarSettingsButton")
              .onClick(async () => {
                new ChangeCmdname(this.app, this.plugin, newCommand, false, this.currentEditingConfig).open();
              });
          })
          .addDropdown((dropdown) => {
            dropdown
              .addOption("submenu", text("Button Submenu"))
              .addOption("dropdown", text("Dropdown Menu"))
              .setValue(newCommand.menuType || "submenu")
              .onChange(async (value: "submenu" | "dropdown") => {
                newCommand.menuType = value;
                this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
                await this.plugin.saveSettings();
                this.triggerRefresh();
                new Notice(text("Menu type changed to") + ": " + (value === "dropdown" ? text("Dropdown Menu") : text("Button Submenu")));
              });
            dropdown.selectEl.addClass("editingToolbarMenuTypeDropdown");
          })
          .addButton((deleteButton) => this.createDeleteButton(deleteButton, async () => {
            currentCommands.remove(newCommand);
            this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
            await this.plugin.saveSettings();
            this.display();
            this.triggerRefresh();
            console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
          }))

        if (newCommand.id == "editingToolbar-plugin:change-font-color") return;
        if (newCommand.id == "editingToolbar-plugin:change-background-color") return;

        const editingToolbarCommandsContainer_sub = setting.settingEl.createEl("div", {
          cls: "editingToolbarSettingsTabsContainer_sub",
        });
        Sortable.create(editingToolbarCommandsContainer_sub, {
          group: {
            name: "item",
            pull: true,
            put: function () {
              if (dragele.includes("editingToolbarCommandsubItem"))
                return false;
              else return true;
            }
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
          onStart: function () { },
          onSort: (command) => {

            if (command.from.className === command.to.className) {
              const arrayResult = commandsToEdit;
              const subresult = arrayResult[index]?.SubmenuCommands;

              if (subresult) {
                const [removed] = subresult.splice(command.oldIndex, 1);
                subresult.splice(command.newIndex, 0, removed);
                this.plugin.updateCurrentCommands(arrayResult, this.currentEditingConfig);
                this.plugin.saveSettings();
              }
            } else if (command.to.className === "editingToolbarSettingsTabsContainer") {
              const arrayResult = commandsToEdit;
              const datasetId = command.target.parentElement?.dataset?.["id"];

              if (!datasetId) {
                console.error('Cannot find parent dataset id');
                return;
              }

              const cmdindex = getComandindex(datasetId, arrayResult);

              if (cmdindex === -1 || !arrayResult[cmdindex]) {
                console.error('Cannot find parent command:', datasetId);
                return;
              }

              const subresult = arrayResult[cmdindex].SubmenuCommands;

              if (!subresult || !Array.isArray(subresult) || command.oldIndex < 0 || command.oldIndex >= subresult.length) {
                console.error('Invalid drag operation');
                return;
              }

              const [removed] = subresult.splice(command.oldIndex, 1);
              arrayResult.splice(command.newIndex, 0, removed);
              this.plugin.updateCurrentCommands(arrayResult, this.currentEditingConfig);
              this.plugin.saveSettings();
            } else if (command.from.className === "editingToolbarSettingsTabsContainer") {
              const arrayResult = commandsToEdit;
              const fromDatasetId = command.target.parentElement?.dataset?.["id"];

              if (!fromDatasetId) {
                console.error('Cannot find target dataset id');
                return;
              }

              const cmdindex = getComandindex(fromDatasetId, arrayResult);

              if (cmdindex === -1 || !arrayResult[cmdindex]) {
                console.error('Cannot find target command:', fromDatasetId);
                return;
              }

              const subresult = arrayResult[cmdindex].SubmenuCommands;

              if (!subresult || !Array.isArray(subresult) || command.oldIndex < 0 || command.oldIndex >= arrayResult.length) {
                console.error('Invalid drag operation');
                return;
              }

              const [removed] = arrayResult.splice(command.oldIndex, 1);
              subresult.splice(command.newIndex, 0, removed);
              this.plugin.updateCurrentCommands(arrayResult, this.currentEditingConfig);
              this.plugin.saveSettings();
            }
            this.triggerRefresh();
          },
        });
        newCommand.SubmenuCommands.forEach((subCommand: Command) => {
          const subsetting = new Setting(editingToolbarCommandsContainer_sub)
          subsetting
            .setClass("editingToolbarCommandItem")
            .addButton((addicon) => {
              addicon
                .setClass("editingToolbarSettingsIcon")
                .onClick(async () => {
                  new ChooseFromIconList(this.plugin, subCommand, true, null, this.currentEditingConfig).open();
                });
              checkHtml(subCommand?.icon) ? addicon.buttonEl.innerHTML = subCommand.icon : addicon.setIcon(subCommand.icon)
            })
            .setName(this.getLocalizedCommandName(subCommand.name))
            .addButton((changename) => {
              changename
                .setIcon("pencil")
                .setTooltip(text("Change Command Name"))
                .setClass("editingToolbarSettingsButton")
                .onClick(async () => {
                  new ChangeCmdname(this.app, this.plugin, subCommand, true, this.currentEditingConfig).open();
                });
            })
            .addButton((deleteButton) => this.createDeleteButton(deleteButton, async () => {
              newCommand.SubmenuCommands.remove(subCommand);
              await this.plugin.saveSettings();
              this.display();
              this.triggerRefresh();
              console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
            }))
          subsetting.nameEl;
        });
      } else {
        setting
          .addButton((addicon) => {
            addicon
              //    .setIcon(newCommand.icon)
              .setClass("editingToolbarSettingsIcon")
              .onClick(async () => {
                new ChooseFromIconList(this.plugin, newCommand, false, null, this.currentEditingConfig).open();
              });
            checkHtml(newCommand.icon) ? addicon.buttonEl.innerHTML = newCommand.icon : addicon.setIcon(newCommand.icon)
          })
        if (newCommand.id == "editingToolbar-Divider-Line") setting.setClass("editingToolbar-Divider-Line")
        setting
          .setClass("editingToolbarCommandItem")
          .setName(this.getLocalizedCommandName(newCommand.name))
          .addButton((changename) => {
            changename
              .setIcon("pencil")
              .setTooltip(text("Change Command Name"))
              .setClass("editingToolbarSettingsButton")
              .onClick(async () => {
                new ChangeCmdname(this.app, this.plugin, newCommand, false, this.currentEditingConfig).open();
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("editingToolbarSub")
              .setTooltip(text("Add Submenu"))
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonaddsub")
              .onClick(async () => {
                const submenuCommand: SubmenuCommand = {
                  id: "SubmenuCommands-" + GenNonDuplicateID(1),
                  name: "submenu",
                  icon: "remix-Filter3Line",
                  SubmenuCommands: []
                };
                const currentCommands = commandsToEdit;
                currentCommands.splice(index + 1, 0, submenuCommand);
                this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
                console.log(`%cCommand '${submenuCommand.id}' add `, "color: #989cab");
              });
          })
          .addButton((addsubButton) => {
            addsubButton
              .setIcon("vertical-split")
              .setTooltip(text("Add Separator"))
              .setClass("editingToolbarSettingsButton")
              .setClass("editingToolbarSettingsButtonaddsub")
              .onClick(async () => {
                const dividermenu =
                  { id: "editingToolbar-Divider-Line", name: text("Vertical Split"), icon: "vertical-split" };
                const currentCommands = commandsToEdit;
                currentCommands.splice(index + 1, 0, dividermenu);
                this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
                await this.plugin.saveSettings();
                this.display();
                this.triggerRefresh();
              });
          })
          .addButton((deleteButton) => this.createDeleteButton(deleteButton, async () => {
            currentCommands.remove(newCommand);
            this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
            await this.plugin.saveSettings();
            this.display();
            this.triggerRefresh();
            console.log(`%cCommand '${newCommand.name}' was removed from editingToolbar`, "color: #989cab");
          }))
      }
    });
  }
  private setupPickrEvents(
    pickr: any,
    settingKey: string,
    cssProperty: string
  ) {
    pickr.on("save", (color: any) => {
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
        const bucket = this.getAppearanceBucket(editingStyle as ToolbarStyleKey);
        (bucket as any)[settingKey] = hexColor;
        // Only push CSS variables if we're editing the active style
        if (activeStyle === editingStyle) {
          document.documentElement.style.setProperty(
            `--editing-toolbar-${cssProperty}`,
            hexColor
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
        (this.plugin.settings as any)[settingKey] = hexColor;
      }
      this.plugin.saveSettings();
    });
  }
  private destroyPickrs() {
    this.pickrs.forEach(pickr => {
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
  private removeCommandFromConfig(commands: any[], commandId: string) {
    if (!commands) return;
    for (let i = commands.length - 1; i >= 0; i--) {
      if (commands[i].id === commandId) {
        commands.splice(i, 1);
        continue;
      }
      if (commands[i].SubmenuCommands) {
        this.removeCommandFromConfig(commands[i].SubmenuCommands, commandId);
      }
    }
  }

  private displayImportExportSettings(containerEl: HTMLElement): void {
    const importExportContainer = containerEl.createDiv('import-export-container');
    importExportContainer.style.padding = '16px';
    importExportContainer.style.borderRadius = '8px';
    importExportContainer.style.backgroundColor = 'var(--background-secondary)';
    importExportContainer.style.marginBottom = '20px';
    new Setting(importExportContainer)
      .setName(text('Export Configuration'))
      .setDesc(text('Export your toolbar configuration to share with others.'))
      .addButton(button => button
        .setButtonText(text('Export'))
        .setCta()
        .onClick(() => {
          new ImportExportModal(this.app, this.plugin, 'export').open();
        })
      );
    new Setting(importExportContainer)
      .setName(text('Import Configuration'))
      .setDesc(text('Import toolbar configuration from JSON.'))
      .addButton(button => button
        .setButtonText(text('Import'))
        .setCta()
        .onClick(() => {
          new ImportExportModal(this.app, this.plugin, 'import').open();
        })
      );
    const infoDiv = containerEl.createDiv('import-export-info');
    infoDiv.style.marginTop = '20px';
    infoDiv.style.padding = '16px';
    infoDiv.style.borderRadius = '8px';
    infoDiv.style.backgroundColor = 'var(--background-secondary)';
    infoDiv.createEl('h3', {
      text: text('Usage Instructions'),
      cls: 'import-export-heading'
    }).style.marginTop = '0';

    const ul = infoDiv.createEl('ul');
    ul.style.paddingLeft = '20px';
    ul.createEl('li', { text: text('Export: Generate a JSON configuration that you can save or share.') });
    ul.createEl('li', { text: text('Import: Paste a previously exported JSON configuration.') });
    const communityDiv = containerEl.createDiv('community-share-container');
    communityDiv.style.marginTop = '20px';
    communityDiv.style.padding = '16px';
    communityDiv.style.borderRadius = '8px';
    communityDiv.style.backgroundColor = 'rgba(var(--color-green-rgb), 0.1)';
    communityDiv.style.border = '1px solid rgba(var(--color-green-rgb), 0.3)';
    communityDiv.createEl('h3', {
      text: text('Join the Community'),
      cls: 'community-heading'
    }).style.marginTop = '0';

    const shareLink = communityDiv.createEl('p');
    shareLink.innerHTML = text('Share your toolbar settings and styles in our') + ' <a href="https://github.com/PKM-er/obsidian-editing-toolbar/discussions/categories/show-and-tell" target="_blank" rel="noopener noreferrer">Show and Tell</a> ';
    const shareNote = communityDiv.createEl('p', {
      text: text('Get inspired by what others have created or showcase your own customizations.')
    });
    const warningDiv = containerEl.createDiv('import-export-warning');
    warningDiv.style.marginTop = '20px';
    warningDiv.style.padding = '16px';
    warningDiv.style.borderRadius = '8px';
    warningDiv.style.backgroundColor = 'rgba(var(--color-red-rgb), 0.1)';
    warningDiv.style.border = '1px solid rgba(var(--color-red-rgb), 0.3)';
    warningDiv.createEl('p', {
      text: text('Warning: Importing configuration will overwrite your current settings. Consider exporting your current configuration first as a backup.'),
      cls: 'warning-text'
    }).style.margin = '0';
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
  private applyAestheticStyle(element: HTMLElement, aestheticStyle: string, positionStyle: string) {
    Object.values(this.aestheticStyleMap).forEach(className => {
      element.removeClass(className);
    });
    const selectedAestheticClass = this.aestheticStyleMap[aestheticStyle] || this.aestheticStyleMap.default;
    element.addClass(selectedAestheticClass);
    const positionClass = this.aestheticStyleMap[positionStyle] || this.aestheticStyleMap.top;
    element.addClass(positionClass);
  }
  private getCommandsArrayByType(type: string) {
    switch (type) {
      case 'following':
        return this.plugin.settings.followingCommands;
      case 'top':
        return this.plugin.settings.topCommands;
      case 'fixed':
        return this.plugin.settings.fixedCommands;
      case 'mobile':
        return this.plugin.settings.mobileCommands;
      default:
        return this.plugin.settings.menuCommands;
    }
  }
}
