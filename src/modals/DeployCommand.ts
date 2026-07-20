import { App, Modal, Notice, setIcon, Setting, ToggleComponent } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { t } from 'src/translations/helper';

interface DeployOption {
  id: string;
  name: string;
  enabled: boolean;
  toggle?: ToggleComponent;
}

export class DeployCommandModal extends Modal {
    private deployOptions: DeployOption[] = [];
    private command: any;
    private plugin: editingToolbarPlugin;
  

    constructor(app: App, plugin: editingToolbarPlugin, command: any) {
      super(app);
      this.plugin = plugin;
      this.command = command;
      this.deployOptions = [
        { id: 'following', name: t('Following Style'), enabled: true },
        { id: 'top', name: t('Top Style'), enabled: true },
        { id: 'fixed', name: t('Fixed Style'), enabled: true },
      ];
      if (this.plugin.settings.isLoadOnMobile) {
        this.deployOptions.push({ id: 'mobile', name: t('Mobile Style'), enabled: true });
      }
    }
  
    onOpen() {
      const { contentEl } = this;
      contentEl.empty();
      
      contentEl.createEl('h3', { text: t('Deploy command to configurations') });
      
      const allContainer = contentEl.createDiv('deploy-option');
  
  
      const optionsContainer = contentEl.createDiv('deploy-options');
      this.deployOptions.forEach(option => {
        const setting = new Setting(optionsContainer)
          .setName(option.name)
          .addToggle(toggle => {
            return toggle
              .setValue(option.enabled)
              .onChange(value => {
                option.enabled = value;
              });
          });
        setting.settingEl.addClass('deploy-option');
      });
  
      const buttonContainer = contentEl.createDiv('deploy-buttons');
      new Setting(buttonContainer)
        .addButton(button => button
          .setButtonText(t('Deploy'))
          .setCta()
          .onClick(() => {
            this.deployCommand();
            this.close();
          }))
        .addButton(button => button
          .setButtonText(t('Cancel'))
          .onClick(() => {
            this.close();
          }));
    }
    

  
    private deployCommand() {
      const toolbarCommand = {
        id: `editing-toolbar:${this.command.id}`,
        name: this.command.name,
        icon: this.command.icon || 'obsidian-new'
      };

      const existsInDefault = this.plugin.settings.menuCommands.some(
        cmd => cmd.id === toolbarCommand.id
      );

      if (!existsInDefault) {
        this.plugin.settings.menuCommands.push({...toolbarCommand});
      }

      let deployedCount = 0;
      
      this.deployOptions.forEach(option => {
        if (option.enabled) {
          let targetCommands: any[] | undefined;
          
          switch (option.id) {
            case 'mobile':
              targetCommands = this.plugin.settings.mobileCommands;
              break;
            case 'following':
              targetCommands = this.plugin.settings.followingCommands;
              break;
            case 'top':
              targetCommands = this.plugin.settings.topCommands;
              break;
            case 'fixed':
              targetCommands = this.plugin.settings.fixedCommands;
              break;
          }

          if (targetCommands && !targetCommands.some(cmd => cmd.id === toolbarCommand.id)) {
            targetCommands.push({...toolbarCommand});
            deployedCount++;
          }
        }
      });

      this.plugin.saveSettings().then(() => {
        let message = '';
        
        if (deployedCount > 0) {
          const deployedConfigs = this.deployOptions
            .filter(opt => opt.enabled)
            .map(opt => opt.name)
            .join(', ');
          
          message = t('Command deployed to: ') + deployedConfigs;
        
        } else {
          message = t('Command already exists in selected configurations');
        }

        new Notice(message);
        dispatchEvent(new Event("editingToolbar-NewCommand"));
        this.plugin.reloadCustomCommands();
      });
    }
}
  