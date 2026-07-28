import Pickr from "@simonwep/pickr";

import { strings } from "src/translations/helper";

export interface ColorPickrOptions {
  el: HTMLElement;
  container: HTMLElement;
  swatches: string[];
  opacity: boolean;
  defaultColor: string;
  onSave(hexColor: string): void;
  onClear(): void;
}

export function createColorPickr(options: ColorPickrOptions): Pickr {
  const pickr = Pickr.create({
    el: options.el,
    container: options.container,
    theme: "nano",
    swatches: options.swatches,
    lockOpacity: !options.opacity,
    default: options.defaultColor,
    position: "left-middle",
    components: {
      preview: true,
      hue: true,
      opacity: options.opacity,
      interaction: {
        hex: true,
        rgba: false,
        hsla: false,
        input: true,
        clear: true,
        save: true,
      },
    },
    i18n: {
      "btn:clear": strings.reset,
      "aria:btn:clear": strings.reset,
    },
  });

  // Pickr fires save(null) alongside clear; only the clear handler acts on it.
  pickr.on("save", (color: Pickr.HSVaColor | null) => {
    if (color) options.onSave(color.toHEXA().toString());
  });

  pickr.on("clear", () => {
    options.onClear();
  });

  return pickr;
}
