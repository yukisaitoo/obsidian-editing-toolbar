import {
  App,
  Command,
  FuzzyMatch,
  FuzzySuggestModal,
  Modal,
  Notice,
  TextComponent,
  debounce,
  setIcon,
} from "obsidian";
import { getAppIcons } from "src/icons/appIcons";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { strings, t } from "src/translations/helper";
import { findCommandLocation } from "src/util/util";

type IconSelectCallback = (iconId: string) => void;

export class ChooseFromIconList extends FuzzySuggestModal<string> {
  plugin: EditingToolbarPlugin;
  command: Command;
  isSubmenuItem: boolean;
  currentEditingConfig: ToolbarStyleKey;
  customCallback: IconSelectCallback | null = null;
  constructor(
    plugin: EditingToolbarPlugin,
    command: Command,
    isSubmenuItem: boolean = false,
    callback?: IconSelectCallback,
    currentEditingConfig?: ToolbarStyleKey,
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.command = command;
    this.isSubmenuItem = isSubmenuItem;
    this.customCallback = callback || null;
    this.setPlaceholder(strings.chooseIcon2);
    this.currentEditingConfig = currentEditingConfig ?? plugin.liveStyle;
  }

  private capitalJoin(string: string): string {
    return string
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word) => word[0].toUpperCase() + word.substring(1))
      .join(" ");
  }

  getItems(): string[] {
    return getAppIcons();
  }

  getItemText(item: string): string {
    return this.capitalJoin(
      item
        .replace(/^lucide-/, "")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/-/gi, " "),
    );
  }

  renderSuggestion(icon: FuzzyMatch<string>, iconItem: HTMLElement): void {
    const span = createSpan({ cls: "editingToolbarIconPick" });
    iconItem.appendChild(span);
    setIcon(span, icon.item);
    super.renderSuggestion(icon, iconItem);
  }

  async onChooseItem(item: string): Promise<void> {
    if (this.customCallback) {
      this.customCallback(item);
      return;
    }

    const currentCommands = this.plugin.getCurrentCommands(
      this.currentEditingConfig,
    );
    if (this.command.icon) {
      const location = findCommandLocation(
        this.command,
        this.isSubmenuItem,
        currentCommands,
      );
      if (this.isSubmenuItem) {
        currentCommands[location.index].SubmenuCommands![
          location.subIndex
        ].icon = item;
      } else {
        currentCommands[location.index].icon = item;
      }
      this.plugin.updateCurrentCommands(
        currentCommands,
        this.currentEditingConfig,
      );
    } else {
      this.command.icon = item;
      currentCommands.push(this.command);
      this.plugin.updateCurrentCommands(
        currentCommands,
        this.currentEditingConfig,
      );
    }

    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }
}

export class CommandPicker extends FuzzySuggestModal<Command> {
  command!: Command;
  currentEditingConfig: ToolbarStyleKey;
  constructor(
    private plugin: EditingToolbarPlugin,
    currentEditingConfig?: ToolbarStyleKey,
  ) {
    super(plugin.app);
    this.setPlaceholder(strings.chooseCommand);
    this.currentEditingConfig = currentEditingConfig ?? plugin.liveStyle;
  }

  getItems(): Command[] {
    return this.app.commands.listCommands();
  }

  getItemText(item: Command): string {
    return t(item.name);
  }

  async onChooseItem(item: Command): Promise<void> {
    const currentCommands = this.plugin.getCurrentCommands(
      this.currentEditingConfig,
    );

    if (currentCommands.some((v) => v.id === item.id)) {
      new Notice(strings.command2 + t(item.name) + strings.alreadyExists, 3000);
      return;
    }

    // A command with no icon needs one picked before it can go on the toolbar.
    if (!item.icon) {
      new ChooseFromIconList(
        this.plugin,
        item,
        false,
        undefined,
        this.currentEditingConfig,
      ).open();
      return;
    }

    currentCommands.push(item);
    this.plugin.updateCurrentCommands(
      currentCommands,
      this.currentEditingConfig,
    );
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }
}

export class ChangeCmdname extends Modal {
  plugin: EditingToolbarPlugin;
  item: Command;
  isSubmenuItem: boolean;
  currentEditingConfig: ToolbarStyleKey;
  submitEnterCallback!: (this: HTMLInputElement, ev: KeyboardEvent) => unknown;
  constructor(
    app: App,
    plugin: EditingToolbarPlugin,
    item: Command,
    isSubmenuItem: boolean,
    currentEditingConfig?: ToolbarStyleKey,
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.isSubmenuItem = isSubmenuItem;
    this.currentEditingConfig = currentEditingConfig ?? plugin.liveStyle;
    this.containerEl.addClass("editingToolbar-Modal");
    this.containerEl.addClass("changename");
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("b", { text: strings.pleaseEnterNewName });

    const textComponent = new TextComponent(contentEl);
    textComponent.inputEl.classList.add("InputPromptInputEl");
    textComponent
      .setPlaceholder("")
      .setValue(this.item.name ?? "")
      .onChange(
        debounce(
          async (value) => {
            const currentCommands = this.plugin.getCurrentCommands(
              this.currentEditingConfig,
            );

            const location = findCommandLocation(
              this.item,
              this.isSubmenuItem,
              currentCommands,
            );
            this.item.name = value;

            if (!this.isSubmenuItem) {
              if (location.index === -1) {
                currentCommands.push(this.item);
              } else {
                currentCommands[location.index].name = value;
              }
            } else {
              const submenu = currentCommands[location.index]?.SubmenuCommands;
              if (location.subIndex === -1) {
                submenu?.push(this.item);
              } else if (submenu) {
                submenu[location.subIndex].name = value;
              }
            }

            this.plugin.updateCurrentCommands(
              currentCommands,
              this.currentEditingConfig,
            );
            await this.plugin.saveSettings();
          },
          100,
          true,
        ),
      )
      .inputEl.addEventListener("keydown", this.submitEnterCallback);
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.rebuildToolbars();
  }
}
