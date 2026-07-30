import { ButtonComponent, setIcon, Setting } from "obsidian";
import type { ToolbarStyleKey } from "src/settings/settingsData";
import {
  applyAppearanceVars,
  getAppearanceBucket,
  getAppearanceValue,
  POSITION_STYLES,
  STYLE_LABELS,
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

// A fixed command set for the preview bar
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

const PREVIEW_LAYOUT_CLASS: Record<ToolbarStyleKey, string> = {
  top: "top",
  following: "editingToolbarFlex",
};

export function renderAppearanceTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  const editingStyle = ctx.plugin.resolveActiveStyle();
  ctx.plugin.appearanceEditStyle = editingStyle;

  const styleContainer = containerEl.createDiv("appearanceSetting-container");
  new Setting(styleContainer)
    .setName(strings.toolbarSettings)
    .setDesc(strings.chooseWhichToolbarStyleS)
    .addDropdown((dropdown) => {
      POSITION_STYLES.forEach((style) =>
        dropdown.addOption(style, STYLE_LABELS[style]),
      );
      dropdown.setValue(editingStyle).onChange(async (value) => {
        const style = value as ToolbarStyleKey;
        ctx.plugin.appearanceEditStyle = style;
        ctx.plugin.settings.positionStyle = style;
        await ctx.plugin.saveSettings();
        // Rebuilding is what swaps the workspace over to the new style; it also
        // re-renders this pane, so the preview follows without a refresh() here.
        ctx.rebuildToolbar();
      });
    });

  const toolbarContainer = containerEl.createDiv("custom-toolbar-container");
  renderColorSetting(ctx, toolbarContainer, editingStyle, {
    name: strings.toolbarBackgroundColor,
    desc: strings.setBackgroundColorToolbar,
    cls: "toolbar_background",
    key: "toolbarBackgroundColor",
    cssProperty: "--editing-toolbar-background-color",
    swatches: BACKGROUND_SWATCHES,
  });
  renderColorSetting(ctx, toolbarContainer, editingStyle, {
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
        .setValue(
          getAppearanceValue(
            ctx.plugin.settings,
            "toolbarIconSize",
            editingStyle,
          ),
        )
        .setLimits(12, 32, 1)
        .setDynamicTooltip()
        .onChange(async (value) => {
          getAppearanceBucket(
            ctx.plugin.settings,
            editingStyle,
          ).toolbarIconSize = value;

          if (ctx.plugin.liveStyle === editingStyle) {
            document.documentElement.style.setProperty(
              "--toolbar-icon-size",
              `${value}px`,
            );
          }
          await ctx.plugin.saveSettings();
          ctx.rebuildToolbar();
        });
    });

  renderPreview(ctx, toolbarContainer, editingStyle);
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
  editingStyle: ToolbarStyleKey,
  config: ColorSettingConfig,
  color: string,
): void {
  // Only push the global CSS variable when editing the style on screen.
  if (ctx.plugin.liveStyle === editingStyle) {
    document.documentElement.style.setProperty(config.cssProperty, color);
  }
  void ctx.plugin.saveSettings();
  // Deliberately no refresh() alongside this: we are inside a Pickr callback, and
  // a synchronous re-render would destroyAndRemove() the very instance still
  // dispatching. The rebuild re-renders this pane on a timer instead.
  ctx.rebuildToolbar();
}

function renderColorSetting(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  editingStyle: ToolbarStyleKey,
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
        defaultColor: getAppearanceValue(
          ctx.plugin.settings,
          config.key,
          editingStyle,
        ),
        onSave: (hexColor) => {
          getAppearanceBucket(ctx.plugin.settings, editingStyle)[config.key] =
            hexColor;
          applyColor(ctx, editingStyle, config, hexColor);
        },
        onClear: () => {
          // Dropping the key falls the style back to the global appearance field.
          delete getAppearanceBucket(ctx.plugin.settings, editingStyle)[
            config.key
          ];
          applyColor(
            ctx,
            editingStyle,
            config,
            getAppearanceValue(ctx.plugin.settings, config.key, editingStyle),
          );
        },
      });
    });
}

function renderPreview(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
  editingStyle: ToolbarStyleKey,
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
  previewBar.addClass(PREVIEW_LAYOUT_CLASS[editingStyle]);
  // Borrows the real bar's chrome without the live-instance class, so the
  // toolbar lifecycle (selfDestruct, getExistingToolbar) can never see it.
  previewBar.addClass(SHARED_BAR_CLASS);

  PREVIEW_COMMANDS.forEach((command) => {
    const button = new ButtonComponent(previewBar);
    button.setClass("editingToolbarCommandItem");
    button.setTooltip(t(command.name));
    setIcon(button.buttonEl, command.icon);
  });

  // Same custom properties the real toolbar sets, so the preview tracks the size.
  applyAppearanceVars(previewBar, ctx.plugin.settings, editingStyle);
}
