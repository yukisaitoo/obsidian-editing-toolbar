import type { Registrar } from "src/commands/registrars/types";
import { renumberSelection } from "src/util/text/renumber";

export const registerCoreCommands: Registrar = ({ plugin, runOnEditor }) => {
  plugin.addCommand({
    id: "renumber-ordered-list",
    name: "Renumber ordered list",
    callback: () => runOnEditor(renumberSelection),
  });

  plugin.addCommand({
    id: "hide-show-menu",
    name: "Toggle toolbar",
    icon: "editingToolbar",
    callback: async () => {
      plugin.settings.toolbarVisible = !plugin.settings.toolbarVisible;
      await plugin.saveSettings();
      plugin.rebuildToolbars();
    },
  });
};
