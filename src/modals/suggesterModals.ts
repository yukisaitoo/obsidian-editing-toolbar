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
import { focusAfterOpen, submitOnEnter } from "src/modals/modalInput";
import type EditingToolbarPlugin from "src/plugin/main";
import { format, strings, t } from "src/translations/helper";
import { toStoredCommand } from "src/util/commandStorage";

type IconSelectCallback = (iconId: string) => void;

export class ChooseFromIconList extends FuzzySuggestModal<string> {
  plugin: EditingToolbarPlugin;
  command: Command;
  // The settings list the command was rendered from; null when a callback owns
  // the result and nothing is written to settings.
  owner: Command[] | null;
  customCallback: IconSelectCallback | null = null;
  constructor(
    plugin: EditingToolbarPlugin,
    command: Command,
    owner: Command[] | null,
    callback?: IconSelectCallback,
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.command = command;
    this.owner = owner;
    this.customCallback = callback || null;
    this.setPlaceholder(strings.chooseIcon2);
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

    // Removed while the picker was open: nothing to write to.
    if (!this.owner?.includes(this.command)) return;

    this.command.icon = item;
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }
}

export class CommandPicker extends FuzzySuggestModal<Command> {
  command!: Command;
  constructor(private plugin: EditingToolbarPlugin) {
    super(plugin.app);
    this.setPlaceholder(strings.chooseCommand);
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
    this.plugin.settings.commands.push(toStoredCommand(command));
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }

  async onChooseItem(item: Command): Promise<void> {
    if (this.plugin.settings.commands.some((v) => v.id === item.id)) {
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
        null,
        (icon) => void this.addCommand({ ...item, icon }),
      ).open();
      return;
    }

    await this.addCommand(item);
  }
}

export class ChangeCmdname extends Modal {
  plugin: EditingToolbarPlugin;
  item: Command;
  // The settings list the command was rendered from.
  owner: Command[];
  constructor(plugin: EditingToolbarPlugin, item: Command, owner: Command[]) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.owner = owner;
    this.containerEl.addClass("changename");
  }
  private async commitName(value: string): Promise<void> {
    // Removed while the modal was open: nothing to rename.
    if (!this.owner.includes(this.item)) return;

    this.item.name = value;
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

    submitOnEnter(textComponent.inputEl, submit);

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
