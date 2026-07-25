import {
  Command,
  debounce,
  Editor,
  ItemView,
  MarkdownFileInfo,
  MarkdownView,
  Menu,
  Notice,
  Platform,
  Plugin,
} from "obsidian";
import { CommandsManager } from "src/commands/commands";
import { StatusBar } from "src/components/StatusBar";
import addIcons from "src/icons/customIcons";
import { InsertLinkModal } from "src/modals/insertLinkModal";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import {
  DEFAULT_FOLLOWING_COMMANDS,
  DEFAULT_SETTINGS,
  DEFAULT_TOOLBAR_COMMANDS,
  editingToolbarSettings,
  getAppearanceValue,
} from "src/settings/settingsData";
import {
  createFollowingBar,
  editingToolbarPopover,
  getExistingToolbar,
  quietFormatBrushes,
  resetToolbar,
  selfDestruct,
  setFormatEraser,
} from "src/toolbar/editingToolbar";
import { strings } from "src/translations/helper";
import { setBackgroundcolor, setFontcolor } from "src/util/util";
import { ViewUtils } from "src/util/viewUtils";
import { EditingToolbarSettingTab } from "../settings/settingsTab";

let activeDocument: Document;

const STYLE_KEYS: ToolbarStyleKey[] = ["top", "following", "fixed"];

export interface AdmonitionDefinition {
  type: string;
  title?: string;
  icon: string;
  color: string;
  command: boolean;
  injectColor?: boolean;
  noTitle: boolean;
  copy?: boolean;
}

interface EditorContextMenuAction {
  title: string;
  commandId?: string;
  callback?: () => void;
  disabled?: boolean;
}

const ADMONITION_PLUGIN_ID = "obsidian-admonition";

export default class EditingToolbarPlugin extends Plugin {
  settings!: editingToolbarSettings;
  statusBarIcon!: HTMLElement;
  statusBar!: StatusBar;
  public toolbarIconSize!: number;
  public positionStyle!: string;

  // Which style's appearance is being edited in the settings UI
  public appearanceEditStyle: ToolbarStyleKey | null = null;

  commandsManager!: CommandsManager;
  public admonitionDefinitions: Record<string, AdmonitionDefinition> | null =
    null;

  isMoreButton!: boolean;
  bgFormatBrushActive!: boolean;
  fontColorFormatBrushActive!: boolean;
  EN_Text_Format_Brush!: boolean;
  tempNotice: Notice | null = null;
  leafWidth!: number;

  lastExecutedCommand: string | null = null;
  formatBrushActive: boolean = false;
  formatBrushNotice: Notice | null = null;
  lastCalloutType: string | null = null;
  lastExecutedCommandName: string | null = null;

  settingTab!: EditingToolbarSettingTab;

  private toolbarCache: Map<ToolbarStyleKey, HTMLElement> = new Map();
  private popoverCache: Map<ToolbarStyleKey, HTMLElement> = new Map();

