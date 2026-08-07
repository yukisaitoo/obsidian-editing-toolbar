import { ButtonComponent, Command, Notice, Setting } from "obsidian";
import type Sortable from "sortablejs";
import { RenameCommandModal } from "src/modals/renameCommandModal";
import { CommandPicker, IconPicker } from "src/modals/suggesterModals";
import { DIVIDER_NAME, SUBMENU_NAME } from "src/settings/defaultCommands";
import type { SettingsTabContext } from "src/settings/settingsTab";
import {
  DIVIDER_COMMAND_ID,
  isDivider,
  newDividerId,
  newSubmenuId,
} from "src/toolbar/layoutIds";
import { applyButtonIcon, SUBMENU_BUTTON_CLASS } from "src/toolbar/toolbarDom";
import { strings } from "src/translations/helper";
import { hasSubmenu, SubmenuCommand } from "src/util/commandStorage";
import { displayIcon, displayName } from "src/util/displayName";

const DIVIDER_RENAME_CLASS = "editingToolbar-divider-rename";

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

// Only top-level rows get insert buttons; a submenu receives its contents by drag.
const INSERTABLE = {
  submenu: {
    icon: "lucide-list-plus",
    tooltip: strings.addSubmenu,
    make: (): Command => ({
      id: newSubmenuId(),
      name: SUBMENU_NAME,
      icon: "lucide-list-filter",
      SubmenuCommands: [],
    }),
  },
  divider: {
    icon: "vertical-split",
    tooltip: strings.addSeparator,
    make: (): Command => ({
      id: newDividerId(),
      name: DIVIDER_NAME,
      icon: "vertical-split",
    }),
  },
} as const;

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

  // The live settings array; every handler below mutates it in place, then saves.
  const commands = ctx.plugin.settings.commands;
  const listEl = listContainer.createDiv(
    "editingToolbarSettingsTabsContainer",
  );
  const dragList = createDragList(ctx);

  dragList(listEl, commands, { group: "item", animation: 500 });

  commands.forEach((command) =>
    renderRow(ctx, listEl, { command, list: commands, topLevel: true }, dragList),
  );
}

interface CommandRow {
  command: Command;
  // The list this row lives in, for the icon/rename/delete/insert writes.
  list: Command[];
  topLevel: boolean;
}

function renderRow(
  ctx: SettingsTabContext,
  parentEl: HTMLElement,
  row: CommandRow,
  dragList: DragList,
): void {
  const { command, list, topLevel } = row;
  const submenu = hasSubmenu(command) ? command : null;
  const divider = isDivider(command.id);

  const setting = new Setting(parentEl)
    .setClass("editingToolbarCommandItem")
    .setName(displayName(ctx.app, command));

  // The Sortable `put` predicate reads this class off the dragged element to keep
  // submenus out of submenus.
  if (submenu) setting.setClass(SUBMENU_BUTTON_CLASS);
  if (divider) setting.setClass(DIVIDER_COMMAND_ID);

  // Order matters: styles.css hides a divider row's buttons by position, so delete
  // has to stay last and rename has to keep its own class to survive.
  setting.addButton((button) => configureIconButton(ctx, button, command, list));

  if (submenu || divider) {
    setting.addButton((button) => {
      configureRenameButton(ctx, button, command, list);
      if (divider) button.setClass(DIVIDER_RENAME_CLASS);
    });
  }

  if (submenu) {
    setting.addDropdown((dropdown) => {
      dropdown
        .addOption("submenu", strings.buttonSubmenu)
        .addOption("dropdown", strings.dropdownMenu)
        .setValue(submenu.menuType || "submenu")
        .onChange(async (value) => {
          submenu.menuType = value as "submenu" | "dropdown";
          await ctx.persist();
          new Notice(
            `${strings.menuTypeChanged}: ${
              value === "dropdown"
                ? strings.dropdownMenu
                : strings.buttonSubmenu
            }`,
          );
        });
      dropdown.selectEl.addClass("editingToolbarMenuTypeDropdown");
    });
  }

  if (topLevel && !submenu) {
    setting.addButton((button) =>
      configureInsertButton(ctx, button, command, list, "submenu"),
    );
    setting.addButton((button) =>
      configureInsertButton(ctx, button, command, list, "divider"),
    );
  }

  setting.addButton((button) =>
    ctx.createDeleteButton(button, () => removeCommand(ctx, list, command)),
  );

  if (submenu) renderSubmenuChildren(ctx, setting, submenu, dragList);
}

