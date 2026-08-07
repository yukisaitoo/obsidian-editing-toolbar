import { Editor } from "obsidian";

export interface CalloutSpec {
  type: string;
  title: string;
  collapse: "none" | "open" | "closed";
  content: string;
}

export function insertCallout(editor: Editor, spec: CalloutSpec): void {
  let calloutText = `> [!${spec.type}]`;
  if (spec.collapse !== "none") {
    calloutText += `${spec.collapse === "open" ? "+" : "-"}`;
  }
  if (spec.title) {
    calloutText += ` ${spec.title}`;
  }

  calloutText += `\n> ${spec.content.replace(/\n/g, "\n> ")}`;

  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  if (editor.getLine(from.line).slice(0, from.ch).trim() !== "") {
    calloutText = "\n" + calloutText;
  }
  // An unprefixed line below a blockquote is absorbed into it.
  if (editor.getLine(to.line).slice(to.ch).trim() !== "") {
    calloutText += "\n";
  }

  editor.replaceSelection(calloutText + "\n");
}
