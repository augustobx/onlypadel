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

export function getThemeColors(
  theme: string | null | undefined,
  customPrimary?: string | null,
  customSecondary?: string | null
) {
  const normTheme = theme || 'light';
  if (normTheme === 'cyber-padel') {
    return {
      themeName: 'cyber-padel',
      themeClass: 'dark theme-cyber-padel',
      primary: '#10b981',
      secondary: '#00e5ff',
      isDark: true,
    };
  }
  if (normTheme === 'sunset-clay') {
    return {
      themeName: 'sunset-clay',
      themeClass: 'dark theme-sunset-clay',
      primary: '#ea580c',
      secondary: '#f59e0b',
      isDark: true,
    };
  }
  if (normTheme === 'ocean-frost') {
    return {
      themeName: 'ocean-frost',
      themeClass: 'dark theme-ocean-frost',
      primary: '#0284c7',
      secondary: '#06b6d4',
      isDark: true,
    };
  }
  if (normTheme === 'dark') {
    return {
      themeName: 'dark',
      themeClass: 'dark',
      primary: normalizeHexColor(customPrimary, '#10b981'),
      secondary: normalizeHexColor(customSecondary, '#0ea5e9'),
      isDark: true,
    };
  }
  return {
    themeName: 'light',
    themeClass: '',
    primary: normalizeHexColor(customPrimary, '#10b981'),
    secondary: normalizeHexColor(customSecondary, '#0ea5e9'),
    isDark: false,
  };
}

