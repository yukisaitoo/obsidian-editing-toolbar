import "obsidian";

declare module "obsidian" {
  export interface App {
    foldManager: FoldManager;
    plugins: Plugins;
    commands: Commands;
    hotkeyManager: HotkeyManager;
    setting: SettingsManager;
    secretStorage: SecretStorage;
  }

  interface HotkeyManager {
    customKeys: Record<string, Hotkey[]>;
  }

  interface SecretStorage {
    getSecret(key: string): string | null;
    setSecret(key: string, value: string): void;
  }

  interface SettingsManager {
    activeTab: SettingTab | null;
    openTabById(id: string): SettingTab | null;
    openTab(tab: SettingTab): void;
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
    settingTabs: SettingTab[];
    pluginTabs: SettingTab[];
    addSettingTab(): void;
    removeSettingTab(): void;
    containerEl: HTMLDivElement;
  }

  interface Plugins {
    manifests: Record<string, PluginManifest>;
    plugins: Record<string, Plugin>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- undeclared Obsidian internal
    enabledPlugins: any;
    enablePlugin(pluginId: string): Promise<boolean>;
    disablePlugin(pluginId: string): Promise<void>;
    getPlugin(pluginId: string): Plugin | null;
  }

  interface Commands {
    commands: Record<string, Command>;
    addCommand(cmd: Command): void;
    removeCommand(cmd: string): void;
    executeCommandById(id: string): boolean;
    findCommand(id: string): Command | undefined;
    listCommands(): Command[];
  }

  interface MarkdownView {
    onMarkdownFold(): void;
  }

  export interface EditorCoords {
    top: number;
    left: number;
    bottom: number;
  }

  interface Workspace {
    floatingSplit: WorkspaceParentExt;
    on(
      name: "canvas:node-menu",
      callback: (menu: Menu, node: unknown) => unknown,
      ctx?: unknown,
    ): EventRef;
    on(
      name: "url-menu",
      callback: (menu: Menu, url: string, view: MarkdownView) => unknown,
      ctx?: unknown,
    ): EventRef;
  }

  interface Editor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CodeMirror editor handle, untyped by Obsidian
    cm: any;
    getScrollerElement: () => HTMLElement;
    containerEl: HTMLElement;
    coordsAtPos(pos: EditorPosition | number): EditorCoords;
    // CodeMirror 5 legacy; absent on the CM6 editor, hence optional.
    cursorCoords?(start: boolean, mode: string): EditorCoords;
    // Undocumented internal editing commands exposed by Obsidian's editor
    indentList(): void;
    unindentList(): void;
    toggleNumberList(): void;
    toggleBulletList(): void;
    toggleCheckList(state?: boolean): void;
    toggleMarkdownFormatting(format: string): void;
  }

  interface EditorSuggestManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Obsidian's own suggest generic is unconstrained here
    suggests: EditorSuggest<any>[];
  }

  interface Notice {
    noticeEl: HTMLElement;
  }
  interface FoldPosition {
    from: number;
    to: number;
  }

  interface FoldInfo {
    folds: FoldPosition[];
    lines: number;
  }

  export interface FoldManager {
    load(file: TFile): Promise<FoldInfo>;
    save(file: TFile, foldInfo: FoldInfo): Promise<void>;
  }

  export interface WorkspaceItemExt extends WorkspaceItem {
    parentSplit: WorkspaceParentExt;
    containerEl: HTMLElement;
    width: number;
  }

  export interface WorkspaceParentExt
    extends WorkspaceParent, WorkspaceItemExt, WorkspaceContainer {
    children: WorkspaceItemExt[];
    onChildResizeStart: (leaf: WorkspaceItemExt, event: MouseEvent) => void;
    oldChildResizeStart: (leaf: WorkspaceItemExt, event: MouseEvent) => void;
    direction: "horizontal" | "vertical";
  }

  interface View {
    editor: Editor | undefined;
    leaf: WorkspaceLeaf | undefined;
    getMode: () => string;
  }

  interface WorkspaceLeaf {
    view: View;
    width: number;
  }

  interface WorkspaceRibbon {
    show(): void;
    hide(): void;
  }
  interface Menu extends Component {
    bgEl: HTMLElement;
    currentSubmenu?: Menu;
    dom: HTMLElement;
    hideCallback: () => void;
    items: MenuItem[];
    openSubmenuSoon: () => void;
    parentMenu: Menu | null;
    scope: Scope;
    sections: string[];
    selected: number;
    submenuConfig: Record<string, { title: string; icon: string }>;
    unloading: boolean;
    useNativeMenu: boolean;

    addSections(items: string[]): this;
    closeSubmenu(): void;
    isInside(e: HTMLElement): boolean;
    onArrowDown(e: KeyboardEvent): boolean;
    onArrowLeft(e: KeyboardEvent): boolean;
    onArrowRight(e: KeyboardEvent): boolean;
    onArrowUp(e: KeyboardEvent): boolean;
    onEnter(e: KeyboardEvent): boolean;
    onMenuClick(e: MouseEvent): void;
    onMouseOver(e: MouseEvent): boolean;
    openSubmenu(item: MenuItem): void;
    select(index: number): void;
    setParentElement(el: HTMLElement): this;
    setSectionSubmenu(
      section: string,
      submenu: { title: string; icon: string },
    ): this;
    sort(): void;
    unselect(): void;
  }

  interface Menu extends Component {
    setNoIcon(): this;
    addItem(cb: (item: MenuItem) => unknown): this;
    addSeparator(): this;
    showAtMouseEvent(evt: MouseEvent): this;
    showAtPosition(position: Point, doc?: Document): this;
    hide(): this;
    onHide(callback: () => unknown): void;
  }

  interface MenuItem {
    callback?: () => void;
    checked: boolean | null;
    /** Only present when the item is checked */
    checkIconEl?: HTMLElement;
    disabled: boolean;
    dom: HTMLElement;
    iconEl: HTMLElement;
    menu: Menu;
    section: string;
    submenu: Menu | null;
    titleEl: string;

    handleEvent(e: MouseEvent | KeyboardEvent): void;
    removeIcon(): void;
    setActive(active: boolean): this;
    setSubmenu(): Menu;
    setWarning(warning: boolean): this;
  }
}
