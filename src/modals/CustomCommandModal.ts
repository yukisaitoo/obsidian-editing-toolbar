import { App, Modal, Notice, setIcon, Setting, TextComponent } from "obsidian";
import { RegexCommandModal } from "src/modals/RegexCommandModal";
import { ChooseFromIconList } from "src/modals/suggesterModals";
import editingToolbarPlugin from "src/plugin/main";
import { strings } from 'src/translations/helper';
export class CustomCommandModal extends Modal {
  private plugin: editingToolbarPlugin;
  private commandIndex: number | null;
  private commandId: string;
  private commandName: string;
  private prefix: string;
  private suffix: string;
  private char: number;
  private line: number;
  private islinehead: boolean;
  private icon: string;
  private iconDisplay: HTMLElement;
  private commandNameInput: TextComponent;
  private commandIdInput: TextComponent;
  private suffixInput: TextComponent;

  constructor(app: App, plugin: editingToolbarPlugin, commandIndex: number | null) {
    super(app);
    this.plugin = plugin;
    this.commandIndex = commandIndex;
   
    if (commandIndex !== null) {
      const command = plugin.settings.customCommands[commandIndex];
      this.commandId = command.id;
      this.commandName = command.name;
      this.prefix = command.prefix;
      this.suffix = command.suffix;
      this.char = command.char;
      this.line = command.line;
      this.islinehead = command.islinehead;
      this.icon = command.icon || '';
    } else {
      this.commandId = '';
      this.commandName = '';
      this.prefix = '';
      this.suffix = '';
      this.char = 0;
      this.line = 0;
      this.islinehead = false;
      this.icon = '';
    }
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('custom-commands-modal');
    contentEl.empty();
    contentEl.createEl('h2', { text: this.commandIndex !== null ? strings.editCustomCommand : strings.addCustomCommand });

    const switchButtonContainer = contentEl.createDiv('switch-to-regex-container');
    switchButtonContainer.style.marginBottom = '20px';
    switchButtonContainer.style.textAlign = 'center';

    const switchButton = switchButtonContainer.createEl('button', {
      text: strings.switchRegexCommandWindow
    });
    switchButton.addClass('mod-cta');
    switchButton.addEventListener('click', () => {
      this.close();
      new RegexCommandModal(this.app, this.plugin, null).open();
    });

    const commandIdSetting = new Setting(contentEl)
      .setName(strings.commandId)
      .setDesc(strings.uniqueIdentifierSpacesEG)
      .addText(text => {
        this.commandIdInput = text;
        text.setValue(this.commandId);
        if (this.commandIndex !== null) {
          text.setDisabled(true);
          text.inputEl.addClass('id-is-disabled');
        } else {
          text.onChange(value => {
            this.commandId = value;

            if (this.commandNameInput) {
              this.commandNameInput.setValue(value);
              this.commandName = value;
            }
          });
        }
        return text;
      });

    const commandNameSetting = new Setting(contentEl)
      .setName(strings.commandName)
      .setDesc(strings.displayedNameToolbarMenu)
      .addText(text => this.commandNameInput = text
        .setValue(this.commandName)
        .onChange(value => this.commandName = value)
      );


const specialCharMap = {
  '\n': '↵',
  '\t': '⇥',
};
const reverseSpecialCharMap = Object.fromEntries(
  Object.entries(specialCharMap).map(([key, value]) => [value, key])
);

function toDisplayText(text:string) {
  let result = text;
  for (const [char, placeholder] of Object.entries(specialCharMap)) {
    result = result.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
  }
  return result;
}

function toStoredText(text:string) {
  let result = text;
  for (const [placeholder, char] of Object.entries(reverseSpecialCharMap)) {
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
  }
  return result;
}

const specialCharButtons = Object.entries(specialCharMap).map(([char, placeholder]) => {
  let label = placeholder;
  switch (char) {
    case '\n': label += ' (New Line)'; break;
    case '\t': label += ' (Tab)'; break;
  }
  return { placeholder, label };
});
// function insertSpecialChar(input:HTMLInputElement, placeholder:string) {
//   if (input instanceof HTMLInputElement) {
//     const start = input.selectionStart;
//     const end = input.selectionEnd;
//     const currentValue = input.value;
//     const newValue = currentValue.slice(0, start) + placeholder + currentValue.slice(end);
//     input.value = newValue;
//     input.focus();
//     input.setSelectionRange(start + placeholder.length, start + placeholder.length);
//     const changeEvent = new Event('change', { bubbles: true });
//     input.dispatchEvent(changeEvent);
//     return newValue;
//   }
//   return '';
// }

function addSpecialCharButtons(setting: Setting, input: HTMLInputElement) {
  
  input.setAttribute('title', '点击可选择并复制文本');
  
  const buttonContainer = setting.controlEl.createDiv({ cls: 'special-char-buttons' });
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexWrap = 'wrap';
  buttonContainer.style.gap = '5px';
  buttonContainer.style.marginTop = '5px';
  
  specialCharButtons.forEach(({ placeholder, label }) => {
    const charContainer = buttonContainer.createDiv({ cls: 'char-copy-container' });
    charContainer.style.position = 'relative';
    charContainer.style.display = 'inline-block';
    
    const button = charContainer.createEl('button', { text: label });
    button.style.padding = '2px 6px';
    button.style.fontSize = '12px';
    button.style.minWidth = 'auto';
    button.style.border = '1px solid var(--background-modifier-border)';
    button.style.cursor = 'pointer';
    button.setAttribute('data-char', placeholder);
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(placeholder)
        .then(() => {
          const tooltip = charContainer.createDiv({ cls: 'copy-tooltip' });
          tooltip.style.position = 'absolute';
          tooltip.style.bottom = '100%';
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          tooltip.style.backgroundColor = 'var(--background-modifier-success)';
          tooltip.style.color = 'white';
          tooltip.style.padding = '2px 6px';
          tooltip.style.borderRadius = '4px';
          tooltip.style.fontSize = '12px';
          tooltip.style.pointerEvents = 'none';
          tooltip.style.whiteSpace = 'nowrap';
          tooltip.style.zIndex = '100';
          tooltip.textContent = '已复制!';
          
          setTimeout(() => {
            tooltip.remove();
          }, 2000);
        })
        .catch(err => {
          console.error('无法复制文本: ', err);
        });
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--interactive-accent)';
      button.style.color = 'var(--text-on-accent)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '';
      button.style.color = '';
    });
  });
   
  
 
}
const prefixSetting = new Setting(contentEl)
  .setName(strings.prefix)
  .setDesc(strings.addContentBeforeSelectedText+strings.useRepresentLineBreaks)
  .addText(text => text
    .setValue(toDisplayText(this.prefix))
    .onChange(value => {
      this.prefix = toStoredText(value);

      const mirrorText = this.getMirrorText(value);

      if (mirrorText) {
        this.suffix = toStoredText(mirrorText);
        this.suffixInput.setValue(mirrorText);
      }
    })
  )
