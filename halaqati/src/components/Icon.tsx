/** Line icon set (24px grid, currentColor). Decorative by default. */
const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  journey: "M4 19V5M4 19h16M8 15l3-4 3 2 5-6",
  plan: "M9 11l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  sessions: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  halaqa: "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 20a7 7 0 0 1 14 0M4.5 10a2 2 0 1 0 0-.01M19.5 10a2 2 0 1 0 0-.01",
  certificate: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9 14l-1.5 7L12 19l4.5 2L15 14",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6",
  flame: "M12 21c4 0 7-2.6 7-6.6 0-3.2-2-5.4-3.6-7.2-.4 1.8-1.4 3-2.6 3.4.3-2.8-.8-5.6-3.3-7.6-.3 3-1.8 4.8-3.3 6.6C4.9 11.2 5 12.6 5 14.4 5 18.4 8 21 12 21z",
  stats: "M5 20V10M10 20V4M15 20v-7M20 20v-4",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 21h4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-1.6.9L15 21h-4l-.5-2.7a7 7 0 0 1-1.6-.9l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-1.9L3 10.4l2-3.4 1.9.7a7 7 0 0 1 1.6-.9L9 4h4l.5 2.7a7 7 0 0 1 1.6.9l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 1.9z",
  support: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5v.01",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4",
  building: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  list: "M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01",
  child: "M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 21l1-7-3-2 4-1h6l4 1-3 2 1 7",
  more: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11",
  install: "M12 3v12M7 10l5 5 5-5M5 21h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  check: "M5 12l5 5 9-10",
  swap: "M7 7h13l-3-3M17 17H4l3 3",
  chevron: "M15 6l-6 6 6 6",
  book: "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h8",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  chat: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1zM8 10h8M8 13h5",
  medal: "M8 3h8l-2 6h-4zM12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 13l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 15.3l2-.3z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  pin: "M9 4h6l-1 6 3 3H7l3-3zM12 13v8",
  megaphone: "M3 10v4h3l7 4V6L6 10zM16 9a3 3 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11",
  sparkles: "M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z",
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
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
