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

  export interface Command {
    SubmenuCommands?: Command[];
    menuType?: "submenu" | "dropdown";
  }

  interface Workspace {
    floatingSplit?: { children: WorkspaceItem[] };
  }

  interface WorkspaceItem {
    containerEl: HTMLElement;
  }

  interface Editor {
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
