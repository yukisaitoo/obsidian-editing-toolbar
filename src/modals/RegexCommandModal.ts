import { App, Modal, Notice, setIcon, Setting, TextComponent, ToggleComponent } from "obsidian";
import { ChooseFromIconList } from "src/modals/suggesterModals";
import editingToolbarPlugin from "src/plugin/main";
import { CustomCommand } from "src/settings/settingsData";
import { strings } from 'src/translations/helper';

export class RegexCommandModal extends Modal {
  private plugin: editingToolbarPlugin;
  private commandIndex: number | null;
  private commandId: string;
  private commandName: string;
  private icon: string;
  private iconDisplay: HTMLElement;

  private regexPattern: string;
  private regexReplacement: string;
  private regexCaseInsensitive: boolean;
  private regexGlobal: boolean;
  private regexMultiline: boolean;

  private useCondition: boolean;
  private conditionPattern: string;

  private previewInput: HTMLTextAreaElement;
  private previewOutput: HTMLElement;
  private regexPatternInput: TextComponent;
  private regexReplacementInput: TextComponent;
  private useConditionToggle: ToggleComponent;
  private conditionPatternInput: TextComponent;
  private regexMultilineToggle: ToggleComponent;

  constructor(app: App, plugin: editingToolbarPlugin, commandIndex: number | null) {
    super(app);
    this.plugin = plugin;
    this.commandIndex = commandIndex;

    if (commandIndex !== null) {
      const command = plugin.settings.customCommands[commandIndex];
      this.commandId = command.id;
      this.commandName = command.name;
      this.icon = command.icon || '';

      this.regexPattern = command.regexPattern || '';
      this.regexReplacement = command.regexReplacement || '';
      this.regexCaseInsensitive = command.regexCaseInsensitive || false;
      this.regexGlobal = command.regexGlobal !== false;
      this.regexMultiline = command.regexMultiline || false;

      this.useCondition = command.useCondition || false;
      this.conditionPattern = command.conditionPattern || '';
    } else {
      this.commandId = '';
      this.commandName = '';
      this.icon = '';

      this.regexPattern = '';
      this.regexReplacement = '';
      this.regexCaseInsensitive = false;
      this.regexGlobal = true;
      this.regexMultiline = false;

      this.useCondition = false;
      this.conditionPattern = '';
    }
  }

