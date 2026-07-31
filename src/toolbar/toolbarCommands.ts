import { App, ButtonComponent, Command, Menu } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import {
  createColorPickerButton,
  isColorPickerCommand,
} from "src/toolbar/colorPickerButton";
import { attachFlyoutClamp } from "src/toolbar/geometry";
import {
  applyButtonIcon,
  applyMenuItemIcon,
  getHotkey,
  NO_HOTKEY,
  TOOLTIP_DELAY,
} from "src/toolbar/toolbarDom";
import { syncToolbarState } from "src/toolbar/toolbarVisibility";
import { t } from "src/translations/helper";
import { DIVIDER_COMMAND_ID, isDivider } from "src/util/commandIds";

interface RenderContext {
  app: App;
  plugin: EditingToolbarPlugin;
  bar: HTMLElement;
  style: ToolbarStyleKey;
}

export function renderToolbarCommands(
  ctx: RenderContext,
  commands: Command[],
): void {
  commands.forEach((item, index) => {
    if ("SubmenuCommands" in item) {
      if (item.menuType === "dropdown") {
        renderDropdown(ctx, item, index);
      } else {
        renderFlyout(ctx, item, index);
      }
      return;
    }

    if (isColorPickerCommand(item.id)) {
      createColorPickerButton(ctx.app, ctx.plugin, ctx.bar, ctx.style, item);
      return;
    }

    renderPlainButton(ctx, item);
  });
}

function renderPlainButton(ctx: RenderContext, item: Command) {
  const button = new ButtonComponent(ctx.bar)
    .setTooltip(tooltipFor(ctx.app, item), { delay: TOOLTIP_DELAY })
    .onClick(() => runCommand(ctx, item.id));

  button.setClass("editingToolbarCommandItem");
  applyTooltipPosition(ctx, button);
  if (isDivider(item.id)) button.setClass(DIVIDER_COMMAND_ID);
  applyButtonIcon(button, item.icon);
}

function renderDropdown(ctx: RenderContext, item: Command, index: number) {
  const parent = new ButtonComponent(ctx.bar);
  parent.setClass("editingToolbarCommandsubItem" + index);
  applyTooltipPosition(ctx, parent);
  applyButtonIcon(parent, item.icon);
  parent.setTooltip(tooltipFor(ctx.app, item), { delay: TOOLTIP_DELAY });

  parent.onClick((evt: MouseEvent) => {
    const menu = new Menu();

    item.SubmenuCommands?.forEach((subitem) => {
      if (isDivider(subitem.id)) {
        menu.addSeparator();
        menu.addItem((menuItem) => {
          menuItem.setTitle(t(subitem.name)).setDisabled(true);
          applyMenuItemIcon(menuItem, "");
        });
        return;
      }

      menu.addItem((menuItem) => {
        menuItem.setTitle(t(subitem.name)).onClick(() => runCommand(ctx, subitem.id));
        applyMenuItemIcon(menuItem, subitem.icon);
        menuItem.dom
          .createSpan({ cls: "menu-item-hotkey" })
          .setText(getHotkey(ctx.app, subitem.id));
      });
    });

    menu.dom.addClass("editing-toolbar-dropdown-menu");
    menu.showAtMouseEvent(evt);
  });
}

function renderFlyout(ctx: RenderContext, item: Command, index: number) {
  const parent = new ButtonComponent(ctx.bar);
  parent.setClass("editingToolbarCommandsubItem" + index);
  applyTooltipPosition(ctx, parent);
  applyButtonIcon(parent, item.icon);

  const submenu = createDiv("subitem");
  parent.buttonEl.insertAdjacentElement("afterbegin", submenu);

  item.SubmenuCommands?.forEach((subitem) => {
    const subBtn = new ButtonComponent(submenu)
      .setTooltip(tooltipFor(ctx.app, subitem), { delay: TOOLTIP_DELAY })
      .setClass("menu-item")
      .onClick(() => runCommand(ctx, subitem.id));

    applyTooltipPosition(ctx, subBtn);
    if (isDivider(subitem.id)) subBtn.setClass(DIVIDER_COMMAND_ID);
    applyButtonIcon(subBtn, subitem.icon);
  });

  attachFlyoutClamp(parent.buttonEl);
}

function runCommand(ctx: RenderContext, commandId: string): void {
  ctx.app.commands.executeCommandById(commandId);
  syncToolbarState(ctx.plugin, ctx.bar, ctx.style);
}

function tooltipFor(app: App, item: Command): string {
  const label = t(item.name);
  const hotkey = getHotkey(app, item.id);
  return hotkey === NO_HOTKEY ? label : `${label}(${hotkey})`;
}

// A floating bar sits over the text it acts on, so its tooltips go above it.
function applyTooltipPosition(ctx: RenderContext, button: ButtonComponent): void {
  if (ctx.style !== "top") {
    button.buttonEl.setAttribute("aria-label-position", "top");
  }
}
