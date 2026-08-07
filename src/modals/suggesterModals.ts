import {
  App,
  Command,
  FuzzyMatch,
  FuzzySuggestModal,
  Notice,
  setIcon,
} from "obsidian";
import { getAppIcons } from "src/icons/appIcons";
import type EditingToolbarPlugin from "src/plugin/main";
import { format, strings } from "src/translations/helper";
import { toStoredCommand } from "src/util/commandStorage";

export class IconPicker extends FuzzySuggestModal<string> {
  constructor(
    app: App,
    private onChoose: (iconId: string) => void,
  ) {
    super(app);
    this.setPlaceholder(strings.chooseIcon);
  }

  getItems(): string[] {
    return getAppIcons();
  }

  // "lucide-chevron-right" reads as "Chevron Right".
  getItemText(item: string): string {
    const words = item
      .replace(/^lucide-/, "")
      .split(/-|(?=[A-Z])/)
      .filter(Boolean);
    return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  }

  renderSuggestion(icon: FuzzyMatch<string>, iconItem: HTMLElement): void {
    const span = iconItem.createSpan({ cls: "editingToolbarIconPick" });
    setIcon(span, icon.item);
    super.renderSuggestion(icon, iconItem);
  }

  onChooseItem(item: string): void {
    this.onChoose(item);
  }
}

export class CommandPicker extends FuzzySuggestModal<Command> {
  constructor(private plugin: EditingToolbarPlugin) {
    super(plugin.app);
    this.setPlaceholder(strings.chooseCommand);
  }

  getItems(): Command[] {
    return this.app.commands.listCommands();
  }

  // Verbatim: names are already localized, and the source prefix keeps same-named
  // commands from different plugins apart.
  getItemText(item: Command): string {
    return item.name;
  }

  async onChooseItem(item: Command): Promise<void> {
    if (this.plugin.settings.commands.some((v) => v.id === item.id)) {
      new Notice(
        format(strings.commandAlreadyExists, { name: this.getItemText(item) }),
        3000,
      );
      return;
    }

    if (!item.icon) {
      new IconPicker(
        this.app,
        (icon) => void this.addCommand({ ...item, icon }),
      ).open();
      return;
    }

    await this.addCommand(item);
  }

  // Reads the list afresh: the icon picker sits open in between, so the reference
  // from onChooseItem can be stale by the time an icon is chosen.
  private async addCommand(command: Command): Promise<void> {
    this.plugin.settings.commands.push(toStoredCommand(command));
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }
}
