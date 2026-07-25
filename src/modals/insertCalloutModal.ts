import { DropdownComponent, Modal, Platform, Setting, setIcon } from "obsidian";
import EditingToolbarPlugin from "src/plugin/main";
import { strings } from "src/translations/helper";
interface BuiltInCalloutType {
    type: string;
    aliases: string[];
    icon: string;
    label: string;
    color: string;
}
interface AdmonitionIconDefinition {
    name: string;
    type:  string; // 'default' means Admonition handles it
    svg?: string;
}
interface CombinedCalloutTypeInfo {
    type: string; // e.g. 'note', 'ad-warning'
    label: string;
    icon: string | AdmonitionIconDefinition;
    color: string;
    isAdmonition: boolean;
    sourcePlugin?: string;
}
export class InsertCalloutModal extends Modal {
    public type: string = "note";
    public title: string = "";
    public content: string = "";
    public collapse: "none" | "open" | "closed" = "none";
    private insertButton!: HTMLElement;
    private contentTextArea!: HTMLTextAreaElement;
    private allCalloutOptions: CombinedCalloutTypeInfo[] = [];
    private iconContainerEl!: HTMLElement;
    private readonly builtInCalloutTypes: Array<BuiltInCalloutType> = [
        { type: "note", aliases: [], icon: "lucide-pencil", label: "Note", color: "var(--callout-default)" },
        { type: "abstract", aliases: ["summary", "tldr"], icon: "lucide-clipboard-list", label: "Abstract", color: "var(--callout-summary)" },
        { type: "info", aliases: [], icon: "lucide-info", label: "Info", color: "var(--callout-info)" },
        { type: "todo", aliases: [], icon: "lucide-check-circle-2", label: "Todo", color: "var(--callout-todo)" },
        { type: "important", aliases: [], icon: "lucide-flame", label: "Important", color: "var(--callout-important)" },
        { type: "tip", aliases: ["hint"], icon: "lucide-flame", label: "Tip", color: "var(--callout-tip)" },
        { type: "success", aliases: ["check", "done"], icon: "lucide-check", label: "Success", color: "var(--callout-success)" },
        { type: "question", aliases: ["help", "faq"], icon: "lucide-help-circle", label: "Question", color: "var(--callout-question)" },
        { type: "warning", aliases: ["caution", "attention"], icon: "lucide-alert-triangle", label: "Warning", color: "var(--callout-warning)" },
        { type: "failure", aliases: ["fail", "missing"], icon: "lucide-x", label: "Failure", color: "var(--callout-fail)" },
        { type: "danger", aliases: ["error"], icon: "lucide-zap", label: "Danger", color: "var(--callout-error)" },
        { type: "bug", aliases: [], icon: "lucide-bug", label: "Bug", color: "var(--callout-bug)" },
        { type: "example", aliases: [], icon: "lucide-list", label: "Example", color: "var(--callout-example)" },
        { type: "quote", aliases: ["cite"], icon: "lucide-quote", label: "Quote", color: "var(--callout-quote)" }
    ];
    constructor(private plugin: EditingToolbarPlugin) {
        super(plugin.app);
        this.containerEl.addClass("insert-callout-modal");
        this.prepareCalloutOptions();
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (editor) {
            const selectedText = editor.getSelection();
            if (selectedText) {
                this.content = selectedText;
            }
        }
        if (!this.allCalloutOptions.find(opt => opt.type === this.type)) {
            this.type = this.allCalloutOptions.length > 0 ? this.allCalloutOptions[0].type : "note";
        }
    }
    private prepareCalloutOptions() {
        this.builtInCalloutTypes.forEach(bt => {
            this.allCalloutOptions.push({
                type: bt.type,
                label: bt.label,
                icon: bt.icon,
                color: bt.color,
                isAdmonition: false
            });
            bt.aliases.forEach(alias => {
                this.allCalloutOptions.push({
                    type: alias,
                    label: `${bt.label} (${alias})`,
                    icon: bt.icon,
                    color: bt.color,
                    isAdmonition: false
                });
            });
        });
        if (this.plugin.admonitionDefinitions) {
            const admonitionTypes = Object.values(this.plugin.admonitionDefinitions);
            if (admonitionTypes.length > 0) {
                admonitionTypes.forEach(ad => {
                    // Avoid duplicates if a built-in type has the same name
                    if (!this.allCalloutOptions.some(opt => opt.type === ad.type)) {
                        this.allCalloutOptions.push({
                            type: ad.type,
                            label: ad.title || ad.type.charAt(0).toUpperCase() + ad.type.slice(1),
                            icon: ad.icon,
                            color: `rgb(${ad.color})`, // Admonition stores colour as "R,G,B"
                            isAdmonition: true,
                            sourcePlugin: "Admonition"
                        });
                    }
                });
            }
        }
        
    }

    onOpen() {
        this.display();
    }

