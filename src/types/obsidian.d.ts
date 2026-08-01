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
    open(): void;
  }

  interface Plugins {
    getPlugin(pluginId: string): Plugin | null;
  }

  interface Plugin {
    // Injects styles.css into the document head. Obsidian calls it itself, after
    // onload() has resolved.
    loadCSS(): Promise<void>;
  }

  interface Commands {
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
    floatingSplit?: { children: WorkspaceItem[] };
  }

  interface WorkspaceItem {
    containerEl: HTMLElement;
  }

  interface Editor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CodeMirror editor handle, untyped by Obsidian
    cm: any;
    containerEl: HTMLElement;
    // null when `pos` falls outside CodeMirror's rendered viewport.
    coordsAtPos(pos: EditorPosition): EditorCoords | null;
    // Undocumented internal editing commands exposed by Obsidian's editor
    indentList(): void;
    unindentList(): void;
    toggleNumberList(): void;
    toggleBulletList(): void;
    toggleCheckList(state?: boolean): void;
    toggleMarkdownFormatting(format: string): void;
  }

  interface View {
    editor: Editor | undefined;
    getMode: () => string;
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
