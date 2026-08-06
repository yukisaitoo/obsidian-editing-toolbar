import { ButtonComponent, Command, Modal, TextComponent } from "obsidian";
import { focusAfterOpen, submitOnEnter } from "src/modals/modalInput";
import type EditingToolbarPlugin from "src/plugin/main";
import { strings } from "src/translations/helper";

export class RenameCommandModal extends Modal {
  constructor(
    private plugin: EditingToolbarPlugin,
    private item: Command,
    // The settings list the command was rendered from.
    private owner: Command[],
  ) {
    super(plugin.app);
    this.containerEl.addClass("editing-toolbar-rename-modal");
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("b", { text: strings.pleaseEnterNewName });

    const textComponent = new TextComponent(contentEl);
    textComponent.setPlaceholder("").setValue(this.item.name ?? "");
    focusAfterOpen(textComponent.inputEl);

    const submit = async () => {
      await this.commitName(textComponent.inputEl.value);
      this.close();
    };

    submitOnEnter(textComponent.inputEl, submit);

    const buttons = contentEl.createDiv("modal-button-container");
    new ButtonComponent(buttons)
      .setButtonText(strings.confirm)
      .setCta()
      .onClick(() => void submit());
    new ButtonComponent(buttons)
      .setButtonText(strings.cancel)
      .onClick(() => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async commitName(value: string): Promise<void> {
    // Removed while the modal was open: nothing to rename.
    if (!this.owner.includes(this.item)) return;

    this.item.name = value;
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }
}
