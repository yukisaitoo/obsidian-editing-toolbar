import Pickr from "@simonwep/pickr";

export interface ColorPickrOptions {
  /** Element the swatch button replaces. */
  el: HTMLElement;
  /** Element the picker panel is appended to. */
  container: HTMLElement;
  swatches: string[];
  opacity: boolean;
  defaultColor: string;
  onSave(hexColor: string): void;
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
        cancel: true,
        save: true,
      },
    },
  });

  pickr.on("save", (color: Pickr.HSVaColor) => {
    options.onSave(color.toHEXA().toString());
  });

  return pickr;
}
