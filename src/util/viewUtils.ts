import { View } from 'obsidian';

export class ViewUtils {
  static isAllowedViewType(view: View | null, allowedTypes?: string[]): boolean {
    if (!view) return false;

    const viewType = view.getViewType();

    const defaultAllowedTypes =
      [
        'markdown',
        'canvas',
      ];
    const types = allowedTypes || defaultAllowedTypes;

    return types.includes(viewType);
  }

  static isSourceMode(view: View | null): boolean {
    if (!view) return false;
    return view.getMode() === 'source';
  }
} 