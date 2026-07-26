import type { Command } from "obsidian";

import {
  DEFAULT_FOLLOWING_COMMANDS,
  DEFAULT_TOOLBAR_COMMANDS,
} from "src/settings/defaultCommands";
import { strings } from "src/translations/helper";

export type ToolbarStyleKey = "top" | "following";

export const POSITION_STYLES: ToolbarStyleKey[] = ["top", "following"];

/** User-facing name of each toolbar style. */
export const STYLE_LABELS: Record<ToolbarStyleKey, string> = {
  top: strings.topToolbar,
  following: strings.followingToolbar,
};

export interface StyleAppearanceSettings {
  toolbarBackgroundColor?: string;
  toolbarIconColor?: string;
  toolbarIconSize?: number;
}

export interface AppearanceByStyle {
  [style: string]: StyleAppearanceSettings;
}

/**
 * Read a per-style appearance value: the value stored in `style`'s bucket, falling
 * back to the global default field on `settings`.
 */
export function getAppearanceValue<K extends keyof StyleAppearanceSettings>(
  settings: EditingToolbarSettings,
  key: K,
  style: string,
): NonNullable<StyleAppearanceSettings[K]> {
  // The global field is always populated from DEFAULT_SETTINGS, so this never resolves undefined.
  const bucketValue = settings.appearanceByStyle?.[style]?.[key];
  return (bucketValue ??
    (settings as unknown as StyleAppearanceSettings)[key]) as NonNullable<
    StyleAppearanceSettings[K]
  >;
}

/**
 * The writable appearance bucket for `style`, created on demand. Values left out
 * of a bucket fall back to the global fields via getAppearanceValue().
 */
export function getAppearanceBucket(
  settings: EditingToolbarSettings,
  style: string,
): StyleAppearanceSettings {
  const store = (settings.appearanceByStyle ??= {});
  return (store[style] ??= {});
}

/**
 * Push a style's resolved appearance onto an element as the custom properties the
 * toolbar CSS reads. Used for the live bars, the overflow popover, the settings
 * preview, and the document root.
 */
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

/**
 * After a position-toolbar toggle, decide which style should become the primary
 * (configured/appearance) style. Returns the style to switch to, or null if the
 * primary style should stay as-is.
 *
 * `enabled` is the toggled style's new on/off state; `prevStyle` is the current
 * primary style. When a style is turned on it becomes primary; when the current
 * primary is turned off, the next enabled style (top → following) takes over.
 */
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

/** Keys of the user-defined custom color swatches, all of which hold hex strings. */
export type CustomColorKey =
  | `custom_bg${1 | 2 | 3 | 4 | 5}`
  | `custom_fc${1 | 2 | 3 | 4 | 5}`;

export interface EditingToolbarSettings {
  cMenuFontColor: string;
  cMenuBackgroundColor: string;
  positionStyle: string;
  followingCommands: Command[];
  topCommands: Command[];
  enableTopToolbar: boolean;
  enableFollowingToolbar: boolean;
  cMenuVisibility: boolean;
  cMenuNumRows: number;
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

  // Per-style appearance buckets (top/following)
  appearanceByStyle?: AppearanceByStyle;

  // Global appearance defaults, used as the fallback for empty per-style buckets
  toolbarBackgroundColor: string;
  toolbarIconColor: string;
  toolbarIconSize: number;
}

// The command lists are seeded in loadSettings() rather than here, so a list the
// user deliberately cleared is not re-filled on every load.
export const DEFAULT_SETTINGS: EditingToolbarSettings = {
  positionStyle: "top",
  followingCommands: [],
  topCommands: [],
  enableTopToolbar: true,
  enableFollowingToolbar: false,
  cMenuVisibility: true,
  cMenuNumRows: 12,
  cMenuFontColor: "#2DC26B",
  cMenuBackgroundColor: "#d3f8b6",
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

  appearanceByStyle: {
    top: {
      toolbarBackgroundColor: "var(--background-primary)",
      toolbarIconColor: "var(--text-normal)",
      toolbarIconSize: 18,
    },
    following: {
      toolbarBackgroundColor: "var(--background-primary)",
      toolbarIconColor: "var(--text-normal)",
      toolbarIconSize: 18,
    },
  },

  // Global appearance defaults: used as the fallback for any empty per-style bucket
  toolbarBackgroundColor: "var(--background-primary)",
  toolbarIconColor: "var(--text-normal)",
  toolbarIconSize: 18,
};

/** Command list each style starts with on a fresh install. */
export const DEFAULT_COMMANDS_BY_STYLE: Record<ToolbarStyleKey, Command[]> = {
  top: DEFAULT_TOOLBAR_COMMANDS,
  following: DEFAULT_FOLLOWING_COMMANDS,
};
