import { App, Editor, EditorPosition, MarkdownView, Modal, Notice, Platform, requestUrl, setIcon, Setting, TextComponent, ToggleComponent } from "obsidian";
import EditingToolbarPlugin from "src/plugin/main";
import { strings } from "src/translations/helper";

interface ClipboardItems {
    [key: string]: string;
}

interface LinkTarget {
    isImage: boolean;
    text: string;
    url: string;
    title: string;
    from: EditorPosition;
    to: EditorPosition;
}

class UrlTitleFetcher {
    private static htmlTitlePattern = /<title>([^<]*)<\/title>/im;
    private static wxTitlePattern = /<meta property="og:title" content="([^<]*)" \/>/im;

    private static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch (err) {
            return false;
        }
    }

    private static parseTitle(url: string, body: string): string {
        const patterns = [
            url.includes('mp.weixin.qq.com') ? this.wxTitlePattern : null,
            this.htmlTitlePattern,
            /<title [^>]*>(.*?)<\/title>/i,
            /<meta name="title" content="([^<]*)" \/>/im
        ].filter(Boolean);
    
        for (const pattern of patterns) {
            const match = body.match(pattern);
            if (match && typeof match[1] === 'string') {
                return match[1].trim();
            }
        }
        
        throw new Error('Unable to parse the title tag');
    }

    public static getFallbackTitle(url: string): string {
        const pathMatch = url.match(/[^/\\]+$/);
        if (pathMatch) {
            return pathMatch[0]
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .trim();
        }
        return url;
    }

    public static async fetchRemoteTitle(url: string): Promise<string> {
        if (!this.isValidUrl(url) || !url.match(/^https?:\/\//)) {
            return this.getFallbackTitle(url);
        }

        try {
            const response = await requestUrl({
                url,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                throw: true
            });

            if (response.status !== 200) {
                throw new Error(`Status code ${response.status}`);
            }

            const html = response.text;
            const title = this.parseTitle(url, html);

            if (!title || title.length > 100) {
                return this.getFallbackTitle(url);
            }

            return title;
        } catch (error) {
            console.error(`Failed to fetch title for ${url}:`, error);
     
            return this.getFallbackTitle(url);
        }
    }
}



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
    private linkTextInput: TextComponent;
    private linkUrlInput: TextComponent;
    private linkAliasInput: TextComponent;
    private embedToggle: ToggleComponent;
    private urlErrorMsg: HTMLElement;
    private previewSetting: Setting;
    private insertButton: HTMLElement;

    constructor(private plugin: EditingToolbarPlugin) {
        super(plugin.app);
    
        const editor = this.plugin.commandsManager.getActiveEditor();
        if (editor) {
            const selectedText = editor.getSelection() || "";
            if (selectedText) {
                this.handleSelectedText(editor, selectedText);
            } else {
                this.handleCursorPosition(editor);
            }
        } else {
            this.parseClipboard();
        }
    
        this.updateHeader();
    }
    
    private handleSelectedText(editor: Editor, selectedText: string) {
        const target = this.tryExpandSelection(editor, selectedText);
        if (target) {
            const expandedText = this.formatTargetText(target);
            editor.setSelection(target.from, target.to);
            this.selectedText = expandedText;
            this.parseSelectedText(expandedText);
        } else {
            this.selectedText = selectedText;
            this.parseSelectedText(selectedText);
        }
    }
    
    private handleCursorPosition(editor: Editor) {
        const cursor = editor.getCursor();
        const target = this.findLinkAtCursor(editor, cursor);
        if (target) {
            const formattedText = this.formatTargetText(target);
            editor.setSelection(target.from, target.to);
            this.selectedText = formattedText;
            this.parseSelectedText(formattedText);
        } else {
            this.parseClipboard();
        }
    }
    
    private tryExpandSelection(editor: Editor, selectedText: string): LinkTarget | null {
        const cursorFrom = editor.getCursor('from');
        const line = editor.getLine(cursorFrom.line);
        const selectionStart = cursorFrom.ch;
        const selectionEnd = editor.getCursor('to').ch;
    
        return this.matchLinkInLine(line, selectionStart, selectionEnd, cursorFrom.line);
    }
    
    private findLinkAtCursor(editor: Editor, cursor: EditorPosition): LinkTarget | null {
        const line = editor.getLine(cursor.line);
        const cursorPosInLine = cursor.ch;
    
        return this.matchLinkInLine(line, cursorPosInLine, cursorPosInLine, cursor.line);
    }
    
