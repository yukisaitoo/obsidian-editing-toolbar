import { ButtonComponent, Command, Notice, Setting } from "obsidian";
import type Sortable from "sortablejs";
import {
  ChangeCmdname,
  ChooseFromIconList,
  CommandPicker,
} from "src/modals/suggesterModals";
import { DIVIDER_NAME, SUBMENU_NAME } from "src/settings/defaultCommands";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { applyButtonIcon, SUBMENU_BUTTON_CLASS } from "src/toolbar/toolbarDom";
import { strings, t } from "src/translations/helper";
import {
  DIVIDER_COMMAND_ID,
  isDivider,
  newDividerId,
  newSubmenuId,
} from "src/util/commandIds";
import { hasSubmenu, SubmenuCommand } from "src/util/commandStorage";

const TOP_LEVEL_CONTAINER_CLASS = "editingToolbarSettingsTabsContainer";

const SHARED_SORTABLE_OPTIONS: Sortable.Options = {
  draggable: ".setting-item",
  filter:
    ".setting-item-control button, .dropdown, .editingToolbarMenuTypeDropdown",
  preventOnFilter: false,
  dragoverBubble: false,
  forceFallback: true,
  fallbackOnBody: true,
  swapThreshold: 0.7,
  easing: "cubic-bezier(1, 0, 0, 1)",
  delay: 800,
  delayOnTouchOnly: true,
  touchStartThreshold: 5,
};

export function renderCommandsTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  const listContainer = containerEl.createDiv("command-lists-container");

  new Setting(listContainer)
    .setName(strings.editingToolbarCommands)
    .setDesc(strings.addCommandOntoEditingToolbar)
    .addButton((addButton) => {
      addButton
        .setIcon("plus")
        .setTooltip(strings.add)
        // No rebuild here: this fires when the picker *opens*, long before a
        // command is chosen. CommandPicker rebuilds once it has one.
        .onClick(() => new CommandPicker(ctx.plugin).open());
    });

  renderCommandList(ctx, listContainer);
}

function renderCommandList(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  // The live settings array — the handlers below mutate it in place, then save.
  const commands = ctx.plugin.settings.commands;
  const listEl = containerEl.createEl("div", {
    cls: TOP_LEVEL_CONTAINER_CLASS,
  });
  const dragList = createDragList(ctx);

  dragList(listEl, commands, { group: "item", animation: 500 });

  commands.forEach((command, index) => {
    const setting = new Setting(listEl);
    if (hasSubmenu(command)) {
      renderSubmenuRow(ctx, setting, { command, commands, dragList });
    } else {
      renderCommandRow(ctx, setting, { command, index, commands });
    }
  });
}

interface RowContext {
  command: Command;
  index: number;
  commands: Command[];
}

