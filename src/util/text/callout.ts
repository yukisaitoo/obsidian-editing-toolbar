import { Editor } from "obsidian";

export interface CalloutSpec {
  type: string;
  title: string;
  collapse: "none" | "open" | "closed";
  content: string;
}

export function insertCallout(editor: Editor, spec: CalloutSpec): void {
  const mark =
    spec.collapse === "open" ? "+" : spec.collapse === "closed" ? "-" : "";
  const title = spec.title ? ` ${spec.title}` : "";
  const lines = [`> [!${spec.type}]${mark}${title}`];
  if (spec.content) {
    lines.push(...spec.content.split("\n").map((l) => (l ? `> ${l}` : ">")));
  }

  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  const before = editor.getLine(from.line).slice(0, from.ch);
  const after = editor.getLine(to.line).slice(to.ch);
  // An unprefixed line above or below a blockquote is absorbed into it. What ends
  // up below is the tail the cursor pushes down, or the next line if there is none.
  const below =
    after || (to.line < editor.lastLine() ? editor.getLine(to.line + 1) : "");

  if (before.trim()) lines.unshift("");
  if (below.trim()) lines.push("");

  // The trailing break only exists to put a real tail on its own line.
  editor.replaceSelection(lines.join("\n") + (after ? "\n" : ""));
}
