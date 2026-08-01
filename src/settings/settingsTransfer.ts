import type { Command } from "obsidian";

import type {
  AppearanceOverrides,
  AppearanceSettings,
  EditingToolbarSettings,
} from "src/settings/settingsData";
import {
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  TOOLBAR_ICON_SIZE_MAX,
  TOOLBAR_ICON_SIZE_MIN,
} from "src/settings/settingsData";
import { toHexColor } from "src/util/color";
import { hasSubmenu, parseCommandList } from "src/util/commandStorage";

// Import/export crosses a JSON boundary with no schema: every payload below is
// whatever the user's file happened to contain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unvalidated import/export JSON
export type JsonPayload = any;

export type ImportMode = "overwrite" | "update";

// Every flat setting the payload carries. The appearance overrides are nested, so
// they travel separately via mergeAppearance().
export const GENERAL_SETTING_KEYS: (keyof EditingToolbarSettings)[] = [
  "toolbarVisible",
  "lastFontColor",
  "lastHighlightColor",
  "custom_bg1",
  "custom_bg2",
  "custom_bg3",
  "custom_bg4",
  "custom_bg5",
  "custom_fc1",
  "custom_fc2",
  "custom_fc3",
  "custom_fc4",
  "custom_fc5",
];

// Every key holding a colour. All of them reach note markup: the `last*` pair
// directly, the custom swatches by way of a click.
const COLOR_SETTING_KEYS = new Set<keyof EditingToolbarSettings>([
  "lastFontColor",
  "lastHighlightColor",
  "custom_bg1",
  "custom_bg2",
  "custom_bg3",
  "custom_bg4",
  "custom_bg5",
  "custom_fc1",
  "custom_fc2",
  "custom_fc3",
  "custom_fc4",
  "custom_fc5",
]);

// `appearance` and `commands` are null when the payload did not mention them at
// all — distinct from an empty one, which overwrite mode is meant to apply.
// `skipped` names every value the payload could not supply.
export interface ParsedImport {
  general: Partial<EditingToolbarSettings>;
  appearance: AppearanceOverrides | null;
  commands: Command[] | null;
  skipped: string[];
}

// The one place the payload is inspected: everything past here works with typed
// data. A value that will not parse costs itself alone and is named in `skipped`;
// null is reserved for a payload that is not an object at all.
export function parseImport(data: JsonPayload): ParsedImport | null {
  if (!data || typeof data !== "object") return null;

  const general: Partial<EditingToolbarSettings> = {};
  const skipped: string[] = [];

  for (const key of GENERAL_SETTING_KEYS) {
    const value = data[key];
    if (value === undefined) continue;

    // A key left out of `general` keeps whatever the caller already had, which is
    // the default on load and the current value on import.
    const clean =
      typeof value !== typeof DEFAULT_SETTINGS[key]
        ? null
        : COLOR_SETTING_KEYS.has(key)
          ? toHexColor(value)
          : value;

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

    // An omitted key already means "use DEFAULT_APPEARANCE", so dropping it recovers.
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

// Returns the settings the import would produce, leaving `current` untouched so the
// caller can put it back if anything downstream fails.
export function buildImportedSettings(
  current: EditingToolbarSettings,
  parsed: ParsedImport,
  mode: ImportMode,
): EditingToolbarSettings {
  const next: EditingToolbarSettings = { ...current, ...parsed.general };

  // Overwrite replaces the bucket outright, so a value the payload cleared stays
  // cleared; update merges its keys over what is there.
  if (parsed.appearance) {
    next.appearance =
      mode === "overwrite"
        ? { ...parsed.appearance }
        : { ...current.appearance, ...parsed.appearance };
  }

  if (parsed.commands) {
    next.commands =
      mode === "overwrite"
        ? parsed.commands
        : mergeCommands(current.commands, parsed.commands);
  }

  return next;
}

function mergeCommands(existing: Command[], imported: Command[]): Command[] {
  const merged = [...existing];

  for (const command of imported) {
    const index = merged.findIndex((cmd) => cmd.id === command.id);
    if (index < 0) {
      merged.push(command);
    } else {
      merged[index] = mergeCommand(merged[index], command);
    }
  }

  return merged;
}

// A submenu the payload does not mention keeps the entries it had.
function mergeCommand(existing: Command, imported: Command): Command {
  if (!hasSubmenu(existing) || !hasSubmenu(imported)) return imported;

  return {
    ...imported,
    SubmenuCommands: mergeCommands(
      existing.SubmenuCommands,
      imported.SubmenuCommands,
    ),
  };
}