    private async display() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
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
                const builtIns = this.allCalloutOptions.filter(opt => !opt.isAdmonition);
                const admonitions = this.allCalloutOptions.filter(opt => opt.isAdmonition);
                if (builtIns.length > 0 && admonitions.length > 0) {
                    // DropdownComponent has no <optgroup>; fake a separator with a disabled option
                    dropdown.addOption("---separator---", "---- Admonitions ----");
                    const separatorOption = dropdown.selectEl.options[dropdown.selectEl.options.length - 1];
                    if (separatorOption) {
                        separatorOption.disabled = true;
                    }
                }
                admonitions.forEach(opt => {
                    dropdown.addOption(opt.type, `${opt.label} (Admonition)`);
                });
                dropdown.addOption("---separator---", "---- Default ----");
                builtIns.forEach(opt => {
                    dropdown.addOption(opt.type, opt.label);
                });
                if (!this.allCalloutOptions.some(opt => opt.type === this.type)) {
                    this.type = this.allCalloutOptions.length > 0 ? this.allCalloutOptions[0].type : "note";
                }
                dropdown.setValue(this.type);
                dropdown.onChange((value) => {
                    if (value === "---separator---") {
                        // Separator isn't selectable — revert to the last valid type
                        dropdown.setValue(this.type);
                        return;
                    }
                    this.type = value;
                    this.updateIconAndColor(this.iconContainerEl, value);
                });
            });
        this.updateIconAndColor(this.iconContainerEl, this.type);

        new Setting(contentEl)
            .setName(strings.title)
            .setDesc(strings.optionalLeaveBlankDefaultTitle)
            .addText((text) => {
                text.setPlaceholder(strings.inputTitle)
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

        new Setting(contentEl)
            .setName(strings.content)
            .addTextArea((text) => {
                text.setPlaceholder(strings.inputContent)
                    .setValue(this.content)
                    .onChange((value) => {
                        this.content = value;
                    });
                text.inputEl.rows = 5;
                text.inputEl.cols = 40;
                this.contentTextArea = text.inputEl;
            });

        const shortcutHint = contentEl.createDiv("shortcut-hint");
        shortcutHint.setText(`${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${strings.insert2}`);
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
                        this.insertCallout();
                        this.close();
                    });
                this.insertButton = btn.buttonEl;
                return btn;
            })
            .addButton((btn) => {
                btn.setButtonText(strings.cancel)
                    .setTooltip(strings.cancel)
                    .onClick(() => this.close());
                return btn;
            });

        setTimeout(() => {
            if (this.contentTextArea) {
                this.contentTextArea.focus();
            }
        }, 10);
    }
    private updateIconAndColor(iconContainer: HTMLElement, typeKey: string) {
        if (!iconContainer) return;
        const typeInfo = this.allCalloutOptions.find(t => t.type === typeKey);
        iconContainer.empty();
        if (typeInfo) {
            if (typeInfo.isAdmonition) {
                const adIcon = typeInfo.icon as AdmonitionIconDefinition;
                if (adIcon.type === 'custom' && adIcon.svg) {
                    iconContainer.innerHTML = adIcon.svg;
                    const svgEl = iconContainer.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.fill = typeInfo.color;
                        svgEl.style.width = "var(--icon-size)";
                        svgEl.style.height = "var(--icon-size)";
                    }
                } else if ( adIcon.name.startsWith('lucide-')) {
                    setIcon(iconContainer, adIcon.name);
                    iconContainer.style.setProperty("--callout-color", typeInfo.color);
                } else if (adIcon.type === 'default') {
                    setIcon(iconContainer, adIcon.name); // may not be a valid IconName
                    iconContainer.style.setProperty("--callout-color", typeInfo.color);
                } else {
                    // Unhandled Admonition icon type → placeholder
                    setIcon(iconContainer, "lucide-box");
                    iconContainer.style.setProperty("--callout-color", typeInfo.color);
                }
            } else {
                setIcon(iconContainer, typeInfo.icon as string);
                iconContainer.style.setProperty("--callout-color", typeInfo.color);
            }
        } else {
            // Shouldn't happen if the dropdown is in sync with allCalloutOptions
            setIcon(iconContainer, "lucide-alert-circle");
            iconContainer.style.removeProperty("--callout-color");
        }
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

        calloutText += `\n> ${this.content.replace(/\n/g, '\n> ')}`;

        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const isLineStart = cursor.ch === 0;

        let newCursorPos: { line: number, ch: number };

        if (editor.getSelection()) {
            if (!isLineStart && line.trim().length > 0) {
                calloutText = '\n' + calloutText;
            }
            const selectionStart = editor.getCursor('from');
            editor.replaceSelection(calloutText);
            
            const calloutLines = calloutText.split('\n').length;
            newCursorPos = {
                line: selectionStart.line + calloutLines,
                ch: 0
            };
        } else {
            if (!isLineStart && line.trim().length > 0) {
                calloutText = '\n' + calloutText;
            }

            editor.replaceRange(calloutText, cursor);
            
            const calloutLines = calloutText.split('\n').length;
            newCursorPos = {
                line: cursor.line + calloutLines,
                ch: 0
            };
        }

        setTimeout(() => {
            editor.replaceRange('\n', newCursorPos);
            editor.setCursor({
                line: newCursorPos.line + 1,
                ch: 0
            });
            editor.focus();
        }, 0);
    }
}