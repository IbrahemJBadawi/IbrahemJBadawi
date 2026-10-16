/**
 * Minimal line-art silhouettes (original artwork, 200x260 viewBox) used for
 * category tiles and for generated sample-product images. No brand imagery.
 */
export const ART: Record<string, string> = {
  women:
    "M78 30 Q100 44 122 30 L130 70 Q118 84 120 104 L160 232 Q100 246 40 232 L80 104 Q82 84 70 70 Z M78 30 L70 18 M122 30 L130 18 M86 104 Q100 112 114 104",
  men:
    "M70 36 L100 50 L130 36 L168 60 L154 104 L138 96 L138 226 L62 226 L62 96 L46 104 L32 60 Z M100 50 L100 226 M88 44 L100 66 L112 44 M94 90 h0 M94 120 h0 M94 150 h0",
  kids:
    "M74 64 L100 74 L126 64 L156 84 L144 116 L130 110 L130 200 L70 200 L70 110 L56 116 L44 84 Z M88 70 Q100 86 112 70 M86 140 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0",
  shoes:
    "M30 196 L30 168 Q30 150 50 146 L96 140 Q118 120 132 92 L148 96 Q150 130 160 150 L176 172 Q182 196 170 200 L40 200 Q30 200 30 196 Z M42 200 L42 214 M160 200 L162 230 M118 132 L136 142",
  bags:
    "M48 100 L152 100 L166 222 L34 222 Z M74 100 Q74 48 100 48 Q126 48 126 100 M48 126 L152 126 M92 140 h16 v12 h-16 Z",
  accessories:
    "M100 40 a22 22 0 1 0 0.1 0 M100 84 L100 104 M70 104 L130 104 L136 196 Q100 214 64 196 Z M100 130 a24 24 0 1 0 0.1 0 M100 140 L100 154 L110 160",
};

export function artFor(slug: string | null | undefined) {
  return (slug && ART[slug]) || ART.accessories;
}

/** Full SVG document (used by the demo seed to write image files). */
export function artSvg(slug: string, bg: string, stroke: string, label?: string) {
  const text = label
    ? `<text x="200" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="18" letter-spacing="6" fill="${stroke}" opacity="0.55">${label}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="900" height="1200">
<rect width="400" height="533" fill="${bg}"/>
<g transform="translate(60 90) scale(1.4)" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
<path d="${artFor(slug)}"/></g>${text}</svg>`;
}
