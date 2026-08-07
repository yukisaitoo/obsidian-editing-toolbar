import type { Command } from "obsidian";

import type {
  AppearanceOverrides,
  AppearanceSettings,
  CustomColorKey,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import {
  customColorKeys,
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  TOOLBAR_ICON_SIZE_MAX,
  TOOLBAR_ICON_SIZE_MIN,
} from "src/settings/settingsData";
import { toHexColor } from "src/util/color";
import { parseCommandList } from "src/util/commandStorage";

// data.json has no schema and is a file the user can edit, so everything below is
// whatever it happened to contain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unvalidated data.json
type JsonPayload = any;

type FlatSettingKey = Exclude<
  keyof EditingToolbarSettings,
  "commands" | "appearance"
>;

// Custom swatch colours end up in note markup, so they have to be hex.
const customColorSanitisers = Object.fromEntries(
  [...customColorKeys("custom_bg"), ...customColorKeys("custom_fc")].map(
    (key) => [key, toHexColor],
  ),
) as Record<CustomColorKey, typeof toHexColor>;

const GENERAL_SANITISERS: {
  [K in FlatSettingKey]: (
    value: EditingToolbarSettings[K],
  ) => EditingToolbarSettings[K] | null;
} = {
  toolbarVisible: (value) => value,
  lastFontColor: toHexColor,
  lastHighlightColor: toHexColor,
  ...customColorSanitisers,
};

const GENERAL_SETTING_KEYS = Object.keys(
  GENERAL_SANITISERS,
) as FlatSettingKey[];

// `appearance` and `commands` are null when the file did not mention them at all,
// as opposed to mentioning an empty one. `skipped` names every value that failed
// to parse.
interface ParsedSettings {
  general: Partial<EditingToolbarSettings>;
  appearance: AppearanceOverrides | null;
  commands: Command[] | null;
  skipped: string[];
}

// The one place data.json is inspected; everything past here works with typed data.
// A bad value costs itself alone; null means the file was not an object at all.
export function parseSettings(data: JsonPayload): ParsedSettings | null {
  if (!data || typeof data !== "object") return null;

  const general: Partial<EditingToolbarSettings> = {};
  const skipped: string[] = [];

  for (const key of GENERAL_SETTING_KEYS) {
    const value = data[key];
    if (value === undefined) continue;

    const sanitise = GENERAL_SANITISERS[key] as (
      value: JsonPayload,
    ) => JsonPayload;
    const clean =
      typeof value === typeof DEFAULT_SETTINGS[key] ? sanitise(value) : null;

    if (clean === null) skipped.push(key);
    else (general as JsonPayload)[key] = clean;
  }

  let appearance: AppearanceOverrides | null = null;
  if ("appearance" in data) {
    appearance = parseAppearance(data.appearance, skipped);
    if (!appearance) skipped.push("appearance");
  }

  let commands: Command[] | null = null;
  if ("commands" in data) {
    commands = parseCommandList(data.commands, skipped);
    if (!commands) skipped.push("commands");
  }

  return { general, appearance, commands, skipped };
}

function parseAppearance(
  value: JsonPayload,
  skipped: string[],
): AppearanceOverrides | null {
  if (!value || typeof value !== "object") return null;

  const parsed: AppearanceOverrides = {};

  const take = <K extends keyof AppearanceSettings>(
    key: K,
    sanitise: (entry: AppearanceSettings[K]) => AppearanceSettings[K] | null,
  ): void => {
    const entry = value[key];
    if (entry === undefined) return;

    // Dropping a bad key recovers: omitted already means "use DEFAULT_APPEARANCE".
    const clean =
      typeof entry === typeof DEFAULT_APPEARANCE[key] ? sanitise(entry) : null;

    if (clean === null) skipped.push(`appearance.${key}`);
    else parsed[key] = clean;
  };

  take("toolbarBackgroundColor", toHexColor);
  take("toolbarIconColor", toHexColor);
  take("toolbarIconSize", clampIconSize);

  return parsed;
}

function clampIconSize(size: number): number | null {
  if (!Number.isFinite(size)) return null;

  return Math.round(
    Math.min(TOOLBAR_ICON_SIZE_MAX, Math.max(TOOLBAR_ICON_SIZE_MIN, size)),
  );
}

// Anything the file did not supply falls back to `defaults`, so a partial or partly
// unreadable data.json still yields a complete, valid settings object.
export function buildSettings(
  defaults: EditingToolbarSettings,
  parsed: ParsedSettings,
): EditingToolbarSettings {
  return {
    ...defaults,
    ...parsed.general,
    ...(parsed.appearance ? { appearance: parsed.appearance } : {}),
    ...(parsed.commands ? { commands: parsed.commands } : {}),
  };
}
