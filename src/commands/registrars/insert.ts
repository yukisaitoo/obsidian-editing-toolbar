import {
  CORE_EDITOR_COMMANDS,
  WRAP_COMMAND_NAMES,
  WRAP_COMMANDS,
} from "src/commands/commandDefinitions";
import type { Registrar } from "src/commands/registrars/types";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import { insertCallout } from "src/util/text/callout";

// Obsidian leaves the cursor inside the markup it inserts for these two.
const CURSOR_OFFSETS: Record<string, number> = {
  "editor:insert-tag": 1,
  "editor:insert-callout": 11,
};

export const registerInsertCommands: Registrar = ({
  plugin,
  runOnEditor,
  applyCommand,
}) => {
  plugin.addCommand({
    id: "insert-callout",
    name: "Insert callout…",
    icon: "lucide-quote",
    callback: () =>
      runOnEditor(async (editor) => {
        const spec = await InsertCalloutModal.prompt(plugin, editor);
        if (spec) insertCallout(editor, spec);
      }),
  });

  Object.entries(WRAP_COMMANDS).forEach(([name, plot]) => {
    plugin.addCommand({
      id: name,
      name: WRAP_COMMAND_NAMES[name] ?? `Toggle ${name}`,
      icon: `${name}-glyph`,
      callback: () => runOnEditor((editor) => applyCommand(plot, editor)),
    });
  });

  CORE_EDITOR_COMMANDS.forEach((command) => {
    plugin.addCommand({
      id: command.id,
      name: command.name,
      icon: command.icon,
      callback: () =>
        runOnEditor((editor) => {
          const cursorEnd = editor.getCursor("to");
          plugin.app.commands.executeCommandById(command.id);

          const offset = CURSOR_OFFSETS[command.id] ?? 0;
          if (!offset) return;

          // Deferred by one microtask on purpose: the core command has only just
          // written its markup, and setCursor has to land after that edit.
          return Promise.resolve().then(() =>
            editor.setCursor(cursorEnd.line, cursorEnd.ch + offset),
          );
        }),
    });
  });
};