addSpecialCharButtons(prefixSetting, prefixSetting.controlEl.querySelector('input'));

const suffixSetting = new Setting(contentEl)
  .setName(strings.suffix)
  .setDesc(strings.addContentAfterSelectedText)
  .addText(text => {
    this.suffixInput = text;
    text.setValue(toDisplayText(this.suffix))
      .onChange(value => {
        this.suffix = toStoredText(value);
      });
  })
addSpecialCharButtons(suffixSetting, suffixSetting.controlEl.querySelector('input'));


    const charSetting = new Setting(contentEl)
      .setName(strings.cursorPositionOffset)
      .setDesc(strings.default0FormatKeepText)
      .addText(text => text
        .setValue(this.char.toString())
        .onChange(value => this.char = parseInt(value) || 0)
      );

    const lineSetting = new Setting(contentEl)
      .setName(strings.lineOffset)
      .setDesc(strings.lineOffsetCursorAfterFormatting)
      .addText(text => text
        .setValue(this.line.toString())
        .onChange(value => this.line = parseInt(value) || 0)
      );

    new Setting(contentEl)
      .setName(strings.lineHeadFormat)
      .setDesc(strings.whetherInsertBeginningNextLine)
      .addToggle(toggle => toggle
        .setValue(this.islinehead)
        .onChange(value => this.islinehead = value)
      );

    const iconSetting = new Setting(contentEl)
      .setName(strings.icon)
      .setDesc(strings.commandIconClickSelect);

    this.iconDisplay = iconSetting.controlEl.createDiv('editingToolbarSettingsIcon');
    if (this.icon) {
      try {
        setIcon(this.iconDisplay, this.icon);
      } catch (e) {
        this.iconDisplay.setText(this.icon);
      }
    }



    iconSetting.addButton(button => button
      .setButtonText(strings.chooseIcon)
      .onClick(() => {
        const command = {
          id: this.commandId,
          name: this.commandName,
          icon: this.icon
        }

        new ChooseFromIconList(
          this.plugin,
          command,
          false,
          (selectedIcon) => {
            this.icon = selectedIcon;
            this.iconDisplay.empty();
            if (this.icon) {
              try {
                setIcon(this.iconDisplay, this.icon);
              } catch (e) {
                this.iconDisplay.setText(this.icon);
              }
            }
            const iconInput = iconSetting.controlEl.querySelector('input');
            if (iconInput) {
              iconInput.value = this.icon;
            }
          }
        ).open();
      })
    );



    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(strings.save)
        .setCta()
        .onClick(() => {
          if (!this.commandId || !this.commandName) {
            new Notice(strings.commandIdCommandNameCannot);
            return;
          }

          if (this.commandId.includes(' ')) {
            new Notice(strings.commandIdCannotContainSpaces);
            return;
          }
          const commandId = this.commandIndex === null ? `custom-${this.commandId}` : this.commandId;
          if (this.commandIndex === null) {
            
            const existingIndex = this.plugin.settings.customCommands.findIndex(
              cmd => cmd.id === commandId
            );
            if (existingIndex >= 0) {
              new Notice(strings.command2 + this.commandId + strings.alreadyExists, 8000);
              return;
            }
          }
      
          const command = {
            id: commandId,
            name: this.commandName,
            prefix: this.prefix,
            suffix: this.suffix,
            char: this.char,
            line: this.line,
            islinehead: this.islinehead,
            icon: this.icon
          };

          if (this.commandIndex !== null) {
            const oldCommand = this.plugin.settings.customCommands[this.commandIndex];
            const oldIcon = oldCommand.icon;

            if (oldIcon !== this.icon) {
              const customCommandId = `editing-toolbar:${commandId}`;

              this.updateCommandIcon(this.plugin.settings.menuCommands, customCommandId);

              if (this.plugin.settings.enableMultipleConfig) {
                this.updateCommandIcon(this.plugin.settings.followingCommands, customCommandId);
                this.updateCommandIcon(this.plugin.settings.topCommands, customCommandId);
                this.updateCommandIcon(this.plugin.settings.fixedCommands, customCommandId);

                if (this.plugin.settings.isLoadOnMobile) {
                  this.updateCommandIcon(this.plugin.settings.mobileCommands, customCommandId);
                }
              }
            }

            this.plugin.settings.customCommands[this.commandIndex] = command;
          } else {
            this.plugin.settings.customCommands.push(command);
          }

          this.plugin.saveSettings().then(() => {
            this.close();
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
              this.plugin.reloadCustomCommands();
            }, 100);
          });
        })
      )
      .addButton(button => button
        .setButtonText(strings.cancel)
        .onClick(() => this.close())
      );

    setTimeout(() => {
      if (this.commandIndex !== null)
        this.commandIdInput.inputEl.focus();
      else
        this.commandNameInput.inputEl.focus();
    }, 10);
  }

  private updateCommandIcon(commands: any[], commandId: string) {
    if (!commands) return;

    commands.forEach(cmd => {
      if (cmd.id === commandId) {
        cmd.icon = this.icon;
      }
      if (cmd.SubmenuCommands) {
        this.updateCommandIcon(cmd.SubmenuCommands, commandId);
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private getMirrorText(text: string): string {
    const commonPairs: { [key: string]: string } = {
      '**': '**',
      '*': '*',
      '__': '__',
      '_': '_',
      '~~': '~~',
      '`': '`',
      '```': '```',
      '$': '$',
      '$$': '$$',
      '(': ')',
      '[': ']',
      '{': '}',
      '<': '>',
      '==': '==',
      '*==': '==*',
      '**==': '==**',
      '***==': '==***',

    };

    if (!text) return '';

    if (text in commonPairs) {
      return commonPairs[text];
    }

    const htmlTagMatch = text.match(/^<(\w+)([^>]*)>$/);
    if (htmlTagMatch) {
      return `</${htmlTagMatch[1]}>`;
    }

    return '';
  }
} 