function renderCommandRow(
  ctx: SettingsTabContext,
  setting: Setting,
  row: RowContext,
): void {
  const { command, index, commands } = row;

  setting.addButton((iconButton) =>
    configureIconButton(ctx, iconButton, command, commands),
  );

  setting.setClass("editingToolbarCommandItem").setName(t(command.name));

  if (isDivider(command.id)) {
    setting
      .setClass(DIVIDER_COMMAND_ID)
      .addButton((renameButton) =>
        configureRenameButton(ctx, renameButton, command, commands),
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
            id: newSubmenuId(),
            name: SUBMENU_NAME,
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
            name: DIVIDER_NAME,
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
  command: SubmenuCommand;
  // The list owning this row, for the icon/rename/delete writes — not for drags.
  commands: Command[];
  dragList: DragList;
}

function renderSubmenuRow(
  ctx: SettingsTabContext,
  setting: Setting,
  row: SubmenuRowContext,
): void {
  const { command, commands, dragList } = row;

  setting
    .setClass("editingToolbarCommandItem")
    .setClass(SUBMENU_BUTTON_CLASS)
    .setName(t(command.name))
    .addButton((iconButton) =>
      configureIconButton(ctx, iconButton, command, commands),
    )
    .addButton((renameButton) =>
      configureRenameButton(ctx, renameButton, command, commands),
    )
    .addDropdown((dropdown) => {
      dropdown
        .addOption("submenu", strings.buttonSubmenu)
        .addOption("dropdown", strings.dropdownMenu)
        .setValue(command.menuType || "submenu")
        .onChange(async (value) => {
          command.menuType = value as "submenu" | "dropdown";
          await ctx.plugin.saveSettings();
          ctx.applyChanges();
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

  dragList(subListEl, command.SubmenuCommands, {
    animation: 150,
    group: {
      name: "item",
      pull: true,
      // Submenus take plain commands only — never another submenu.
      put: (_to, _from, dragEl) =>
        !dragEl.classList.contains(SUBMENU_BUTTON_CLASS),
    },
  });

  command.SubmenuCommands.forEach((subCommand) => {
    const subSetting = new Setting(subListEl)
      .setClass("editingToolbarCommandItem")
      .addButton((iconButton) =>
        configureIconButton(
          ctx,
          iconButton,
          subCommand,
          command.SubmenuCommands,
        ),
      )
      .setName(t(subCommand.name));

    if (isDivider(subCommand.id)) {
      subSetting.addButton((renameButton) =>
        configureRenameButton(
          ctx,
          renameButton,
          subCommand,
          command.SubmenuCommands,
        ),
      );
    }

    subSetting.addButton((deleteButton) =>
      ctx.createDeleteButton(deleteButton, async () => {
        command.SubmenuCommands.remove(subCommand);
        await ctx.plugin.saveSettings();
        ctx.applyChanges();
      }),
    );
  });
}

// Every drag list is registered with the array it renders, so a drop reads that
// array back off the element instead of reconstructing it from the DOM.
type DragList = (
  listEl: HTMLElement,
  list: Command[],
  options: Sortable.Options,
) => void;

function createDragList(ctx: SettingsTabContext): DragList {
  const listsByEl = new WeakMap<HTMLElement, Command[]>();

  return (listEl, list, options) => {
    listsByEl.set(listEl, list);

    ctx.createSortable(listEl, {
      ...SHARED_SORTABLE_OPTIONS,
      ...options,
      // Sortable fires onSort on BOTH lists of a cross-list drag; the destination
      // owns the move so it lands exactly once. Within one list source === target,
      // where the splice pair is already a move.
      onSort: (evt) => {
        if (evt.oldIndex == null || evt.newIndex == null) return;
        if (evt.to !== listEl) return;

        const source = listsByEl.get(evt.from);
        if (!source || evt.oldIndex >= source.length) return;

        list.splice(evt.newIndex, 0, source.splice(evt.oldIndex, 1)[0]);
        void ctx.plugin.saveSettings();
        ctx.applyChanges();
      },
    });
  };
}

async function removeCommand(
  ctx: SettingsTabContext,
  commands: Command[],
  command: Command,
): Promise<void> {
  commands.remove(command);
  await ctx.plugin.saveSettings();
  ctx.applyChanges();
}

async function insertAfter(
  ctx: SettingsTabContext,
  commands: Command[],
  index: number,
  command: Command,
): Promise<void> {
  commands.splice(index + 1, 0, command);
  await ctx.plugin.saveSettings();
  ctx.applyChanges();
}

function configureIconButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  command: Command,
  owner: Command[],
): void {
  button.setClass("editingToolbarSettingsIcon").onClick(() => {
    new ChooseFromIconList(
      ctx.app,
      (icon) => void setStoredIcon(ctx, command, owner, icon),
    ).open();
  });

  applyButtonIcon(button, command.icon);
}

async function setStoredIcon(
  ctx: SettingsTabContext,
  command: Command,
  owner: Command[],
  icon: string,
): Promise<void> {
  // Removed while the picker was open: nothing to write to.
  if (!owner.includes(command)) return;

  command.icon = icon;
  await ctx.plugin.saveSettings();
  ctx.plugin.rebuildToolbars();
}

function configureRenameButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  command: Command,
  owner: Command[],
): void {
  button
    .setIcon("pencil")
    .setTooltip(
      hasSubmenu(command)
        ? strings.changeSubmenuName
        : strings.changeCommandName,
    )
    .setClass("editingToolbarSettingsButton")
    .onClick(() => {
      new ChangeCmdname(ctx.plugin, command, owner).open();
    });
}
