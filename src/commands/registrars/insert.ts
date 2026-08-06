import {
  CORE_EDITOR_COMMANDS,
  WRAP_COMMANDS,
} from "src/commands/commandDefinitions";
import type { Registrar } from "src/commands/registrars/types";
import { InsertCalloutModal } from "src/modals/insertCalloutModal";
import { insertCallout } from "src/util/text/callout";
import { insertHorizontalRule } from "src/util/text/horizontalRule";

export const registerInsertCommands: Registrar = ({
  plugin,
  addEditorCommand,
  applyCommand,
}) => {
  addEditorCommand({
    id: "insert-callout",
    name: "Insert callout…",
    icon: "lucide-quote",
    run: async (editor) => {
      const spec = await InsertCalloutModal.prompt(plugin, editor);
      if (spec) insertCallout(editor, spec);
    },
  });

  addEditorCommand({
    id: "hrline",
    name: "Insert horizontal rule",
    icon: "horizontal-rule",
    run: insertHorizontalRule,
  });

  Object.entries(WRAP_COMMANDS).forEach(([id, plot]) => {
    addEditorCommand({
      id,
      name: plot.name,
      icon: `${id}-glyph`,
      run: (editor) => applyCommand(plot, editor),
    });
  });

  CORE_EDITOR_COMMANDS.forEach((command) => {
    addEditorCommand({
      id: command.id,
      name: command.name,
      icon: command.icon,
      run: () => plugin.app.commands.executeCommandById(command.id),
    });
  });
};
