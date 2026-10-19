/**
 * The site's icon set: simple 24×24 stroke icons drawn for this site
 * (no icon font, no external library). Decorative by default.
 */
const PATHS = {
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14",
  transform: "M4 7h11l-3-3M20 17H9l3 3M4 7v3M20 17v-3",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  kanban: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6",
  rocket: "M5 15c-1.5 1.5-2 4-2 6 2 0 4.5-.5 6-2M9 15l-3-3c1.5-5 6-9 14-9 0 8-4 12.5-9 14zM14.5 9.5h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0",
  sun: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
  home: "M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  building: "M5 21V4h10v17M15 9h4v12M9 8h2M9 12h2M9 16h2M3 21h18",
  chat: "M4 5h16v11H9l-5 4z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 6.5M18 14.8c1.8.8 3 2.6 3.5 5.2",
  briefcase: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  school: "M3 10l9-5 9 5-9 5zM6 12v6h12v-6",
  lightbulb: "M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  target: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7a5 5 0 100 10 5 5 0 000-10zM12 11a1 1 0 100 2 1 1 0 000-2z",
  refresh: "M20 11a8 8 0 00-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.5 4.5L20 16M20 20v-4h-4",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  phone: "M8 2h8v20H8zM11 18h2",
  telegram: "M21 4L3 11l6 2 2 6 3-4 5 4zM9 13l9-6",
  github: "M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 00-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21",
  linkedin: "M4 9h4v11H4zM6 4a2 2 0 100 4 2 2 0 000-4zM11 9h4v1.5c.8-1.2 2-1.8 3.5-1.8 2.3 0 3.5 1.5 3.5 4.3v7h-4v-6c0-1.4-.6-2.2-1.7-2.2s-1.8.8-1.8 2.2v6h-4z",
  facebook: "M14 8h3V4.5h-3c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.6v-6.5h2.9l.5-3.5h-3.4V8.7c0-.4.3-.7.7-.7z",
  instagram: "M4 4h16v16H4zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM16.8 7.2h.01",
  tiktok: "M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className, label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["icon", className].filter(Boolean).join(" ")}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
