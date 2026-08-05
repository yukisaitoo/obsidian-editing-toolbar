import { App, Editor, Menu } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { ownCommand, runCommandById } from "src/plugin/pluginId";
import { strings, t } from "src/translations/helper";
import { canRenumber } from "src/util/text/renumber";
import { canConvertTableToList } from "src/util/text/tables";

export function registerEditorContextMenu(plugin: EditingToolbarPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor) => {
      addEditorContextSubmenu(
        plugin.app,
        menu,
        strings.textTools,
        "whole-word",
        buildTextContextIds(editor),
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
    item.onClick(() => runCommandById(app, command.id));
  });
}

function addEditorContextSubmenu(
  app: App,
  menu: Menu,
  title: string,
  icon: string,
  commandIds: string[],
): void {
  menu.addItem((item) => {
    item.setTitle(title).setIcon(icon);
    item.setSection("info");

    const submenu = item.setSubmenu();
    commandIds.forEach((id) => addCommandItem(app, submenu, id));
  });
}

function buildTextContextIds(editor: Editor): string[] {
  const ids: string[] = [];

  if (editor.somethingSelected()) {
    ids.push(
      "split-lines",
      "merge-lines",
      "smart-symbols",
      "dedupe-lines",
      "add-wrap",
      "number-lines",
      "remove-whitespace-trim",
      "remove-whitespace-compress",
      "remove-whitespace-all",
      "extract-between",
      "list-to-table",
    );
  } else {
    ids.push("add-wrap", "insert-blank-lines");
  }

  if (canConvertTableToList(editor)) {
    ids.push("table-to-list");
  }

  if (canRenumber(editor)) {
    ids.push("renumber-ordered-list");
  }

  return ids;
}
