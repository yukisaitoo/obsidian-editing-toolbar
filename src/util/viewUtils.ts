import { MarkdownView, View } from "obsidian";

export function isReadingMode(view: View | null): boolean {
  return view instanceof MarkdownView && view.getMode() === "preview";
}
