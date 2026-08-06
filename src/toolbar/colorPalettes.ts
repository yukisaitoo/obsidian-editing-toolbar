// The fixed swatches both toolbar colour pickers offer, laid out one array per
// rendered row. The user's own five custom swatches are appended at render time.

// Word's theme palette: a row of base hues, then five tint/shade steps of it.
export const FONT_THEME_COLORS: string[][] = [
  [
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
  [
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
  [
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
  [
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
  [
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
  [
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
];

export const FONT_STANDARD_COLORS: string[] = [
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
];

// Alpha, so the text underneath stays legible whatever the theme.
export const BACKGROUND_TRANSLUCENT_COLORS: string[][] = [
  [
    "rgba(140, 140, 140, 0.12)",
    "rgba(92, 92, 92, 0.2)",
    "rgba(163, 67, 31, 0.2)",
    "rgba(240, 107, 5, 0.2)",
    "rgba(240, 200, 0, 0.2)",
  ],
  [
    "rgba(46, 161, 33, 0.2)",
    "rgba(3, 135, 102, 0.2)",
    "rgba(5, 117, 197, 0.2)",
    "rgba(74, 82, 199, 0.2)",
    "rgba(136, 49, 204, 0.2)",
  ],
];

export const BACKGROUND_HIGHLIGHTER_COLORS: string[][] = [
  [
    "rgb(255, 248, 143)",
    "rgb(211, 248, 182)",
    "rgb(175, 250, 209)",
    "rgb(177, 255, 255)",
    "rgb(253, 191, 255)",
  ],
  [
    "rgb(210, 203, 255)",
    "rgb(64, 169, 255)",
    "rgb(255, 77, 79)",
    "rgb(212, 177, 6)",
    "rgb(146, 84, 222)",
  ],
];
