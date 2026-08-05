import { App, Editor, Menu } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { ownCommand, runCommandById } from "src/plugin/pluginId";
import { t } from "src/translations/helper";
import { canRenumber } from "src/util/text/renumber";

export function registerEditorContextMenu(plugin: EditingToolbarPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor) => {
      buildTextContextIds(editor).forEach((id) =>
        addCommandItem(plugin.app, menu, id),
      );
    }),
  );
}

// Title and existence both come from the command registry, so a renamed id drops
// the entry instead of rendering one that does nothing.
function addCommandItem(app: App, menu: Menu, id: string): void {
  const command = app.commands.findCommand(ownCommand(id));
  if (!command) return;

  menu.addItem((item) => {
    item.setTitle(t(command.name));
    item.setSection("info");
    item.onClick(() => runCommandById(app, command.id));
  });
}

function buildTextContextIds(editor: Editor): string[] {
  const ids: string[] = [];

  if (editor.somethingSelected()) {
    ids.push("smart-symbols");
  }

  if (canRenumber(editor)) {
    ids.push("renumber-ordered-list");
  }

  return ids;
}
