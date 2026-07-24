import { View } from 'obsidian';

const DEFAULT_ALLOWED_VIEW_TYPES = ['markdown', 'canvas'];

export class ViewUtils {
  static isAllowedViewType(view: View | null, allowedTypes?: string[]): boolean {
    if (!view) return false;

    const types = allowedTypes || DEFAULT_ALLOWED_VIEW_TYPES;
    return types.includes(view.getViewType());
  }

  static isSourceMode(view: View | null): boolean {
    if (!view) return false;
    return view.getMode() === 'source';
  }
}
