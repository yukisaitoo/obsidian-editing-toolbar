import {
  App,
  Command,
  debounce,
  Editor,
  ItemView,
  MarkdownView,
  Menu,
  Notice,
  Platform,
  Plugin,
  requireApiVersion,
  setIcon,
  ToggleComponent,
  View,
} from "obsidian";
import { CommandsManager } from "src/commands/commands";
import { StatusBar } from "src/components/StatusBar";
import addIcons from "src/icons/customIcons";
import { createFollowingbar, editingToolbarPopover, isExistoolbar, quiteFormatbrushes, resetToolbar, selfDestruct, setFormateraser } from "src/modals/editingToolbarModal";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import { InsertLinkModal } from "src/modals/insertLinkModal";
import { DEFAULT_SETTINGS, editingToolbarSettings } from "src/settings/settingsData";
import { strings } from 'src/translations/helper';
import { setBackgroundcolor, setFontcolor } from "src/util/util";
import { ViewUtils } from 'src/util/viewUtils';
import { EditingToolbarSettingTab } from '../settings/settingsTab';

let activeDocument: Document;

// ---- Per-style appearance support (patch v3, integrated) ----
import type { AppearanceByStyle, StyleAppearanceSettings, ToolbarStyleKey } from "src/settings/settingsData";

const STYLE_KEYS: ToolbarStyleKey[] = ["top", "following", "fixed", "mobile"];

const APPEARANCE_KEYS: Array<keyof StyleAppearanceSettings> = [
  "toolbarBackgroundColor",
  "toolbarIconColor",
  "toolbarIconSize",
  "aestheticStyle",
];

function ensureAppearanceStore(
  settings: editingToolbarSettings,
  migratingFromGlobal: boolean
): void {
  if (!settings.appearanceByStyle || typeof settings.appearanceByStyle !== "object") {
    settings.appearanceByStyle = {};
  }

  const store = settings.appearanceByStyle as AppearanceByStyle;

  // Ensure bucket objects exist for each style
  STYLE_KEYS.forEach((style) => {
    if (!store[style] || typeof store[style] !== "object") {
      store[style] = {};
    }
  });

  // On first migration: seed all style buckets from the legacy/global fields
  if (migratingFromGlobal) {
    APPEARANCE_KEYS.forEach((key) => {
      const legacyValue = (settings as any)[key];
      if (legacyValue === undefined) return;

      STYLE_KEYS.forEach((style) => {
        const bucket = store[style]!;
        if (!(key in bucket)) {
          (bucket as any)[key] = legacyValue;
        }
      });
    });
  }
}
// ---- end per-style appearance helpers ----
export interface AdmonitionDefinition  {
  type: string;
  title?: string;
  icon: string;
  color: string;
  command: boolean;
  injectColor?: boolean;
  noTitle: boolean;
  copy?: boolean;
}

interface AdmonitionPluginPublic {
  admonitions: Map<string, AdmonitionDefinition>;
  postprocessors: Map<string, any>;
}
interface EditorContextMenuAction {
  title: string;
  commandId?: string;
  callback?: () => void;
  disabled?: boolean;
}

const ADMONITION_PLUGIN_ID = "obsidian-admonition";

export default class EditingToolbarPlugin extends Plugin {
  app: App;
  settings: editingToolbarSettings;
  statusBarIcon: HTMLElement;
  statusBar: StatusBar;
  public toolbarIconSize: number;
  public positionStyle: string;
  
  // NEW: which style's appearance is being edited in the settings UI
  public appearanceEditStyle: ToolbarStyleKey | null = null;
  
  commandsManager: CommandsManager;
  public admonitionDefinitions: Record<string, AdmonitionDefinition> | null =
    null;

  isMoreButton: boolean;
  bgFormatBrushActive: boolean;
  fontColorFormatBrushActive: boolean;
  EN_Text_Format_Brush: boolean;
  tempNotice: Notice;
  leafWidth: number;

  lastExecutedCommand: string | null = null;
  formatBrushActive: boolean = false;
  formatBrushNotice: Notice | null = null;
  lastCalloutType: string | null = null;
  lastExecutedCommandName: string | null = null;

