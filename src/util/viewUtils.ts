import { View } from 'obsidian';
import type editingToolbarPlugin from 'src/plugin/main';

export class ViewUtils {
  static isAllowedViewType(view: View | null, allowedTypes?: string[]): boolean {
    if (!view) return false;

    const viewType = view.getViewType();

    const plugin = (window as any).app?.plugins?.plugins?.['editing-toolbar'] as editingToolbarPlugin | undefined;
    
    if (plugin?.settings?.viewTypeSettings && plugin.settings.viewTypeSettings[viewType] !== undefined) {
      return plugin.settings.viewTypeSettings[viewType];
    }

    const defaultAllowedTypes =
      [
        'markdown',
        'canvas',
        'thino_view',
        'meld-encrypted-view',
      ];
    const types = allowedTypes || defaultAllowedTypes;

    return types.includes(viewType);
  }

  static isSourceMode(view: View | null): boolean {
    if (!view) return false;
    return view.getMode() === 'source';
  }
} 