import { App, ItemView } from "obsidian";

// Every toolbar lookup, mount and measurement has to agree on which Document it
// is working in — a note popped out into its own window has its own.
export function resolveToolbarDocument(app: App): Document {
  return (
    app.workspace.getActiveViewOfType(ItemView)?.containerEl?.ownerDocument ||
    activeWindow.document
  );
}

// Anything applied at the root — CSS vars, teardown sweeps — has to visit the main
// window and every popout.
export function toolbarDocuments(app: App): Document[] {
  const docs = [app.workspace.rootSplit?.doc ?? activeWindow.document];
  app.workspace.floatingSplit?.children.forEach((child) => docs.push(child.doc));
  return docs;
}

export function windowOf(el: Element): Window {
  return el.ownerDocument.defaultView ?? activeWindow;
}
