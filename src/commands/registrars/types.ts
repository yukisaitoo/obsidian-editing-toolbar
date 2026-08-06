import { Editor } from "obsidian";
import type { CommandPlot } from "src/commands/commandDefinitions";
import type { OwnCommandId } from "src/commands/commandLabels";
import type EditingToolbarPlugin from "src/plugin/main";

// Name and icon come from COMMAND_LABELS, keyed by this id. Core ids are excluded:
// registering one would shadow Obsidian's command rather than reach it.
export interface EditorCommand {
  id: OwnCommandId;
  run: (editor: Editor) => unknown;
}

// What a registrar may do. Editor-backed commands go through `addEditorCommand`,
// never `plugin.addCommand`: it registers them as `editorCallback`, so Obsidian
// decides when an editor is available and `run` always gets a live one.
export interface RegistrarContext {
  plugin: EditingToolbarPlugin;
  addEditorCommand(command: EditorCommand): void;
  applyCommand(command: CommandPlot, editor: Editor): void;
}

export type Registrar = (ctx: RegistrarContext) => void;
