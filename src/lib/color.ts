const HEX_COLOR = /^#([0-9a-f]{6})$/i;

export function normalizeHexColor(value: string | null | undefined, fallback: string) {
  return value && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

export function getReadableForeground(background: string) {
  const match = HEX_COLOR.exec(background);
  if (!match) return '#ffffff';
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  // Punto de cruce WCAG entre blanco y slate-900. Por encima de este valor
  // el texto oscuro ofrece mayor relación de contraste.
  return luminance > 0.179 ? '#0f172a' : '#ffffff';
}
