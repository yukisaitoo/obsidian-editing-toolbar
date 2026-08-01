import {
  ButtonComponent,
  Command,
  FuzzyMatch,
  FuzzySuggestModal,
  Modal,
  Notice,
  TextComponent,
  setIcon,
} from "obsidian";
import { getAppIcons } from "src/icons/appIcons";
import { focusAfterOpen } from "src/modals/modalFocus";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { format, strings, t } from "src/translations/helper";
import { findStoredCommand, toStoredCommand } from "src/util/commandStorage";

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

    const target = findStoredCommand(
      this.command,
      this.isSubmenuItem,
      this.plugin.getCurrentCommands(this.currentEditingConfig),
    );
    // Removed while the picker was open: nothing to write to.
    if (!target) return;

    target.icon = item;
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
    const target = findStoredCommand(
      this.item,
      this.isSubmenuItem,
      this.plugin.getCurrentCommands(this.currentEditingConfig),
    );
    // Removed while the modal was open: nothing to rename.
    if (!target) return;

    target.name = value;
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("b", { text: strings.pleaseEnterNewName });

    const textComponent = new TextComponent(contentEl);
    textComponent.setPlaceholder("").setValue(this.item.name ?? "");
    focusAfterOpen(textComponent.inputEl);

    const submit = async () => {
      await this.commitName(textComponent.inputEl.value);
      this.close();
    };

    textComponent.inputEl.addEventListener("keydown", (ev) => {
      // isComposing guards IME users, whose confirm-Enter must not close the modal.
      if (ev.key !== "Enter" || ev.isComposing) return;
      ev.preventDefault();
      void submit();
    });

    const buttons = contentEl.createDiv("modal-button-container");
    new ButtonComponent(buttons)
      .setButtonText(strings.confirm)
      .setCta()
      .onClick(() => void submit());
    new ButtonComponent(buttons)
      .setButtonText(strings.cancel)
      .onClick(() => this.close());
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