  onOpen() {
    const { contentEl } = this;
    this.modalEl.addClass('custom-commands-modal');
    contentEl.empty();
    contentEl.createEl('h2', { text: this.commandIndex !== null ? strings.editRegularExpressionCommand : strings.addRegularExpressionCommand });

    const basicSettingsContainer = contentEl.createDiv('basic-settings-container');

    const commandIdSetting = new Setting(basicSettingsContainer)
      .setName(strings.commandId)
      .setDesc(strings.uniqueIdentifierSpacesEG)
      .addText(text => {
        text.setValue(this.commandId);
        if (this.commandIndex !== null) {
          text.setDisabled(true);
          text.inputEl.addClass('id-is-disabled');
        } else {
          text.onChange(value => {
            this.commandId = value;
            const commandNameInput = contentEl.querySelector('.setting-item:nth-child(2) input');
            if (commandNameInput instanceof HTMLInputElement) {
              commandNameInput.value = value;
              this.commandName = value;
            }
          });
        }
        return text;
      });

    const commandNameSetting = new Setting(basicSettingsContainer)
      .setName(strings.commandName)
      .setDesc(strings.displayedNameToolbarMenu)
      .addText(text => text
        .setValue(this.commandName)
        .onChange(value => this.commandName = value)
      );

    const regexContainer = contentEl.createDiv('regex-settings');
    regexContainer.style.border = '1px solid var(--background-modifier-border)';
    regexContainer.style.padding = '10px';
    regexContainer.style.borderRadius = '5px';
    regexContainer.style.marginBottom = '10px';

    const aiHelpContainer = regexContainer.createEl('details', { cls: 'ai-help-container' });
    aiHelpContainer.style.marginBottom = '10px';
    aiHelpContainer.style.borderRadius = '5px';
    aiHelpContainer.style.overflow = 'hidden';

    const aiHelpSummary = aiHelpContainer.createEl('summary', { text: strings.howUseAiGetRegular });
    aiHelpSummary.style.padding = '8px 12px';
    aiHelpSummary.style.backgroundColor = 'var(--background-secondary)';
    aiHelpSummary.style.cursor = 'pointer';
    aiHelpSummary.style.fontWeight = 'bold';
    aiHelpSummary.style.borderRadius = '4px';
    aiHelpSummary.style.userSelect = 'none';

    const aiHelpContent = aiHelpContainer.createDiv('ai-help-content');
    aiHelpContent.style.padding = '6px';
    aiHelpContent.style.backgroundColor = 'var(--background-secondary-alt)';
    aiHelpContent.style.borderBottomLeftRadius = '5px';
    aiHelpContent.style.borderBottomRightRadius = '5px';
    aiHelpContent.style.marginTop = '1px';

    aiHelpContent.setAttribute('contenteditable', 'false');
    aiHelpContent.style.userSelect = 'text';

    aiHelpContent.innerHTML = `
      <p><strong>${strings.aiQuestionTemplate}</strong><br>
    ${strings.description}:
      ${strings.iNeedConvertUrlMarkdown}
    <br>
    ${strings.example}: 
      ${strings.exampleConvertHttpsExampleCom}
    <br>
    ${strings.requirements}:  
      ${strings.useJsRegularExpressionImplement}
    <br>
    ${strings.output}:
    <br>
      "name": "[Descriptive Name]", <br>
      "pattern": "[Regex Pattern]", <br>
      "replacement": "[Replacement Pattern, if applicable]", <br>
      "flags": "[Regex Flags]" <br>
    </p>
    `;

    new Setting(regexContainer)
      .setName(strings.matchingPattern)
      .setDesc(strings.regexPatternMatch)
      .addText(text =>
        this.regexPatternInput = text
          .setValue(this.regexPattern)
          .onChange(value => {
            this.regexPattern = value;
            this.updatePreview();
          })
      );

    new Setting(regexContainer)
      .setName(strings.replacementPattern)
      .setDesc(strings.replacementPatternUse12+strings.useNRepresentLineBreaks)
      .addText(text =>
        this.regexReplacementInput = text
      .setValue(this.regexReplacement.replace(/\n/g, '\\n'))
      .onChange(value => {
        this.regexReplacement = value.replace(/\\n/g, '\n');
        this.updatePreview();
      })
      );

    const regexOptionsContainer = regexContainer.createDiv('regex-options');
    regexOptionsContainer.style.display = 'flex';
    regexOptionsContainer.style.gap = '8px';

    new Setting(regexOptionsContainer)
      .setName(strings.ignoreCase)
      .setDesc(strings.matchCaseInsensitive)
      .addToggle(toggle => toggle
        .setValue(this.regexCaseInsensitive)
        .onChange(value => {
          this.regexCaseInsensitive = value;
          this.updatePreview();
        })
      );

    new Setting(regexOptionsContainer)
      .setName(strings.globalReplace)
      .setDesc(strings.replaceAllMatches)
      .addToggle(toggle => toggle
        .setValue(this.regexGlobal)
        .onChange(value => {
          this.regexGlobal = value;
          this.updatePreview();
        })
      );

    new Setting(regexOptionsContainer)
      .setName(strings.multilineMode)
      .setDesc(strings.matchStartEndEachLine)
      .addToggle(toggle =>
        this.regexMultilineToggle = toggle
          .setValue(this.regexMultiline)
          .onChange(value => {
            this.regexMultiline = value;
            this.updatePreview();
          })
      );
   

    const conditionContainer = regexContainer.createDiv('condition-container');

    new Setting(conditionContainer)
      .setName(strings.useCondition)
      .setDesc(strings.onlyApplyCustomCommandWhen)
      .addToggle(toggle =>
        this.useConditionToggle = toggle
          .setValue(this.useCondition)
          .onChange(value => {
            this.useCondition = value;
            conditionSettingsContainer.style.display = value ? 'block' : 'none';
          })
      );

    const conditionSettingsContainer = conditionContainer.createDiv('condition-settings');
    conditionSettingsContainer.style.display = this.useCondition ? 'block' : 'none';
    conditionSettingsContainer.style.border = '1px solid var(--background-modifier-border)';
    conditionSettingsContainer.style.padding = '10px';
    conditionSettingsContainer.style.borderRadius = '5px';
    conditionSettingsContainer.style.marginBottom = '15px';

    new Setting(conditionSettingsContainer)
      .setName(strings.conditionPattern)
      .setDesc(strings.mustExistRegularExpressionText)
      .addText(text =>
        this.conditionPatternInput = text
          .setValue(this.conditionPattern)
          .onChange(value => {
            this.conditionPattern = value;
          })
      );

    const iconSetting = new Setting(regexContainer)
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
      .setButtonText(strings.chooseIcon3)
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
    const regexHelpContainer = regexContainer.createSpan('regex-help');
    const regexExamplesContainer = regexContainer.createEl('details', { cls: 'regex-examples-container' });
    regexExamplesContainer.style.marginTop = '15px';
    regexExamplesContainer.style.borderRadius = '5px';
    regexExamplesContainer.style.overflow = 'hidden';

    const examplesSummary = regexExamplesContainer.createEl('summary', { text: strings.regularExpressionExamples });
    examplesSummary.style.padding = '8px 12px';
    examplesSummary.style.backgroundColor = 'var(--background-secondary)';
    examplesSummary.style.cursor = 'pointer';
    examplesSummary.style.fontWeight = 'bold';
    examplesSummary.style.borderRadius = '4px';
    examplesSummary.style.userSelect = 'none';

    const examplesContent = regexExamplesContainer.createDiv('examples-content');
    examplesContent.style.padding = '10px';
    examplesContent.style.backgroundColor = 'var(--background-secondary-alt)';
    examplesContent.style.borderBottomLeftRadius = '5px';
    examplesContent.style.borderBottomRightRadius = '5px';
    examplesContent.style.marginTop = '1px';

    const examplesList = examplesContent.createEl('ul');
    examplesList.style.paddingLeft = '20px';
    examplesList.style.margin = '0';

    const examples = [
      {
        name: strings.urlMarkdownLink,
        pattern: '(https?://\\S+)',
        replacement: '[$1]($1)'
      },
      {
        name: strings.convertMmDdYyyyYyyy,
        pattern: '(\\d{1,2})/(\\d{1,2})/(\\d{4})',
        replacement: '$3-$1-$2'
      },
      {
        name: strings.addBoldKeywords,
        pattern: '\\b(important|critical|urgent)\\b',
        replacement: '**$1**'
      },
      {
        name: strings.formatPhoneNumber,
        pattern: '(\\d{3})(\\d{3})(\\d{4})',
        replacement: '($1) $2-$3'
      },
      {
        name: strings.removeExtraSpaces,
        pattern: '\\s{2,}',
        replacement: ' '
      },
      {
        name: strings.convertHtmlBoldTagsMarkdown,
        pattern: '<strong>(.*?)</strong>',
        replacement: '**$1**'
      },
  
      {
        name: strings.convertQuotedTextQuoteBlock,
        pattern: '"([^"]+)"',
        replacement: '> $1'
      },
      {
        name: strings.addUniformAliasMarkdownLinks,
        pattern: '\\[([^\\]]+)\\]\\(([^\\)]+)\\)',
        replacement: '[$1|alias]($2)'
      },
      {
        name: strings.deleteEmptyLinesMultilineMode,
        pattern: '^\\s*$\\n',
        replacement: '',
        toggleMultiline: true
      },
      {
        name: strings.addListSymbolEachLine,
        pattern: '^(.+)$',
        replacement: '- $1',
        toggleMultiline: true
      },
      {
        name: strings.ifTextContainsImportantSet,
        pattern: '(.+)',
        replacement: '==$1==',
        useCondition: true,
        conditionPattern: 'important'
      }
    ];

    examples.forEach(example => {
      const item = examplesList.createEl('li');
      item.style.marginBottom = '8px';

      const link = item.createEl('a', {
        text: example.name,
        href: '#'
      });
      link.style.color = 'var(--text-accent)';
      link.style.textDecoration = 'none';
      link.addEventListener('mouseenter', () => {
        link.style.textDecoration = 'underline';
      });
      link.addEventListener('mouseleave', () => {
        link.style.textDecoration = 'none';
      });

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.regexPattern = example.pattern;
        this.regexReplacement = example.replacement;


        this.regexPatternInput.setValue(example.pattern);
        this.regexReplacementInput.setValue(example.replacement);

        if (example.useCondition) {
          this.useCondition = true;
          this.conditionPattern = example.conditionPattern || '';
          this.useConditionToggle.setValue(true);
          this.conditionPatternInput.setValue(this.conditionPattern);
          conditionSettingsContainer.style.display = 'block';
        }else{
          this.useCondition = false;
          this.useConditionToggle.setValue(false);
          this.conditionPatternInput.setValue('');
          conditionSettingsContainer.style.display = 'none';
        }
        if (example.toggleMultiline) {
          this.regexMultilineToggle.setValue(true);
        }else{
          this.regexMultilineToggle.setValue(false);
        }

        this.updatePreview();

        regexExamplesContainer.removeAttribute('open');
      });
    });
    const previewContainer = contentEl.createDiv('preview-container');
    previewContainer.style.marginTop = '20px';
    previewContainer.style.marginBottom = '20px';
    previewContainer.style.border = '1px solid var(--background-modifier-border)';
    previewContainer.style.padding = '10px';
    previewContainer.style.borderRadius = '5px';

    const previewLabel = previewContainer.createEl('label', { text: strings.preview });


    const previewInputContainer = previewContainer.createDiv('preview-input-container');
    previewInputContainer.style.marginBottom = '10px';

    const previewInputLabel = previewInputContainer.createEl('label', { text: strings.exampleText });
    previewInputLabel.style.display = 'block';
    previewInputLabel.style.marginBottom = '5px';

    this.previewInput = previewInputContainer.createEl('textarea', {
      attr: {
        placeholder: strings.inputExampleTextViewFormatting
      }
    });
    this.previewInput.style.height = 'auto';
    this.previewInput.style.width = '100%';
    this.previewInput.style.padding = '8px';
    this.previewInput.style.borderRadius = '4px';
    this.previewInput.style.border = '1px solid var(--background-modifier-border)';
    this.previewInput.value = "Sample text https://example.com important text    1234567890";

    this.previewInput.addEventListener('input', () => {
      this.updatePreview();
    });

    const previewOutputContainer = previewContainer.createDiv('preview-output-container');

    const previewOutputLabel = previewOutputContainer.createEl('label', { text: strings.result });
    previewOutputLabel.style.display = 'block';
    previewOutputLabel.style.marginBottom = '5px';

    this.previewOutput = previewOutputContainer.createDiv('preview-output');
    this.previewOutput.style.padding = '8px';
    this.previewOutput.style.borderRadius = '4px';
    this.previewOutput.style.border = '1px solid var(--background-modifier-border)';
    this.previewOutput.style.backgroundColor = 'var(--background-secondary)';
    this.previewOutput.style.minHeight = '3em';

    this.updatePreview();

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('保存')
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

          if (!this.regexPattern) {
            new Notice(strings.regexPatternCannotEmpty);
            return;
          }
          const commandId = this.commandIndex === null ? `custom-${this.commandId}` : this.commandId;
          if (this.commandIndex === null) {
            const existingIndex = this.plugin.settings.customCommands.findIndex(
              cmd => cmd.id === commandId
            );
            if (existingIndex >= 0) {
              new Notice(strings.command+' ' + this.commandId +' '+ strings.alreadyExists, 8000);
              return;
            }
          }

          const command: CustomCommand = {
            id: commandId,
            name: this.commandName,
            icon: this.icon,
            useRegex: true,
            regexPattern: this.regexPattern,
            regexReplacement: this.regexReplacement.replace(/\\n/g, '\n'),
            regexCaseInsensitive: this.regexCaseInsensitive,
            regexGlobal: this.regexGlobal,
            regexMultiline: this.regexMultiline,
            useCondition: this.useCondition,
            conditionPattern: this.conditionPattern,
            prefix: '',
            suffix: '',
            char: 0,
            line: 0,
            islinehead: false
          };

          if (this.commandIndex !== null) {
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
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private updatePreview() {
    const sampleText = this.previewInput.value;
    let result = sampleText;

    try {
      if (this.regexPattern) {
        let flags = '';
        if (this.regexGlobal) flags += 'g';
        if (this.regexCaseInsensitive) flags += 'i';
        if (this.regexMultiline) flags += 'm';

        const regex = new RegExp(this.regexPattern, flags);
        const replacement = this.regexReplacement.replace(/\\n/g, '\n');
        result = sampleText.replace(regex, replacement);

        this.showCompleteRegexCode(flags);
      }

      this.previewOutput.empty();
      result.split('\n').forEach((line, index, array) => {
        this.previewOutput.createSpan({ text: line });
        if (index < array.length - 1) {
          this.previewOutput.createEl('br');
        }
      });
      this.previewOutput.style.color = 'var(--text-normal)';
    } catch (error) {
      this.previewOutput.setText(strings.error + error.message);
      this.previewOutput.style.color = 'var(--text-error)';

      const codeContainer = this.previewOutput.parentElement?.querySelector('.regex-code-container');
      if (codeContainer) {
        codeContainer.remove();
      }
    }
  }

  private showCompleteRegexCode(flags: string) {
    const previewContainer = this.previewOutput.parentElement;
    if (!previewContainer) return;

    let codeContainer = previewContainer.querySelector('.regex-code-container');
    if (!codeContainer) {
      codeContainer = previewContainer.createDiv('regex-code-container') as HTMLDivElement;
      (codeContainer as HTMLDivElement).style.marginTop = '15px';
      (codeContainer as HTMLDivElement).style.borderTop = '1px solid var(--background-modifier-border)';
      (codeContainer as HTMLDivElement).style.paddingTop = '10px';

      const codeTitle = codeContainer.createEl('div', { text: strings.completeRegularExpressionCodeCopy });
      codeTitle.style.marginBottom = '5px';
      codeTitle.style.fontWeight = 'bold';
    } else {
      codeContainer.empty();
      const codeTitle = codeContainer.createEl('div', { text: strings.completeRegularExpressionCodeCopy });
      codeTitle.style.marginBottom = '5px';
      codeTitle.style.fontWeight = 'bold';
    }

    const codeBlock = codeContainer.createEl('pre');
    codeBlock.style.backgroundColor = 'var(--background-code)';
    codeBlock.style.padding = '8px';
    codeBlock.style.borderRadius = '4px';
    codeBlock.style.overflowX = 'auto';
    codeBlock.style.fontFamily = 'monospace';
    codeBlock.style.fontSize = 'var(--font-smaller)';

    let codeText = `//${strings.explainSyntaxJavascriptRegularExpressions}\n`;
    codeText += `const regex = /${this.escapeRegexForDisplay(this.regexPattern)}/${flags};\n`;
    codeText += `const result = text.replace(regex, "${this.escapeStringForDisplay(this.regexReplacement)}");\n`;

    if (this.useCondition && this.conditionPattern) {
      codeText += `\n//${strings.conditionalMatching}\n`;
      codeText += `const condition = /${this.escapeRegexForDisplay(this.conditionPattern)}/;\n`;
      codeText += `if (condition.test(text)) {\n`;
      codeText += `  //${strings.applyRegularExpressionReplacement}\n`;
      codeText += `  const result = text.replace(regex, "${this.escapeStringForDisplay(this.regexReplacement)}");\n`;
      codeText += `}`;
    }

    codeBlock.textContent = codeText;

    const copyButton = codeContainer.createEl('button', { text: strings.copyCode });
    copyButton.style.marginTop = '5px';
    copyButton.style.padding = '4px 8px';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';

    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(codeText).then(() => {
        copyButton.textContent = strings.copied;
        setTimeout(() => {
          copyButton.textContent = strings.copyCode;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy code: ', err);
      });
    });
  }

  private escapeRegexForDisplay(pattern: string): string {
    return pattern.replace(/\\/g, '\\\\');
  }

  private escapeStringForDisplay(str: string): string {
    return str.replace(/"/g, '\\"');
  }

} 
