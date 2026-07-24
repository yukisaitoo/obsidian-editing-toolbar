// English (United Kingdom)

import type { en } from "../en";

const ui: Partial<Record<keyof typeof en, string>> = {
  clickPickerAdjustColor: "Click on the picker to adjust the colour",
  copyClipboard: "Copy",
  customBackgroundColor: "Custom Background Colour",
  customFontColor: "Custom Font Colour",
  customFontColors: "Custom Font Colours",
  customColors: "Custom Colours",
  themeColors: "Theme Colours",
  standardColors: "Standard Colours",
  translucentColors: "Translucent Colours",
  highlighterColors: "Highlighter Colours",
  fontColors: "Font Colours",
  fontColorFormattingBrush: "Font-Colour formatting brush ON!",
  backgroundColorFormattingBrush: "Background-Colour formatting brush ON!",
  selectPresetToolbarThemeAutomatically:
    "Select a preset toolbar theme, automatically setting the background colour, icon colour, and size for the selected style.",
  setBackgroundColorToolbar: "Set the background colour of the toolbar.",
  setColorToolbarIcon: "Set the colour of the toolbar icon.",
  toolbarBackgroundColor: "Toolbar Background Colour",
  toolbarIconColor: "Toolbar Icon Colour",
  format:
    "】format\nClick the mouse middle or right key to close the formatting-brush",
  setCustomFontColor: "🖌️ Set Custom Font Colour",
};

export default ui;

export const commandNames: Record<string, string> = {
  "Background color": "Background colour",
};
