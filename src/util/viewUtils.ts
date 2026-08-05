import { MarkdownView, View } from "obsidian";

export function isAllowedViewType(view: View | null): boolean {
  return view?.getViewType() === "markdown";
}

export function isSourceMode(view: View | null): boolean {
  return view instanceof MarkdownView && view.getMode() === "source";
}

export function isReadingMode(view: View | null): boolean {
  return view instanceof MarkdownView && view.getMode() === "preview";
}
