import { ButtonComponent, Command, Notice, Setting } from "obsidian";
import Sortable from "sortablejs";
import {
  ChangeCmdname,
  ChooseFromIconList,
  CommandPicker,
} from "src/modals/suggesterModals";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { POSITION_STYLES, STYLE_LABELS } from "src/settings/settingsData";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { checkHtml } from "src/toolbar/toolbarDom";
import { strings, t } from "src/translations/helper";
import {
  DIVIDER_COMMAND_ID,
  GenNonDuplicateID,
  isDivider,
  newDividerId,
} from "src/util/util";

const TOP_LEVEL_CONTAINER_CLASS = "editingToolbarSettingsTabsContainer";

const SHARED_SORTABLE_OPTIONS: Sortable.Options = {
  draggable: ".setting-item",
  ghostClass: "sortable-ghost",
  chosenClass: "sortable-chosen",
  dragClass: "sortable-drag",
  fallbackClass: "sortable-fallback",
  dragoverBubble: false,
  forceFallback: true,
  fallbackOnBody: true,
  swapThreshold: 0.7,
  easing: "cubic-bezier(1, 0, 0, 1)",
  delay: 800,
  delayOnTouchOnly: true,
  touchStartThreshold: 5,
};

export interface CommandsTabState {
  style: ToolbarStyleKey;
  onStyleChange(style: ToolbarStyleKey): void;
}

export function renderCommandsTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  state: CommandsTabState,
): void {
  new Setting(containerEl.createDiv("commandSetting-container"))
    .setName(strings.toolbarSettings)
    .setDesc(strings.chooseWhichToolbarStyleCommand)
    .addDropdown((dropdown) => {
      POSITION_STYLES.forEach((style) =>
        dropdown.addOption(style, STYLE_LABELS[style]),
      );
      dropdown
        .setValue(state.style)
        .onChange((value) => state.onStyleChange(value as ToolbarStyleKey));
    });

  const listContainer = containerEl.createDiv("command-lists-container");
  listContainer.addClass(state.style);
  listContainer.createEl("div", {
    cls: `position-style-info ${state.style}`,
    text: `${strings.currentlyEditingCommands} "${STYLE_LABELS[state.style]}" ${strings.configuration}`,
  });

  new Setting(listContainer)
    .setName(strings.editingToolbarCommands)
    .setDesc(strings.addCommandOntoEditingToolbar)
    .addButton((addButton) => {
      addButton
        .setIcon("plus")
        .setTooltip(strings.add)
        .onClick(() => {
          new CommandPicker(ctx.plugin, state.style).open();
          ctx.rebuildToolbar();
        });
    });

  renderCommandList(ctx, listContainer, state.style);
}

function renderCommandList(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  style: ToolbarStyleKey,
): void {
  const commands = ctx.plugin.getCurrentCommands(style);
  const listEl = containerEl.createEl("div", {
    cls: TOP_LEVEL_CONTAINER_CLASS,
  });

  // Submenus take only plain commands; the `put` checks below read this.
  let draggedItemClass = "";

  const save = () => {
    ctx.plugin.updateCurrentCommands(commands, style);
    ctx.plugin.saveSettings();
  };

  Sortable.create(listEl, {
    ...SHARED_SORTABLE_OPTIONS,
    group: "item",
    animation: 500,
    filter:
      ".setting-item-control button, .dropdown, .editingToolbarMenuTypeDropdown",
    preventOnFilter: false,
    onChoose: (evt) => evt.item.classList.add("sortable-chosen-feedback"),
    onUnchoose: (evt) => evt.item.classList.remove("sortable-chosen-feedback"),
    onStart: (evt) => {
      draggedItemClass = evt.item.className;
    },
    onSort: (evt) => {
      if (evt.oldIndex == null || evt.newIndex == null) return;
      if (evt.from.className === evt.to.className) {
        moveWithin(commands, evt.oldIndex, evt.newIndex);
        save();
      }
      ctx.rebuildToolbar();
    },
  });

  commands.forEach((command, index) => {
    const setting = new Setting(listEl);
    if (command.SubmenuCommands) {
      renderSubmenuRow(ctx, setting, {
        command,
        commands,
        style,
        isPlainItemDragging: () =>
          !draggedItemClass.includes("editingToolbarCommandsubItem"),
      });
    } else {
      renderCommandRow(ctx, setting, { command, index, commands, style });
    }
  });
}

