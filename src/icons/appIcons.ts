import { getIconIds } from "obsidian";
import { internalIconNames, pickerIconNames } from "src/icons/customIcons";

// Call only after addIcons(). Legacy ids that would display under the same name as
// a "lucide-" one are dropped, so the picker shows no visual duplicates.
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
