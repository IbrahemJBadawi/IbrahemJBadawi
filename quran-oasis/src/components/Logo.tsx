/** شعار واحة القرآن: محراب يحتضن سعفة واحة، وشمس ذهبية صغيرة. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#234334" />
      <path d="M14 38V22a10 10 0 0 1 20 0v16" fill="none" stroke="#C4A66A" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M24 37c0-7 0-11 0-15m0 4c-3.5-3.2-6.4-3.8-8.6-3.4m8.6 3.4c3.5-3.2 6.4-3.8 8.6-3.4M24 30c-2.8-2.4-5.3-2.9-7.4-2.6M24 30c2.8-2.4 5.3-2.9 7.4-2.6"
        fill="none"
        stroke="#A9BF9D"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="17.5" r="2.4" fill="#C4A66A" />
      <path d="M12 38h24" stroke="#71866A" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-fg">واحة القرآن</span>
          <span className="text-[11px] font-medium tracking-wide text-muted">Quran Oasis</span>
        </span>
      )}
    </span>
  );
}
