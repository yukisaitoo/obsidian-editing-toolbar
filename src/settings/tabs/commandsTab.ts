import { ButtonComponent, Command, Notice, Setting } from "obsidian";
import type Sortable from "sortablejs";
import {
  ChangeCmdname,
  ChooseFromIconList,
  CommandPicker,
} from "src/modals/suggesterModals";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { POSITION_STYLES, STYLE_LABELS } from "src/settings/settingsData";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { applyButtonIcon } from "src/toolbar/toolbarDom";
import { format, strings, t } from "src/translations/helper";
import {
  DIVIDER_COMMAND_ID,
  isDivider,
  newDividerId,
  uniqueId,
} from "src/util/commandIds";

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
    text: format(strings.editingCommandsFor, {
      style: STYLE_LABELS[state.style],
    }),
  });

  new Setting(listContainer)
    .setName(strings.editingToolbarCommands)
    .setDesc(strings.addCommandOntoEditingToolbar)
    .addButton((addButton) => {
      addButton
        .setIcon("plus")
        .setTooltip(strings.add)
        // No rebuild here: this fires when the picker *opens*, long before a
        // command is chosen. CommandPicker rebuilds once it has one.
        .onClick(() => new CommandPicker(ctx.plugin, state.style).open());
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

  const save = () => void ctx.plugin.saveSettings();

  ctx.createSortable(listEl, {
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
      // Sortable fires onSort on BOTH lists for a cross-list drag. The
      // destination owns the move so it is applied exactly once.
      if (evt.to !== listEl) return;

      if (evt.from === listEl) {
        moveWithin(commands, evt.oldIndex, evt.newIndex);
      } else {
        const source = submenuFor(evt.from, commands);
        if (!source || evt.oldIndex >= source.length) return;
        commands.splice(evt.newIndex, 0, source.splice(evt.oldIndex, 1)[0]);
      }

      save();
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
          insertAfter(ctx, commands, index, {
            id: "SubmenuCommands-" + uniqueId(1),
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
          insertAfter(ctx, commands, index, {
            id: newDividerId(),
            name: strings.verticalSplit,
            icon: "vertical-split",
          }),
        );
    })
    .addButton((deleteButton) =>
      ctx.createDeleteButton(deleteButton, () =>
        removeCommand(ctx, commands, command),
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
        removeCommand(ctx, commands, command),
      ),
    );

  const subListEl = setting.settingEl.createEl("div", {
    cls: "editingToolbarSettingsTabsContainer_sub",
  });

  // The empty-state hint is a CSS ::before, so the translated copy reaches it as a
  // custom property. JSON.stringify produces the quoting `content` expects.
  subListEl.style.setProperty(
    "--editing-toolbar-drag-hint",
    JSON.stringify(`✖️${strings.dragCommandsHere}`),
  );

  ctx.createSortable(subListEl, {
    ...SHARED_SORTABLE_OPTIONS,
    animation: 150,
    group: { name: "item", pull: true, put: row.isPlainItemDragging },
    onSort: (evt) => {
      if (evt.oldIndex == null || evt.newIndex == null) return;
      // Destination owns the move, as in the top-level list above. Without this
      // both submenus in a submenu-to-submenu drag reorder themselves instead.
      if (evt.to !== subListEl) return;

      const submenu = command.SubmenuCommands!;

      if (evt.from === subListEl) {
        moveWithin(submenu, evt.oldIndex, evt.newIndex);
      } else if (evt.from.classList.contains(TOP_LEVEL_CONTAINER_CLASS)) {
        if (evt.oldIndex >= commands.length) return;
        submenu.splice(evt.newIndex, 0, commands.splice(evt.oldIndex, 1)[0]);
      } else {
        const source = submenuFor(evt.from, commands);
        if (!source || evt.oldIndex >= source.length) return;
        submenu.splice(evt.newIndex, 0, source.splice(evt.oldIndex, 1)[0]);
      }

      void ctx.plugin.saveSettings();
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

// The submenu a sub-list element belongs to. Each sub-list is a child of the
// parent command's row, which carries its id in `data-id`.
function submenuFor(listEl: HTMLElement, commands: Command[]) {
  const parentId = listEl.parentElement?.dataset?.["id"];
  if (!parentId) {
    console.error("editing-toolbar: drag source has no parent command id");
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
): Promise<void> {
  commands.remove(command);
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
  command: Command,
): Promise<void> {
  commands.splice(index + 1, 0, command);
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

  applyButtonIcon(button, command.icon);
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
      new ChangeCmdname(ctx.plugin, command, isSubmenuItem, style).open();
    });
}
