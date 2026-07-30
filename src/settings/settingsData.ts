import type { Command } from "obsidian";

import {
  DEFAULT_FOLLOWING_COMMANDS,
  DEFAULT_TOOLBAR_COMMANDS,
} from "src/settings/defaultCommands";
import { strings } from "src/translations/helper";

export type ToolbarStyleKey = "top" | "following";

export const POSITION_STYLES: ToolbarStyleKey[] = ["top", "following"];

export const STYLE_LABELS: Record<ToolbarStyleKey, string> = {
  top: strings.topToolbar,
  following: strings.followingToolbar,
};

export interface AppearanceSettings {
  toolbarBackgroundColor: string;
  toolbarIconColor: string;
  toolbarIconSize: number;
}

export type StyleAppearanceSettings = Partial<AppearanceSettings>;

export interface AppearanceByStyle {
  [style: string]: StyleAppearanceSettings;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  toolbarBackgroundColor: "var(--background-primary)",
  toolbarIconColor: "var(--text-normal)",
  toolbarIconSize: 18,
};

export function getAppearanceValue<K extends keyof AppearanceSettings>(
  settings: EditingToolbarSettings,
  key: K,
  style: string,
): AppearanceSettings[K] {
  return settings.appearanceByStyle?.[style]?.[key] ?? DEFAULT_APPEARANCE[key];
}

// Writable bucket for `style`, created on demand. Keys left out of it fall back
// to DEFAULT_APPEARANCE via getAppearanceValue().
export function getAppearanceBucket(
  settings: EditingToolbarSettings,
  style: string,
): StyleAppearanceSettings {
  const store = (settings.appearanceByStyle ??= {});
  return (store[style] ??= {});
}

export function applyAppearanceVars(
  el: HTMLElement,
  settings: EditingToolbarSettings,
  style: string,
): void {
  el.style.setProperty(
    "--editing-toolbar-background-color",
    getAppearanceValue(settings, "toolbarBackgroundColor", style),
  );
  el.style.setProperty(
    "--editing-toolbar-icon-color",
    getAppearanceValue(settings, "toolbarIconColor", style),
  );
  el.style.setProperty(
    "--toolbar-icon-size",
    `${getAppearanceValue(settings, "toolbarIconSize", style)}px`,
  );
}

// Which style owns "primary" after a toggle, or null to leave it alone: enabling one
// makes it primary, disabling the primary promotes the next enabled style.
export function resolveNextPositionStyle(
  settings: EditingToolbarSettings,
  toggledStyle: ToolbarStyleKey,
  enabled: boolean,
  prevStyle: string | null,
): ToolbarStyleKey | null {
  if (enabled) return toggledStyle;
  if (prevStyle !== toggledStyle) return null;

  const enabledFlags: Record<ToolbarStyleKey, boolean> = {
    top: settings.enableTopToolbar,
    following: settings.enableFollowingToolbar,
  };
  return (
    POSITION_STYLES.find(
      (style) => style !== toggledStyle && enabledFlags[style],
    ) ?? null
  );
}

declare module "obsidian" {
  export interface Command {
    SubmenuCommands?: Command[];
    menuType?: "submenu" | "dropdown";
  }
}

// All hold hex strings.
export type CustomColorKey =
  | `custom_bg${1 | 2 | 3 | 4 | 5}`
  | `custom_fc${1 | 2 | 3 | 4 | 5}`;

export interface EditingToolbarSettings {
  lastFontColor: string;
  lastHighlightColor: string;
  positionStyle: string;
  followingCommands: Command[];
  topCommands: Command[];
  enableTopToolbar: boolean;
  enableFollowingToolbar: boolean;
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

  appearanceByStyle?: AppearanceByStyle;
}

// The command lists are seeded in loadSettings() rather than here, so a list the
// user deliberately cleared is not re-filled on every load.
export const DEFAULT_SETTINGS: EditingToolbarSettings = {
  positionStyle: "top",
  followingCommands: [],
  topCommands: [],
  enableTopToolbar: true,
  enableFollowingToolbar: false,
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

export const DEFAULT_COMMANDS_BY_STYLE: Record<ToolbarStyleKey, Command[]> = {
  top: DEFAULT_TOOLBAR_COMMANDS,
  following: DEFAULT_FOLLOWING_COMMANDS,
};
