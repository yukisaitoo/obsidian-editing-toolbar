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
import { format, strings, t } from "src/translations/helper";
import {
  commandLabel,
  commandSource,
  toStoredCommand,
} from "src/util/commandStorage";

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
    return item
      .replace(/^lucide-/, "")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/-/g, " ")
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word) => word[0].toUpperCase() + word.substring(1))
      .join(" ");
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

  // The list spans every registered command, so the source prefix stays on to keep
  // same-named commands from different plugins apart.
  getItemText(item: Command): string {
    return commandSource(item.name) + t(commandLabel(item.name));
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

  // Read afresh rather than reusing the list from onChooseItem: the icon picker sits
  // open in between, so that reference can be stale by the time an icon is chosen.
  private async addCommand(command: Command): Promise<void> {
    this.plugin.settings.commands.push(toStoredCommand(command));
    await this.plugin.saveSettings();
    this.plugin.rebuildToolbars();
  }
}
