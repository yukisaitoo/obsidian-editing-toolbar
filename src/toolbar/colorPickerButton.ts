import { App, ButtonComponent, Command, setTooltip } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { ownCommand, PLUGIN_ID, runCommandById } from "src/plugin/pluginId";
import {
  renderBackgroundColorPicker,
  renderFontColorPicker,
} from "src/toolbar/colorPickerDom";
import { attachFlyoutClamp } from "src/toolbar/geometry";
import { applyButtonIcon, SUBMENU_BUTTON_CLASS } from "src/toolbar/toolbarDom";
import { strings } from "src/translations/helper";
import { toHexColor } from "src/util/color";
import { displayIcon, displayName } from "src/util/displayName";

interface PickerVariant {
  // The swatch panel's palette icon is not a command, so it has no registry name.
  customTooltip: string;
  render: (parent: HTMLElement, plugin: EditingToolbarPlugin) => void;
  settingsKey: "lastFontColor" | "lastHighlightColor";
}

const VARIANTS: Record<string, PickerVariant | undefined> = {
  [ownCommand("change-font-color")]: {
    customTooltip: strings.customFontColor,
    render: renderFontColorPicker,
    settingsKey: "lastFontColor",
  },
  [ownCommand("change-background-color")]: {
    customTooltip: strings.customBackgroundColor,
    render: renderBackgroundColorPicker,
    settingsKey: "lastHighlightColor",
  },
};

export function colorPickerVariant(id: string): PickerVariant | undefined {
  return VARIANTS[id];
}

export function createColorPickerButton(
  app: App,
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
  item: Command,
  variant: PickerVariant,
): void {
  const button = new ButtonComponent(bar)
    .setClass(SUBMENU_BUTTON_CLASS)
    .setClass("editingToolbarColorPickerItem")
    .onClick((event: MouseEvent) => {
      // Clicks inside the swatch panel are handled by the swatches themselves.
      const target = event.target as HTMLElement | null;
      if (target?.closest(".x-color-picker-wrapper, .subitem")) return;

      runCommandById(app, item.id);
    });

  // On the icon, not the button: the swatch panel below is a child of the button.
  setTooltip(
    applyButtonIcon(button, displayIcon(app, item)),
    displayName(app, item),
  );

  const submenu = createEl("div");
  submenu.addClass("subitem");
  variant.render(submenu, plugin);
  button.buttonEl.insertAdjacentElement("afterbegin", submenu);

  wireSwatches(app, plugin, submenu, variant, item.id);

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
  app: App,
  plugin: EditingToolbarPlugin,
  root: ParentNode,
  variant: PickerVariant,
  commandId: string,
): void {
  const table = root.querySelector<HTMLTableElement>(".x-color-picker-table");
  if (!table) return;

  table.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const cell = (event.target as HTMLElement | null)?.closest("td");
    const color = cell && toHexColor(cell.style.backgroundColor);
    if (!color) return;

    // The command reads the colour back out of settings, so store it first.
    plugin.settings[variant.settingsKey] = color;
    plugin.applyRootColorVars();
    void plugin.saveSettings();
    runCommandById(app, commandId);
  });
}

// The custom swatches this button edits live on the General tab. Reached by id, so
// this does not depend on General happening to be the first tab.
function openCustomColorSettings(app: App, plugin: EditingToolbarPlugin): void {
  app.setting.open();
  app.setting.openTabById(PLUGIN_ID);
  plugin.settingTab.setActiveTab("general");
}
