interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Covers everything the two inputs can produce: `#rrggbb` / `#rrggbbaa` from Pickr,
// and the plain-number `rgb()` / `rgba()` that comes back off the CSSOM. Shorthand,
// percentage and named colours are out of scope because nothing here writes them.
function parseColor(color: string): Rgba | null {
  const hex = color.trim().match(/^#([0-9a-fA-F]+)$/);
  if (hex) {
    const digits = hex[1];
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
// parseColor does not understand, which is how a swatch click rejects a cell whose
// background the CSSOM dropped as invalid.
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
