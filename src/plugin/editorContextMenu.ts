import { App, Editor, Menu } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { ownCommand, runCommandById } from "src/plugin/pluginId";
import { strings, t } from "src/translations/helper";

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
  const hasSelection = editor.somethingSelected();
  const cursor = editor.getCursor();
  const lineText = editor.getLine(cursor.line);
  const isOrderedListLine = /^\d+\.\s/.test(lineText);
  const isTableContext = lineText.includes("|");

  if (hasSelection) {
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
      "table-to-list",
    );
  } else {
    ids.push("add-wrap", "insert-blank-lines");
    if (isTableContext) {
      ids.push("table-to-list");
    }
  }

  if (isOrderedListLine) {
    ids.push("renumber-ordered-list");
  }

  return ids;
}
