import { App, ButtonComponent, Modal } from 'obsidian';
import { strings } from 'src/translations/helper';

interface ConfirmModalOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void> | void;
}

export class ConfirmModal extends Modal {
    private options: ConfirmModalOptions;

    constructor(app: App, options: ConfirmModalOptions) {
        super(app);
        this.options = {
            title: strings.confirm,
            confirmText: strings.confirm,
            cancelText: strings.cancel,
            ...options
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('confirm-modal');
        contentEl.createEl('h2', { text: this.options.title });

        this.options.message.split('\n').forEach(line => {
            contentEl.createEl('p', { text: line });
        });

        const buttonContainer = contentEl.createDiv('confirm-modal-buttons');

        new ButtonComponent(buttonContainer)
            .setButtonText(this.options.cancelText ?? strings.cancel)
            .onClick(() => this.close());

        new ButtonComponent(buttonContainer)
            .setButtonText(this.options.confirmText ?? strings.confirm)
            .setCta()
            .onClick(async () => {
                await this.options.onConfirm();
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    static show(app: App, options: ConfirmModalOptions) {
        new ConfirmModal(app, options).open();
    }
}