import { App, Modal, Notice, setIcon, Setting, ToggleComponent } from "obsidian";
import editingToolbarPlugin from "src/plugin/main";
import { strings } from 'src/translations/helper';

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
        { id: 'following', name: strings.followingStyle, enabled: true },
        { id: 'top', name: strings.topStyle, enabled: true },
        { id: 'fixed', name: strings.fixedStyle, enabled: true },
      ];
      if (this.plugin.settings.isLoadOnMobile) {
        this.deployOptions.push({ id: 'mobile', name: strings.mobileStyle, enabled: true });
      }
    }
  
    onOpen() {
      const { contentEl } = this;
      contentEl.empty();
      
      contentEl.createEl('h3', { text: strings.deployCommandConfigurations });
      
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
          .setButtonText(strings.deploy)
          .setCta()
          .onClick(() => {
            this.deployCommand();
            this.close();
          }))
        .addButton(button => button
          .setButtonText(strings.cancel)
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
          
          message = strings.commandDeployed + deployedConfigs;
        
        } else {
          message = strings.commandAlreadyExistsSelectedConfigurations;
        }

        new Notice(message);
        dispatchEvent(new Event("editingToolbar-NewCommand"));
        this.plugin.reloadCustomCommands();
      });
    }
}
  