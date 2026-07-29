import { Editor } from "obsidian";
import type { CommandPlot } from "src/commands/commandDefinitions";
import type EditingToolbarPlugin from "src/plugin/main";

/**
 * What a registrar is allowed to do. `runOnEditor` is the single validation
 * point for editor-backed commands — everything downstream gets a guaranteed-live
 * editor and never re-checks.
 */
export interface RegistrarContext {
  plugin: EditingToolbarPlugin;
  runOnEditor(action: (editor: Editor) => unknown): void;
  applyCommand(command: CommandPlot, editor: Editor): void;
  runHistoryAction(action: "undo" | "redo"): void;
}

export type Registrar = (ctx: RegistrarContext) => void;
