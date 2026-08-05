interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, and the plain-number forms of
// `rgb()` / `rgba()`. Percentage and named colours are out of scope: nothing here
// writes them — pickr emits hex, swatch clicks read back CSSOM `rgb()` — so they
// only arrive from a hand-edited config, where landing in `skipped` is correct.
function parseColor(color: string): Rgba | null {
  const hex = color.trim().match(/^#([0-9a-fA-F]+)$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((d) => d + d)
        .join("");
    }
    if (digits.length !== 6 && digits.length !== 8) return null;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fn = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!fn) return null;

  const parts = fn[1]
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;

  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
  };
}

// Serialises back to hex, keeping alpha as the 8-digit form. Null for anything
// parseColor does not understand, which makes this the colour validator too.
export function toHexColor(color: string): string | null {
  const rgba = parseColor(color);
  if (!rgba) return null;

  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");

  const rgb = `#${channel(rgba.r)}${channel(rgba.g)}${channel(rgba.b)}`;
  return rgba.a >= 1 ? rgb : `${rgb}${channel(rgba.a * 255)}`;
}

// Theme vars are valid CSS but not a colour Pickr can parse, so resolving one
// means letting the browser do it.
export function resolveHexColor(
  parent: HTMLElement,
  color: string,
): string | null {
  const direct = toHexColor(color);
  if (direct) return direct;

  const probe = parent.createDiv();
  probe.style.color = color;
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return toHexColor(computed);
}
