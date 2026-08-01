import {
  DropdownComponent,
  Modal,
  Platform,
  Setting,
  sanitizeHTMLToDom,
  setIcon,
} from "obsidian";
import type { CalloutTypeInfo } from "src/modals/callout/calloutTypes";
import { buildCalloutOptions } from "src/modals/callout/calloutTypes";
import { focusAfterOpen } from "src/modals/modalFocus";
import EditingToolbarPlugin from "src/plugin/main";
import { strings } from "src/translations/helper";

const SEPARATOR_VALUE = "---separator---";

export class InsertCalloutModal extends Modal {
  public type: string = "note";
  public title: string = "";
  public content: string = "";
  public collapse: "none" | "open" | "closed" = "none";
  private insertButton!: HTMLElement;
  private contentTextArea!: HTMLTextAreaElement;
  private allCalloutOptions: CalloutTypeInfo[] = [];
  private iconContainerEl!: HTMLElement;

  constructor(private plugin: EditingToolbarPlugin) {
    super(plugin.app);
    this.containerEl.addClass("insert-callout-modal");
    this.allCalloutOptions = buildCalloutOptions(
      this.plugin.admonitionDefinitions ?? undefined,
    );
    const editor = this.plugin.commandsManager.getActiveEditor();
    if (editor) {
      const selectedText = editor.getSelection();
      if (selectedText) {
        this.content = selectedText;
      }
    }
    if (!this.allCalloutOptions.find((opt) => opt.type === this.type)) {
      this.type =
        this.allCalloutOptions.length > 0
          ? this.allCalloutOptions[0].type
          : "note";
    }
  }
  onOpen() {
    this.display();
  }

  private display() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (this.insertButton) {
          this.insertButton.click();
        }
      }
    });

    const typeContainer = contentEl.createDiv("callout-type-container");
    this.iconContainerEl = typeContainer.createDiv("callout-icon-container");
    new Setting(typeContainer)
      .setName(strings.calloutType)
      .addDropdown((dropdown: DropdownComponent) => {
        const builtIns = this.allCalloutOptions.filter(
          (opt) => !opt.isAdmonition,
        );
        const admonitions = this.allCalloutOptions.filter(
          (opt) => opt.isAdmonition,
        );
        // DropdownComponent has no <optgroup>; a disabled option fakes a separator
        // that keyboard navigation skips.
        const addSeparator = (label: string) => {
          dropdown.addOption(SEPARATOR_VALUE, label);
          const option =
            dropdown.selectEl.options[dropdown.selectEl.options.length - 1];
          if (option) {
            option.disabled = true;
          }
        };
        const needsSeparators = builtIns.length > 0 && admonitions.length > 0;
        if (needsSeparators) {
          addSeparator("---- Admonitions ----");
        }
        admonitions.forEach((opt) => {
          dropdown.addOption(opt.type, `${opt.label} (Admonition)`);
        });
        if (needsSeparators) {
          addSeparator("---- Default ----");
        }
        builtIns.forEach((opt) => {
          dropdown.addOption(opt.type, opt.label);
        });
        dropdown.setValue(this.type);
        dropdown.onChange((value) => {
          this.type = value;
          this.updateIconAndColor(this.iconContainerEl, value);
        });
      });
    this.updateIconAndColor(this.iconContainerEl, this.type);

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
      .setText(`${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${strings.insert2}`);

    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText(strings.insert)
          .setCta()
          .onClick(() => {
            this.insertCallout();
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
  private updateIconAndColor(iconContainer: HTMLElement, typeKey: string) {
    if (!iconContainer) return;
    iconContainer.empty();

    const typeInfo = this.allCalloutOptions.find((t) => t.type === typeKey);
    if (!typeInfo) return;

    iconContainer.style.setProperty("--callout-color", typeInfo.color);
    const icon = typeInfo.icon;

    if (typeof icon === "string") {
      setIcon(iconContainer, icon);
      return;
    }

    // Admonition's inline SVG has no currentColor to inherit, so it is filled
    // directly rather than through --callout-color.
    if (icon.type === "custom" && icon.svg) {
      iconContainer.style.removeProperty("--callout-color");
      iconContainer.appendChild(sanitizeHTMLToDom(icon.svg));
      const svgEl = iconContainer.querySelector("svg");
      if (svgEl) {
        svgEl.style.fill = typeInfo.color;
        svgEl.style.width = "var(--icon-size)";
        svgEl.style.height = "var(--icon-size)";
      }
      return;
    }

    const renderable =
      icon.name?.startsWith("lucide-") || icon.type === "default";
    setIcon(iconContainer, renderable ? icon.name : "lucide-box");
  }

  private insertCallout() {
    const editor = this.plugin.commandsManager.getActiveEditor();
    if (!editor) return;

    let calloutText = `> [!${this.type}]`;
    if (this.collapse !== "none") {
      calloutText += `${this.collapse === "open" ? "+" : "-"}`;
    }
    if (this.title) {
      calloutText += ` ${this.title}`;
    }

    calloutText += `\n> ${this.content.replace(/\n/g, "\n> ")}`;

    const from = editor.getCursor("from");
    if (editor.getLine(from.line).slice(0, from.ch).trim() !== "") {
      calloutText = "\n" + calloutText;
    }

    // The trailing newline leaves the cursor on a fresh line below the callout and
    // pushes any text that followed the cursor down with it.
    editor.replaceSelection(calloutText + "\n");

    // Modal.close() runs right after this and synchronously hands focus back to
    // whatever held it when the modal opened — the toolbar button, not the editor.
    void Promise.resolve().then(() => editor.focus());
  }
}
