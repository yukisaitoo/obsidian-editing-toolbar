import { ButtonComponent, Setting } from "obsidian";
import { type CommandId } from "src/commands/commandLabels";
import { toCommand } from "src/settings/defaultCommands";
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
import { strings } from "src/translations/helper";
import { resolveHexColor } from "src/util/color";
import { displayIcon, displayName } from "src/util/displayName";

const BACKGROUND_SWATCHES = [
  "#F5F8FA",
  "#F4F1E8",
  "#2D3033",
  "#1A2F28",
  "#2A1D3B",
];

const ICON_SWATCHES = ["#4A5568", "#D4AF37", "#2D3033", "#6D5846", "#4C2A55"];

const PREVIEW_COMMANDS: CommandId[] = [
  "editor:toggle-bold",
  "editor:toggle-italics",
  "editor:toggle-strikethrough",
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

  // On the container, not the bar: the vars inherit, and the controls that
  // repaint the preview are built before the bar exists.
  const applyPreview = () =>
    applyAppearanceVars(toolbarContainer, ctx.plugin.settings);
  applyPreview();

  renderColorSetting(
    ctx,
    toolbarContainer,
    {
      name: strings.toolbarBackgroundColor,
      desc: strings.setBackgroundColorToolbar,
      key: "toolbarBackgroundColor",
      swatches: BACKGROUND_SWATCHES,
    },
    applyPreview,
  );
  renderColorSetting(
    ctx,
    toolbarContainer,
    {
      name: strings.toolbarIconColor,
      desc: strings.setColorToolbarIcon,
      key: "toolbarIconColor",
      swatches: ICON_SWATCHES,
    },
    applyPreview,
  );

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
          applyPreview();
          await ctx.persist();
        });
    });

  renderPreview(ctx, toolbarContainer);
}

interface ColorSettingConfig {
  name: string;
  desc: string;
  key: "toolbarBackgroundColor" | "toolbarIconColor";
  swatches: string[];
}

function renderColorSetting(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  config: ColorSettingConfig,
  applyPreview: () => void,
): void {
  new Setting(containerEl)
    .setName(config.name)
    .setDesc(config.desc)
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
        el: pickerContainer.createDiv(),
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
          pickerContainer.removeClass("pickr-unset");
          applyPreview();
          void ctx.persist();
        },
        // Pickr repaints and reseeds itself on save, but not on clear.
        onClear: () => {
          delete getAppearanceBucket(ctx.plugin.settings)[config.key];
          void ctx.persist();
          ctx.refresh();
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
  // (removeAllToolbars, findToolbar) must never see the preview.
  previewBar.addClass(SHARED_BAR_CLASS);

  PREVIEW_COMMANDS.forEach((id) => {
    const command = toCommand(id);
    const button = new ButtonComponent(previewBar);
    button.setClass("editingToolbarCommandItem");
    button.setTooltip(displayName(ctx.app, command));
    applyButtonIcon(button, displayIcon(ctx.app, command));
  });
}