  settingTab: EditingToolbarSettingTab;

  private toolbarCache: Map<ToolbarStyleKey, HTMLElement> = new Map();
  private popoverCache: Map<ToolbarStyleKey, HTMLElement> = new Map();



    // Initialise per-style appearance (patch v3 logic, but limited to this plugin)
  private initPerStyleAppearance(): void {
    const settings = this.settings;
    if (!settings) return;

    const migratingFromGlobal = !settings.appearanceByStyle;
    ensureAppearanceStore(settings, migratingFromGlobal);

    const store = settings.appearanceByStyle as AppearanceByStyle;
    
    const getCurrentStyle = (): ToolbarStyleKey => {
      const raw = (
        this.appearanceEditStyle ||       // 1. style we are editing in settings
        this.positionStyle ||             // 2. live toolbar style
        settings.positionStyle ||         // 3. stored fallback
        "top"
      ) as string;

      return STYLE_KEYS.includes(raw as ToolbarStyleKey)
        ? (raw as ToolbarStyleKey)
        : "top";
    };

    APPEARANCE_KEYS.forEach((key) => {
      // Only patch properties that actually exist on settings
      if (!(key in settings)) return;

      const initialGlobal = (settings as any)[key];

      Object.defineProperty(settings, key, {
        configurable: true,
        enumerable: true,
        get() {
          const style = getCurrentStyle();
          const bucket = store[style];
          if (bucket && Object.prototype.hasOwnProperty.call(bucket, key)) {
            return (bucket as any)[key];
          }
          // Fallback to the original global value
          return initialGlobal;
        },
        set(value: any) {
          const style = getCurrentStyle();
          ensureAppearanceStore(settings, false);
          const bucket = (settings.appearanceByStyle as AppearanceByStyle)[style]!;
          (bucket as any)[key] = value;
        },
      });
    });
  }

  private getPluginCommandId(commandId: string): string {
    return `${this.manifest.id}:${commandId}`;
  }

  private executePluginCommand(commandId: string): void {
    this.app.commands.executeCommandById(this.getPluginCommandId(commandId));
  }

  private addEditorContextAction(menu: Menu, action: EditorContextMenuAction): void {
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
      if (requireApiVersion("0.15.0")) item.setSection("info");

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
        { title: strings.shrinkExtraSpaces, commandId: "remove-whitespace-compress" },
        { title: strings.removeAllWhitespace, commandId: "remove-whitespace-all" },
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
      actions.push({ title: strings.renumberList, commandId: "renumber-ordered-list" });
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
    _view: MarkdownView,
  ): void => {
    this.addEditorContextSubmenu(menu, strings.textTools, "whole-word", this.buildTextContextActions(editor));
  };