function renderSubmenuChildren(
  ctx: SettingsTabContext,
  setting: Setting,
  submenu: SubmenuCommand,
  dragList: DragList,
): void {
  const subListEl = setting.settingEl.createDiv(
    "editingToolbarSettingsTabsContainer_sub",
  );

  // The empty-state hint is a CSS ::before, so the translated copy reaches it as a
  // custom property. JSON.stringify produces the quoting `content` expects.
  subListEl.style.setProperty(
    "--editing-toolbar-drag-hint",
    JSON.stringify(`✖️${strings.dragCommandsHere}`),
  );

  dragList(subListEl, submenu.SubmenuCommands, {
    animation: 150,
    group: {
      name: "item",
      pull: true,
      // Submenus take plain commands only, never another submenu.
      put: (_to, _from, dragEl) =>
        !dragEl.classList.contains(SUBMENU_BUTTON_CLASS),
    },
  });

  submenu.SubmenuCommands.forEach((child) =>
    renderRow(
      ctx,
      subListEl,
      { command: child, list: submenu.SubmenuCommands, topLevel: false },
      dragList,
    ),
  );
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
      // Sortable fires onSort on both lists of a cross-list drag; the destination
      // owns the move so it lands exactly once. Within one list source === target,
      // where the splice pair is already a move.
      onSort: (evt) => {
        if (evt.oldIndex == null || evt.newIndex == null) return;
        if (evt.to !== listEl) return;

        const source = listsByEl.get(evt.from);
        if (!source || evt.oldIndex >= source.length) return;

        const [moved] = source.splice(evt.oldIndex, 1);
        list.splice(evt.newIndex, 0, moved);
        void ctx.persist();
      },
    });
  };
}

async function removeCommand(
  ctx: SettingsTabContext,
  list: Command[],
  command: Command,
): Promise<void> {
  list.remove(command);
  await ctx.persist();
}

function configureInsertButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  after: Command,
  list: Command[],
  kind: keyof typeof INSERTABLE,
): void {
  const { icon, tooltip, make } = INSERTABLE[kind];

  button
    .setIcon(icon)
    .setTooltip(tooltip)
    .setClass("editingToolbarSettingsButton")
    .onClick(async () => {
      // Located on click, not on render: a re-render can be pending when this
      // fires, which would make an index captured earlier point at the wrong row.
      const index = list.indexOf(after);
      if (index < 0) return;

      list.splice(index + 1, 0, make());
      await ctx.persist();
    });
}

function configureIconButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  command: Command,
  list: Command[],
): void {
  button.setClass("editingToolbarSettingsIcon").onClick(() => {
    new IconPicker(
      ctx.app,
      (icon) => void setStoredIcon(ctx, command, list, icon),
    ).open();
  });

  applyButtonIcon(button, displayIcon(ctx.app, command));
}

async function setStoredIcon(
  ctx: SettingsTabContext,
  command: Command,
  list: Command[],
  icon: string,
): Promise<void> {
  // Removed while the picker was open: nothing to write to.
  if (!list.includes(command)) return;

  command.icon = icon;
  await ctx.persist();
}

function configureRenameButton(
  ctx: SettingsTabContext,
  button: ButtonComponent,
  command: Command,
  list: Command[],
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
      new RenameCommandModal(ctx.plugin, command, list).open();
    });
}
