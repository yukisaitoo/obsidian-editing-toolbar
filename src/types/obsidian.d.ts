import "obsidian";

declare module "obsidian" {
  export interface App {
    plugins: Plugins;
    commands: Commands;
    hotkeyManager: HotkeyManager;
    setting: SettingsManager;
  }

  interface HotkeyManager {
    customKeys: Record<string, Hotkey[]>;
  }

  interface SettingsManager {
    activeTab: SettingTab | null;
    openTabById(id: string): SettingTab | null;
    openTab(tab: SettingTab): void;
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
    containerEl: HTMLDivElement;
  }

  interface Plugins {
    plugins: Record<string, Plugin>;
    getPlugin(pluginId: string): Plugin | null;
  }

  interface Plugin {
    // Injects styles.css into the document head. Obsidian calls it itself, after
    // onload() has resolved.
    loadCSS(): Promise<void>;
  }

  interface Commands {
    commands: Record<string, Command>;
    addCommand(cmd: Command): void;
    removeCommand(cmd: string): void;
    executeCommandById(id: string): boolean;
    findCommand(id: string): Command | undefined;
    listCommands(): Command[];
  }

  export interface EditorCoords {
    top: number;
    left: number;
    bottom: number;
  }

  interface Workspace {
    floatingSplit: WorkspaceParentExt;
    on(
      name: "url-menu",
      callback: (menu: Menu, url: string, view: MarkdownView) => unknown,
      ctx?: unknown,
    ): EventRef;
  }

  interface Editor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CodeMirror editor handle, untyped by Obsidian
    cm: any;
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

  export interface WorkspaceItemExt extends WorkspaceItem {
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

  interface Menu {
    dom: HTMLElement;
  }

  interface MenuItem {
    dom: HTMLElement;
    iconEl: HTMLElement;
    setSubmenu(): Menu;
  }
}
