import { App, ButtonComponent, Command, Editor, setTooltip } from "obsidian";
import {
  BACKGROUND_COLOR_ICON_CLASS,
  FONT_COLOR_ICON_CLASS,
} from "src/icons/customIcons";
import type EditingToolbarPlugin from "src/plugin/main";
import { ownCommand, PLUGIN_ID, runCommandById } from "src/plugin/pluginId";
import { attachFlyoutClamp } from "src/toolbar/geometry";
import { applyButtonIcon, SUBMENU_BUTTON_CLASS } from "src/toolbar/toolbarDom";
import { syncToolbarState } from "src/toolbar/toolbarVisibility";
import { strings } from "src/translations/helper";
import { toHexColor } from "src/util/color";
import {
  renderBackgroundColorPicker,
  renderFontColorPicker,
} from "src/util/colorPickerDom";
import { setBackgroundColor, setFontColor } from "src/util/text/inlineColor";

interface PickerVariant {
  tooltip: string;
  customTooltip: string;
  iconClass: string;
  render: (parent: HTMLElement, plugin: EditingToolbarPlugin) => void;
  settingsKey: "lastFontColor" | "lastHighlightColor";
  apply: (color: string, editor: Editor) => void;
}

const VARIANTS: Record<string, PickerVariant> = {
  [ownCommand("change-font-color")]: {
    tooltip: strings.fontColors,
    customTooltip: strings.customFontColor,
    iconClass: FONT_COLOR_ICON_CLASS,
    render: renderFontColorPicker,
    settingsKey: "lastFontColor",
    apply: setFontColor,
  },
  [ownCommand("change-background-color")]: {
    tooltip: strings.backgroundColor,
    customTooltip: strings.customBackgroundColor,
    iconClass: BACKGROUND_COLOR_ICON_CLASS,
    render: renderBackgroundColorPicker,
    settingsKey: "lastHighlightColor",
    apply: setBackgroundColor,
  },
};

export function isColorPickerCommand(id: string): boolean {
  return id in VARIANTS;
}

export function createColorPickerButton(
  app: App,
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
  item: Command,
): void {
  const variant = VARIANTS[item.id];

  const button = new ButtonComponent(bar)
    .setClass(SUBMENU_BUTTON_CLASS)
    .setClass("editingToolbarColorPickerItem")
    .onClick((event: MouseEvent) => {
      // Clicks inside the swatch panel are handled by the swatches themselves.
      const target = event.target as HTMLElement | null;
      if (target?.closest(".x-color-picker-wrapper, .subitem")) return;

      runCommandById(app, item.id);
      syncToolbarState(plugin, bar);
    });

  // On the icon, not the button: the swatch panel below is a child of the button.
  setTooltip(applyButtonIcon(button, item.icon), variant.tooltip);

  const submenu = createEl("div");
  submenu.addClass("subitem");
  variant.render(submenu, plugin);
  button.buttonEl.insertAdjacentElement("afterbegin", submenu);

  wireSwatches(plugin, submenu, variant);

  const wrapper = submenu.querySelector<HTMLElement>(".x-color-picker-wrapper");
  if (wrapper) {
    new ButtonComponent(wrapper)
      .setIcon("palette")
      .setTooltip(variant.customTooltip)
      .onClick(() => openCustomColorSettings(app, plugin));
  }

  attachFlyoutClamp(button.buttonEl);
}

function wireSwatches(
  plugin: EditingToolbarPlugin,
  root: ParentNode,
  variant: PickerVariant,
): void {
  const table = root.querySelector<HTMLTableElement>(".x-color-picker-table");
  if (!table) return;

  // Every cell, header rows included: a header `th` carries no background colour,
  // so the `!raw` guard below already skips it.
  for (const row of Array.from(table.rows)) {
    for (const cell of Array.from(row.cells)) {
      cell.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const editor = plugin.commandsManager.getActiveEditor();
        const raw = cell.style.backgroundColor;
        if (!editor || !raw) return;

        const color = toHexColor(raw);
        if (!color) return;

        plugin.settings[variant.settingsKey] = color;
        variant.apply(color, editor);
        paintColorIcons(cell.ownerDocument, variant.iconClass, color);
        void plugin.saveSettings();
      });
    }
  }
}

export function syncColorIcons(
  doc: Document,
  settings: { lastFontColor: string; lastHighlightColor: string },
): void {
  paintColorIcons(doc, FONT_COLOR_ICON_CLASS, settings.lastFontColor);
  paintColorIcons(
    doc,
    BACKGROUND_COLOR_ICON_CLASS,
    settings.lastHighlightColor,
  );
}

// Every live bar has its own copy of the icon, so this paints all of them.
function paintColorIcons(
  doc: Document,
  iconClass: string,
  color: string,
): void {
  doc
    .querySelectorAll<SVGElement>(`.${iconClass}`)
    .forEach((el) => (el.style.fill = color));
}

// The custom swatches this button edits live on the General tab. Straight there by
// id — no timer, and no dependence on it happening to be the first tab.
function openCustomColorSettings(app: App, plugin: EditingToolbarPlugin): void {
  app.setting.open();
  app.setting.openTabById(PLUGIN_ID);
  plugin.settingTab.setActiveTab("general");
}
