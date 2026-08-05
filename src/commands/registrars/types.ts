import { Editor } from "obsidian";
import type { CommandPlot } from "src/commands/commandDefinitions";
import type EditingToolbarPlugin from "src/plugin/main";

// What a registrar may do. `runOnEditor` is the single validation and failure
// boundary for editor-backed commands: downstream actions get a live editor, never
// re-check it, and never need their own try/catch.
export interface RegistrarContext {
  plugin: EditingToolbarPlugin;
  runOnEditor(action: (editor: Editor) => unknown): void;
  applyCommand(command: CommandPlot, editor: Editor): void;
}

export type Registrar = (ctx: RegistrarContext) => void;
