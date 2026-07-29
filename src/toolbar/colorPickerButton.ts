import { App, ButtonComponent, Command } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import { attachFlyoutClamp } from "src/toolbar/geometry";
import { applyButtonIcon, TOOLTIP_DELAY } from "src/toolbar/toolbarDom";
import {
  applyToolbarState,
  resolveToolbarState,
} from "src/toolbar/toolbarVisibility";
import { strings } from "src/translations/helper";
import {
  backcolorpicker,
  colorpicker,
  setBackgroundcolor,
  setFontcolor,
} from "src/util/util";

interface PickerVariant {
  tooltip: string;
  customTooltip: string;
  tableId: string;
  iconId: string;
  html: (plugin: EditingToolbarPlugin) => string;
  settingsKey: "lastFontColor" | "lastHighlightColor";
  apply: typeof setFontcolor;
}

const VARIANTS: Record<string, PickerVariant> = {
  "editing-toolbar:change-font-color": {
    tooltip: strings.fontColors,
    customTooltip: strings.customFontColor,
    tableId: "x-color-picker-table",
    iconId: "change-font-color-icon",
    html: colorpicker,
    settingsKey: "lastFontColor",
    apply: setFontcolor,
  },
  "editing-toolbar:change-background-color": {
    tooltip: strings.backgroundColor,
    customTooltip: strings.customBackgroundColor,
    tableId: "x-backgroundcolor-picker-table",
    iconId: "change-background-color-icon",
    html: backcolorpicker,
    settingsKey: "lastHighlightColor",
    apply: setBackgroundcolor,
  },
};

export function isColorPickerCommand(id: string): boolean {
  return id in VARIANTS;
}

export function createColorPickerButton(
  app: App,
  plugin: EditingToolbarPlugin,
  bar: HTMLElement,
  style: ToolbarStyleKey,
  item: Command,
): void {
  const variant = VARIANTS[item.id];

  const button = new ButtonComponent(bar)
    .setClass("editingToolbarCommandsubItem-font-color")
    .setTooltip(variant.tooltip, { delay: TOOLTIP_DELAY })
    .onClick((event: MouseEvent) => {
      // Clicks inside the swatch panel are handled by the swatches themselves.
      const target = event.target as HTMLElement | null;
      if (target?.closest(".x-color-picker-wrapper, .subitem")) return;

      app.commands.executeCommandById(item.id);
      applyToolbarState(bar, resolveToolbarState(plugin, style));
    });
  applyButtonIcon(button, item.icon);

  const submenu = createEl("div");
  submenu.addClass("subitem");
  submenu.innerHTML = variant.html(plugin);
  button.buttonEl.insertAdjacentElement("afterbegin", submenu);

  wireSwatches(plugin, submenu, variant);

  const wrapper = submenu.querySelector<HTMLElement>(".x-color-picker-wrapper");
  if (wrapper) {
    new ButtonComponent(wrapper)
      .setIcon("palette")
      .setTooltip(variant.customTooltip, { delay: TOOLTIP_DELAY })
      .onClick(() => openAppearanceSettings(app));
  }

  attachFlyoutClamp(button.buttonEl);
}

/** Each swatch cell applies its own `background-color`; the header rows are inert. */
function wireSwatches(
  plugin: EditingToolbarPlugin,
  root: ParentNode,
  variant: PickerVariant,
): void {
  const table = root.querySelector<HTMLTableElement>(`#${variant.tableId}`);
  if (!table) return;

  Array.from(table.rows)
    .slice(1)
    .forEach((row) => {
      Array.from(row.cells).forEach((cell) => {
        cell.onclick = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();

          const editor = plugin.commandsManager.getActiveEditor();
          const raw = (event.currentTarget as HTMLElement).style.backgroundColor;
          if (!editor || !raw) return;

          const color = toHex(raw);
          plugin.settings[variant.settingsKey] = color;
          variant.apply(color, editor);
          paintColorIcons(cell.ownerDocument, variant.iconId, color);
          void plugin.saveSettings();
        };
      });
    });
}

export function syncColorIcons(
  doc: Document,
  settings: { lastFontColor: string; lastHighlightColor: string },
): void {
  paintColorIcons(doc, "change-font-color-icon", settings.lastFontColor);
  paintColorIcons(
    doc,
    "change-background-color-icon",
    settings.lastHighlightColor,
  );
}

function paintColorIcons(doc: Document, iconId: string, color: string): void {
  doc
    .querySelectorAll<HTMLElement>(`#${iconId}`)
    .forEach((el) => (el.style.fill = color));
}

function openAppearanceSettings(app: App): void {
  app.setting.open();
  app.setting.openTabById("editing-toolbar");
  setTimeout(() => {
    const tabs = app.setting.activeTab?.containerEl.querySelector(
      ".editing-toolbar-tabs",
    );
    (tabs?.children[0] as HTMLElement | undefined)?.click();
  }, 200);
}

/** Swatches carry computed `rgb(...)`; settings and markup want hex. */
function toHex(color: string): string {
  const rgb = color.match(/\d+/g);
  if (/^rgba?\(/i.test(color) && rgb && rgb.length >= 3) {
    return (
      "#" +
      rgb
        .slice(0, 3)
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  const short = color.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    return (
      "#" +
      short[1]
        .split("")
        .map((d) => d + d)
        .join("")
    );
  }

  return color;
}
