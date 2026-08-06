import {
  WRAP_COMMANDS,
  type WrapCommandId,
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
    run: async (editor) => {
      const spec = await InsertCalloutModal.prompt(plugin, editor);
      if (spec) insertCallout(editor, spec);
    },
  });

  addEditorCommand({ id: "hrline", run: insertHorizontalRule });

  (Object.keys(WRAP_COMMANDS) as WrapCommandId[]).forEach((id) => {
    addEditorCommand({
      id,
      run: (editor) => applyCommand(WRAP_COMMANDS[id], editor),
    });
  });
};