  async onload(): Promise<void> {
    activeDocument = activeWindow.document;

    await this.loadSettings();

    this.initAppearanceStore();

    this.settingTab = new EditingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();
    this.app.workspace.onLayoutReady(() => {
      this.statusBar = new StatusBar(this);
      this.statusBar.init();

      // Delay lets Settings Search finish scanning tabs before we apply visibility
      setTimeout(() => {
        if (!this.settings.cMenuVisibility) {
          this.handleEditingToolbar();
        }
      }, 100);
    });
    this.init_evt(activeDocument);
    this.registerEvent(
      this.app.workspace.on("window-open", (leaf) => {
        this.init_evt(leaf.doc);
        setTimeout(() => {
          if (!this.settings.cMenuVisibility) {
            return;
          }

          if (this.isFollowingToolbarActive()) {
            editingToolbarPopover(this.app, this, "following", leaf.doc);
          }

          if (this.settings.enableFixedToolbar) {
            editingToolbarPopover(this.app, this, "fixed", leaf.doc);
          }
        }, 50);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleEditingToolbar),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleEditingToolbar_layout),
    );
    this.registerEvent(
      this.app.workspace.on("resize", this.handleEditingToolbar_resize),
    );
    if (this.settings.cMenuVisibility == true) {
      setTimeout(() => {
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100);
    }
    this.app.workspace.onLayoutReady(async () => {
      await this.tryGetAdmonitionTypes();
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", this.handleEditorContextMenu),
    );
    this.registerEvent(
      this.app.workspace.on(
        // @ts-expect-error untyped API access
        "url-menu",
        (menu: Menu, _url: string, _view: MarkdownView) => {
          menu.addItem((item) =>
            item
              .setTitle("Edit Link(Modal)")
              .setSection("info")
              .setIcon("link")
              .onClick(() => {
                new InsertLinkModal(this).open();
              }),
          );
        },
      ),
    );
    addIcons();
    this.positionStyle = this.settings.positionStyle;
    const activeStyle = this.resolveActiveStyle();
    this.toolbarIconSize = getAppearanceValue(
      this.settings,
      "toolbarIconSize",
      activeStyle,
    );
    activeDocument.documentElement.style.setProperty(
      "--editing-toolbar-background-color",
      getAppearanceValue(this.settings, "toolbarBackgroundColor", activeStyle),
    );
    activeDocument.documentElement.style.setProperty(
      "--editing-toolbar-icon-color",
      getAppearanceValue(this.settings, "toolbarIconColor", activeStyle),
    );
    activeDocument.documentElement.style.setProperty(
      "--toolbar-icon-size",
      `${getAppearanceValue(this.settings, "toolbarIconSize", activeStyle)}px`,
    );
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    for (const key of Object.keys(
      DEFAULT_SETTINGS,
    ) as (keyof editingToolbarSettings)[]) {
      if (this.settings[key] === undefined || this.settings[key] === null) {
        (this.settings[key] as unknown) = DEFAULT_SETTINGS[key];
      }
    }

    // Every style keeps its own command list, each with its own fresh-install
    // default (top and fixed share the full set; following gets a curated inline
    // set). Seed a list only when it has never been persisted, so a list the user
    // deliberately cleared stays empty. Deep-copy so styles sharing a default (and
    // the module-level default constants) never alias each other's command objects.
    const seedDefaults = {
      topCommands: DEFAULT_TOOLBAR_COMMANDS,
      fixedCommands: DEFAULT_TOOLBAR_COMMANDS,
      followingCommands: DEFAULT_FOLLOWING_COMMANDS,
    } as const;
    for (const key of Object.keys(
      seedDefaults,
    ) as (keyof typeof seedDefaults)[]) {
      if (!loadedData || loadedData[key] === undefined) {
        this.settings[key] = structuredClone(seedDefaults[key]);
      }
    }
  }

  // Ensure per-style appearance buckets exist. Empty buckets fall back to the
  // global appearance fields via getAppearanceValue().
  private initAppearanceStore(): void {
    const store = (this.settings.appearanceByStyle ??= {});
    for (const style of STYLE_KEYS) {
      store[style] ??= {};
    }
  }

  /**
   * The toolbar style whose appearance is currently in effect: the style being
   * edited in settings, else the live position style, else the stored fallback.
   */
  public resolveActiveStyle(): ToolbarStyleKey {
    const raw = (this.appearanceEditStyle ||
      this.positionStyle ||
      this.settings.positionStyle ||
      "top") as string;
    return STYLE_KEYS.includes(raw as ToolbarStyleKey)
      ? (raw as ToolbarStyleKey)
      : "top";
  }

  private getPluginCommandId(commandId: string): string {
    return `${this.manifest.id}:${commandId}`;
  }

  private executePluginCommand(commandId: string): void {
    this.app.commands.executeCommandById(this.getPluginCommandId(commandId));
  }

  private addEditorContextAction(
    menu: Menu,
    action: EditorContextMenuAction,
  ): void {
    menu.addItem((item) => {
      item.setTitle(action.title);

      if (action.disabled) {
        item.setDisabled(true);
        return;
      }

      item.onClick(() => {
        if (action.callback) {
          action.callback();
          return;
        }

        if (action.commandId) {
          this.executePluginCommand(action.commandId);
        }
      });
    });
  }

  private addEditorContextSubmenu(
    menu: Menu,
    title: string,
    icon: string,
    actions: EditorContextMenuAction[],
  ): void {
    if (!actions.length) {
      return;
    }

    menu.addItem((item) => {
      item.setTitle(title).setIcon(icon);
      item.setSection("info");

      const submenu = item.setSubmenu();
      actions.forEach((action) => this.addEditorContextAction(submenu, action));
    });
  }

  private buildTextContextActions(editor: Editor): EditorContextMenuAction[] {
    const actions: EditorContextMenuAction[] = [];
    const hasSelection = editor.somethingSelected();
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    const isOrderedListLine = /^\d+\.\s/.test(lineText);
    const isTableContext = lineText.includes("|");

    if (hasSelection) {
      actions.push(
        { title: strings.splitLines, commandId: "split-lines" },
        { title: strings.mergeLines, commandId: "merge-lines" },
        { title: strings.fullHalfConverter, commandId: "smart-symbols" },
        { title: strings.dedupeLines, commandId: "dedupe-lines" },
        { title: strings.addPrefixSuffix, commandId: "add-wrap" },
        { title: strings.numberLinesCustom, commandId: "number-lines" },
        { title: strings.trimLineEnds, commandId: "remove-whitespace-trim" },
        {
          title: strings.shrinkExtraSpaces,
          commandId: "remove-whitespace-compress",
        },
        {
          title: strings.removeAllWhitespace,
          commandId: "remove-whitespace-all",
        },
        { title: strings.extractBetweenStrings, commandId: "extract-between" },
        { title: strings.listTable, commandId: "list-to-table" },
        { title: strings.tableList, commandId: "table-to-list" },
      );
    }

    if (!hasSelection) {
      actions.push(
        { title: strings.addPrefixSuffix, commandId: "add-wrap" },
        { title: strings.insertBlankLines, commandId: "insert-blank-lines" },
        { title: strings.extractBetweenStrings, commandId: "extract-between" },
      );
    }

    if (isOrderedListLine) {
      actions.push({
        title: strings.renumberList,
        commandId: "renumber-ordered-list",
      });
    }

    if (!hasSelection && isTableContext) {
      actions.push({ title: strings.tableList, commandId: "table-to-list" });
    }

    if (!actions.length) {
      actions.push({ title: strings.selectTextSeeMoreTools, disabled: true });
    }

    return actions;
  }

  private handleEditorContextMenu = (
    menu: Menu,
    editor: Editor,
    _view: MarkdownView | MarkdownFileInfo,
  ): void => {
    this.addEditorContextSubmenu(
      menu,
      strings.textTools,
      "whole-word",
      this.buildTextContextActions(editor),
    );
  };

  async tryGetAdmonitionTypes(_retries = 0): Promise<void> {
    const admonitionPluginInstance =
      // @ts-expect-error untyped API access
      this.app.plugins?.getPlugin(ADMONITION_PLUGIN_ID);
    if (admonitionPluginInstance) {
      this.processAdmonitionTypes(admonitionPluginInstance);
    }
  }

  processAdmonitionTypes(pluginInstance: unknown) {
    const admonitionPlugin = pluginInstance as {
      admonitions?: Record<string, AdmonitionDefinition>;
    };

    if (
      admonitionPlugin.admonitions &&
      typeof admonitionPlugin.admonitions === "object" &&
      !Array.isArray(admonitionPlugin.admonitions) &&
      Object.keys(admonitionPlugin.admonitions).length > 0
    ) {
      this.admonitionDefinitions = admonitionPlugin.admonitions;
    } else {
      console.warn(
        "Could not read types from admonitionPlugin.admonitions (as object).",
      );
      this.admonitionDefinitions = null;
    }
  }

  isLoadMobile() {
    // Mobile is unsupported: the toolbar never loads there.
    return !Platform.isMobileApp;
  }

  onunload(): void {
    this.app.workspace.off("active-leaf-change", this.handleEditingToolbar);
    this.app.workspace.off("layout-change", this.handleEditingToolbar_layout);
    this.app.workspace.off("resize", this.handleEditingToolbar_resize);

    if (this.formatBrushNotice) {
      this.formatBrushNotice.hide();
      this.formatBrushNotice = null;
    }

    this.quietAllFormatBrushes();

    selfDestruct(this);

    console.log("editingToolbar unloaded");
  }

  isView() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return ViewUtils.isAllowedViewType(view);
  }

  handleEditingToolbar = () => {
    // Keep format-brush cursor state in sync with the toolbar state
    if (!this.formatBrushActive) {
      activeDocument.body.classList.remove("format-brush-cursor");
    }

    if (!this.settings.cMenuVisibility) {
      (["top", "following", "fixed"] as const).forEach((style) => {
        const el = getExistingToolbar(this.app, this, style);
        if (el) el.style.display = "none";
      });
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(ItemView);

    // Focus moved off the note — a sidebar/settings got focus, or the main pane
    // itself became a non-editor view (PDF, graph, image, base, …). Decide from
    // the main-area content rather than the focused pane: getMostRecentLeaf()
    // ignores sidebars, so it still points at the note you're editing when you
    // just clicked a sidebar, but points at the PDF/graph when the main pane
    // itself changed. Keep the top and fixed bars only while that main content
    // is an editable note or canvas — so dipping into a sidebar doesn't flicker
    // them, but reading mode and non-editor views correctly hide them. The
    // selection-following bar always hides here; it has no selection to track.
    if (!ViewUtils.isAllowedViewType(view)) {
      const following = getExistingToolbar(this.app, this, "following");
      if (following) following.style.visibility = "hidden";

      const mainView = this.app.workspace.getMostRecentLeaf()?.view ?? null;
      const mainType = mainView?.getViewType();
      const mainEditable =
        mainType === "canvas" ||
        (mainType === "markdown" && ViewUtils.isSourceMode(mainView));

      if (!mainEditable) {
        (["top", "fixed"] as const).forEach((style) => {
          const el = getExistingToolbar(this.app, this, style);
          if (el) el.style.visibility = "hidden";
        });
      }
      return;
    }

    const viewType = view?.getViewType();
    const isMarkdownView = viewType === "markdown";
    const inSourceMode = isMarkdownView && ViewUtils.isSourceMode(view);

    // Reading mode hides everything; non-markdown views (Canvas, …) handled below.
    if (isMarkdownView && !inSourceMode) {
      (["top", "following", "fixed"] as const).forEach((style) => {
        const el = getExistingToolbar(this.app, this, style);
        if (el) el.style.visibility = "hidden";
      });
      return;
    }

    // The explicit enable flags are the single source of truth. Legacy
    // positionStyle-only configs are migrated into these flags in
    // loadSettings(), so we must NOT fall back to positionStyle here:
    // doing so re-enables a toolbar the user just toggled off (positionStyle
    // still points at it), which is the "toggle won't turn it off" bug.
    const topEnabled = this.isTopToolbarActive();
    const followingEnabled = this.isFollowingToolbarActive();
    const fixedEnabled = this.settings.enableFixedToolbar;

    const styles: { key: "top" | "following" | "fixed"; enabled: boolean }[] = [
      { key: "top", enabled: topEnabled },
      { key: "following", enabled: followingEnabled },
      { key: "fixed", enabled: fixedEnabled },
    ];

    for (const { key, enabled } of styles) {
      const existing = getExistingToolbar(this.app, this, key);

      if (!enabled) {
        if (existing) existing.style.visibility = "hidden";
        continue;
      }

      if (!existing) {
        editingToolbarPopover(this.app, this, key);
      }

      const toolbar = getExistingToolbar(this.app, this, key);
      if (!toolbar) continue;

      if (key === "following") {
        // Following bar stays hidden until a selection reveals it (selection handlers)
        toolbar.style.visibility = "hidden";
      } else {
        toolbar.style.visibility = "visible";
      }
    }
  };

  handleEditingToolbar_layout = () => {
    this.handleEditingToolbar();
  };

  handleEditingToolbar_resize = () => {
    if (!this.settings.cMenuVisibility || !this.isTopToolbarActive()) {
      return false;
    }

    const view = this.app.workspace.getActiveViewOfType(ItemView);
    if (!ViewUtils.isSourceMode(view)) {
      return false;
    }

    const leafwidth = this.app.workspace.activeLeaf?.view?.leaf?.width ?? 0;
    if (leafwidth <= 0 || this.leafWidth === leafwidth) {
      return false;
    }

    this.leafWidth = leafwidth;

    if (this.settings.cMenuWidth && leafwidth) {
      const diff = leafwidth - this.settings.cMenuWidth;

      // Don't rebuild while the configured width still fits
      if (diff < 78 && leafwidth > this.settings.cMenuWidth) {
        return;
      }

      setTimeout(() => {
        resetToolbar(this);
        editingToolbarPopover(this.app, this);
      }, 200);
    }

    return true;
  };

  setIsMoreButton(status: boolean): void {
    this.isMoreButton = status;
  }
  setBgFormatBrushActive(status: boolean): void {
    this.bgFormatBrushActive = status;
  }
  setFontColorFormatBrushActive(status: boolean): void {
    this.fontColorFormatBrushActive = status;
  }
  setEN_Text_Format_Brush(status: boolean): void {
    this.EN_Text_Format_Brush = status;
  }
  setTempNotice(content: Notice): void {
    this.tempNotice = content;
  }

  getCurrentCommands(style?: string): Command[] {
    switch (style || this.positionStyle) {
      case "following":
        return this.settings.followingCommands;
      case "top":
        return this.settings.topCommands;
      case "fixed":
        return this.settings.fixedCommands;
      default:
        return this.settings.menuCommands;
    }
  }

  updateCurrentCommands(commands: Command[], style?: string): void {
    switch (style || this.positionStyle) {
      case "following":
        this.settings.followingCommands = commands;
        break;
      case "top":
        this.settings.topCommands = commands;
        break;
      case "fixed":
        this.settings.fixedCommands = commands;
        break;
      default:
        this.settings.menuCommands = commands;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Restore every setting and command list to the shipped defaults, persist, and
  // rebuild the live toolbars. Seeds the per-style command lists the same way
  // loadSettings() does, since DEFAULT_SETTINGS keeps them empty.
  async resetSettings(): Promise<void> {
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.settings.topCommands = structuredClone(DEFAULT_TOOLBAR_COMMANDS);
    this.settings.fixedCommands = structuredClone(DEFAULT_TOOLBAR_COMMANDS);
    this.settings.followingCommands = structuredClone(
      DEFAULT_FOLLOWING_COMMANDS,
    );

    this.initAppearanceStore();
    this.appearanceEditStyle = null;
    this.toolbarIconSize = this.settings.toolbarIconSize;

    await this.saveSettings();

    // Tear down existing toolbars, then let onPositionStyleChange re-apply the
    // global appearance variables and dispatch the rebuild event.
    selfDestruct(this);
    this.onPositionStyleChange(this.settings.positionStyle);
  }

  setLastExecutedCommand(commandId: string): void {
    this.lastExecutedCommand = commandId;

    const command = this.app.commands.commands[commandId];
    if (command && command.name) {
      this.lastExecutedCommandName = command.name;
    } else {
      const parts = commandId.split(":");
      this.lastExecutedCommandName = parts[parts.length - 1].replace(/-/g, " ");
    }
  }

  // "Wrap" formats matched against a whole selection; first match wins.
  private static readonly SELECTION_WRAP_FORMATS: Array<{
    re: RegExp;
    command: string;
    name: string;
  }> = [
    { re: /^\*\*.*\*\*$/, command: "editor:toggle-bold", name: "Bold" },
    { re: /^\*.*\*$/, command: "editor:toggle-italics", name: "Italic" },
    { re: /^_.*_$/, command: "editor:toggle-italics", name: "Italic" },
    {
      re: /^~~.*~~$/,
      command: "editor:toggle-strikethrough",
      name: "Strikethrough",
    },
    { re: /^==.*==$/, command: "editor:toggle-highlight", name: "Highlight" },
    { re: /^`.*`$/, command: "editor:toggle-code", name: "Code" },
    {
      re: /^<font color=".*">.*<\/font>$/,
      command: "editing-toolbar:change-font-color",
      name: "Font Color",
    },
    {
      re: /^<mark style="background:.*">.*<\/mark>$/,
      command: "editing-toolbar:change-background-color",
      name: "Background Color",
    },
    {
      re: /^<u>([^<]+)<\/u>$/,
      command: "editor:toggle-underline",
      name: "Underline",
    },
    {
      re: /^<center>([^<]+)<\/center>$/,
      command: "editing-toolbar:center",
      name: "Center",
    },
    {
      re: /^<p align="left">(.*?)<\/p>$/,
      command: "editing-toolbar:left",
      name: "Left Align",
    },
    {
      re: /^<p align="right">(.*?)<\/p>$/,
      command: "editing-toolbar:right",
      name: "Right Align",
    },
    {
      re: /^<p align="justify">(.*?)<\/p>$/,
      command: "editing-toolbar:justify",
      name: "Justify",
    },
    {
      re: /^<sup>(.*?)<\/sup>$/,
      command: "editing-toolbar:superscript",
      name: "Superscript",
    },
    {
      re: /^<sub>(.*?)<\/sub>$/,
      command: "editing-toolbar:subscript",
      name: "Subscript",
    },
  ];

  // Inline formats scanned around the cursor when nothing is selected.
  // Order doesn't matter here; the nearest match to the cursor is chosen.
  private static readonly CURSOR_INLINE_FORMATS: Array<{
    re: RegExp;
    command: string;
    name: string;
  }> = [
    {
      re: /<u>([^<]+)<\/u>/g,
      command: "editing-toolbar:toggle-underline",
      name: "Underline",
    },
    {
      re: /<center>([^<]+)<\/center>/g,
      command: "editing-toolbar:center",
      name: "Center",
    },
    {
      re: /<p align="left">([^<]+)<\/p>/g,
      command: "editing-toolbar:left",
      name: "Left Align",
    },
    {
      re: /<p align="right">([^<]+)<\/p>/g,
      command: "editing-toolbar:right",
      name: "Right Align",
    },
    {
      re: /<p align="justify">([^<]+)<\/p>/g,
      command: "editing-toolbar:justify",
      name: "Justify",
    },
    {
      re: /<sup>([^<]+)<\/sup>/g,
      command: "editing-toolbar:superscript",
      name: "Superscript",
    },
    {
      re: /<sub>([^<]+)<\/sub>/g,
      command: "editing-toolbar:subscript",
      name: "Subscript",
    },
    { re: /\*\*([^*]+)\*\*/g, command: "editor:toggle-bold", name: "Bold" },
    {
      re: /~~([^~]+)~~/g,
      command: "editor:toggle-strikethrough",
      name: "Strikethrough",
    },
    {
      re: /==([^=]+)==/g,
      command: "editor:toggle-highlight",
      name: "Highlight",
    },
    { re: /`([^`]+)`/g, command: "editor:toggle-code", name: "Code" },
    {
      re: /<font color="([^"]+)">([^<]+)<\/font>/g,
      command: "editing-toolbar:change-font-color",
      name: "Font Color",
    },
    {
      re: /<span style="background:([^"]+)">([^<]+)<\/span>/g,
      command: "editing-toolbar:change-background-color",
      name: "Background Color",
    },
  ];

  // Returns the heading level (1-6) if the text starts with that many '#'
  // followed by a space, otherwise 0.
  private matchLeadingHeading(text: string): number {
    const headings = [/^# /, /^## /, /^### /, /^#### /, /^##### /, /^###### /];
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].test(text)) return i + 1;
    }
    return 0;
  }

  private detectSelectionFormat(
    selectedText: string,
  ): { command: string; name: string; calloutType: string } | null {
    for (const {
      re,
      command,
      name,
    } of EditingToolbarPlugin.SELECTION_WRAP_FORMATS) {
      if (re.test(selectedText)) {
        return { command, name, calloutType: "" };
      }
    }

    const calloutMatch = selectedText.match(
      /^> \[!(note|tip|warning|danger|info|success|question|quote)\]/i,
    );
    if (calloutMatch) {
      const calloutType = calloutMatch[1].toLowerCase();
      return {
        command: "editor:insert-callout",
        name: "Callout-" + calloutType,
        calloutType,
      };
    }

    const headingLevel = this.matchLeadingHeading(selectedText);
    if (headingLevel > 0) {
      return {
        command: `editor:set-heading-${headingLevel}`,
        name: `Heading ${headingLevel}`,
        calloutType: "",
      };
    }

    return null;
  }

  private detectCursorFormat(
    lineText: string,
    cursorPos: number,
  ): { command: string; name: string } | null {
    const foundFormats: Array<{
      command: string;
      name: string;
      distance: number;
    }> = [];

    for (const {
      re,
      command,
      name,
    } of EditingToolbarPlugin.CURSOR_INLINE_FORMATS) {
      let match: RegExpExecArray | null;
      while ((match = re.exec(lineText)) !== null) {
        const formatStart = match.index;
        const formatEnd = match.index + match[0].length;
        if (cursorPos > formatStart && cursorPos < formatEnd) {
          foundFormats.push({
            command,
            name,
            distance: Math.min(cursorPos - formatStart, formatEnd - cursorPos),
          });
        }
      }
    }

    if (foundFormats.length > 0) {
      foundFormats.sort((a, b) => a.distance - b.distance);
      return { command: foundFormats[0].command, name: foundFormats[0].name };
    }

    // Italic uses single * or _ and is only a fallback when nothing else matched.
    if (/(\*|_)([^*_]+)(\*|_)/.test(lineText)) {
      return { command: "editor:toggle-italics", name: "Italic" };
    }

    const headingLevel = this.matchLeadingHeading(lineText);
    if (headingLevel > 0 && cursorPos > headingLevel - 1) {
      return {
        command: `editor:set-heading-${headingLevel}`,
        name: `Heading ${headingLevel}`,
      };
    }

    return null;
  }

  toggleFormatBrush(): void {
    const editor = this.commandsManager.getActiveEditor();
    let detectedFormat = false;
    let calloutType = "";

    if (editor) {
      if (editor.somethingSelected()) {
        const result = this.detectSelectionFormat(editor.getSelection());
        if (result) {
          this.lastExecutedCommand = result.command;
          this.lastExecutedCommandName = result.name;
          calloutType = result.calloutType;
          detectedFormat = true;
        }
      } else {
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        const result = this.detectCursorFormat(lineText, cursor.ch);
        if (result) {
          this.lastExecutedCommand = result.command;
          this.lastExecutedCommandName = result.name;
          detectedFormat = true;
        }
      }
    }

    if (!detectedFormat && !this.lastExecutedCommand) {
      new Notice(strings.pleaseExecuteFormatCommandSelect);
      return;
    }

    this.formatBrushActive = !this.formatBrushActive;

    if (this.formatBrushActive) {
      activeDocument.body.classList.add("format-brush-cursor");
      this.fontColorFormatBrushActive = false;
      this.bgFormatBrushActive = false;
      this.EN_Text_Format_Brush = false;
      this.lastCalloutType = calloutType;
      if (this.formatBrushNotice) this.formatBrushNotice.hide();
      this.formatBrushNotice = new Notice(
        strings.formatBrushSelectTextApply +
          this.lastExecutedCommandName +
          strings.format,
        0,
      );
    } else {
      activeDocument.body.classList.remove("format-brush-cursor");
      if (this.formatBrushNotice) {
        this.formatBrushNotice.hide();
        this.formatBrushNotice = null;
      }
    }
  }
  applyCalloutFormat(editor: Editor, text: string, calloutType: string) {
    const calloutPrefixRegex =
      /^> \[!(note|tip|warning|danger|info|success|question|quote)\] ?/i;
    const cleanedText = text.replace(calloutPrefixRegex, "").trim();

    const lines = cleanedText.split("\n");
    const processedLines = lines.map((line) => line.replace(/^\s*>\s*/, ""));

    const newText = `> [!${calloutType}]\n> ${processedLines.join("\n> ")}`;

    editor.replaceSelection(newText);
  }
  applyFormatBrush(editor: Editor): void {
    if (!this.lastExecutedCommand || !this.formatBrushActive) return;
    const command = this.app.commands.commands[this.lastExecutedCommand];
    if (command && command.callback) {
      command.callback();
    }
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (command && command.editorCallback && view) {
      command.editorCallback(editor, view);
    }
  }

  quietAllFormatBrushes(): void {
    this.fontColorFormatBrushActive = false;
    this.bgFormatBrushActive = false;
    this.EN_Text_Format_Brush = false;
    activeDocument.body.classList.remove("format-brush-cursor");
    if (this.formatBrushActive) {
      this.formatBrushActive = false;
      if (this.formatBrushNotice) {
        this.formatBrushNotice.hide();
        this.formatBrushNotice = null;
      }
    }

    if (this.tempNotice) {
      this.tempNotice.hide();
      this.tempNotice = null;
    }
  }

  public getCommandsManager(): CommandsManager {
    return this.commandsManager;
  }

  init_evt(container: Document) {
    this.resetFormatBrushStates();

    const debouncedHandleTextSelection = debounce(() => {
      this.handleTextSelection();
    }, 100);

    this.registerDomEvent(container, "mousedown", (e: MouseEvent) => {
      if (!this.isView() || !this.commandsManager.getActiveEditor()) return;

      const mouseDownTime = Date.now();
      if (e.button === 1) {
        this.registerDomEvent(container, "mouseup", (e2: MouseEvent) => {
          const mouseUpTime = Date.now();
          if (mouseUpTime - mouseDownTime < 300 && e2.button === 1) {
            this.handleMiddleClickToolbar(e2);
          }
        });
      }

      this.resetFormatBrushIfActive(container, e);
    });

    this.registerDomEvent(container, "mouseup", (e) => {
      if (e.button !== 1) {
        debouncedHandleTextSelection();
      }
    });

    this.registerDomEvent(container, "keyup", this.handleKeyboardSelection);

    this.registerScrollAndBlurEvents(container);
  }

  private resetFormatBrushStates() {
    this.fontColorFormatBrushActive = false;
    this.bgFormatBrushActive = false;
    this.EN_Text_Format_Brush = false;
    this.formatBrushActive = false;
  }

  public getCachedToolbar(style: ToolbarStyleKey): HTMLElement | null {
    const cached = this.toolbarCache.get(style);
    if (cached && cached.isConnected) {
      return cached;
    }
    if (cached) {
      this.toolbarCache.delete(style);
    }

    return null;
  }

  public setCachedToolbar(style: ToolbarStyleKey, element: HTMLElement): void {
    this.toolbarCache.set(style, element);
  }

  public getCachedPopover(style: ToolbarStyleKey): HTMLElement | null {
    const cached = this.popoverCache.get(style);
    if (cached && cached.isConnected) {
      return cached;
    }
    if (cached) {
      this.popoverCache.delete(style);
    }
    return null;
  }

  public setCachedPopover(style: ToolbarStyleKey, element: HTMLElement): void {
    this.popoverCache.set(style, element);
  }

  public clearToolbarCache(style?: ToolbarStyleKey): void {
    if (style) {
      this.toolbarCache.delete(style);
      this.popoverCache.delete(style);
    } else {
      this.toolbarCache.clear();
      this.popoverCache.clear();
    }
  }

  // A toolbar style is active iff its explicit enable flag is on. Legacy
  // positionStyle-only configs are migrated into these flags in loadSettings(),
  // so positionStyle must not be consulted here (see handleEditingToolbar).
  private isTopToolbarActive(): boolean {
    return this.settings.enableTopToolbar;
  }

  private isFollowingToolbarActive(): boolean {
    return this.settings.enableFollowingToolbar;
  }

  private handleMiddleClickToolbar(_e: MouseEvent) {
    const cmEditor = this.commandsManager.getActiveEditor();
    if (this.isFollowingToolbarActive() && cmEditor?.hasFocus()) {
      this.showFollowingToolbar(cmEditor);
    }
  }

  private resetFormatBrushIfActive(container: Document, e: MouseEvent) {
    if (e.button === 2 && this.isFormatBrushActive()) {
      const preventMenu = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        container.removeEventListener("contextmenu", preventMenu, {
          capture: true,
        });
      };
      container.addEventListener("contextmenu", preventMenu, { capture: true });
      quietFormatBrushes(this);
    }
  }

  private isFormatBrushActive(): boolean {
    return (
      this.fontColorFormatBrushActive ||
      this.bgFormatBrushActive ||
      this.EN_Text_Format_Brush ||
      this.formatBrushActive
    );
  }

  private handleKeyboardSelection = (e: KeyboardEvent) => {
    const selectionKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "ShiftLeft",
      "ShiftRight",
    ];

    if (selectionKeys.includes(e.code) || e.shiftKey) {
      this.handleTextSelection();
    } else if (!e.shiftKey && this.isFollowingToolbarActive()) {
      this.hideToolbarIfNotSelected();
    }
  };

  private getToolbarHostDocument(editor?: Editor | null): Document {
    return (
      editor?.cm?.dom?.ownerDocument ||
      editor?.cm?.contentDOM?.ownerDocument ||
      this.app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
      activeWindow.document
    );
  }

  private registerScrollAndBlurEvents(container: Document) {
    const hideToolbar = this.throttle(() => {
      if (!this.isFollowingToolbarActive()) return;
      this.hideToolbarIfNotSelected(container);
    }, 200);

    this.registerDomEvent(container, "wheel", hideToolbar);
    this.registerDomEvent(container, "blur", () => {
      this.hideToolbarIfNotSelected(container);
    });
  }

  private hideToolbarIfNotSelected(hostDocument?: Document) {
    const followingToolbar = getExistingToolbar(
      this.app,
      this,
      "following",
      hostDocument ||
        this.getToolbarHostDocument(this.commandsManager.getActiveEditor()),
    );
    if (followingToolbar && this.isFollowingToolbarActive()) {
      followingToolbar.style.visibility = "hidden";
    }
  }

  private handleTextSelection() {
    if (!this.isView()) return;

    const cmEditor = this.commandsManager.getActiveEditor();
    if (!cmEditor?.hasFocus()) return;

    if (cmEditor.somethingSelected()) {
      this.handleSelectedText(cmEditor);
    } else {
      this.hideToolbarIfNotSelected(this.getToolbarHostDocument(cmEditor));
    }
  }

  private handleSelectedText(cmEditor: Editor) {
    if (this.fontColorFormatBrushActive) {
      setFontcolor(this.settings.cMenuFontColor, cmEditor);
    } else if (this.bgFormatBrushActive) {
      setBackgroundcolor(this.settings.cMenuBackgroundColor, cmEditor);
    } else if (this.EN_Text_Format_Brush) {
      setFormatEraser(this, cmEditor);
    } else if (this.formatBrushActive && this.lastCalloutType) {
      this.applyCalloutFormat(
        cmEditor,
        cmEditor.getSelection(),
        this.lastCalloutType,
      );
    } else if (this.formatBrushActive && this.lastExecutedCommand) {
      this.applyFormatBrush(cmEditor);
    } else if (this.isFollowingToolbarActive()) {
      this.showFollowingToolbar(cmEditor);
    }
  }

  private throttle(func: () => void, limit: number = 100): () => void {
    let inThrottle = false;
    return () => {
      if (!inThrottle) {
        func();
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  private showFollowingToolbar(editor: Editor) {
    if (!this.isFollowingToolbarActive()) return;

    const targetDocument = this.getToolbarHostDocument(editor);

    const followingToolbar = getExistingToolbar(
      this.app,
      this,
      "following",
      targetDocument,
    );

    if (followingToolbar) {
      followingToolbar.style.visibility = "visible";
      followingToolbar.classList.add("editingToolbarFlex");
      followingToolbar.classList.remove("editingToolbarGrid");

      createFollowingBar(
        this.app,
        this.toolbarIconSize,
        this,
        editor,
        true,
        targetDocument,
      );
    } else {
      createFollowingBar(
        this.app,
        this.toolbarIconSize,
        this,
        editor,
        true,
        targetDocument,
      );
    }
  }

  onPositionStyleChange(newStyle: string): void {
    // Temporarily ignore any "editing style" override while we update the live toolbar
    const previousEditStyle = this.appearanceEditStyle;
    this.appearanceEditStyle = null;

    this.positionStyle = newStyle;
    this.settings.positionStyle = newStyle;

    const activeStyle = this.resolveActiveStyle();
    this.toolbarIconSize = getAppearanceValue(
      this.settings,
      "toolbarIconSize",
      activeStyle,
    );

    // Refresh the global CSS variables from the *active* style's appearance
    const doc = activeDocument ?? document;
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty(
        "--editing-toolbar-background-color",
        getAppearanceValue(
          this.settings,
          "toolbarBackgroundColor",
          activeStyle,
        ),
      );
      doc.documentElement.style.setProperty(
        "--editing-toolbar-icon-color",
        getAppearanceValue(this.settings, "toolbarIconColor", activeStyle),
      );
      doc.documentElement.style.setProperty(
        "--toolbar-icon-size",
        `${getAppearanceValue(this.settings, "toolbarIconSize", activeStyle)}px`,
      );
    }

    dispatchEvent(new Event("editingToolbar-NewCommand"));

    // Restore whatever the settings UI was editing
    this.appearanceEditStyle = previousEditStyle;
  }
}
