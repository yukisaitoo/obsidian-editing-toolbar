import {
  DropdownComponent,
  Editor,
  Modal,
  Platform,
  Setting,
  setIcon,
} from "obsidian";
import { buildCalloutOptions } from "src/modals/calloutTypes";
import { focusAfterOpen } from "src/modals/modalInput";
import EditingToolbarPlugin from "src/plugin/main";
import { strings } from "src/translations/helper";
import type { CalloutSpec } from "src/util/text/callout";

export class InsertCalloutModal extends Modal {
  private type: string = "note";
  private title: string = "";
  private content: string = "";
  private collapse: "none" | "open" | "closed" = "none";
  private insertButton!: HTMLElement;
  private contentTextArea!: HTMLTextAreaElement;
  private allCalloutOptions = buildCalloutOptions();
  private iconContainerEl!: HTMLElement;
  private inserted = false;
  private resolve!: (spec: CalloutSpec | null) => void;

  private constructor(plugin: EditingToolbarPlugin, editor: Editor) {
    super(plugin.app);
    this.containerEl.addClass("insert-callout-modal");
    const selectedText = editor.getSelection();
    if (selectedText) {
      this.content = selectedText;
    }
  }

  // Resolves with the callout to insert, or null if the modal was dismissed.
  static prompt(
    plugin: EditingToolbarPlugin,
    editor: Editor,
  ): Promise<CalloutSpec | null> {
    const modal = new InsertCalloutModal(plugin, editor);
    return new Promise((resolve) => {
      modal.resolve = resolve;
      modal.open();
    });
  }

  onOpen() {
    this.scope.register(["Mod"], "Enter", () => {
      this.insertButton.click();
      return false;
    });
    this.buildForm();
  }

  private buildForm() {
    const { contentEl } = this;

    const typeContainer = contentEl.createDiv("callout-type-container");
    this.iconContainerEl = typeContainer.createDiv("callout-icon-container");
    new Setting(typeContainer)
      .setName(strings.calloutType)
      .addDropdown((dropdown: DropdownComponent) => {
        this.allCalloutOptions.forEach((opt) => {
          dropdown.addOption(opt.type, opt.label);
        });
        dropdown.setValue(this.type);
        dropdown.onChange((value) => {
          this.type = value;
          this.updateIconAndColor(value);
        });
      });
    this.updateIconAndColor(this.type);

    new Setting(contentEl)
      .setName(strings.title)
      .setDesc(strings.optionalLeaveBlankDefaultTitle)
      .addText((text) => {
        text
          .setPlaceholder(strings.inputTitle)
          .setValue(this.title)
          .onChange((value) => {
            this.title = value;
          });
      });

    new Setting(contentEl)
      .setName(strings.collapseState)
      .addDropdown((dropdown) => {
        dropdown
          .addOption("none", strings.default)
          .addOption("open", strings.open)
          .addOption("closed", strings.closed)
          .setValue(this.collapse)
          .onChange((value: string) => {
            this.collapse = value as "none" | "open" | "closed";
          });
      });

    new Setting(contentEl).setName(strings.content).addTextArea((text) => {
      text
        .setPlaceholder(strings.inputContent)
        .setValue(this.content)
        .onChange((value) => {
          this.content = value;
        });
      text.inputEl.rows = 5;
      text.inputEl.cols = 40;
      this.contentTextArea = text.inputEl;
    });

    contentEl
      .createDiv("shortcut-hint")
      .setText(`${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${strings.toInsert}`);

    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText(strings.insert)
          .setCta()
          .onClick(() => {
            this.inserted = true;
            this.close();
          });
        this.insertButton = btn.buttonEl;
        return btn;
      })
      .addButton((btn) => {
        btn
          .setButtonText(strings.cancel)
          .setTooltip(strings.cancel)
          .onClick(() => this.close());
        return btn;
      });

    focusAfterOpen(this.contentTextArea);
  }
  private updateIconAndColor(typeKey: string) {
    const iconContainer = this.iconContainerEl;
    iconContainer.empty();

    const typeInfo = this.allCalloutOptions.find((t) => t.type === typeKey);
    if (!typeInfo) return;

    iconContainer.style.setProperty("--callout-color", typeInfo.color);
    setIcon(iconContainer, typeInfo.icon);
  }

  onClose() {
    this.contentEl.empty();
    this.resolve(
      this.inserted
        ? {
            type: this.type,
            title: this.title,
            collapse: this.collapse,
            content: this.content,
          }
        : null,
    );
  }
}
