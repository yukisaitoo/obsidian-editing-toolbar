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
  if (editor.getLine(from.line).slice(0, from.ch).trim() !== "") {
    calloutText = "\n" + calloutText;
  }

  // The trailing newline leaves the cursor on a fresh line below the callout and
  // pushes any text that followed the cursor down with it.
  editor.replaceSelection(calloutText + "\n");
}
