import type { Command } from "obsidian";

import type {
  AppearanceByStyle,
  EditingToolbarSettings,
  StyleAppearanceSettings,
  ToolbarStyleKey,
} from "src/settings/settingsData";
import {
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  POSITION_STYLES,
} from "src/settings/settingsData";
import { hasSubmenu, parseCommandList } from "src/util/commandStorage";

// Import/export crosses a JSON boundary with no schema: every payload below is
// whatever the user's file happened to contain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- unvalidated import/export JSON
export type JsonPayload = any;

export type ImportMode = "overwrite" | "update";

// Every flat setting the payload carries. The per-style appearance buckets are
// nested, so they travel separately via mergeAppearance().
export const GENERAL_SETTING_KEYS: (keyof EditingToolbarSettings)[] = [
  "positionStyle",
  "enableTopToolbar",
  "enableFollowingToolbar",
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

const APPEARANCE_KEYS: (keyof StyleAppearanceSettings)[] = [
  "toolbarBackgroundColor",
  "toolbarIconColor",
  "toolbarIconSize",
];

export interface ImportedCommandList {
  style: ToolbarStyleKey;
  commands: Command[];
}

export interface ParsedImport {
  general: Partial<EditingToolbarSettings>;
  appearance: AppearanceByStyle;
  lists: ImportedCommandList[];
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
    (general as JsonPayload)[key] = value;
  }

  // The only general key whose values are a closed set.
  if (
    general.positionStyle !== undefined &&
    !POSITION_STYLES.includes(general.positionStyle as ToolbarStyleKey)
  ) {
    return null;
  }

  const appearance = parseAppearance(data.appearanceByStyle);
  if (!appearance) return null;

  const lists: ImportedCommandList[] = [];
  for (const style of POSITION_STYLES) {
    const key = `${style}Commands` as const;
    if (!(key in data)) continue;

    const commands = parseCommandList(data[key]);
    if (!commands) return null;
    lists.push({ style, commands });
  }

  return { general, appearance, lists };
}

// An absent bucket store becomes {}, which merges as a no-op.
function parseAppearance(value: JsonPayload): AppearanceByStyle | null {
  if (value === undefined) return {};
  if (!value || typeof value !== "object") return null;

  const parsed: AppearanceByStyle = {};

  for (const style of POSITION_STYLES) {
    const source = value[style];
    if (source === undefined) continue;
    if (!source || typeof source !== "object") return null;

    const bucket: StyleAppearanceSettings = {};
    for (const key of APPEARANCE_KEYS) {
      const entry = source[key];
      if (entry === undefined) continue;
      if (typeof entry !== typeof DEFAULT_APPEARANCE[key]) return null;
      (bucket as JsonPayload)[key] = entry;
    }

    parsed[style] = bucket;
  }

  return parsed;
}

// Returns the settings the import would produce, leaving `current` untouched so the
// caller can put it back if anything downstream fails.
export function buildImportedSettings(
  current: EditingToolbarSettings,
  parsed: ParsedImport,
  mode: ImportMode,
): EditingToolbarSettings {
  const next: EditingToolbarSettings = { ...current, ...parsed.general };

  next.appearanceByStyle = mergeAppearance(
    current.appearanceByStyle,
    parsed.appearance,
    mode,
  );

  for (const { style, commands } of parsed.lists) {
    const key = `${style}Commands` as const;
    next[key] =
      mode === "overwrite" ? commands : mergeCommands(current[key], commands);
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

// Overwrite replaces the bucket outright, so a swatch the payload cleared stays
// cleared; update merges its keys over what is there.
function mergeAppearance(
  current: AppearanceByStyle | undefined,
  imported: AppearanceByStyle,
  mode: ImportMode,
): AppearanceByStyle {
  const store: AppearanceByStyle = { ...current };

  for (const [style, source] of Object.entries(imported)) {
    store[style] =
      mode === "overwrite" ? { ...source } : { ...store[style], ...source };
  }

  return store;
}