private matchLinkInLine(line: string, startPos: number, endPos: number, lineNumber: number): LinkTarget | null {
    const markdownRegex = /(!)?\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g;
    let match;

    while ((match = markdownRegex.exec(line)) !== null) {
        const isImage = !!match[1];
        const linkStart = match.index;
        const linkEnd = match.index + match[0].length;
        const text = match[2];
        const url = match[3];
        const quotedTitle = match[4] || '';

        if (startPos <= linkEnd && endPos >= linkStart) {
            return {
                isImage,
                text,
                url,
                title: quotedTitle,
                from: { line: lineNumber, ch: linkStart },
                to: { line: lineNumber, ch: linkEnd }
            };
        }
    }


   const urlRegex = /(?:^|\s)([a-zA-Z][a-zA-Z\d+\-.]*:\/\/\S+|\S+\.[a-zA-Z]{2,}(?:\/\S*)?)/g;

   while ((match = urlRegex.exec(line)) !== null) {
       const url = match[1];
       const linkStart = match.index + (match[0].startsWith(' ') ? 1 : 0);
       const linkEnd = linkStart + url.length;

       if (startPos <= linkEnd && endPos >= linkStart) {
           return {
               isImage: /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url),
               text: url,
               url,
               title: '',
               from: { line: lineNumber, ch: linkStart },
               to: { line: lineNumber, ch: linkEnd }
           };
       }
   }

   return null;
}
    
    private formatTargetText(target: LinkTarget): string {
        if (target.isImage) {
            return `![${target.text}](${target.url}${target.title ? ` "${target.title}"` : ''})`;
        }
        return target.title
            ? `[${target.text}](${target.url} "${target.title}")`
            : `[${target.text}](${target.url})`;
    }
    
 

    private parseSelectedText(text: string) {
        const imglinkMatch = text.match(/!\[.*?\]\(.*?\)/);
        if (imglinkMatch) {
            const prefixText = text.substring(0, imglinkMatch.index);
            const suffixText = text.substring(imglinkMatch.index + imglinkMatch[0].length);
            const imageMatch = this.parseMarkdownImageLink(text);
            if (imageMatch) {
                this.linkText = imageMatch.title;
                this.linkUrl = imageMatch.url;
                this.linkAlias = imageMatch.quotedTitle || '';
                this.imageWidth = imageMatch.width || '';
                this.imageHeight = imageMatch.height || '';
                this.isEmbed = true;
                this.prefixText = prefixText;
                this.suffixText = suffixText;
                return;
            }
        }

        const linkMatch = text.match(/\[([^\]]+)\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)/);
        if (linkMatch) {
            const linkPart = linkMatch[0];
            const prefixText = text.substring(0, linkMatch.index);
            const suffixText = text.substring(linkMatch.index + linkPart.length);
            const parsedLink = this.parseMarkdownLink(linkPart);

            if (parsedLink) {
                this.linkText = parsedLink.text;
                this.linkUrl = parsedLink.url;
                this.linkAlias = parsedLink.title || '';
                this.isEmbed = false;
            }

            this.prefixText = prefixText;
            this.suffixText = suffixText;
        } else {
            const parsed = this.parseMixedContent(text);
            if (parsed) {
                this.linkText = parsed.title;
                this.linkUrl = parsed.url;
            }
        }
    }

    private parseMixedContent(content: string): { title: string; url: string } | null {

        const titleUrlPattern = /^(.*?)\s*((?:https?:\/\/|www\.)\S+)$/i;

        const markdownPattern = /^\[(.*?)\]\((.*?)\)$/;

        const htmlPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i;

        let match;

        if ((match = content.match(markdownPattern))) {
            return {
                title: match[1].trim(),
                url: match[2].trim()
            };
        }

        if ((match = content.match(htmlPattern))) {
            return {
                title: match[2].trim(),
                url: match[1].trim()
            };
        }

        if ((match = content.match(titleUrlPattern)) && match[1].trim()) {
            return {
                title: match[1].trim(),
                url: match[2].trim()
            };
        }

        if (this.isValidUrl(content.trim())) {
            return {
                title: this.extractTitleFromUrl(content.trim()),
                url: content.trim()
            };
        }

        return {
            title: content.trim(),
            url: ""
        };
    }

    private extractTitleFromUrl(url: string): string {
        const specialProtocolMatch = url.match(/^([a-zA-Z]+):\/\/(.+)$/);
        if (specialProtocolMatch) {
            const [, protocol, path] = specialProtocolMatch;
            const segments = path.split(/[/\\]/);
            const lastSegment = segments[segments.length - 1];
            if (lastSegment) {
                return decodeURIComponent(lastSegment)
                    .trim();
            }
            return protocol.toUpperCase();
        }

        const wikiLinkMatch = url.match(/^\[\[(.*?)\]\]$/);
        if (wikiLinkMatch) {
            return wikiLinkMatch[1];
        }

        const pathMatch = url.match(/[^/\\]+$/);
        if (pathMatch) {
            return pathMatch[0]
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]/g, ' ')
                .trim();
        }

        return url;
    }

    private isValidUrl(url: string): boolean {
        if (!url || url.includes('\n') || /\s/.test(url)) {
            return false;
        }

        const specialProtocols = [
            'obsidian://',
            'zotero://',
            'evernote://',
            'notion://',
            'bear://',
            'things://',
            'drafts://',
            'x-devonthink-item://',
            'file://',
            'ftp://',
            'ftps://',
            'http://',
            'https://',
            'tel:',
            'mailto:',
        ];

        if (specialProtocols.some(protocol => url.startsWith(protocol))) {
            return true;
        }

        if (url.match(/^\[\[.*?\]\]$/)) {
            return true;
        }

        if (url.match(/^[./\\]/) ||
            url.match(/^[a-zA-Z]:\\/) ||
            url.match(/^\/[^/]/) ||
            url.match(/^[a-zA-Z]+:\/\//)
        ) {
            return true;
        }


        try {

            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    private parseMarkdownImageLink(markdown: string): {
        title: string;
        url: string;
        width?: string;
        height?: string;
        quotedTitle?: string;
    } | null {
        const imageRegex = /!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?\]\(\s*([^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)/; const match = markdown.match(imageRegex);

        if (match) {
            const[, title , width, height, url, quotedTitle] = match;
            this.isEmbed = true;
            if (this.embedToggle) {
                this.embedToggle.setValue(true);
                const imageSizeEl = this.contentEl.querySelector('.image-size-setting');
                if (imageSizeEl) {
                    (imageSizeEl as HTMLElement).style.display = 'block';
                }
            }

            return {
                title: title.trim(),
                url: url.trim(),
                width: width,
                height: height,
                quotedTitle: quotedTitle?.trim()
            };
        }
        return null;
    }

    private parseMarkdownLink(markdown: string): {
        text: string;
        url: string;
        title?: string;
    } | null {
        const linkRegex = /\[([^\]]+)\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)/;
        const match = markdown.match(linkRegex);

        if (match) {
            const [, text, url, title] = match;
            return {
                text: text.trim(),
                url: url.trim(),
                title: title?.trim()
            };
        }
        return null;
    }

    private async parseClipboard() {
        try {
            const clipboardItems = await this.readClipboard();

            const plainText = clipboardItems['text/plain'];
            if (plainText) {
                const imageMatch = this.parseMarkdownImageLink(plainText);

                if (imageMatch) {
                    this.linkText = imageMatch.title;
                    this.linkUrl = imageMatch.url;
                    this.linkAlias = imageMatch.quotedTitle || '';
                    if (imageMatch.width || imageMatch.height) {
                        this.isEmbed = true;
                        this.imageWidth = imageMatch.width || '';
                        this.imageHeight = imageMatch.height || '';
                    }
                    this.updateUI();
                    return;
                }

                const linkMatch = this.parseMarkdownLink(plainText);
                if (linkMatch) {
                    this.linkText = linkMatch.text;
                    this.linkUrl = linkMatch.url;
                    this.linkAlias = linkMatch.title || '';
                    this.isEmbed = false;
                    this.updateUI();
                    return;
                }
            }

            if (clipboardItems['text/html']) {
                const parsed = this.parseHtmlContent(clipboardItems['text/html']);
                if (parsed) {
                    this.linkText = this.linkText || parsed.title;
                    this.linkUrl = parsed.url;
                }
            } else if (clipboardItems['text/markdown']) {
                const parsed = this.parseMarkdownContent(clipboardItems['text/markdown']);
                if (parsed) {
                    this.linkText = this.linkText || parsed.title;
                    this.linkUrl = parsed.url;
                }
            } else if (clipboardItems['text/plain']) {
                const parsed = this.parseMixedContent(clipboardItems['text/plain']);
                if (parsed) {
                    this.linkText = this.linkText || parsed.title;
                    this.linkUrl = parsed.url;
                }
            }

            this.updateUI();

        } catch (e) {
            console.error("Failed to read clipboard:", e);
        }
    }

    private async readClipboard(): Promise<ClipboardItems> {
        const items: ClipboardItems = {};

        try {
            const clipboardItems = await navigator.clipboard.read();

            for (const clipboardItem of clipboardItems) {
                const types = clipboardItem.types;

                for (const type of types) {
                    if (type === 'text/html' || type === 'text/plain' || type === 'text/markdown') {
                        const blob = await clipboardItem.getType(type);
                        items[type] = await blob.text();
                    }
                }
            }
        } catch (e) {
            try {
                const text = await navigator.clipboard.readText();
                items['text/plain'] = text;
            } catch (e) {
                console.error("Failed to read clipboard:", e);
            }
        }

        return items;
    }

    private parseHtmlContent(html: string): { title: string; url: string } | null {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const linkElement = doc.querySelector('a');
        if (linkElement) {
            return {
                title: linkElement.textContent?.trim() || '',
                url: linkElement.href
            };
        }

        const text = doc.body.textContent || '';
        return this.parseMixedContent(text);
    }

    private parseMarkdownContent(markdown: string): { title: string; url: string } | null {
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const match = markdown.match(markdownLinkRegex);

        if (match) {
            return {
                title: match[1].trim(),
                url: match[2].trim()
            };
        }

        return this.parseMixedContent(markdown);
    }

    onOpen() {
        this.display();
    }
    private updateHeader() {


        const previewText = this.getPreviewText();
        if (this.previewSetting) {
            this.previewSetting.controlEl.querySelector('input').value = previewText;
        }
    }
    private getPreviewText(): string {
        const linkText = this.linkText || "";
        const linkUrl = this.linkUrl;
        let markdownLink = this.isEmbed ? "!" : "";
        markdownLink += `[${linkText}`;

        if (this.isEmbed && (this.imageWidth || this.imageHeight)) {
            markdownLink += "|";
            if (this.imageWidth && this.imageHeight) {
                markdownLink += `${this.imageWidth}x${this.imageHeight}`;
            } else if (this.imageWidth) {
                markdownLink += this.imageWidth;
            } else if (this.imageHeight) {
                markdownLink += `x${this.imageHeight}`;
            }
        }

        markdownLink += `](${linkUrl}`;

        if (this.linkAlias) {
            markdownLink += ` "${this.linkAlias}"`;
        }

        markdownLink += `)`;
        return markdownLink;
    }

    private async display() {
        const { contentEl } = this;
    
        contentEl.empty();
        contentEl.addClass("insert-link-modal");
        this.titleEl.textContent = "";
        this.titleEl.addClass("insert-link-modal-title");
    
        contentEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (this.insertButton) {
                    this.insertButton.click();
                }
            }
        });
    
        const linkTextSetting = new Setting(contentEl)

        .addButton((btn) => {
            btn.setIcon("lucide-globe")
                .setTooltip(strings.fetchRemoteTitle)
                .onClick(async () => {
                    if (this.linkUrl) {
                        btn.setDisabled(true);
                        btn.setIcon("lucide-loader");
                        const title = await this.fetchRemoteTitle(this.linkUrl);
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
        linkTextSetting.setName(strings.linkText)
            .addText((text) => {
                this.linkTextInput = text;
                text.setPlaceholder(strings.linkText)
                    .setValue(this.linkText)
                    .onChange((value) => {
                        this.linkText = value;
                        this.updateHeader();
                    });
            })
       
    
        const aliasSetting = new Setting(contentEl)
            .setName(strings.title)
            .addText((text) => {
                this.linkAliasInput = text;
                text.setPlaceholder(strings.linkTitleOptional)
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
                text.setPlaceholder(strings.linkUrl)
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
                        await this.parseClipboard();
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
        this.embedToggle
            .setValue(this.isEmbed)
            .onChange((value) => {
                this.isEmbed = value;
                const imageSizeEl = contentEl.querySelector('.image-size-setting');
                const aliasSettingEl = aliasSetting.settingEl;
                if (imageSizeEl) {
                    (imageSizeEl as HTMLElement).style.display = value ? 'flex' : 'none';
                }
          
                this.updateHeader();
            });
    
        const imageSizeSetting = new Setting(contentEl)
        .addButton((btn) => {
            btn.setIcon("lucide-maximize")
                .setTooltip(strings.fitEditorWidth)
                .onClick(() => {
                    const dimensions = this.getImageDimensions();
                    if (dimensions) {
                        this.imageWidth = dimensions.width.toString();
                        this.imageHeight = dimensions.height?.toString();
                        (imageSizeSetting.components[1] as TextComponent).setValue(this.imageWidth);
                        if (this.imageHeight) {
                            (imageSizeSetting.components[2] as TextComponent).setValue(this.imageHeight);
                        }
                        this.updateHeader();
                    }
                });
        });
        imageSizeSetting.setClass('image-size-setting')
            .setName(strings.imageSize)
            .addText((text) => {
                text.inputEl.addClass('image-width-input');
                text.setPlaceholder(strings.imageWidth)
                    .setValue(this.imageWidth)
                    .onChange((value) => {
                        this.imageWidth = value.replace(/[^\d]/g, '');
                        text.setValue(this.imageWidth);
                        this.updateHeader();
                    });
            })
          
    
        const imageSizeIcon = imageSizeSetting.controlEl.createDiv("image-size-icon");
        setIcon(imageSizeIcon, "lucide-x");
    
        imageSizeSetting.addText((text) => {
            text.inputEl.addClass('image-height-input');
            text.setPlaceholder(strings.imageHeight)
                .setValue(this.imageHeight)
                .onChange((value) => {
                    this.imageHeight = value.replace(/[^\d]/g, '');
                    text.setValue(this.imageHeight);
                    this.updateHeader();
                });
        });
    
        imageSizeSetting.settingEl.style.display = this.isEmbed ? 'block' : 'none';
    
        new Setting(contentEl)
            .setName(strings.insertNewLine)
            .setDesc(strings.insertLinkNextLine)
            .addToggle((toggle) => {
                toggle.setValue(this.insertNewLine)
                    .onChange((value) => {
                        this.insertNewLine = value;
                        this.updateHeader();
                    });
            });
    
        this.previewSetting = new Setting(contentEl)
            .setClass("preview-setting")
            .setTooltip(this.getPreviewText())
            .addText((text) => {
                text.setValue(this.getPreviewText())
                    .inputEl.setAttribute("readonly", "true");
            });
    
        const shortcutHint = contentEl.createDiv("shortcut-hint");
        shortcutHint.setText(`${Platform.isMacOS ? "⌘" : "Ctrl"} + Enter ${strings.insert2}`);
        shortcutHint.style.textAlign = "right";
        shortcutHint.style.fontSize = "0.8em";
        shortcutHint.style.opacity = "0.7";
        shortcutHint.style.marginTop = "5px";
    
        const buttonSetting = new Setting(contentEl)
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
                btn
                    .setButtonText(strings.cancel)
                    .onClick(() => {
                        this.close();
                    })
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
    
private async fetchRemoteTitle(url: string): Promise<string> {
    return UrlTitleFetcher.fetchRemoteTitle(url);
}

 
    private getImageDimensions(): { width: number; height: number } | null {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return null;
    
    const editorEl = view.contentEl.querySelector('.markdown-source-view .cm-content') as HTMLElement;
    const containerEl = view.contentEl as HTMLElement;
    if (!editorEl || !containerEl) return null;

    const editorWidth = editorEl.offsetWidth;
    const viewHeight = containerEl.offsetHeight;
    const maxHeight = Math.floor(viewHeight / 2);

    if (view.getMode() === 'preview' || view.getMode() === 'source') {
        const imgEls = editorEl.querySelectorAll('img');
        if (imgEls.length > 0) {
            let targetImg: HTMLImageElement | null = null;
            if (this.linkUrl) {
                imgEls.forEach((img) => {
                    if (img.src === this.linkUrl && img.complete && img.naturalWidth > 0) {
                        targetImg = img as HTMLImageElement;
                    }
                });
            }
           

            if (targetImg) {
                const naturalWidth = targetImg.naturalWidth;
                const naturalHeight = targetImg.naturalHeight;
                const aspectRatio = naturalWidth / naturalHeight;

                let adjustedWidth = Math.min(naturalWidth, Math.floor(editorWidth * 0.65));
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
        const adjustedWidth = Math.min(Math.floor(editorWidth * 0.65), heightLimitedWidth);
      
    
        return { width: adjustedWidth, height: null };
    }

    private validateUrl(url: string) {
        if (!url) {
            this.urlErrorMsg.style.display = "none";
            return true;
        }

        if (!this.isValidUrl(url)) {
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

        const linkText = this.linkText || this.linkUrl;
        const linkUrl = this.linkUrl;

        let markdownLink = this.isEmbed ? "!" : "";
        markdownLink += `[${linkText}`;

        if (this.isEmbed && (this.imageWidth || this.imageHeight)) {
            markdownLink += "|";
            if (this.imageWidth && this.imageHeight) {
                markdownLink += `${this.imageWidth}x${this.imageHeight}`;
            } else if (this.imageWidth) {
                markdownLink += this.imageWidth;
            } else if (this.imageHeight) {
                markdownLink += `x${this.imageHeight}`;
            }
        }
        markdownLink += `](${linkUrl}`;

        if (this.linkAlias) {
            markdownLink += ` "${this.linkAlias}"`;
        }

        markdownLink += `)`;

        let newCursorPos: { line: number, ch: number };

        const selection = editor.somethingSelected();
        if (selection) {
            const selectionStart = editor.getCursor('from');
            const selectionEnd = editor.getCursor('to');

            if (this.insertNewLine) {
                editor.replaceRange('\n' + markdownLink, { line: selectionEnd.line, ch: editor.getLine(selectionEnd.line).length });
                newCursorPos = { line: selectionEnd.line + 1, ch: markdownLink.length };
            } else {
                const fullText = this.prefixText + markdownLink + this.suffixText;
                editor.replaceRange(
                    fullText,
                    { line: selectionStart.line, ch: selectionStart.ch },
                    selectionEnd
                );
                newCursorPos = {
                    line: selectionStart.line,
                    ch: this.prefixText.length + markdownLink.length
                };
            }
        } else {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);

            if (this.insertNewLine) {
                const nextLineNum = cursor.line + 1;
                editor.replaceRange('\n', { line: cursor.line, ch: line.length });
                editor.setCursor({ line: nextLineNum, ch: 0 });
                editor.replaceRange(markdownLink, { line: nextLineNum, ch: 0 });
                newCursorPos = { line: nextLineNum, ch: markdownLink.length };
            } else {
                editor.replaceRange(markdownLink, cursor);
                newCursorPos = {
                    line: cursor.line,
                    ch: cursor.ch + markdownLink.length
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

        const widthInput = this.contentEl.querySelector('.image-width-input') as HTMLInputElement;
        const heightInput = this.contentEl.querySelector('.image-height-input') as HTMLInputElement;
        if (widthInput) widthInput.value = this.imageWidth;
        if (heightInput) heightInput.value = this.imageHeight;

        if (this.linkAliasInput) {
            this.linkAliasInput.setValue(this.linkAlias);
        }

        const aliasSettingEl = this.contentEl.querySelector('.setting-item:nth-child(2)');
        if (aliasSettingEl) {
            (aliasSettingEl as HTMLElement).style.display =  'flex';
        }
        this.updateHeader();
    }
}

