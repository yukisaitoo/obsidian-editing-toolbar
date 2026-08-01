import type { Command } from "obsidian";

import type {
  AppearanceByStyle,
  EditingToolbarSettings,
  StyleAppearanceSettings,
  ToolbarStyleKey,
} from "src/settings/settingsData";
import { POSITION_STYLES } from "src/settings/settingsData";

// Import/export crosses a JSON boundary with no schema: every payload below is
// whatever the user's file happened to contain.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Returns the settings the import would produce, leaving `current` untouched so the
// caller can put it back if anything downstream fails.
export function buildImportedSettings(
  current: EditingToolbarSettings,
  importData: JsonPayload,
  lists: ImportedCommandList[],
  mode: ImportMode,
): EditingToolbarSettings {
  const next: EditingToolbarSettings = { ...current };

  GENERAL_SETTING_KEYS.forEach((key) => {
    if (importData[key] !== undefined) {
      (next as JsonPayload)[key] = importData[key];
    }
  });

  next.appearanceByStyle = mergeAppearance(
    current.appearanceByStyle,
    importData.appearanceByStyle,
    mode,
  );

  for (const { style, commands } of lists) {
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
  if (!existing.SubmenuCommands || !imported.SubmenuCommands) return imported;

  return {
    ...imported,
    SubmenuCommands: mergeCommands(
      existing.SubmenuCommands,
      imported.SubmenuCommands,
    ),
  };
}

// Overwrite replaces the bucket outright, so a swatch the payload cleared stays
// cleared; update merges its keys over what is there. Unknown keys are ignored.
function mergeAppearance(
  current: AppearanceByStyle | undefined,
  imported: JsonPayload,
  mode: ImportMode,
): AppearanceByStyle | undefined {
  if (!imported || typeof imported !== "object") return current;

  const store: AppearanceByStyle = { ...current };

  for (const style of POSITION_STYLES) {
    const source = imported[style];
    if (!source || typeof source !== "object") continue;

    const bucket: StyleAppearanceSettings =
      mode === "overwrite" ? {} : { ...store[style] };

    APPEARANCE_KEYS.forEach((key) => {
      if (source[key] !== undefined) {
        (bucket as JsonPayload)[key] = source[key];
      }
    });

    store[style] = bucket;
  }

  return store;
}
