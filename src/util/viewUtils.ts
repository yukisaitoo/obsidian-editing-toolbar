import { View } from "obsidian";

const ALLOWED_VIEW_TYPES = ["markdown", "canvas"];

export function isAllowedViewType(view: View | null): boolean {
  return view !== null && ALLOWED_VIEW_TYPES.includes(view.getViewType());
}

export function isSourceMode(view: View | null): boolean {
  return view?.getMode() === "source";
}
