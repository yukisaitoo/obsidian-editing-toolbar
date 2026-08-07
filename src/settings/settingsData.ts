import type { Command } from "obsidian";

import { defaultToolbarCommands } from "src/settings/defaultCommands";

export interface AppearanceSettings {
  toolbarBackgroundColor: string;
  toolbarIconColor: string;
  toolbarIconSize: number;
}

export type AppearanceOverrides = Partial<AppearanceSettings>;

export const TOOLBAR_ICON_SIZE_MIN = 12;
export const TOOLBAR_ICON_SIZE_MAX = 32;

// The colour defaults are theme vars, not hex, so they must never be written into the
// override bucket: an override is what hasAppearanceOverride() reports and the swatch
// renders as set. Clearing a colour deletes its key instead of writing the default back.
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

export function hasAppearanceOverride(
  settings: EditingToolbarSettings,
  key: keyof AppearanceSettings,
): boolean {
  return settings.appearance?.[key] !== undefined;
}

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

// Kept out of applyAppearanceVars, which is also applied per bar: a bar-level copy
// of these would shadow the root and go stale.
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

// The vars sit on documentElement, which survives unload, so they need explicit
// removal.
export function clearLastColorVars(el: HTMLElement): void {
  el.style.removeProperty("--editing-toolbar-font-color");
  el.style.removeProperty("--editing-toolbar-highlight-color");
}

const CUSTOM_COLOR_INDEXES = [1, 2, 3, 4, 5] as const;

export type CustomColorPrefix = "custom_bg" | "custom_fc";
export type CustomColorKey =
  `${CustomColorPrefix}${(typeof CUSTOM_COLOR_INDEXES)[number]}`;

export function customColorKeys(prefix: CustomColorPrefix): CustomColorKey[] {
  return CUSTOM_COLOR_INDEXES.map((i) => `${prefix}${i}` as CustomColorKey);
}

export interface EditingToolbarSettings extends Record<CustomColorKey, string> {
  lastFontColor: string;
  lastHighlightColor: string;
  commands: Command[];
  toolbarVisible: boolean;

  appearance?: AppearanceOverrides;
}

export const DEFAULT_SETTINGS: Omit<EditingToolbarSettings, "commands"> = {
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
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    commands: defaultToolbarCommands(),
  };
}
