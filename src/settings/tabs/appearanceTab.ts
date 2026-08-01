import { ButtonComponent, setIcon, Setting } from "obsidian";
import {
  applyAppearanceVars,
  getAppearanceBucket,
  getAppearanceValue,
} from "src/settings/settingsData";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { SHARED_BAR_CLASS } from "src/toolbar/toolbarDom";
import { strings, t } from "src/translations/helper";

const BACKGROUND_SWATCHES = [
  "#F5F8FA",
  "#F4F1E8",
  "#2D3033",
  "#1A2F28",
  "#2A1D3B",
];

const ICON_SWATCHES = ["#4A5568", "#D4AF37", "#2D3033", "#6D5846", "#4C2A55"];

const PREVIEW_COMMANDS = [
  { name: "Bold", icon: "bold" },
  { name: "Italics", icon: "italic" },
  { name: "Strikethrough", icon: "strikethrough" },
  { name: "Code", icon: "code" },
  { name: "Blockquote", icon: "quote-glyph" },
  { name: "Link", icon: "link" },
  { name: "Checklist status", icon: "checkbox-glyph" },
  { name: "Insert callout", icon: "lucide-quote" },
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
    cssProperty: "--editing-toolbar-background-color",
    swatches: BACKGROUND_SWATCHES,
  });
  renderColorSetting(ctx, toolbarContainer, {
    name: strings.toolbarIconColor,
    desc: strings.setColorToolbarIcon,
    cls: "toolbar_icon",
    key: "toolbarIconColor",
    cssProperty: "--editing-toolbar-icon-color",
    swatches: ICON_SWATCHES,
  });

  new Setting(toolbarContainer)
    .setName(strings.toolbarIconSize)
    .setDesc(strings.setSizeToolbarIconPx)
    .addSlider((slider) => {
      slider
        .setValue(getAppearanceValue(ctx.plugin.settings, "toolbarIconSize"))
        .setLimits(12, 32, 1)
        .setDynamicTooltip()
        .onChange(async (value) => {
          getAppearanceBucket(ctx.plugin.settings).toolbarIconSize = value;

          activeWindow.document.documentElement.style.setProperty(
            "--toolbar-icon-size",
            `${value}px`,
          );
          await ctx.plugin.saveSettings();
          ctx.rebuildToolbar();
        });
    });

  renderPreview(ctx, toolbarContainer);
}

interface ColorSettingConfig {
  name: string;
  desc: string;
  cls: string;
  key: "toolbarBackgroundColor" | "toolbarIconColor";
  cssProperty: string;
  swatches: string[];
}

function applyColor(
  ctx: SettingsTabContext,
  config: ColorSettingConfig,
  color: string,
): void {
  activeWindow.document.documentElement.style.setProperty(
    config.cssProperty,
    color,
  );
  void ctx.plugin.saveSettings();
  // No refresh() here: inside a Pickr callback a synchronous re-render would
  // destroyAndRemove() the instance still dispatching. The rebuild does it on a timer.
  ctx.rebuildToolbar();
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

      ctx.createPickr({
        el: pickerContainer.createDiv({ cls: "picker" }),
        container: pickerContainer,
        swatches: config.swatches,
        opacity: false,
        defaultColor: getAppearanceValue(ctx.plugin.settings, config.key),
        onSave: (hexColor) => {
          getAppearanceBucket(ctx.plugin.settings)[config.key] = hexColor;
          applyColor(ctx, config, hexColor);
        },
        onClear: () => {
          delete getAppearanceBucket(ctx.plugin.settings)[config.key];
          applyColor(
            ctx,
            config,
            getAppearanceValue(ctx.plugin.settings, config.key),
          );
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
    text: strings.toolbarPreviewHypotheticalCommandConfigurati,
    cls: "toolbar-preview-label",
  });

  const wrapper = previewContainer.createDiv("preview-toolbar-wrapper");

  const previewBar = wrapper.createDiv();
  previewBar.addClass("editing-toolbar-preview");
  previewBar.addClass("editingToolbarDefaultAesthetic");
  // The shared chrome class, but not the live-instance one: the toolbar lifecycle
  // (selfDestruct, getExistingToolbar) must never see the preview.
  previewBar.addClass(SHARED_BAR_CLASS);

  PREVIEW_COMMANDS.forEach((command) => {
    const button = new ButtonComponent(previewBar);
    button.setClass("editingToolbarCommandItem");
    button.setTooltip(t(command.name));
    setIcon(button.buttonEl, command.icon);
  });

  applyAppearanceVars(previewBar, ctx.plugin.settings);
}
