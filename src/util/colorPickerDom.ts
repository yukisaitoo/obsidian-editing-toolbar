import { EditingToolbarSettings } from "src/settings/settingsData";
import { strings } from "src/translations/helper";

// The toolbar reads each swatch's `background-color`; headers and spacers are inert.
type PickerRow = { header: string } | { spacer: true } | { colors: string[] };

// Built as DOM rather than an HTML string: the custom swatches are settings values,
// and settings arrive from Import as unvalidated JSON. Assigning a colour through
// `style.backgroundColor` makes an unparseable one render as no colour, which
// wireSwatches already skips — an interpolated string would make it markup.
function renderColorPicker(
  parent: HTMLElement,
  tableId: string,
  colspan: number,
  rows: PickerRow[],
): void {
  const wrapper = parent.createDiv({ cls: "x-color-picker-wrapper" });
  const table = wrapper
    .createDiv({ cls: "x-color-picker" })
    .createEl("table", { cls: "x-color-picker-table", attr: { id: tableId } });
  const body = table.createEl("tbody");

  for (const row of rows) {
    const tr = body.createEl("tr");

    if ("header" in row) {
      tr.createEl("th", {
        cls: "ui-widget-content",
        text: row.header,
        attr: { colspan },
      });
      continue;
    }

    if ("spacer" in row) {
      tr.createEl("th", { attr: { colspan } });
      continue;
    }

    for (const color of row.colors) {
      const cell = tr.createEl("td");
      cell.style.backgroundColor = color;
      cell.createEl("span");
    }
  }
}

export function renderFontColorPicker(
  parent: HTMLElement,
  plugin: { settings: EditingToolbarSettings },
): void {
  const s = plugin.settings;
  renderColorPicker(parent, "x-color-picker-table", 10, [
    { header: strings.themeColors },
    {
      colors: [
        "#ffffff",
        "#000000",
        "#eeece1",
        "#1f497d",
        "#4f81bd",
        "#c0504d",
        "#9bbb59",
        "#8064a2",
        "#4bacc6",
        "#f79646",
      ],
    },
    { spacer: true },
    {
      colors: [
        "#f2f2f2",
        "#7f7f7f",
        "#ddd9c3",
        "#c6d9f0",
        "#dbe5f1",
        "#f2dcdb",
        "#ebf1dd",
        "#e5e0ec",
        "#dbeef3",
        "#fdeada",
      ],
    },
    {
      colors: [
        "#d8d8d8",
        "#595959",
        "#c4bd97",
        "#8db3e2",
        "#b8cce4",
        "#e5b9b7",
        "#d7e3bc",
        "#ccc1d9",
        "#b7dde8",
        "#fbd5b5",
      ],
    },
    {
      colors: [
        "#bfbfbf",
        "#3f3f3f",
        "#938953",
        "#548dd4",
        "#95b3d7",
        "#d99694",
        "#c3d69b",
        "#b2a2c7",
        "#92cddc",
        "#fac08f",
      ],
    },
    {
      colors: [
        "#a5a5a5",
        "#262626",
        "#494429",
        "#17365d",
        "#366092",
        "#953734",
        "#76923c",
        "#5f497a",
        "#31859b",
        "#e36c09",
      ],
    },
    {
      colors: [
        "#7f7f7f",
        "#0c0c0c",
        "#1d1b10",
        "#0f243e",
        "#244061",
        "#632423",
        "#4f6128",
        "#3f3151",
        "#205867",
        "#974806",
      ],
    },
    { spacer: true },
    { header: strings.standardColors },
    {
      colors: [
        "#c00000",
        "#ff0000",
        "#ffc000",
        "#ffff00",
        "#92d050",
        "#00b050",
        "#00b0f0",
        "#0070c0",
        "#002060",
        "#7030a0",
      ],
    },
    { header: strings.customFontColors },
    {
      colors: [
        s.custom_fc1,
        s.custom_fc2,
        s.custom_fc3,
        s.custom_fc4,
        s.custom_fc5,
      ],
    },
  ]);
}

export function renderBackgroundColorPicker(
  parent: HTMLElement,
  plugin: { settings: EditingToolbarSettings },
): void {
  const s = plugin.settings;
  renderColorPicker(parent, "x-backgroundcolor-picker-table", 5, [
    { header: strings.translucentColors },
    {
      colors: [
        "rgba(140, 140, 140, 0.12)",
        "rgba(92, 92, 92, 0.2)",
        "rgba(163, 67, 31, 0.2)",
        "rgba(240, 107, 5, 0.2)",
        "rgba(240, 200, 0, 0.2)",
      ],
    },
    {
      colors: [
        "rgba(3, 135, 102, 0.2)",
        "rgba(3, 135, 102, 0.2)",
        "rgba(5, 117, 197, 0.2)",
        "rgba(74, 82, 199, 0.2)",
        "rgba(136, 49, 204, 0.2)",
      ],
    },
    { header: strings.highlighterColors },
    {
      colors: [
        "rgb(255, 248, 143)",
        "rgb(211, 248, 182)",
        "rgb(175, 250, 209)",
        "rgb(177, 255, 255)",
        "rgb(253, 191, 255)",
      ],
    },
    {
      colors: [
        "rgb(210, 203, 255)",
        "rgb(64, 169, 255)",
        "rgb(255, 77, 79)",
        "rgb(212, 177, 6)",
        "rgb(146, 84, 222)",
      ],
    },
    { header: strings.customColors },
    {
      colors: [
        s.custom_bg1,
        s.custom_bg2,
        s.custom_bg3,
        s.custom_bg4,
        s.custom_bg5,
      ],
    },
  ]);
}
