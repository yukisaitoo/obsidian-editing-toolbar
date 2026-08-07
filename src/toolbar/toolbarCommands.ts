import { App, ButtonComponent, Command, Menu, setTooltip } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { runCommandById } from "src/plugin/pluginId";
import { DIVIDER_NAME } from "src/settings/defaultCommands";
import {
  colorPickerVariant,
  createColorPickerButton,
} from "src/toolbar/colorPickerButton";
import { attachFlyoutClamp } from "src/toolbar/geometry";
import { hotkeyLabel } from "src/toolbar/hotkeys";
import { DIVIDER_COMMAND_ID, isDivider } from "src/toolbar/layoutIds";
import { applyButtonIcon, SUBMENU_BUTTON_CLASS } from "src/toolbar/toolbarDom";
import { hasSubmenu, SubmenuCommand } from "src/util/commandStorage";
import { displayIcon, displayName } from "src/util/displayName";

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

    // A divider is a rule, not a control: no command to run, nothing to label.
    if (isDivider(item.id)) {
      ctx.bar.createDiv(DIVIDER_COMMAND_ID);
      return;
    }

    const variant = colorPickerVariant(item.id);
    if (variant) {
      createColorPickerButton(ctx.app, ctx.plugin, ctx.bar, item, variant);
      return;
    }

    renderPlainButton(ctx, item);
  });
}

function renderPlainButton(ctx: RenderContext, item: Command) {
  const button = new ButtonComponent(ctx.bar)
    .setTooltip(tooltipFor(ctx.app, item))
    .onClick(() => runCommandById(ctx.app, item.id));

  button.setClass("editingToolbarCommandItem");
  applyButtonIcon(button, displayIcon(ctx.app, item));
}

function renderDropdown(ctx: RenderContext, item: SubmenuCommand) {
  const parent = new ButtonComponent(ctx.bar);
  parent.setClass(SUBMENU_BUTTON_CLASS);
  applyButtonIcon(parent, displayIcon(ctx.app, item));
  parent.setTooltip(tooltipFor(ctx.app, item));

  parent.onClick((evt: MouseEvent) => {
    const menu = new Menu();

    item.SubmenuCommands.forEach((subitem) => {
      if (isDivider(subitem.id)) {
        menu.addSeparator();
        // Dividers keep DIVIDER_NAME until renamed; only a chosen name is a label.
        if (subitem.name !== DIVIDER_NAME) {
          menu.addItem((menuItem) => {
            menuItem
              .setTitle(displayName(ctx.app, subitem))
              .setDisabled(true)
              .removeIcon();
          });
        }
        return;
      }

      menu.addItem((menuItem) => {
        menuItem
          .setTitle(displayName(ctx.app, subitem))
          .setIcon(displayIcon(ctx.app, subitem) ?? null)
          .onClick(() => runCommandById(ctx.app, subitem.id));

        const hotkey = hotkeyLabel(ctx.app, subitem.id);
        if (hotkey) {
          menuItem.dom.createSpan({ cls: "menu-item-hotkey" }).setText(hotkey);
        }
      });
    });

    menu.dom.addClass("editing-toolbar-dropdown-menu");
    menu.showAtMouseEvent(evt);
  });
}

function renderFlyout(ctx: RenderContext, item: SubmenuCommand) {
  const parent = new ButtonComponent(ctx.bar);
  parent.setClass(SUBMENU_BUTTON_CLASS);

  // On the icon, not the button: the flyout below is a child of the button.
  setTooltip(
    applyButtonIcon(parent, displayIcon(ctx.app, item)),
    tooltipFor(ctx.app, item),
  );

  const submenu = createDiv("subitem");
  parent.buttonEl.insertAdjacentElement("afterbegin", submenu);

  item.SubmenuCommands.forEach((subitem) => {
    if (isDivider(subitem.id)) {
      submenu.createDiv(DIVIDER_COMMAND_ID);
      return;
    }

    const subBtn = new ButtonComponent(submenu)
      .setTooltip(tooltipFor(ctx.app, subitem))
      .setClass("menu-item")
      .onClick(() => runCommandById(ctx.app, subitem.id));

    applyButtonIcon(subBtn, displayIcon(ctx.app, subitem));
  });

  attachFlyoutClamp(parent.buttonEl);
}

function tooltipFor(app: App, item: Command): string {
  const label = displayName(app, item);
  const hotkey = hotkeyLabel(app, item.id);
  return hotkey ? `${label}(${hotkey})` : label;
}
