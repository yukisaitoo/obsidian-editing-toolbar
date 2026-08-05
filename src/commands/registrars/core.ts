import type { Registrar } from "src/commands/registrars/types";

export const registerCoreCommands: Registrar = ({ plugin }) => {
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
