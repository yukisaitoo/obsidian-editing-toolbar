import type { Command } from "obsidian";

import { DEFAULT_TOOLBAR_COMMANDS } from "src/settings/defaultCommands";

export interface AppearanceSettings {
  toolbarBackgroundColor: string;
  toolbarIconColor: string;
  toolbarIconSize: number;
}

export type AppearanceOverrides = Partial<AppearanceSettings>;

export const TOOLBAR_ICON_SIZE_MIN = 12;
export const TOOLBAR_ICON_SIZE_MAX = 32;

// The colour defaults are theme vars, not hex, so they are the one thing the override
// bucket must never hold: parseAppearance() keeps only hex, and would drop them on the
// next load. Clearing a colour deletes its key instead of writing the default back.
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  toolbarBackgroundColor: "var(--background-primary)",
  toolbarIconColor: "var(--text-normal)",
  toolbarIconSize: 18,
};

export function getAppearanceValue<K extends keyof AppearanceSettings>(
  settings: EditingToolbarSettings,
  key: K,
): AppearanceSettings[K] {
  return settings.appearance?.[key] ?? DEFAULT_APPEARANCE[key];
}

// The writable bucket, created on demand. Keys left out of it fall back to
// DEFAULT_APPEARANCE via getAppearanceValue().
export function getAppearanceBucket(
  settings: EditingToolbarSettings,
): AppearanceOverrides {
  return (settings.appearance ??= {});
}

export function applyAppearanceVars(
  el: HTMLElement,
  settings: EditingToolbarSettings,
): void {
  el.style.setProperty(
    "--editing-toolbar-background-color",
    getAppearanceValue(settings, "toolbarBackgroundColor"),
  );
  el.style.setProperty(
    "--editing-toolbar-icon-color",
    getAppearanceValue(settings, "toolbarIconColor"),
  );
  el.style.setProperty(
    "--editing-toolbar-icon-size",
    `${getAppearanceValue(settings, "toolbarIconSize")}px`,
  );
}

// Deliberately not folded into applyAppearanceVars: that one is also applied to
// individual bars, and a bar-level copy of these would shadow the root and go stale.
export function applyLastColorVars(
  el: HTMLElement,
  settings: EditingToolbarSettings,
): void {
  el.style.setProperty("--editing-toolbar-font-color", settings.lastFontColor);
  el.style.setProperty(
    "--editing-toolbar-highlight-color",
    settings.lastHighlightColor,
  );
}

// All hold hex strings.
export type CustomColorKey =
  | `custom_bg${1 | 2 | 3 | 4 | 5}`
  | `custom_fc${1 | 2 | 3 | 4 | 5}`;

export interface EditingToolbarSettings {
  lastFontColor: string;
  lastHighlightColor: string;
  commands: Command[];
  toolbarVisible: boolean;
  custom_bg1: string;
  custom_bg2: string;
  custom_bg3: string;
  custom_bg4: string;
  custom_bg5: string;
  custom_fc1: string;
  custom_fc2: string;
  custom_fc3: string;
  custom_fc4: string;
  custom_fc5: string;

  appearance?: AppearanceOverrides;
}

// The command list is seeded by createDefaultSettings() rather than here, so a
// list the user deliberately cleared is not re-filled on every load.
export const DEFAULT_SETTINGS: EditingToolbarSettings = {
  commands: [],
  toolbarVisible: true,
  lastFontColor: "#2DC26B",
  lastHighlightColor: "#d3f8b6",
  custom_bg1: "#FFB78B8C",
  custom_bg2: "#CDF4698C",
  custom_bg3: "#A0CCF68C",
  custom_bg4: "#F0A7D88C",
  custom_bg5: "#ADEFEF8C",
  custom_fc1: "#D83931",
  custom_fc2: "#DE7802",
  custom_fc3: "#245BDB",
  custom_fc4: "#6425D0",
  custom_fc5: "#646A73",
};

// Cloned, because the defaults above are shared module constants and callers
// mutate what they get back.
export function createDefaultSettings(): EditingToolbarSettings {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.commands = structuredClone(DEFAULT_TOOLBAR_COMMANDS);
  return settings;
}
