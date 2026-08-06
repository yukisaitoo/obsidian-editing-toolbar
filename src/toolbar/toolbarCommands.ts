import { App, ButtonComponent, Command, Menu } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { runCommandById } from "src/plugin/pluginId";
import {
  createColorPickerButton,
  isColorPickerCommand,
} from "src/toolbar/colorPickerButton";
import { attachFlyoutClamp } from "src/toolbar/geometry";
import {
  applyButtonIcon,
  getHotkey,
  NO_HOTKEY,
  SUBMENU_BUTTON_CLASS,
} from "src/toolbar/toolbarDom";
import { syncToolbarState } from "src/toolbar/toolbarVisibility";
import { t } from "src/translations/helper";
import { DIVIDER_COMMAND_ID, isDivider } from "src/util/commandIds";
import { hasSubmenu, SubmenuCommand } from "src/util/commandStorage";

interface RenderContext {
  app: App;
  plugin: EditingToolbarPlugin;
  bar: HTMLElement;
}

export function renderToolbarCommands(
  ctx: RenderContext,
  commands: Command[],
): void {
  commands.forEach((item) => {
    if (hasSubmenu(item)) {
      if (item.menuType === "dropdown") {
        renderDropdown(ctx, item);
      } else {
        renderFlyout(ctx, item);
      }
      return;
    }

    if (isColorPickerCommand(item.id)) {
      createColorPickerButton(ctx.app, ctx.plugin, ctx.bar, item);
      return;
    }

    renderPlainButton(ctx, item);
  });
}

function renderPlainButton(ctx: RenderContext, item: Command) {
  const button = new ButtonComponent(ctx.bar)
    .setTooltip(tooltipFor(ctx.app, item))
    .onClick(() => runCommand(ctx, item.id));

  button.setClass("editingToolbarCommandItem");
  if (isDivider(item.id)) button.setClass(DIVIDER_COMMAND_ID);
  applyButtonIcon(button, item.icon);
}

function renderDropdown(ctx: RenderContext, item: SubmenuCommand) {
  const parent = new ButtonComponent(ctx.bar);
  parent.setClass(SUBMENU_BUTTON_CLASS);
  applyButtonIcon(parent, item.icon);
  parent.setTooltip(tooltipFor(ctx.app, item));

  parent.onClick((evt: MouseEvent) => {
    const menu = new Menu();

    item.SubmenuCommands.forEach((subitem) => {
      if (isDivider(subitem.id)) {
        menu.addSeparator();
        menu.addItem((menuItem) => {
          menuItem.setTitle(t(subitem.name)).setDisabled(true).removeIcon();
        });
        return;
      }

      menu.addItem((menuItem) => {
        menuItem
          .setTitle(t(subitem.name))
          .setIcon(subitem.icon ?? null)
          .onClick(() => runCommand(ctx, subitem.id));
        menuItem.dom
          .createSpan({ cls: "menu-item-hotkey" })
          .setText(getHotkey(ctx.app, subitem.id));
      });
    });

    menu.dom.addClass("editing-toolbar-dropdown-menu");
    menu.showAtMouseEvent(evt);
  });
}

function renderFlyout(ctx: RenderContext, item: SubmenuCommand) {
  const parent = new ButtonComponent(ctx.bar);
  parent.setClass(SUBMENU_BUTTON_CLASS);
  applyButtonIcon(parent, item.icon);

  const submenu = createDiv("subitem");
  parent.buttonEl.insertAdjacentElement("afterbegin", submenu);

  item.SubmenuCommands.forEach((subitem) => {
    const subBtn = new ButtonComponent(submenu)
      .setTooltip(tooltipFor(ctx.app, subitem))
      .setClass("menu-item")
      .onClick(() => runCommand(ctx, subitem.id));

    if (isDivider(subitem.id)) subBtn.setClass(DIVIDER_COMMAND_ID);
    applyButtonIcon(subBtn, subitem.icon);
  });

  attachFlyoutClamp(parent.buttonEl);
}

function runCommand(ctx: RenderContext, commandId: string): void {
  runCommandById(ctx.app, commandId);
  syncToolbarState(ctx.plugin, ctx.bar);
}

function tooltipFor(app: App, item: Command): string {
  const label = t(item.name);
  const hotkey = getHotkey(app, item.id);
  return hotkey === NO_HOTKEY ? label : `${label}(${hotkey})`;
}
