import { ButtonComponent, Setting } from "obsidian";
import { COMMAND_LABELS, type CommandId } from "src/commands/commandLabels";
import {
  applyAppearanceVars,
  getAppearanceBucket,
  getAppearanceValue,
  hasAppearanceOverride,
  TOOLBAR_ICON_SIZE_MAX,
  TOOLBAR_ICON_SIZE_MIN,
} from "src/settings/settingsData";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { applyButtonIcon, SHARED_BAR_CLASS } from "src/toolbar/toolbarDom";
import { strings, t } from "src/translations/helper";
import { resolveHexColor } from "src/util/color";

const BACKGROUND_SWATCHES = [
  "#F5F8FA",
  "#F4F1E8",
  "#2D3033",
  "#1A2F28",
  "#2A1D3B",
];

const ICON_SWATCHES = ["#4A5568", "#D4AF37", "#2D3033", "#6D5846", "#4C2A55"];

const PREVIEW_COMMANDS: CommandId[] = [
  "toggle-bold",
  "toggle-italics",
  "toggle-strikethrough",
  "editor:toggle-code",
  "editor:toggle-blockquote",
  "editor:insert-wikilink",
  "editor:toggle-checklist-status",
  "insert-callout",
];

export function renderAppearanceTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  const toolbarContainer = containerEl.createDiv("custom-toolbar-container");
  renderColorSetting(ctx, toolbarContainer, {
    name: strings.toolbarBackgroundColor,
    desc: strings.setBackgroundColorToolbar,
    cls: "toolbar_background",
    key: "toolbarBackgroundColor",
    swatches: BACKGROUND_SWATCHES,
  });
  renderColorSetting(ctx, toolbarContainer, {
    name: strings.toolbarIconColor,
    desc: strings.setColorToolbarIcon,
    cls: "toolbar_icon",
    key: "toolbarIconColor",
    swatches: ICON_SWATCHES,
  });

  new Setting(toolbarContainer)
    .setName(strings.toolbarIconSize)
    .setDesc(strings.setSizeToolbarIconPx)
    .addSlider((slider) => {
      slider
        .setLimits(TOOLBAR_ICON_SIZE_MIN, TOOLBAR_ICON_SIZE_MAX, 1)
        .setValue(getAppearanceValue(ctx.plugin.settings, "toolbarIconSize"))
        .setDisplayFormat((value) => `${value}px`)
        .onChange(async (value) => {
          getAppearanceBucket(ctx.plugin.settings).toolbarIconSize = value;

          await ctx.plugin.saveSettings();
          ctx.applyChanges();
        });
    });

  renderPreview(ctx, toolbarContainer);
}

interface ColorSettingConfig {
  name: string;
  desc: string;
  cls: string;
  key: "toolbarBackgroundColor" | "toolbarIconColor";
  swatches: string[];
}

function applyColor(ctx: SettingsTabContext): void {
  void ctx.plugin.saveSettings();
  ctx.applyChanges();
}

function renderColorSetting(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  config: ColorSettingConfig,
): void {
  new Setting(containerEl)
    .setName(config.name)
    .setDesc(config.desc)
    .setClass(config.cls)
    .then((setting) => {
      const pickerContainer = setting.controlEl.createDiv({
        cls: "pickr-container",
      });
      // Pickr is still seeded with the resolved theme colour below, so the popup
      // opens on it and Save writes it; only the swatch is left reading as empty.
      pickerContainer.toggleClass(
        "pickr-unset",
        !hasAppearanceOverride(ctx.plugin.settings, config.key),
      );

      ctx.createPickr({
        el: pickerContainer.createDiv({ cls: "picker" }),
        container: pickerContainer,
        swatches: config.swatches,
        opacity: false,
        defaultColor:
          resolveHexColor(
            pickerContainer,
            getAppearanceValue(ctx.plugin.settings, config.key),
          ) ?? "#000000",
        onSave: (hexColor) => {
          getAppearanceBucket(ctx.plugin.settings)[config.key] = hexColor;
          applyColor(ctx);
        },
        onClear: () => {
          delete getAppearanceBucket(ctx.plugin.settings)[config.key];
          applyColor(ctx);
        },
      });
    });
}

function renderPreview(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  const previewContainer = containerEl.createDiv("toolbar-preview-section");
  previewContainer.createEl("h3", {
    text: strings.toolbarPreviewLabel,
    cls: "toolbar-preview-label",
  });

  const wrapper = previewContainer.createDiv("preview-toolbar-wrapper");

  const previewBar = wrapper.createDiv();
  previewBar.addClass("editingToolbarDefaultAesthetic");
  // The shared chrome class, but not the live-instance one: the toolbar lifecycle
  // (removeAllToolbars, toolbarIn) must never see the preview.
  previewBar.addClass(SHARED_BAR_CLASS);

  PREVIEW_COMMANDS.forEach((id) => {
    const { name, icon } = COMMAND_LABELS[id];
    const button = new ButtonComponent(previewBar);
    button.setClass("editingToolbarCommandItem");
    button.setTooltip(t(name));
    applyButtonIcon(button, icon);
  });

  applyAppearanceVars(previewBar, ctx.plugin.settings);
}
