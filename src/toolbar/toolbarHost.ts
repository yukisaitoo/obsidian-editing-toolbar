import { App, ItemView } from "obsidian";

// Every toolbar lookup, mount and measurement has to agree on which Document it
// is working in — a note popped out into its own window has its own.
export function resolveToolbarDocument(app: App): Document {
  return (
    app.workspace.getActiveViewOfType(ItemView)?.containerEl?.ownerDocument ||
    activeWindow.document
  );
}

export function windowOf(node: Node): Window {
  const doc = node instanceof Document ? node : node.ownerDocument;
  return doc?.defaultView ?? activeWindow;
}
