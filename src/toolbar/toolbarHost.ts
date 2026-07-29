import { App, Editor, ItemView } from "obsidian";

// Every toolbar lookup, mount and measurement has to agree on which Document it
// is working in — a note popped out into its own window has its own.
export function resolveToolbarDocument(
  app: App,
  editor?: Editor | null,
): Document {
  return (
    editor?.cm?.dom?.ownerDocument ||
    editor?.cm?.contentDOM?.ownerDocument ||
    app.workspace.getActiveViewOfType(ItemView)?.containerEl?.ownerDocument ||
    activeWindow.document
  );
}

export function windowOf(node: Node): Window {
  const doc = node instanceof Document ? node : node.ownerDocument;
  return doc?.defaultView ?? activeWindow;
}
