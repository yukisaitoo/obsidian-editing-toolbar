import { COMMAND_LABELS } from "src/commands/commandLabels";
import type { Registrar } from "src/commands/registrars/types";

export const registerCoreCommands: Registrar = ({ plugin }) => {
  plugin.addCommand({
    id: "hide-show-menu",
    ...COMMAND_LABELS["hide-show-menu"],
    callback: async () => {
      plugin.settings.toolbarVisible = !plugin.settings.toolbarVisible;
      await plugin.saveSettings();
      plugin.rebuildToolbars();
    },
  });
};