interface RowContext {
  command: Command;
  index: number;
  commands: Command[];
  style: ToolbarStyleKey;
}

function renderCommandRow(
  ctx: SettingsTabContext,
  setting: Setting,
  row: RowContext,
): void {
  const { command, index, commands, style } = row;

  setting.addButton((iconButton) =>
    configureIconButton(ctx, iconButton, command, false, style),
  );

  if (isDivider(command.id)) {
    setting.setClass(DIVIDER_COMMAND_ID);
  }

  setting.setClass("editingToolbarCommandItem").setName(t(command.name));

  if (isDivider(command.id)) {
    setting.addButton((renameButton) =>
      configureRenameButton(ctx, renameButton, command, false, style),
    );
  }

  setting
    .addButton((addSubmenu) => {
      addSubmenu
        .setIcon("editingToolbarSub")
        .setTooltip(strings.addSubmenu)
        .setClass("editingToolbarSettingsButton")
        .onClick(() =>
          insertAfter(ctx, commands, index, style, {
            id: "SubmenuCommands-" + GenNonDuplicateID(1),
            name: "Submenu",
            icon: "remix-Filter3Line",
            SubmenuCommands: [],
          }),
        );
    })
    .addButton((addSeparator) => {
      addSeparator
        .setIcon("vertical-split")
        .setTooltip(strings.addSeparator)
        .setClass("editingToolbarSettingsButton")
        .onClick(() =>
          insertAfter(ctx, commands, index, style, {
            id: newDividerId(),
            name: strings.verticalSplit,
            icon: "vertical-split",
          }),
        );
    })
    .addButton((deleteButton) =>
      ctx.createDeleteButton(deleteButton, () =>
        removeCommand(ctx, commands, command, style),
      ),
    );
}

interface SubmenuRowContext {
  command: Command;
  commands: Command[];
  style: ToolbarStyleKey;
  isPlainItemDragging(): boolean;
}

function renderSubmenuRow(
  ctx: SettingsTabContext,
  setting: Setting,
  row: SubmenuRowContext,
): void {
  const { command, commands, style } = row;

  setting.settingEl.setAttribute("data-id", command.id);
  setting
    .setClass("editingToolbarCommandItem")
    .setClass("editingToolbarCommandsubItem")
    .setName(t(command.name))
    .addButton((iconButton) =>
      configureIconButton(ctx, iconButton, command, false, style),
    )
    .addButton((renameButton) =>
      configureRenameButton(ctx, renameButton, command, false, style, true),
    )
    .addDropdown((dropdown) => {
      dropdown
        .addOption("submenu", strings.buttonSubmenu)
        .addOption("dropdown", strings.dropdownMenu)
        .setValue(command.menuType || "submenu")
        .onChange(async (value) => {
          command.menuType = value as "submenu" | "dropdown";
          ctx.plugin.updateCurrentCommands(commands, style);
          await ctx.plugin.saveSettings();
          ctx.rebuildToolbar();
          new Notice(
            `${strings.menuTypeChanged}: ${
              value === "dropdown"
                ? strings.dropdownMenu
                : strings.buttonSubmenu
            }`,
          );
        });
      dropdown.selectEl.addClass("editingToolbarMenuTypeDropdown");
    })
    .addButton((deleteButton) =>
      ctx.createDeleteButton(deleteButton, () =>
        removeCommand(ctx, commands, command, style),
      ),
    );

  const subListEl = setting.settingEl.createEl("div", {
    cls: "editingToolbarSettingsTabsContainer_sub",
  });

  // The empty-state hint is a CSS ::before, which cannot reach the translation
  // table, so the copy is handed to it as a custom property. JSON.stringify
  // produces the quoted-and-escaped string `content` expects.
  subListEl.style.setProperty(
    "--editing-toolbar-drag-hint",
    JSON.stringify(`✖️${strings.dragCommandsHere}`),
  );

  Sortable.create(subListEl, {
    ...SHARED_SORTABLE_OPTIONS,
    animation: 150,
    group: { name: "item", pull: true, put: row.isPlainItemDragging },
    onSort: (evt) => {
      if (evt.oldIndex == null || evt.newIndex == null) return;

      if (evt.from.className === evt.to.className) {
        // Reordered inside this submenu.
        moveWithin(command.SubmenuCommands!, evt.oldIndex, evt.newIndex);
      } else if (evt.to.className === TOP_LEVEL_CONTAINER_CLASS) {
        // Dragged out of a submenu onto the toolbar.
        const source = submenuOf(evt, commands);
        if (!source || evt.oldIndex >= source.length) return;
        commands.splice(evt.newIndex, 0, source.splice(evt.oldIndex, 1)[0]);
      } else if (evt.from.className === TOP_LEVEL_CONTAINER_CLASS) {
        // Dragged from the toolbar into a submenu.
        const target = submenuOf(evt, commands);
        if (!target || evt.oldIndex >= commands.length) return;
        target.splice(evt.newIndex, 0, commands.splice(evt.oldIndex, 1)[0]);
      } else {
        return;
      }

      ctx.plugin.updateCurrentCommands(commands, style);
      ctx.plugin.saveSettings();
      ctx.rebuildToolbar();
    },
  });

  command.SubmenuCommands!.forEach((subCommand) => {
    const subSetting = new Setting(subListEl)
      .setClass("editingToolbarCommandItem")
      .addButton((iconButton) =>
        configureIconButton(ctx, iconButton, subCommand, true, style),
      )
      .setName(t(subCommand.name));

    if (isDivider(subCommand.id)) {
      subSetting.addButton((renameButton) =>
        configureRenameButton(ctx, renameButton, subCommand, true, style),
      );
    }

    subSetting.addButton((deleteButton) =>
      ctx.createDeleteButton(deleteButton, async () => {
        command.SubmenuCommands!.remove(subCommand);
        await ctx.plugin.saveSettings();
        ctx.refresh();
        ctx.rebuildToolbar();
      }),
    );
  });
}

