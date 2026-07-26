import { getIconIds } from "obsidian";
import { internalIconNames, pickerIconNames } from "src/icons/customIcons";

/**
 * Icon-picker list, in order: this plugin's icons, then everything Obsidian has
 * registered (Lucide, legacy Obsidian names, and icons added by other plugins).
 *
 * Must be called after addIcons() has run, so the plugin's own icons are
 * already registered. Lucide ids come back "lucide-" prefixed; legacy ids that
 * would display under the same name are dropped so the picker has no visual
 * duplicates.
 */
export function getAppIcons(): string[] {
  const own = new Set([...pickerIconNames, ...internalIconNames]);
  const seen = new Set(pickerIconNames);
  const rest: string[] = [];

  for (const id of getIconIds()) {
    if (own.has(id)) continue;
    const name = id.replace(/^lucide-/, "");
    if (seen.has(name)) continue;
    seen.add(name);
    rest.push(id);
  }

  return [...pickerIconNames, ...rest];
}
