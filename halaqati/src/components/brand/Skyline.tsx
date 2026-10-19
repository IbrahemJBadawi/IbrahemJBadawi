/** Decorative mosque skyline (domes and minarets), drawn in currentColor. */
export function Skyline() {
  return (
    <div className="dawn-skyline" aria-hidden>
      <svg viewBox="0 0 800 120" preserveAspectRatio="xMidYMax slice" fill="currentColor">
        <path d="M0 120V96h40v-8h20v8h30V70h6l3-14 3 14h6v26h22V82c0-14 12-26 26-30 14 4 26 16 26 30v14h20V58l4-18 4 18v38h18V86c0-22 18-40 40-44 22 4 40 22 40 44v10h24V64l5-22 5 22v32h30V78c0-10 8-18 18-21 10 3 18 11 18 21v18h26V40l6-26 6 26v56h22V70c0-26 22-48 50-52 28 4 50 26 50 52v26h22V40l6-26 6 26v56h26V78c0-10 8-18 18-21 10 3 18 11 18 21v18h30V64l5-22 5 22v32h24V86c0-22 18-40 40-44 22 4 40 22 40 44v10h18V58l4-18 4 18v38h20V82c0-14 12-26 26-30 14 4 26 16 26 30v14h22V96h20v-8h20v8h20v24z" />
      </svg>
    </div>
  );
}

/** Crescent moon accent. */
export function Crescent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14.5 2.5a9.5 9.5 0 1 0 7 15.9A8 8 0 0 1 14.5 2.5z" />
    </svg>
  );
}