function submenuOf(evt: Sortable.SortableEvent, commands: Command[]) {
  const parentId = evt.target.parentElement?.dataset?.["id"];
  if (!parentId) {
    console.error("editing-toolbar: drag target has no parent command id");
    return null;
  }
  const parent = commands.find((command) => command.id === parentId);
  if (!parent?.SubmenuCommands) {
    console.error("editing-toolbar: no submenu for command", parentId);
    return null;
  }
  return parent.SubmenuCommands;
}

async function removeCommand(
  ctx: SettingsTabContext,
  commands: Command[],
  command: Command,
  style: ToolbarStyleKey,
): Promise<void> {
  commands.remove(command);
  ctx.plugin.updateCurrentCommands(commands, style);
  await ctx.plugin.saveSettings();
  ctx.refresh();
  ctx.rebuildToolbar();
}

function moveWithin(items: Command[], from: number, to: number): void {
  items.splice(to, 0, items.splice(from, 1)[0]);
}

async function insertAfter(
  ctx: SettingsTabContext,
  commands: Command[],
  index: number,
  style: ToolbarStyleKey,
  command: Command,
): Promise<void> {
  commands.splice(index + 1, 0, command);
  ctx.plugin.updateCurrentCommands(commands, style);
  await ctx.plugin.saveSettings();
  ctx.refresh();
  ctx.rebuildToolbar();
}

function configureIconButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  command: Command,
  isSubmenuItem: boolean,
  style: ToolbarStyleKey,
): void {
  button.setClass("editingToolbarSettingsIcon").onClick(() => {
    new ChooseFromIconList(
      ctx.plugin,
      command,
      isSubmenuItem,
      undefined,
      style,
    ).open();
  });

  const icon = command.icon ?? "";
  if (checkHtml(icon)) {
    button.buttonEl.innerHTML = icon;
  } else {
    button.setIcon(icon);
  }
}

function configureRenameButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  command: Command,
  isSubmenuItem: boolean,
  style: ToolbarStyleKey,
  isSubmenuParent = false,
): void {
  button
    .setIcon("pencil")
    .setTooltip(
      isSubmenuParent ? strings.changeSubmenuName : strings.changeCommandName,
    )
    .setClass("editingToolbarSettingsButton")
    .onClick(() => {
      new ChangeCmdname(
        ctx.app,
        ctx.plugin,
        command,
        isSubmenuItem,
        style,
      ).open();
    });
}
