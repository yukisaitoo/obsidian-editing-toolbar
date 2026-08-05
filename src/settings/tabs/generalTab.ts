import { Setting } from "obsidian";
import { ConfirmModal } from "src/modals/confirmModal";
import type { CustomColorKey } from "src/settings/settingsData";
import { DEFAULT_SETTINGS } from "src/settings/settingsData";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { strings } from "src/translations/helper";

export function renderGeneralTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  const paintbrushContainer = containerEl.createDiv(
    "custom-paintbrush-container",
  );
  renderSwatchRow(ctx, paintbrushContainer, {
    name: strings.setCustomBackground,
    desc: strings.setCustomBackgroundDesc,
    cls: "custom_bg",
    keyPrefix: "custom_bg",
    // `<mark style="background:…">` carry alpha
    opacity: true,
  });
  renderSwatchRow(ctx, paintbrushContainer, {
    name: strings.setCustomFontColor,
    desc: strings.setCustomFontColorDesc,
    cls: "custom_font",
    keyPrefix: "custom_fc",
    // `<font color=…>` cannot carry alpha
    opacity: false,
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
            },
          });
        });
    });
}

function renderSwatchRow(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  config: {
    name: string;
    desc: string;
    cls: string;
    keyPrefix: "custom_bg" | "custom_fc";
    opacity: boolean;
  },
): void {
  const keys = [1, 2, 3, 4, 5].map(
    (i) => `${config.keyPrefix}${i}` as CustomColorKey,
  );
  const swatches = keys.map((key) => DEFAULT_SETTINGS[key]);

  new Setting(containerEl)
    .setName(config.name)
    .setDesc(config.desc)
    .setClass(config.cls)
    .then((setting) => {
      const pickerContainer = setting.controlEl.createDiv({
        cls: "pickr-container",
      });

      for (const settingKey of keys) {
        ctx.createPickr({
          el: pickerContainer.createDiv({ cls: "picker" }),
          container: pickerContainer,
          swatches,
          opacity: config.opacity,
          defaultColor: ctx.plugin.settings[settingKey] || "#000000",
          onSave: (hexColor) => {
            ctx.plugin.settings[settingKey] = hexColor;
            void ctx.plugin.saveSettings();
          },
          onClear: () => {
            ctx.plugin.settings[settingKey] = DEFAULT_SETTINGS[settingKey];
            void ctx.plugin.saveSettings();
            ctx.applyChanges();
          },
        });
      }
    });
}
