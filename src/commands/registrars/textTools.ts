import { App, Editor } from "obsidian";
import type { Registrar } from "src/commands/registrars/types";
import { TextInputModal } from "src/modals/TextInputModal";
import { strings } from "src/translations/helper";
import {
  dedupe,
  insertBlankLines,
  mergeLines,
  numberList,
  splitLines,
} from "src/util/text/lines";
import {
  convertListToTableMultiDim,
  convertTableToList,
} from "src/util/text/tables";
import {
  copySelectionAsPlainText,
  processWhitespace,
} from "src/util/text/whitespace";
import { addWrap, extractBetween, smartTypography } from "src/util/text/wrap";

export const registerTextToolCommands: Registrar = ({
  plugin,
  runOnEditor,
}) => {
  const add = (id: string, name: string, run: (editor: Editor) => void) =>
    plugin.addCommand({ id, name, callback: () => runOnEditor(run) });

  add("get-plain-text", "Get plain text", copySelectionAsPlainText);
  add("insert-blank-lines", "Insert blank lines", insertBlankLines);
  add("split-lines", "Split lines", splitLines);
  add("smart-symbols", "Convert punctuation width", smartTypography);
  add("list-to-table", strings.listTable, convertListToTableMultiDim);
  add("table-to-list", strings.tableList, convertTableToList);

  add("remove-blank-lines", "Remove blank lines", (editor) =>
    processWhitespace(editor, { removeEmptyLines: true }),
  );
  add("remove-whitespace-trim", "Trim line ends", (editor) =>
    processWhitespace(editor, { trim: true }),
  );
  add("remove-whitespace-compress", "Shrink extra spaces", (editor) =>
    processWhitespace(editor, { compress: true }),
  );
  add("remove-whitespace-all", "Remove all whitespace", (editor) =>
    processWhitespace(editor, { all: true }),
  );
  add("dedupe-lines", "Dedupe lines", (editor) =>
    dedupe(editor, { trimBeforeCompare: true }),
  );

  add("add-wrap", "Add prefix/suffix", (editor) =>
    promptFields(
      plugin.app,
      strings.addPrefixSuffix,
      [
        {
          key: "prefix",
          label: strings.prefix,
          placeholder: strings.enterPrefix,
        },
        {
          key: "suffix",
          label: strings.suffix,
          placeholder: strings.enterSuffix,
        },
      ],
      (result) => addWrap(editor, result.prefix, result.suffix, true),
    ),
  );

  add("number-lines", "Number lines (custom)", (editor) =>
    promptFields(
      plugin.app,
      strings.numberLinesConfiguration,
      [
        { key: "start", label: strings.startNumber, defaultValue: "1" },
        { key: "step", label: strings.step, defaultValue: "1" },
        { key: "sep", label: strings.separator, defaultValue: ". " },
      ],
      (result) =>
        numberList(
          editor,
          parseInt(result.start) || 1,
          parseInt(result.step) || 1,
          result.sep || ". ",
          "",
        ),
    ),
  );

  add("extract-between", "Extract between strings", (editor) =>
    promptFields(
      plugin.app,
      strings.extractBetweenStrings,
      [
        {
          key: "start",
          label: strings.startString,
          placeholder: strings.enterStartString,
          defaultValue: "[",
        },
        {
          key: "end",
          label: strings.endString,
          placeholder: strings.enterEndString,
          defaultValue: "]",
        },
      ],
      (result) => extractBetween(editor, result.start, result.end),
    ),
  );

  add("merge-lines", strings.mergeLines, (editor) =>
    promptFields(
      plugin.app,
      strings.mergeLinesSettings,
      [
        {
          key: "sep",
          label: strings.separatorLeaveEmptySmartSpacing,
          placeholder: strings.eGCommaPipeArrow,
        },
      ],
      (result) =>
        mergeLines(editor, {
          separator: result.sep,
          // No separator given means "join naturally", which keeps paragraphs.
          preserveParagraphs: result.sep === "",
          trimLines: true,
        }),
    ),
  );
};

interface PromptField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

function promptFields(
  app: App,
  title: string,
  fields: PromptField[],
  onSubmit: (result: Record<string, string>) => void,
): void {
  new TextInputModal(
    app,
    title,
    fields.map((field) => ({
      placeholder: "",
      defaultValue: "",
      ...field,
    })),
    onSubmit,
  ).open();
}