  async onload(): Promise<void> {
    const currentVersion = this.manifest.version;
    console.log("editingToolbar v" + currentVersion + " loaded");
  
    requireApiVersion("0.15.0") ? activeDocument = activeWindow.document : activeDocument = window.document;
  
    await this.loadSettings();

    // IMPORTANT: wire up per-style getters/setters before we start using appearance fields
    this.initPerStyleAppearance();
  
    this.settingTab = new EditingToolbarSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    //addIcons();
    // addRemixIcconsole.log();ons(appIcons);
    this.commandsManager = new CommandsManager(this);
    this.commandsManager.registerCommands();
    const editor = this.commandsManager.getActiveEditor();
    this.app.workspace.onLayoutReady(() => {
      this.statusBar = new StatusBar(this);
      this.statusBar.init();
      
      // Ensure toolbar respects initial visibility state after Settings Search completes
      // Use a small delay to ensure Settings Search has finished scanning settings tabs
      setTimeout(() => {
        if (!this.settings.cMenuVisibility) {
          this.handleeditingToolbar();
        }
      }, 100);
    });
    this.init_evt(activeDocument, editor);
    if (requireApiVersion("0.15.0")) {
      this.registerEvent(this.app.workspace.on("window-open", (leaf) => {
        this.init_evt(leaf.doc, editor);
        setTimeout(() => {
          if (!this.settings.cMenuVisibility) {
            return;
          }

          if (this.isFollowingToolbarActive()) {
            editingToolbarPopover(this.app, this, "following", leaf.doc);
          }

          const fixedEnabled =
            this.settings.enableFixedToolbar ||
            (!this.settings.enableTopToolbar &&
              !this.settings.enableFollowingToolbar &&
              this.positionStyle === "fixed");

          if (fixedEnabled) {
            editingToolbarPopover(this.app, this, "fixed", leaf.doc);
          }
        }, 50);
      }));
    }

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleeditingToolbar)
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleeditingToolbar_layout)
    );
    this.registerEvent(
      this.app.workspace.on("resize", this.handleeditingToolbar_resize)
    );
    if (this.settings.cMenuVisibility == true) {
      setTimeout(() => {
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100);
    }
    this.registerDomEvent(
      activeDocument,
      'contextmenu',
      e => {
        if (this.settings.isLoadOnMobile && Platform.isMobile && this.isFollowingToolbarActive()) {
          const { target } = e;
          if (target instanceof HTMLElement) {
            const iseditor = target.closest('.cm-editor') !== null;
            if (iseditor) {
              e.preventDefault();
            }
          }
        }
      },
    );

this.app.workspace.onLayoutReady(async () => {
  await this.tryGetAdmonitionTypes();
});

    // this.registerEvent(
    //   this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
    //     const selection = editor.getSelection();
    //     if (selection) {
    //       if (/(!)?\[.*(?:\|(?:\d+x\d+|\d+))?\]\([a-zA-Z]+:\/\/[^\s)]+(?:\s+["'][^"']*["'])?\)/.test(selection.trim())) {
    //         menu.addItem((item) =>
    //           item
    //             .setTitle('Edit Link')
    //             .setIcon('link')
    //             .onClick(() => new InsertLinkModal(this).open())
    //         );
    //       }
    //     }
    //     const cursor = editor.getCursor();
    //     const lineText = editor.getLine(cursor.line);
    //     const cursorPos = cursor.ch;
    //     const combinedRegex = /(!)?\[([^\]]+)(?:\|(\d+x\d+|\d+))?\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/g;
    //     let match;
    //     while ((match = combinedRegex.exec(lineText)) !== null) {
    //       const linkStart = match.index;
    //       const linkEnd = match.index + match[0].length;
    //       if (cursorPos >= linkStart && cursorPos <= linkEnd) {
    //         menu.addItem((item) =>
    //           item
    //             .setTitle('Edit Link(Modal)')
    //             .setIcon('link')
    //             .onClick(() => new InsertLinkModal(this).open())
    //         );
    //       }
    //     }
    //   })
    // );
    this.registerEvent(
      this.app.workspace.on("editor-menu", this.handleEditorContextMenu)
    );
    this.registerEvent(
      // @ts-ignore
      this.app.workspace.on('url-menu', (menu: Menu, url: string, view: MarkdownView) => {
        menu.addItem((item) =>
          item
            .setTitle('Edit Link(Modal)')
            .setSection("info")
            .setIcon('link')
            .onClick(() => {

              new InsertLinkModal(this).open()
            })
        );
      })
    );
    addIcons();
    this.toolbarIconSize = this.settings.toolbarIconSize;
    this.positionStyle = this.settings.positionStyle;
    activeDocument.documentElement.style.setProperty(
      "--editing-toolbar-background-color",
      this.settings.toolbarBackgroundColor
    );
    activeDocument.documentElement.style.setProperty(
      "--editing-toolbar-icon-color",
      this.settings.toolbarIconColor
    );
    activeDocument.documentElement.style.setProperty(
      "--toolbar-icon-size",
      `${this.settings.toolbarIconSize}px`
    );
  }

  async tryGetAdmonitionTypes(retries = 0): Promise<void> {
    // @ts-ignore
    const admonitionPluginInstance = this.app.plugins?.getPlugin(ADMONITION_PLUGIN_ID);
    if (admonitionPluginInstance) {
       
        this.processAdmonitionTypes(admonitionPluginInstance);
      }  
    }

  processAdmonitionTypes(pluginInstance: any) {
    const admonitionPlugin = pluginInstance as {
      admonitions?: Record<string, AdmonitionDefinition>;
    };

    let registeredTypes: string[] | null = null;
    const typesSource: string | null = null;

    if (
      admonitionPlugin.admonitions &&
      typeof admonitionPlugin.admonitions === "object" &&
      !Array.isArray(admonitionPlugin.admonitions) &&
      Object.keys(admonitionPlugin.admonitions).length > 0
    ) {
      registeredTypes = Object.keys(admonitionPlugin.admonitions);
      this.admonitionDefinitions = admonitionPlugin.admonitions;
   
  }  else {
    console.warn('Could not read types from admonitionPlugin.admonitions (as object).');
    this.admonitionDefinitions = null; 
  }
}

  isLoadMobile() {
    const screenWidth = window.innerWidth > 0 ? window.innerWidth : screen.width;
    const isLoadOnMobile = this.settings?.isLoadOnMobile
      ? this.settings.isLoadOnMobile
      : false;
    if (Platform.isMobileApp && !isLoadOnMobile) {
      if (screenWidth <= 768) {
        console.log("editing toolbar disable loading on mobile");
        return false;
      }
    }
    return true;
  }

  onunload(): void {
    this.app.workspace.off("active-leaf-change", this.handleeditingToolbar);
    this.app.workspace.off("layout-change", this.handleeditingToolbar_layout);
    this.app.workspace.off("resize", this.handleeditingToolbar_resize);

    if (this.formatBrushNotice) {
      this.formatBrushNotice.hide();
      this.formatBrushNotice = null;
    }

    this.quiteAllFormatBrushes();

    selfDestruct(this);

    console.log("editingToolbar unloaded");
  }

  isView() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    return ViewUtils.isAllowedViewType(view);
  }

  handleeditingToolbar = () => {
    // Keep format-brush cursor state in sync with the toolbar state
    if (!this.formatBrushActive) {
      activeDocument.body.classList.remove("format-brush-cursor");
    }

    // If the toolbar is globally disabled in settings, just hide any existing toolbars and return.
    if (!this.settings.cMenuVisibility) {
      (["top", "following", "fixed"] as const).forEach((style) => {
        const el = isExistoolbar(this.app, this, style);
        if (el) el.style.display = "none";
      });
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(ItemView);

    // If the view type is not allowed at all, hide everything and stop.
    if (!ViewUtils.isAllowedViewType(view)) {
      (["top", "following", "fixed"] as const).forEach((style) => {
        const el = isExistoolbar(this.app, this, style);
        if (el) el.style.visibility = "hidden";
      });
      return;
    }

    const viewType = view?.getViewType();
    const isMarkdownView = viewType === "markdown";
    const inSourceMode = isMarkdownView && ViewUtils.isSourceMode(view);

    // For markdown views in reading mode, hide all toolbars.
    // For non-markdown views (like Canvas), we'll handle them below.
    if (isMarkdownView && !inSourceMode) {
      (["top", "following", "fixed"] as const).forEach((style) => {
        const el = isExistoolbar(this.app, this, style);
        if (el) el.style.visibility = "hidden";
      });
      return;
    }

    // ---- Determine which styles SHOULD be active ----

    // If you already added `isTopToolbarActive` earlier, this will call it.
    // If not, it falls back to a legacy-compatible check.
    const topEnabled =
      typeof (this as any).isTopToolbarActive === "function"
        ? (this as any).isTopToolbarActive()
        : this.settings.enableTopToolbar ||
          (!this.settings.enableFollowingToolbar &&
            !this.settings.enableFixedToolbar &&
            this.positionStyle === "top");

    const followingEnabled =
      typeof (this as any).isFollowingToolbarActive === "function"
        ? this.isFollowingToolbarActive()
        : this.settings.enableFollowingToolbar ||
          (!this.settings.enableTopToolbar &&
            !this.settings.enableFixedToolbar &&
            this.positionStyle === "following");

    const fixedEnabled =
      this.settings.enableFixedToolbar ||
      (!this.settings.enableTopToolbar &&
        !this.settings.enableFollowingToolbar &&
        this.positionStyle === "fixed");

    const styles: { key: "top" | "following" | "fixed"; enabled: boolean }[] = [
      { key: "top",       enabled: topEnabled },
      { key: "following", enabled: followingEnabled },
      { key: "fixed",     enabled: fixedEnabled },
    ];

    // ---- Per-style handling: create / show / hide independently ----
    for (const { key, enabled } of styles) {
      const existing = isExistoolbar(this.app, this, key);

      if (!enabled) {
        // Style disabled in settings → hide any existing toolbar of that style.
        if (existing) existing.style.visibility = "hidden";
        continue;
      }

      // Style is enabled:
      // If we don't have this toolbar yet, create it for this style.
      if (!existing) {
        editingToolbarPopover(this.app, this, key);
      }

      const toolbar = isExistoolbar(this.app, this, key);
      if (!toolbar) continue;

      if (key === "following") {
        // Following toolbar only works in markdown source mode
        // For other views (Canvas, etc.), hide it
        if (!inSourceMode) {
          toolbar.style.visibility = "hidden";
        } else {
          // In markdown source mode, stays hidden until text is selected.
          // Your `showFollowingToolbar` / selection handlers will reveal it.
          toolbar.style.visibility = "hidden";
        }
      } else {
        // Top / Fixed: visible in markdown source mode and other allowed views
        toolbar.style.visibility = "visible";
      }
    }
  };

  handleeditingToolbar_layout = () => {
    // When the workspace layout changes (splits, panes, etc.),
    // just recompute toolbar creation/visibility using the main handler.
    this.handleeditingToolbar();
  };
  
  handleeditingToolbar_resize = () => {
    // Only care about resizing when the toolbar is visible and top-style is active
    if (!this.settings.cMenuVisibility || !this.isTopToolbarActive()) {
      return false;
    }

    const view = this.app.workspace.getActiveViewOfType(ItemView);
    if (!ViewUtils.isSourceMode(view)) {
      return false;
    }

    const leafwidth = this.app.workspace.activeLeaf.view.leaf.width ?? 0;
    if (leafwidth <= 0 || this.leafWidth === leafwidth) {
      return false;
    }

    this.leafWidth = leafwidth;

    if (this.settings.cMenuWidth && leafwidth) {
      const diff = leafwidth - this.settings.cMenuWidth;

      // Same guard as before: don't rebuild if the configured width still fits
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

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    const isLegacyConfig =
      !this.settings.enableTopToolbar &&
      !this.settings.enableFollowingToolbar &&
      !this.settings.enableFixedToolbar;

    if (isLegacyConfig && this.settings.positionStyle) {
      switch (this.settings.positionStyle) {
        case "top":
          this.settings.enableTopToolbar = true;
          break;
        case "following":
          this.settings.enableFollowingToolbar = true;
          break;
        case "fixed":
          this.settings.enableFixedToolbar = true;
          break;
      }

      await this.saveSettings();
    }
  }

  getCurrentCommands(style?: string): any[] {
    if (!this.settings.enableMultipleConfig) {
      return this.settings.menuCommands;
    }
    const currentstyle = style || this.positionStyle;
    if (this.settings.isLoadOnMobile && Platform.isMobileApp) {
      return this.settings.mobileCommands;
    }

    switch (currentstyle) {
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

updateCurrentCommands(commands: any[], style?: string): void {
  if (!this.settings.enableMultipleConfig) {
    this.settings.menuCommands = commands;
    return;
  }

  let targetStyle = style;

  if (!targetStyle) {
    if (this.settings.isLoadOnMobile && Platform.isMobileApp) {
      targetStyle = 'mobile';
    } else {
      targetStyle = this.positionStyle;
    }
  }

  switch (targetStyle) {
    case 'following':
      this.settings.followingCommands = commands;
      break;
    case 'top':
      this.settings.topCommands = commands;
      break;
    case 'fixed':
      this.settings.fixedCommands = commands;
      break;
    case 'mobile':
      this.settings.mobileCommands = commands;
      break;
    default:
      this.settings.menuCommands = commands;
  }
}

  async saveSettings() {
    await this.saveData(this.settings);
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

  // Ordered list of "wrap" formats to match against a whole selection.
  // First match wins, mirroring the original if/else chain.
  private static readonly SELECTION_WRAP_FORMATS: Array<{
    re: RegExp;
    command: string;
    name: string;
  }> = [
    { re: /^\*\*.*\*\*$/, command: "editor:toggle-bold", name: "Bold" },
    { re: /^\*.*\*$/, command: "editor:toggle-italics", name: "Italic" },
    { re: /^_.*_$/, command: "editor:toggle-italics", name: "Italic" },
    { re: /^~~.*~~$/, command: "editor:toggle-strikethrough", name: "Strikethrough" },
    { re: /^==.*==$/, command: "editor:toggle-highlight", name: "Highlight" },
    { re: /^`.*`$/, command: "editor:toggle-code", name: "Code" },
    { re: /^<font color=".*">.*<\/font>$/, command: "editing-toolbar:change-font-color", name: "Font Color" },
    { re: /^<mark style="background:.*">.*<\/mark>$/, command: "editing-toolbar:change-background-color", name: "Background Color" },
    { re: /^<u>([^<]+)<\/u>$/, command: "editor:toggle-underline", name: "Underline" },
    { re: /^<center>([^<]+)<\/center>$/, command: "editing-toolbar:center", name: "Center" },
    { re: /^<p align="left">(.*?)<\/p>$/, command: "editing-toolbar:left", name: "Left Align" },
    { re: /^<p align="right">(.*?)<\/p>$/, command: "editing-toolbar:right", name: "Right Align" },
    { re: /^<p align="justify">(.*?)<\/p>$/, command: "editing-toolbar:justify", name: "Justify" },
    { re: /^<sup>(.*?)<\/sup>$/, command: "editing-toolbar:superscript", name: "Superscript" },
    { re: /^<sub>(.*?)<\/sub>$/, command: "editing-toolbar:subscript", name: "Subscript" },
  ];

  // Inline formats scanned around the cursor when nothing is selected.
  // Order doesn't matter here; the nearest match to the cursor is chosen.
  private static readonly CURSOR_INLINE_FORMATS: Array<{
    re: RegExp;
    command: string;
    name: string;
  }> = [
    { re: /<u>([^<]+)<\/u>/g, command: "editing-toolbar:toggle-underline", name: "Underline" },
    { re: /<center>([^<]+)<\/center>/g, command: "editing-toolbar:center", name: "Center" },
    { re: /<p align="left">([^<]+)<\/p>/g, command: "editing-toolbar:left", name: "Left Align" },
    { re: /<p align="right">([^<]+)<\/p>/g, command: "editing-toolbar:right", name: "Right Align" },
    { re: /<p align="justify">([^<]+)<\/p>/g, command: "editing-toolbar:justify", name: "Justify" },
    { re: /<sup>([^<]+)<\/sup>/g, command: "editing-toolbar:superscript", name: "Superscript" },
    { re: /<sub>([^<]+)<\/sub>/g, command: "editing-toolbar:subscript", name: "Subscript" },
    { re: /\*\*([^*]+)\*\*/g, command: "editor:toggle-bold", name: "Bold" },
    { re: /~~([^~]+)~~/g, command: "editor:toggle-strikethrough", name: "Strikethrough" },
    { re: /==([^=]+)==/g, command: "editor:toggle-highlight", name: "Highlight" },
    { re: /`([^`]+)`/g, command: "editor:toggle-code", name: "Code" },
    { re: /<font color="([^"]+)">([^<]+)<\/font>/g, command: "editing-toolbar:change-font-color", name: "Font Color" },
    { re: /<span style="background:([^"]+)">([^<]+)<\/span>/g, command: "editing-toolbar:change-background-color", name: "Background Color" },
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
    selectedText: string
  ): { command: string; name: string; calloutType: string } | null {
    for (const { re, command, name } of EditingToolbarPlugin.SELECTION_WRAP_FORMATS) {
      if (re.test(selectedText)) {
        return { command, name, calloutType: "" };
      }
    }

    const calloutMatch = selectedText.match(
      /^> \[!(note|tip|warning|danger|info|success|question|quote)\]/i
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
    cursorPos: number
  ): { command: string; name: string } | null {
    const foundFormats: Array<{ command: string; name: string; distance: number }> = [];

    for (const { re, command, name } of EditingToolbarPlugin.CURSOR_INLINE_FORMATS) {
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
      activeDocument.body.classList.add('format-brush-cursor');
      this.fontColorFormatBrushActive = false;
      this.bgFormatBrushActive = false;
      this.EN_Text_Format_Brush = false;
      this.lastCalloutType = calloutType;
      if (this.formatBrushNotice) this.formatBrushNotice.hide();
      this.formatBrushNotice = new Notice(
        strings.formatBrushSelectTextApply +
          this.lastExecutedCommandName +
          strings.format,
        0
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
    const processedLines = lines.map((line, index) =>
      line.replace(/^\s*>\s*/, "")
    );

    const newText = `> [!${calloutType}]\n> ${processedLines.join("\n> ")}`;

    editor.replaceSelection(newText);
  }
  applyFormatBrush(editor: Editor): void {
    if (!this.lastExecutedCommand || !this.formatBrushActive) return;
    const command = this.app.commands.commands[this.lastExecutedCommand];
    if (command && command.callback) {
      command.callback();
    }
    if (command && command.editorCallback) {
      command.editorCallback(
        editor,
        this.app.workspace.getActiveViewOfType(MarkdownView)
      );
    }
  }

  quiteAllFormatBrushes(): void {
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

  public reloadCustomCommands(): void {
    this.commandsManager.reloadCustomCommands();
  }

  init_evt(container: Document, editor: Editor) {
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

    if (Platform.isMobileApp) {
      this.registerDomEvent(container, "selectionchange", () => {
        debouncedHandleTextSelection();
      });
    } else {
      this.registerDomEvent(container, "mouseup", (e) => {
        if (e.button !== 1) {
          debouncedHandleTextSelection();
        }
      });
    }

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





  // Top toolbar is considered active if:
  // - explicit multi-toolbar toggle is on, or
  // - no explicit toggles are used and positionStyle is "top" (legacy behaviour)
  private isTopToolbarActive(): boolean {
    if (this.settings.enableTopToolbar) {
      return true;
    }
  
    // Backwards compatibility fallback:
    // if neither following nor fixed have been explicitly enabled,
    // and the old global positionStyle is "top", behave like old single-mode.
    if (
      !this.settings.enableFollowingToolbar &&
      !this.settings.enableFixedToolbar &&
      this.positionStyle === "top"
    ) {
      return true;
    }
  
    return false;
  }

  private isFollowingToolbarActive(): boolean {
    // New multi-toolbar setting: explicitly enable the following toolbar
    if (this.settings.enableFollowingToolbar) {
      return true;
    }

    // Backwards compatibility:
    // if neither top nor fixed have been explicitly enabled, and the
    // global positionStyle is "following", behave as the old single-mode
    if (
      !this.settings.enableTopToolbar &&
      !this.settings.enableFixedToolbar &&
      this.positionStyle === "following"
    ) {
      return true;
    }

    return false;
  }

  private handleMiddleClickToolbar(e: MouseEvent) {
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
      quiteFormatbrushes(this);
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

    const cmEditor = this.commandsManager.getActiveEditor();

    if (selectionKeys.includes(e.code) || e.shiftKey) {
      this.handleTextSelection();
    } else if (!e.shiftKey && this.isFollowingToolbarActive()) {
      this.hideToolbarIfNotSelected();
    }
  };

  private getToolbarHostDocument(editor?: Editor): Document {
    return (
      (editor as any)?.cm?.dom?.ownerDocument ||
      (editor as any)?.cm?.contentDOM?.ownerDocument ||
      this.app.workspace.activeLeaf?.view?.containerEl?.ownerDocument ||
      (requireApiVersion("0.15.0") ? activeWindow.document : window.document)
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
    const followingToolbar = isExistoolbar(
      this.app,
      this,
      "following",
      hostDocument || this.getToolbarHostDocument(this.commandsManager.getActiveEditor())
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
      setFormateraser(this, cmEditor);
    } else if (this.formatBrushActive && this.lastCalloutType) {
      this.applyCalloutFormat(
        cmEditor,
        cmEditor.getSelection(),
        this.lastCalloutType
      );
    } else if (this.formatBrushActive && this.lastExecutedCommand) {
      this.applyFormatBrush(cmEditor);
    }
    else if (this.isFollowingToolbarActive()) {
      this.showFollowingToolbar(cmEditor);
    }
  }

  private throttle(func: Function, limit: number = 100) {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  private showFollowingToolbar(editor: Editor) {
    if (!this.isFollowingToolbarActive()) return;

    const targetDocument = this.getToolbarHostDocument(editor);

    const followingToolbar = isExistoolbar(this.app, this, "following", targetDocument);

    if (followingToolbar) {
      followingToolbar.style.visibility = "visible";
      followingToolbar.classList.add("editingToolbarFlex");
      followingToolbar.classList.remove("editingToolbarGrid");

      createFollowingbar(this.app, this.toolbarIconSize, this, editor, true, targetDocument);
    } else {
      createFollowingbar(this.app, this.toolbarIconSize, this, editor, true, targetDocument);
    }
  }

  onPositionStyleChange(newStyle: string): void {
    // Temporarily ignore any "editing style" override while we update the live toolbar
    const previousEditStyle = this.appearanceEditStyle;
    this.appearanceEditStyle = null;
  
    // Track the new style both in-memory and in settings
    this.positionStyle = newStyle;
    this.settings.positionStyle = newStyle;
  
    // If multi-config is enabled, ensure the command arrays for this style exist
    if (this.settings.enableMultipleConfig) {
      switch (newStyle) {
        case "following":
          if (!this.settings.followingCommands || this.settings.followingCommands.length === 0) {
            this.settings.followingCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(strings.followingStyleCommandsSuccessfullyInitialize);
          }
          break;
        case "top":
          if (!this.settings.topCommands || this.settings.topCommands.length === 0) {
            this.settings.topCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(strings.topStyleCommandsSuccessfullyInitialized);
          }
          break;
        case "fixed":
          if (!this.settings.fixedCommands || this.settings.fixedCommands.length === 0) {
            this.settings.fixedCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(strings.fixedStyleCommandsSuccessfullyInitialized);
          }
          break;
        case "mobile":
          if (!this.settings.mobileCommands || this.settings.mobileCommands.length === 0) {
            this.settings.mobileCommands = [...this.settings.menuCommands];
            this.saveSettings();
            new Notice(strings.mobileStyleCommandsSuccessfullyInitialized);
          }
          break;
      }
    }
  
    // Keep the in-memory size in sync with the active style
    this.toolbarIconSize = this.settings.toolbarIconSize;
  
    // Refresh the global CSS variables from the *active* style's appearance
    const doc = activeDocument ?? document;
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty(
        "--editing-toolbar-background-color",
        this.settings.toolbarBackgroundColor
      );
      doc.documentElement.style.setProperty(
        "--editing-toolbar-icon-color",
        this.settings.toolbarIconColor
      );
      doc.documentElement.style.setProperty(
        "--toolbar-icon-size",
        `${this.settings.toolbarIconSize}px`
      );
    }
  
    dispatchEvent(new Event("editingToolbar-NewCommand"));
  
    // Restore whatever the settings UI was editing
    this.appearanceEditStyle = previousEditStyle;
  }
}
