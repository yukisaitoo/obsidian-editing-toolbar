import { getIconIds } from "obsidian";
import { customIconNames, pickerIconNames } from "src/icons/customIcons";

// addIcons() has already run by the time a picker opens, so getIconIds() hands back
// the custom ids too: skip all of them, then pin back the two worth showing.
export function getAppIcons(): string[] {
  const seen = new Set<string>(customIconNames);
  const rest: string[] = [];

  for (const id of getIconIds()) {
    if (seen.has(id)) continue;
    seen.add(id);
    rest.push(id);
  }

  return [...pickerIconNames, ...rest];
}
