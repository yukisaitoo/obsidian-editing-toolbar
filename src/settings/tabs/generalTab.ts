import { Setting } from "obsidian";
import { ConfirmModal } from "src/modals/confirmModal";
import type { CustomColorPrefix } from "src/settings/settingsData";
import { customColorKeys, DEFAULT_SETTINGS } from "src/settings/settingsData";
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
    keyPrefix: "custom_bg",
    // `<mark style="background:…">` carry alpha
    opacity: true,
  });
  renderSwatchRow(ctx, paintbrushContainer, {
    name: strings.setCustomFontColor,
    desc: strings.setCustomFontColorDesc,
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
              ctx.refresh();
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
    keyPrefix: CustomColorPrefix;
    opacity: boolean;
  },
): void {
  const keys = customColorKeys(config.keyPrefix);
  const swatches = keys.map((key) => DEFAULT_SETTINGS[key]);

  new Setting(containerEl)
    .setName(config.name)
    .setDesc(config.desc)
    .then((setting) => {
      const pickerContainer = setting.controlEl.createDiv({
        cls: "pickr-container",
      });

      for (const settingKey of keys) {
        const saveColor = (color: string) => {
          ctx.plugin.settings[settingKey] = color;
          void ctx.persist();
        };

        ctx.createPickr({
          el: pickerContainer.createDiv(),
          container: pickerContainer,
          swatches,
          opacity: config.opacity,
          defaultColor: ctx.plugin.settings[settingKey],
          onSave: saveColor,
          // Pickr repaints and reseeds itself on save, but not on clear.
          onClear: () => {
            saveColor(DEFAULT_SETTINGS[settingKey]);
            ctx.refresh();
          },
        });
      }
    });
}
