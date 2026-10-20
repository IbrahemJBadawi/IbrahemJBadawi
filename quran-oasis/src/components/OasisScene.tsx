/** رسم واحة هادئ: شمس، كثبان، ونخيل داخل قوس — بدون صور خارجية. */
export function OasisScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 420" className={className} role="img" aria-label="رسم توضيحي لواحة هادئة">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3EAD6" />
          <stop offset="1" stopColor="#E7EBE1" />
        </linearGradient>
        <clipPath id="arch">
          <path d="M40 410V190C40 90 140 20 260 20s220 70 220 170v220z" />
        </clipPath>
      </defs>
      <g clipPath="url(#arch)">
        <rect width="520" height="420" fill="url(#sky)" />
        <circle cx="330" cy="150" r="46" fill="#C4A66A" opacity=".85" />
        <circle cx="330" cy="150" r="70" fill="#C4A66A" opacity=".12" />
        <path d="M0 300c90-40 170-46 260-18s170 30 260-6v144H0z" fill="#A9BF9D" opacity=".7" />
        <path d="M0 340c110-34 200-30 290 0s150 26 230 4v76H0z" fill="#71866A" />
        <path d="M0 380c120-22 240-20 340 4 70 16 130 12 180 0v36H0z" fill="#234334" />
        <ellipse cx="200" cy="352" rx="70" ry="9" fill="#9fc0c9" opacity=".55" />
        {/* نخلة يمنى */}
        <g stroke="#234334" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M150 350c4-50 2-90-8-128" />
          <path d="M142 222c-22-14-44-14-66 0M142 222c-10-22-28-34-52-36M142 222c18-18 40-22 64-14M142 222c8-22 26-34 50-34M142 222c-2 22-12 40-30 52" />
        </g>
        {/* نخلة صغيرة */}
        <g stroke="#234334" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".85">
          <path d="M250 345c2-30 0-54-6-76" />
          <path d="M244 269c-14-9-30-9-44 0M244 269c-6-15-18-23-34-24M244 269c12-12 27-14 42-8M244 269c6-14 18-22 33-22" />
        </g>
      </g>
      <path d="M40 410V190C40 90 140 20 260 20s220 70 220 170v220" fill="none" stroke="#C4A66A" strokeWidth="3" />
    </svg>
  );
}
