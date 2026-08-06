import {
  customColorKeys,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import {
  BACKGROUND_HIGHLIGHTER_COLORS,
  BACKGROUND_TRANSLUCENT_COLORS,
  FONT_STANDARD_COLORS,
  FONT_THEME_COLORS,
} from "src/toolbar/colorPalettes";
import { strings } from "src/translations/helper";

type PickerRow = { header: string } | { spacer: true } | { colors: string[] };

// wireSwatches reads each cell's `background-color` back off the CSSOM, so a colour
// that does not parse renders as no colour and is skipped rather than acted on.
function renderColorPicker(
  parent: HTMLElement,
  colspan: number,
  rows: PickerRow[],
  variantCls?: string,
): void {
  const wrapper = parent.createDiv({ cls: "x-color-picker-wrapper" });
  const table = wrapper.createEl("table", {
    cls: ["x-color-picker-table", ...(variantCls ? [variantCls] : [])],
  });
  const body = table.createEl("tbody");

  for (const row of rows) {
    const tr = body.createEl("tr");

    if ("header" in row) {
      tr.createEl("th", { text: row.header, attr: { colspan } });
      continue;
    }

    if ("spacer" in row) {
      tr.createEl("th", { attr: { colspan } });
      continue;
    }

    for (const color of row.colors) {
      tr.createEl("td").style.backgroundColor = color;
    }
  }
}

function toRows(palette: string[][]): PickerRow[] {
  return palette.map((colors) => ({ colors }));
}

export function renderFontColorPicker(
  parent: HTMLElement,
  plugin: { settings: EditingToolbarSettings },
): void {
  const [baseHues, ...steps] = FONT_THEME_COLORS;

  renderColorPicker(parent, 10, [
    { header: strings.themeColors },
    { colors: baseHues },
    { spacer: true },
    ...toRows(steps),
    { spacer: true },
    { header: strings.standardColors },
    { colors: FONT_STANDARD_COLORS },
    { header: strings.customFontColors },
    { colors: customColorKeys("custom_fc").map((key) => plugin.settings[key]) },
  ]);
}

export function renderBackgroundColorPicker(
  parent: HTMLElement,
  plugin: { settings: EditingToolbarSettings },
): void {
  renderColorPicker(
    parent,
    5,
    [
      { header: strings.translucentColors },
      ...toRows(BACKGROUND_TRANSLUCENT_COLORS),
      { header: strings.highlighterColors },
      ...toRows(BACKGROUND_HIGHLIGHTER_COLORS),
      { header: strings.customColors },
      {
        colors: customColorKeys("custom_bg").map(
          (key) => plugin.settings[key],
        ),
      },
    ],
    "x-background-color-picker-table",
  );
}
