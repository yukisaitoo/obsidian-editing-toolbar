// English (United Kingdom)

import type { en } from "../en";

const ui: Partial<Record<keyof typeof en, string>> = {
  clickPickerAdjustColor: "Click on the picker to adjust the colour",
  copyClipboard: "Copy",
  customBackgroudColor: "Custom Backgroud Colour",
  customFontColor: "Custom Font Colour",
  fontColors: "Font Colours",
  fontColorFormattingBrush: "Font-Colour formatting brush ON!",
  getInspiredWhatOthersHave:
    "Get inspired by what others have created or showcase your own customisations.",
  selectPresetToolbarThemeAutomatically:
    "Select a preset toolbar theme, automatically setting the background colour, icon colour, and size for the selected style.",
  setBackgroundColorToolbar: "Set the background colour of the toolbar.",
  setColorToolbarIcon: "Set the colour of the toolbar icon.",
  toolbarBackgroundColor: "Toolbar Background Colour",
  toolbarIconColor: "Toolbar Icon Colour",
  whetherEnableMobileDevicesDevice:
    "Whether to enable on mobile devices with device width less than 768px, the default is disable.",
  format:
    "】format\nClick the mouse middle or right key to close the formatting-brush",
  setCustomFontColor: "🖌️ Set Custom Font Colour",
};

export default ui;

export const commandNames: Record<string, string> = {
  "Background color": "Background colour",
};
