import "obsidian";

declare module "obsidian" {
  export interface App {
    commands: Commands;
    hotkeyManager: HotkeyManager;
    setting: SettingsManager;
  }

  interface HotkeyManager {
    getHotkeys(id: string): Hotkey[] | undefined;
    getDefaultHotkeys(id: string): Hotkey[] | undefined;
  }

  interface SettingsManager {
    openTabById(id: string): SettingTab | null;
    open(): void;
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
    floatingSplit?: { children: WorkspaceWindow[] };
  }

  interface Editor {
    // Undocumented internal editing commands exposed by Obsidian's editor
    indentList(): void;
    unindentList(): void;
    toggleNumberList(): void;
    toggleBulletList(): void;
    toggleMarkdownFormatting(format: string): void;
  }

  interface Menu {
    dom: HTMLElement;
  }

  interface MenuItem {
    dom: HTMLElement;
    // Detaches iconEl outright, unlike setIcon(null) which only empties it.
    removeIcon(): this;
  }
}
