import {
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
import { format, strings, t } from "src/translations/helper";
import { findCommandLocation, toStoredCommand } from "src/util/commandStorage";

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
    const location = findCommandLocation(
      this.command,
      this.isSubmenuItem,
      currentCommands,
    );
    // Not in the list — removed while the picker was open: nothing to write to.
    if (location.index === -1) return;

    if (this.isSubmenuItem) {
      currentCommands[location.index].SubmenuCommands![location.subIndex].icon =
        item;
    } else {
      currentCommands[location.index].icon = item;
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

  // Read afresh rather than reusing the list from onChooseItem: the icon picker sits
  // open in between, so that reference can be stale by the time an icon is chosen.
  private async addCommand(command: Command): Promise<void> {
    const currentCommands = this.plugin.getCurrentCommands(
      this.currentEditingConfig,
    );
    currentCommands.push(toStoredCommand(command));
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }

  async onChooseItem(item: Command): Promise<void> {
    const currentCommands = this.plugin.getCurrentCommands(
      this.currentEditingConfig,
    );

    if (currentCommands.some((v) => v.id === item.id)) {
      new Notice(
        format(strings.commandAlreadyExists, { name: t(item.name) }),
        3000,
      );
      return;
    }

    if (!item.icon) {
      new ChooseFromIconList(
        this.plugin,
        item,
        false,
        (icon) => void this.addCommand({ ...item, icon }),
        this.currentEditingConfig,
      ).open();
      return;
    }

    await this.addCommand(item);
  }
}

export class ChangeCmdname extends Modal {
  plugin: EditingToolbarPlugin;
  item: Command;
  isSubmenuItem: boolean;
  currentEditingConfig: ToolbarStyleKey;
  constructor(
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
  private async commitName(value: string): Promise<void> {
    const currentCommands = this.plugin.getCurrentCommands(
      this.currentEditingConfig,
    );

    const location = findCommandLocation(
      this.item,
      this.isSubmenuItem,
      currentCommands,
    );

    // The rename is written to the entry in the list, never to `this.item` — for a
    // command just picked from the palette those are the same live object, and
    // mutating it would rename the palette entry too.
    if (!this.isSubmenuItem) {
      if (location.index === -1) {
        currentCommands.push(toStoredCommand({ ...this.item, name: value }));
      } else {
        currentCommands[location.index].name = value;
      }
    } else {
      const submenu = currentCommands[location.index]?.SubmenuCommands;
      if (location.subIndex === -1) {
        submenu?.push(toStoredCommand({ ...this.item, name: value }));
      } else if (submenu) {
        submenu[location.subIndex].name = value;
      }
    }

    await this.plugin.saveSettings();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("b", { text: strings.pleaseEnterNewName });

    const debouncedCommit = debounce(
      (value: string) => void this.commitName(value),
      100,
      true,
    );

    const textComponent = new TextComponent(contentEl);
    textComponent.inputEl.classList.add("InputPromptInputEl");
    textComponent
      .setPlaceholder("")
      .setValue(this.item.name ?? "")
      .onChange(debouncedCommit);

    textComponent.inputEl.addEventListener("keydown", async (ev) => {
      // isComposing guards IME users, whose confirm-Enter must not close the modal.
      if (ev.key !== "Enter" || ev.isComposing) return;
      ev.preventDefault();
      debouncedCommit.cancel();
      await this.commitName(textComponent.inputEl.value);
      this.close();
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.rebuildToolbars();
  }
}
