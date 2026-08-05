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

  plugin.addCommand({
    id: "hrline",
    name: "Insert horizontal rule",
    icon: "horizontal-rule",
    callback: () => runOnEditor(insertHorizontalRule),
  });

  Object.entries(WRAP_COMMANDS).forEach(([id, plot]) => {
    plugin.addCommand({
      id,
      name: plot.name,
      icon: `${id}-glyph`,
      callback: () => runOnEditor((editor) => applyCommand(plot, editor)),
    });
  });

  CORE_EDITOR_COMMANDS.forEach((command) => {
    plugin.addCommand({
      id: command.id,
      name: command.name,
      icon: command.icon,
      callback: () =>
        runOnEditor(() => plugin.app.commands.executeCommandById(command.id)),
    });
  });
};
