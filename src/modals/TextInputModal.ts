import { App, Modal, Setting } from "obsidian";
import { strings } from "src/translations/helper";

interface ITextInputResult {
  [key: string]: string;
}

interface ITextInputField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
}

export class TextInputModal extends Modal {
  private result: ITextInputResult = {};
  private onSubmit: (result: ITextInputResult) => void | Promise<void>;
  private fields: ITextInputField[];
  private title: string;

  constructor(
    app: App,
    title: string,
    fields: ITextInputField[],
    onSubmit: (result: ITextInputResult) => void | Promise<void>,
  ) {
    super(app);
    this.title = title;
    this.fields = fields;
    this.onSubmit = onSubmit;

    fields.forEach((field) => {
      this.result[field.key] = field.defaultValue || "";
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: this.title });

    this.fields.forEach((field) => {
      const setting = new Setting(contentEl).setName(field.label);

      if (field.multiline) {
        setting.addTextArea((textarea) => {
          textarea
            .setPlaceholder(field.placeholder || "")
            .setValue(field.defaultValue || "")
            .onChange((value) => {
              this.result[field.key] = value;
            });

          textarea.inputEl.rows = 5;
          textarea.inputEl.addClass("editing-toolbar-textarea-input");

          if (field === this.fields[0]) {
            setTimeout(() => textarea.inputEl.focus(), 10);
          }

          textarea.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void this.submit();
            }
          });
        });
        return;
      }

      setting.addText((text) => {
        text
          .setPlaceholder(field.placeholder || "")
          .setValue(field.defaultValue || "")
          .onChange((value) => {
            this.result[field.key] = value;
          });

        if (field === this.fields[0]) {
          setTimeout(() => text.inputEl.focus(), 10);
        }

        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void this.submit();
          }
        });
      });
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(strings.confirm)
          .setCta()
          .onClick(() => {
            void this.submit();
          }),
      )
      .addButton((btn) =>
        btn.setButtonText(strings.cancel).onClick(() => {
          this.close();
        }),
      );
  }

  private async submit() {
    await this.onSubmit(this.result);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
