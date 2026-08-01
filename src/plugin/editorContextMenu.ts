import { App, Editor, Menu } from "obsidian";
import type EditingToolbarPlugin from "src/plugin/main";
import { ownCommand } from "src/plugin/pluginId";
import { strings } from "src/translations/helper";

interface EditorContextMenuAction {
  title: string;
  commandId?: string;
  callback?: () => void;
}

export function registerEditorContextMenu(plugin: EditingToolbarPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu, editor) => {
      addEditorContextSubmenu(
        plugin.app,
        menu,
        strings.textTools,
        "whole-word",
        buildTextContextActions(editor),
      );
    }),
  );
}

function addEditorContextAction(
  app: App,
  menu: Menu,
  action: EditorContextMenuAction,
): void {
  menu.addItem((item) => {
    item.setTitle(action.title);

    item.onClick(() => {
      if (action.callback) {
        action.callback();
        return;
      }

      if (action.commandId) {
        app.commands.executeCommandById(ownCommand(action.commandId));
      }
    });
  });
}

function addEditorContextSubmenu(
  app: App,
  menu: Menu,
  title: string,
  icon: string,
  actions: EditorContextMenuAction[],
): void {
  menu.addItem((item) => {
    item.setTitle(title).setIcon(icon);
    item.setSection("info");

    const submenu = item.setSubmenu();
    actions.forEach((action) => addEditorContextAction(app, submenu, action));
  });
}

function buildTextContextActions(editor: Editor): EditorContextMenuAction[] {
  const actions: EditorContextMenuAction[] = [];
  const hasSelection = editor.somethingSelected();
  const cursor = editor.getCursor();
  const lineText = editor.getLine(cursor.line);
  const isOrderedListLine = /^\d+\.\s/.test(lineText);
  const isTableContext = lineText.includes("|");

  if (hasSelection) {
    actions.push(
      { title: strings.splitLines, commandId: "split-lines" },
      { title: strings.mergeLines, commandId: "merge-lines" },
      { title: strings.fullHalfConverter, commandId: "smart-symbols" },
      { title: strings.dedupeLines, commandId: "dedupe-lines" },
      { title: strings.addPrefixSuffix, commandId: "add-wrap" },
      { title: strings.numberLinesCustom, commandId: "number-lines" },
      { title: strings.trimLineEnds, commandId: "remove-whitespace-trim" },
      {
        title: strings.shrinkExtraSpaces,
        commandId: "remove-whitespace-compress",
      },
      {
        title: strings.removeAllWhitespace,
        commandId: "remove-whitespace-all",
      },
      { title: strings.extractBetweenStrings, commandId: "extract-between" },
      { title: strings.listTable, commandId: "list-to-table" },
      { title: strings.tableList, commandId: "table-to-list" },
    );
  } else {
    actions.push(
      { title: strings.addPrefixSuffix, commandId: "add-wrap" },
      { title: strings.insertBlankLines, commandId: "insert-blank-lines" },
    );
    if (isTableContext) {
      actions.push({ title: strings.tableList, commandId: "table-to-list" });
    }
  }

  if (isOrderedListLine) {
    actions.push({
      title: strings.renumberList,
      commandId: "renumber-ordered-list",
    });
  }

  return actions;
}
