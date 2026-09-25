// Generates lighter/darker shades from one base hex color

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
};

const shade = (hex: string, factor: number) => {
  const { r, g, b } = hexToRgb(hex);
  if (factor >= 0) {
    return rgbToHex(
      r + (255 - r) * factor,
      g + (255 - g) * factor,
      b + (255 - b) * factor,
    );
  }
  return rgbToHex(r * (1 + factor), g * (1 + factor), b * (1 + factor));
};

export const applyTheme = (primaryColor?: string | null) => {
  const base = primaryColor || "#1e3a8a";
  const root = document.documentElement;
  root.style.setProperty("--color-primary", base);
  root.style.setProperty("--color-primary-dark", shade(base, -0.15));
  root.style.setProperty("--color-primary-light", shade(base, 0.9));
  root.style.setProperty("--color-primary-light-2", shade(base, 0.95));
};
