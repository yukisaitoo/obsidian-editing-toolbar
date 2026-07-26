import { Setting } from "obsidian";
import { ConfirmModal } from "src/modals/ConfirmModal";
import type { CustomColorKey } from "src/settings/settingsData";
import { POSITION_STYLES, STYLE_LABELS } from "src/settings/settingsData";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { strings } from "src/translations/helper";

const BACKGROUND_SWATCHES = [
  "#FFB78B8C",
  "#CDF4698C",
  "#A0CCF68C",
  "#F0A7D88C",
  "#ADEFEF8C",
];

const FONT_SWATCHES = ["#D83931", "#DE7802", "#245BDB", "#6425D0", "#646A73"];

const STYLE_DESCRIPTIONS: Record<string, string> = {
  top: strings.enableToolbarPositionedTop,
  following: strings.enableToolbarAppearsUponText,
};

export function renderGeneralTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  const toggleContainer = containerEl.createDiv("generalSetting-container");
  POSITION_STYLES.forEach((style) => {
    new Setting(toggleContainer)
      .setName(STYLE_LABELS[style])
      .setDesc(STYLE_DESCRIPTIONS[style])
      .addToggle((toggle) => {
        toggle
          .setValue(ctx.plugin.isToolbarStyleEnabled(style))
          .onChange(async (enabled) => {
            await ctx.plugin.setToolbarStyleEnabled(style, enabled);
            ctx.refresh();
          });
      });
  });

  const paintbrushContainer = containerEl.createDiv(
    "custom-paintbrush-container",
  );
  renderSwatchRow(ctx, paintbrushContainer, {
    name: strings.setCustomBackground,
    desc: strings.setCustomBackgroundDesc,
    cls: "custom_bg",
    keyPrefix: "custom_bg",
    swatches: BACKGROUND_SWATCHES,
  });
  renderSwatchRow(ctx, paintbrushContainer, {
    name: strings.setCustomFontColor,
    desc: strings.setCustomFontColorDesc,
    cls: "custom_font",
    keyPrefix: "custom_fc",
    swatches: FONT_SWATCHES,
  });

  new Setting(containerEl)
    .setName(strings.resetConfiguration)
    .setDesc(strings.resetConfigurationDesc)
    .addButton((button) => {
      button
        .setButtonText(strings.reset)
        .setWarning()
        .onClick(() => {
          ConfirmModal.show(ctx.app, {
            title: strings.resetConfiguration,
            message: strings.resetConfigurationConfirm,
            confirmText: strings.reset,
            confirmWarning: true,
            onConfirm: async () => {
              await ctx.plugin.resetSettings();
              ctx.refresh();
            },
          });
        });
    });
}

/** Five colour pickers backed by the `custom_bg*` / `custom_fc*` settings keys. */
function renderSwatchRow(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  config: {
    name: string;
    desc: string;
    cls: string;
    keyPrefix: "custom_bg" | "custom_fc";
    swatches: string[];
  },
): void {
  new Setting(containerEl)
    .setName(config.name)
    .setDesc(config.desc)
    .setClass(config.cls)
    .then((setting) => {
      const pickerContainer = setting.controlEl.createDiv({
        cls: "pickr-container",
      });

      for (let i = 1; i <= 5; i++) {
        const settingKey = `${config.keyPrefix}${i}` as CustomColorKey;
        ctx.createPickr({
          el: pickerContainer.createDiv({ cls: "picker" }),
          container: pickerContainer,
          swatches: config.swatches,
          opacity: true,
          defaultColor: ctx.plugin.settings[settingKey] || "#000000",
          onSave: (hexColor) => {
            ctx.plugin.settings[settingKey] = hexColor;
            ctx.plugin.saveSettings();
          },
        });
      }
    });
}
