import { View } from "obsidian";

const DEFAULT_ALLOWED_VIEW_TYPES = ["markdown", "canvas"];

export function isAllowedViewType(
  view: View | null,
  allowedTypes: string[] = DEFAULT_ALLOWED_VIEW_TYPES,
): boolean {
  return view ? allowedTypes.includes(view.getViewType()) : false;
}

export function isSourceMode(view: View | null): boolean {
  return view?.getMode() === "source";
}
