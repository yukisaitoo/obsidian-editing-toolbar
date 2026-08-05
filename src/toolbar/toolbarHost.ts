import { App } from "obsidian";

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
