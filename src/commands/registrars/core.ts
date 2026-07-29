import type { Registrar } from "src/commands/registrars/types";
import { renumberSelection } from "src/util/text/renumber";

export const registerCoreCommands: Registrar = ({ plugin, runOnEditor }) => {
  plugin.addCommand({
    id: "renumber-ordered-list",
    name: "Renumber ordered list",
    editorCallback: (editor) => runOnEditor(() => renumberSelection(editor)),
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

  plugin.addCommand({
    id: "toggle-top-toolbar",
    name: "Toggle top toolbar",
    callback: () =>
      plugin.setToolbarStyleEnabled("top", !plugin.settings.enableTopToolbar),
  });

  plugin.addCommand({
    id: "toggle-following-toolbar",
    name: "Toggle selection toolbar",
    callback: () =>
      plugin.setToolbarStyleEnabled(
        "following",
        !plugin.settings.enableFollowingToolbar,
      ),
  });
};
