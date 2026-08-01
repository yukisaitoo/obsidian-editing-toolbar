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
export interface ParsedImport {
  general: Partial<EditingToolbarSettings>;
  appearance: AppearanceOverrides | null;
  commands: Command[] | null;
}

// The one place the payload is inspected: null means it is not importable, and
// everything past here works with typed data.
export function parseImport(data: JsonPayload): ParsedImport | null {
  if (!data || typeof data !== "object") return null;

  const general: Partial<EditingToolbarSettings> = {};

  for (const key of GENERAL_SETTING_KEYS) {
    const value = data[key];
    if (value === undefined) continue;
    if (typeof value !== typeof DEFAULT_SETTINGS[key]) return null;

    (general as JsonPayload)[key] = COLOR_SETTING_KEYS.has(key)
      ? (toHexColor(value) ?? DEFAULT_SETTINGS[key])
      : value;
  }

  let appearance: AppearanceOverrides | null = null;
  if ("appearance" in data) {
    appearance = parseAppearance(data.appearance);
    if (!appearance) return null;
  }

  let commands: Command[] | null = null;
  if ("commands" in data) {
    commands = parseCommandList(data.commands);
    if (!commands) return null;
  }

  return { general, appearance, commands };
}

function parseAppearance(value: JsonPayload): AppearanceOverrides | null {
  if (!value || typeof value !== "object") return null;

  const parsed: AppearanceOverrides = {};

  const take = <K extends keyof AppearanceSettings>(
    key: K,
    sanitise: (entry: AppearanceSettings[K]) => AppearanceSettings[K] | null,
  ): boolean => {
    const entry = value[key];
    if (entry === undefined) return true;
    if (typeof entry !== typeof DEFAULT_APPEARANCE[key]) return false;

    // An omitted key already means "use DEFAULT_APPEARANCE", so dropping it recovers.
    const clean = sanitise(entry);
    if (clean !== null) parsed[key] = clean;

    return true;
  };

  return take("toolbarBackgroundColor", toHexColor) &&
    take("toolbarIconColor", toHexColor) &&
    take("toolbarIconSize", clampIconSize)
    ? parsed
    : null;
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
