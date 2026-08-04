import { App, Modal, Setting } from "obsidian";
import { focusAfterOpen } from "src/modals/modalFocus";
import { strings } from "src/translations/helper";

interface ITextInputResult {
  [key: string]: string;
}

export interface ITextInputField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

export class TextInputModal extends Modal {
  private result: ITextInputResult = {};
  private submitted = false;
  private resolve!: (result: ITextInputResult | null) => void;

  private constructor(
    app: App,
    private title: string,
    private fields: ITextInputField[],
  ) {
    super(app);

    fields.forEach((field) => {
      this.result[field.key] = field.defaultValue || "";
    });
  }

  /** Resolves with the field values, or null if the modal was dismissed. */
  static prompt(
    app: App,
    title: string,
    fields: ITextInputField[],
  ): Promise<ITextInputResult | null> {
    const modal = new TextInputModal(app, title, fields);
    return new Promise((resolve) => {
      modal.resolve = resolve;
      modal.open();
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: this.title });

    this.fields.forEach((field) => {
      new Setting(contentEl).setName(field.label).addText((text) => {
        text
          .setPlaceholder(field.placeholder || "")
          .setValue(field.defaultValue || "")
          .onChange((value) => {
            this.result[field.key] = value;
          });

        if (field === this.fields[0]) {
          focusAfterOpen(text.inputEl);
        }

        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.submit();
          }
        });
      });
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(strings.confirm)
          .setCta()
          .onClick(() => this.submit()),
      )
      .addButton((btn) =>
        btn.setButtonText(strings.cancel).onClick(() => {
          this.close();
        }),
      );
  }

  private submit() {
    this.submitted = true;
    this.close();
  }

  onClose() {
    this.contentEl.empty();
    this.resolve(this.submitted ? this.result : null);
  }
}
