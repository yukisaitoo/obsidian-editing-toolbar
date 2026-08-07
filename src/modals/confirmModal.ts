import { App, ButtonComponent, Modal } from "obsidian";
import { strings } from "src/translations/helper";

interface ConfirmModalOptions {
  title?: string;
  message: string;
  confirmText?: string;
  confirmWarning?: boolean;
  onConfirm: () => Promise<void> | void;
}

export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private options: ConfirmModalOptions,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("confirm-modal");
    contentEl.createEl("h2", { text: this.options.title ?? strings.confirm });

    this.options.message.split("\n").forEach((line) => {
      contentEl.createEl("p", { text: line });
    });

    const buttonContainer = contentEl.createDiv("confirm-modal-buttons");

    new ButtonComponent(buttonContainer)
      .setButtonText(strings.cancel)
      .onClick(() => this.close());

    const confirmButton = new ButtonComponent(buttonContainer)
      .setButtonText(this.options.confirmText ?? strings.confirm)
      .onClick(async () => {
        await this.options.onConfirm();
        this.close();
      });
    if (this.options.confirmWarning) {
      confirmButton.setWarning();
    } else {
      confirmButton.setCta();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  static show(app: App, options: ConfirmModalOptions) {
    new ConfirmModal(app, options).open();
  }
}
