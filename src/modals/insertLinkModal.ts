import {
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Platform,
  setIcon,
  Setting,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import {
  fetchRemoteTitle,
  readClipboardLink,
} from "src/modals/link/linkClipboard";
import {
  expandSelectionToLink,
  findLinkAtCursor,
  findLinkSpan,
  formatTargetText,
  isValidUrl,
  LinkTarget,
  parseMarkdownImageLink,
  parseMarkdownLink,
  parseMixedContent,
} from "src/modals/link/linkParsing";
import EditingToolbarPlugin from "src/plugin/main";
import { strings } from "src/translations/helper";

export class InsertLinkModal extends Modal {
  private linkText: string = "";
  private linkUrl: string = "";
  private linkAlias: string = "";
  private isEmbed: boolean = false;
  private insertNewLine: boolean = false;
  private imageWidth: string = "";
  private imageHeight: string = "";
  private prefixText: string = "";
  private suffixText: string = "";
  private selectedText: string = "";
  private linkTextInput!: TextComponent;
  private linkUrlInput!: TextComponent;
  private linkAliasInput!: TextComponent;
  private embedToggle!: ToggleComponent;
  private urlErrorMsg!: HTMLElement;
  private previewSetting!: Setting;
  private insertButton!: HTMLElement;

  constructor(private plugin: EditingToolbarPlugin) {
    super(plugin.app);

    const editor = this.plugin.commandsManager.getActiveEditor();
    if (!editor) {
      void this.loadFromClipboard();
    } else if (editor.getSelection()) {
      this.adoptTarget(editor, expandSelectionToLink(editor)) ||
        this.parseSelectedText(editor.getSelection());
    } else if (!this.adoptTarget(editor, findLinkAtCursor(editor, editor.getCursor()))) {
      void this.loadFromClipboard();
    }

    this.updateHeader();
  }

  /** Selects the whole link the cursor sits in, so editing replaces it cleanly. */
  private adoptTarget(editor: Editor, target: LinkTarget | null): boolean {
    if (!target) return false;
    const text = formatTargetText(target);
    editor.setSelection(target.from, target.to);
    this.selectedText = text;
    this.parseSelectedText(text);
    return true;
  }

  private parseSelectedText(text: string) {
    const imageSpan = findLinkSpan(text, "image");
    const image = imageSpan && parseMarkdownImageLink(imageSpan.source);
    if (image) {
      this.applyImage(image);
      this.splitAround(text, imageSpan);
      return;
    }

    const linkSpan = findLinkSpan(text, "link");
    const link = linkSpan && parseMarkdownLink(linkSpan.source);
    if (link) {
      this.linkText = link.text;
      this.linkUrl = link.url;
      this.linkAlias = link.title || "";
      this.isEmbed = false;
      this.splitAround(text, linkSpan);
      return;
    }

    const parsed = parseMixedContent(text);
    this.linkText = parsed.title;
    this.linkUrl = parsed.url;
  }

  /** Text either side of the link is preserved and re-emitted on insert. */
  private splitAround(
    text: string,
    span: { start: number; length: number },
  ): void {
    this.prefixText = text.substring(0, span.start);
    this.suffixText = text.substring(span.start + span.length);
  }

  private applyImage(image: {
    text: string;
    url: string;
    title?: string;
    width?: string;
    height?: string;
  }): void {
    this.linkText = image.text;
    this.linkUrl = image.url;
    this.linkAlias = image.title || "";
    this.imageWidth = image.width || "";
    this.imageHeight = image.height || "";
    this.setEmbed(true);
  }

  private setEmbed(value: boolean): void {
    this.isEmbed = value;
    if (!this.embedToggle) return;
    this.embedToggle.setValue(value);
    const sizeEl = this.contentEl.querySelector<HTMLElement>(
      ".image-size-setting",
    );
    if (sizeEl) sizeEl.style.display = value ? "block" : "none";
  }

  private async loadFromClipboard(): Promise<void> {
    const { image, link, fallback } = await readClipboardLink();

    if (image) {
      this.applyImage(image);
    } else if (link) {
      this.linkText = link.text;
      this.linkUrl = link.url;
      this.linkAlias = link.title || "";
      this.isEmbed = false;
    } else if (fallback) {
      this.linkText = this.linkText || fallback.title;
      this.linkUrl = fallback.url;
    }

    this.updateUI();
  }

  onOpen() {
    this.display();
  }
  private updateHeader() {
    const previewText = this.getPreviewText();
    if (this.previewSetting) {
      const previewInput = this.previewSetting.controlEl.querySelector("input");
      if (previewInput) previewInput.value = previewText;
    }
  }
  // `text` falls back to the URL when inserting, but stays empty in the preview
  // so the field reads as unfilled.
  private buildMarkdownLink(text: string): string {
    let markdownLink = this.isEmbed ? "!" : "";
    markdownLink += `[${text}`;

    if (this.isEmbed && (this.imageWidth || this.imageHeight)) {
      markdownLink += "|";
      if (this.imageWidth && this.imageHeight) {
        markdownLink += `${this.imageWidth}x${this.imageHeight}`;
      } else if (this.imageWidth) {
        markdownLink += this.imageWidth;
      } else {
        markdownLink += `x${this.imageHeight}`;
      }
    }

    markdownLink += `](${this.linkUrl}`;

    if (this.linkAlias) {
      markdownLink += ` "${this.linkAlias}"`;
    }

    return markdownLink + ")";
  }

  private getPreviewText(): string {
    return this.buildMarkdownLink(this.linkText || "");
  }

  private async display() {
    const { contentEl } = this;

    contentEl.empty();
    contentEl.addClass("insert-link-modal");
    this.titleEl.textContent = "";
    this.titleEl.addClass("insert-link-modal-title");

    contentEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (this.insertButton) {
          this.insertButton.click();
        }
      }
    });

    const linkTextSetting = new Setting(contentEl).addButton((btn) => {
      btn
        .setIcon("lucide-globe")
        .setTooltip(strings.fetchRemoteTitle)
        .onClick(async () => {
          if (this.linkUrl) {
            btn.setDisabled(true);
            btn.setIcon("lucide-loader");
            const title = await fetchRemoteTitle(this.linkUrl);
            btn.setIcon("lucide-globe");
            btn.setDisabled(false);
            this.linkText = title;
            this.linkTextInput.setValue(title);
            this.updateHeader();
          } else {
            new Notice(strings.pleaseEnterUrlFirst);
          }
        });
    });
    linkTextSetting.setName(strings.linkText).addText((text) => {
      this.linkTextInput = text;
      text
        .setPlaceholder(strings.linkText)
        .setValue(this.linkText)
        .onChange((value) => {
          this.linkText = value;
          this.updateHeader();
        });
    });

    new Setting(contentEl).setName(strings.title).addText((text) => {
      this.linkAliasInput = text;
      text
        .setPlaceholder(strings.linkTitleOptional)
        .setValue(this.linkAlias)
        .onChange((value) => {
          this.linkAlias = value;
          this.updateHeader();
        });
    });

    const urlSetting = new Setting(contentEl)
      .setName(strings.linkUrl)
      .setClass("link-url-setting")
      .addText((text) => {
        this.linkUrlInput = text;
        text
          .setPlaceholder(strings.linkUrl)
          .setValue(this.linkUrl)
          .onChange((value) => {
            this.linkUrl = value.trim();
            this.validateUrl(this.linkUrl);
            this.updateHeader();
          });
      })
      .addButton((btn) => {
        btn
          .setIcon("lucide-clipboard")
          .setTooltip(strings.pasteParse)
          .onClick(async () => {
            await this.loadFromClipboard();
            this.updateHeader();
          });
      });

    this.urlErrorMsg = urlSetting.descEl.createDiv("url-error");
    this.urlErrorMsg.style.color = "var(--text-error)";
    this.urlErrorMsg.style.display = "none";

    const embedSetting = new Setting(contentEl)
      .setName(strings.embedContent)
      .setDesc(strings.ifImageTurn);

    this.embedToggle = new ToggleComponent(embedSetting.controlEl);
    this.embedToggle.setValue(this.isEmbed).onChange((value) => {
      this.isEmbed = value;
      const imageSizeEl = contentEl.querySelector(".image-size-setting");
      if (imageSizeEl) {
        (imageSizeEl as HTMLElement).style.display = value ? "flex" : "none";
      }

      this.updateHeader();
    });

    const imageSizeSetting = new Setting(contentEl).addButton((btn) => {
      btn
        .setIcon("lucide-maximize")
        .setTooltip(strings.fitEditorWidth)
        .onClick(() => {
          const dimensions = this.getImageDimensions();
          if (dimensions) {
            this.imageWidth = dimensions.width.toString();
            this.imageHeight = dimensions.height?.toString() ?? "";
            (imageSizeSetting.components[1] as TextComponent).setValue(
              this.imageWidth,
            );
            if (this.imageHeight) {
              (imageSizeSetting.components[2] as TextComponent).setValue(
                this.imageHeight,
              );
            }
            this.updateHeader();
          }
        });
    });
    imageSizeSetting
      .setClass("image-size-setting")
      .setName(strings.imageSize)
      .addText((text) => {
        text.inputEl.addClass("image-width-input");
        text
          .setPlaceholder(strings.imageWidth)
          .setValue(this.imageWidth)
          .onChange((value) => {
            this.imageWidth = value.replace(/[^\d]/g, "");
            text.setValue(this.imageWidth);
            this.updateHeader();
          });
      });

    const imageSizeIcon =
      imageSizeSetting.controlEl.createDiv("image-size-icon");
    setIcon(imageSizeIcon, "lucide-x");

    imageSizeSetting.addText((text) => {
      text.inputEl.addClass("image-height-input");
      text
        .setPlaceholder(strings.imageHeight)
        .setValue(this.imageHeight)
        .onChange((value) => {
          this.imageHeight = value.replace(/[^\d]/g, "");
          text.setValue(this.imageHeight);
          this.updateHeader();
        });
    });

    imageSizeSetting.settingEl.style.display = this.isEmbed ? "block" : "none";

    new Setting(contentEl)
      .setName(strings.insertNewLine)
      .setDesc(strings.insertLinkNextLine)
      .addToggle((toggle) => {
        toggle.setValue(this.insertNewLine).onChange((value) => {
          this.insertNewLine = value;
          this.updateHeader();
        });
      });

    this.previewSetting = new Setting(contentEl)
      .setClass("preview-setting")
      .setTooltip(this.getPreviewText())
      .addText((text) => {
        text
          .setValue(this.getPreviewText())
          .inputEl.setAttribute("readonly", "true");
      });

    const shortcutHint = contentEl.createDiv("shortcut-hint");
    shortcutHint.setText(
      `${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${strings.insert2}`,
    );
    shortcutHint.style.textAlign = "right";
    shortcutHint.style.fontSize = "0.8em";
    shortcutHint.style.opacity = "0.7";
    shortcutHint.style.marginTop = "5px";

    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText(strings.insert)
          .setCta()
          .onClick(() => {
            this.insertLink();
            this.close();
          });
        this.insertButton = btn.buttonEl;
      })
      .addButton((btn) =>
        btn.setButtonText(strings.cancel).onClick(() => {
          this.close();
        }),
      );

    setTimeout(() => {
      if (!this.linkText && !this.linkUrl) {
        this.linkTextInput.inputEl.focus();
      } else if (!this.linkText && this.linkUrl) {
        this.linkTextInput.inputEl.focus();
      } else if (this.linkText && !this.linkUrl) {
        this.linkUrlInput.inputEl.focus();
      } else {
        this.linkAliasInput.inputEl.focus();
      }
    }, 10);
  }

  private getImageDimensions(): {
    width: number;
    height: number | null;
  } | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return null;

    const editorEl = view.contentEl.querySelector(
      ".markdown-source-view .cm-content",
    ) as HTMLElement;
    const containerEl = view.contentEl as HTMLElement;
    if (!editorEl || !containerEl) return null;

    const editorWidth = editorEl.offsetWidth;
    const viewHeight = containerEl.offsetHeight;
    const maxHeight = Math.floor(viewHeight / 2);

    if (view.getMode() === "preview" || view.getMode() === "source") {
      const imgEls = editorEl.querySelectorAll("img");
      if (imgEls.length > 0) {
        let targetImg: HTMLImageElement | null = null;
        if (this.linkUrl) {
          // for...of (not forEach) so TS tracks the assignment and keeps
          // targetImg typed as HTMLImageElement | null rather than never.
          for (const img of Array.from(imgEls)) {
            if (
              img.src === this.linkUrl &&
              img.complete &&
              img.naturalWidth > 0
            ) {
              targetImg = img;
            }
          }
        }

        if (targetImg) {
          const naturalWidth = targetImg.naturalWidth;
          const naturalHeight = targetImg.naturalHeight;
          const aspectRatio = naturalWidth / naturalHeight;

          let adjustedWidth = Math.min(
            naturalWidth,
            Math.floor(editorWidth * 0.65),
          );
          let adjustedHeight = Math.floor(adjustedWidth / aspectRatio);

          if (adjustedHeight > maxHeight) {
            adjustedHeight = maxHeight;
            adjustedWidth = Math.floor(adjustedHeight * aspectRatio);
          }

          return { width: adjustedWidth, height: adjustedHeight };
        }
      }
    }

    const defaultAspectRatio = 4 / 3;
    const heightLimitedWidth = Math.floor(maxHeight * defaultAspectRatio);
    const adjustedWidth = Math.min(
      Math.floor(editorWidth * 0.65),
      heightLimitedWidth,
    );

    return { width: adjustedWidth, height: null };
  }

  private validateUrl(url: string) {
    if (!url) {
      this.urlErrorMsg.style.display = "none";
      return true;
    }

    if (!isValidUrl(url)) {
      this.urlErrorMsg.textContent = strings.urlFormatError;
      this.urlErrorMsg.style.display = "block";
      return false;
    }

    this.urlErrorMsg.style.display = "none";
    return true;
  }

  private insertLink() {
    if (!this.validateUrl(this.linkUrl)) {
      return;
    }

    const editor = this.plugin.commandsManager.getActiveEditor();
    if (!editor) return;

    const markdownLink = this.buildMarkdownLink(this.linkText || this.linkUrl);

    let newCursorPos: { line: number; ch: number };

    const selection = editor.somethingSelected();
    if (selection) {
      const selectionStart = editor.getCursor("from");
      const selectionEnd = editor.getCursor("to");

      if (this.insertNewLine) {
        editor.replaceRange("\n" + markdownLink, {
          line: selectionEnd.line,
          ch: editor.getLine(selectionEnd.line).length,
        });
        newCursorPos = { line: selectionEnd.line + 1, ch: markdownLink.length };
      } else {
        const fullText = this.prefixText + markdownLink + this.suffixText;
        editor.replaceRange(
          fullText,
          { line: selectionStart.line, ch: selectionStart.ch },
          selectionEnd,
        );
        newCursorPos = {
          line: selectionStart.line,
          ch: this.prefixText.length + markdownLink.length,
        };
      }
    } else {
      const cursor = editor.getCursor();
      const line = editor.getLine(cursor.line);

      if (this.insertNewLine) {
        const nextLineNum = cursor.line + 1;
        editor.replaceRange("\n", { line: cursor.line, ch: line.length });
        editor.setCursor({ line: nextLineNum, ch: 0 });
        editor.replaceRange(markdownLink, { line: nextLineNum, ch: 0 });
        newCursorPos = { line: nextLineNum, ch: markdownLink.length };
      } else {
        editor.replaceRange(markdownLink, cursor);
        newCursorPos = {
          line: cursor.line,
          ch: cursor.ch + markdownLink.length,
        };
      }
    }

    setTimeout(() => {
      if (newCursorPos) {
        editor.setCursor(newCursorPos);
      }
      editor.focus();
    }, 0);
  }

  private updateUI() {
    if (this.linkTextInput) {
      this.linkTextInput.setValue(this.linkText);
    }
    if (this.linkUrlInput) {
      this.linkUrlInput.setValue(this.linkUrl);
      this.validateUrl(this.linkUrl);
    }

    const widthInput = this.contentEl.querySelector(
      ".image-width-input",
    ) as HTMLInputElement;
    const heightInput = this.contentEl.querySelector(
      ".image-height-input",
    ) as HTMLInputElement;
    if (widthInput) widthInput.value = this.imageWidth;
    if (heightInput) heightInput.value = this.imageHeight;

    if (this.linkAliasInput) {
      this.linkAliasInput.setValue(this.linkAlias);
    }

    const aliasSettingEl = this.contentEl.querySelector(
      ".setting-item:nth-child(2)",
    );
    if (aliasSettingEl) {
      (aliasSettingEl as HTMLElement).style.display = "flex";
    }
    this.updateHeader();
  }
}
