import "obsidian";

declare module "obsidian" {
  export interface App {
    foldManager: FoldManager;
    plugins: Plugins;
    commands: Commands;
    setting: SettingsManager;
    secretStorage: SecretStorage;
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
  }

  interface Commands {
    commands: Record<string, Command>;
    addCommand(cmd: Command): void;
    removeCommand(cmd: string): void;
    executeCommandById(id: string): boolean;
  }

  interface MarkdownView {
    onMarkdownFold(): void;
  }

  interface Workspace {
    on(
      name: "canvas:node-menu",
      callback: (menu: Menu, node: unknown) => unknown,
      ctx?: unknown,
    ): EventRef;
  }

  interface Editor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CodeMirror editor handle, untyped by Obsidian
    cm: any;
    getScrollerElement: () => HTMLElement;
    containerEl: HTMLElement;
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

  export class WorkspaceExt extends Workspace {
    floatingSplit: WorkspaceParentExt;
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
    /** @internal Left arrow moves selection out of the submenu */
    onArrowLeft(e: KeyboardEvent): boolean;
    /** @internal Right arrow moves selection into the submenu */
    onArrowRight(e: KeyboardEvent): boolean;
    onArrowUp(e: KeyboardEvent): boolean;
    /** @internal No-op when the selected item is a submenu */
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
    /** @deprecated Prefer setChecked directly */
    setActive(active: boolean): this;
    /** Creates the foldable "Insert"/"Format"/… submenus from the editor right-click menu */
    setSubmenu(): Menu;
    setWarning(warning: boolean): this;
  }
}
