import type { App } from "obsidian";
import type { AdmonitionDefinition } from "src/modals/callout/calloutTypes";

const ADMONITION_PLUGIN_ID = "obsidian-admonition";

export function readAdmonitionDefinitions(
  app: App,
): Record<string, AdmonitionDefinition> | null {
  const instance = app.plugins?.getPlugin(ADMONITION_PLUGIN_ID) as
    | { admonitions?: Record<string, AdmonitionDefinition> }
    | undefined;
  if (!instance) return null;

  const { admonitions } = instance;
  if (
    admonitions &&
    typeof admonitions === "object" &&
    !Array.isArray(admonitions) &&
    Object.keys(admonitions).length > 0
  ) {
    return admonitions;
  }

  console.warn("editing-toolbar: could not read admonition types");
  return null;
}
