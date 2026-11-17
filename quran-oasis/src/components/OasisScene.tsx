/** مشهد «مشكاة»: محراب هندسي، نجمة ثمانية ومصحف مفتوح؛ رسم متجهي محلي خفيف. */
export function OasisScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 450" className={className} role="img" aria-label="محراب إسلامي مزخرف يتوسطه مصحف مفتوح">
      <defs>
        <linearGradient id="mihrab-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#325B49" />
          <stop offset=".55" stopColor="#1C4438" />
          <stop offset="1" stopColor="#103026" />
        </linearGradient>
        <radialGradient id="mihrab-light" cx="50%" cy="33%" r="65%">
          <stop offset="0" stopColor="#CBAA65" stopOpacity=".32" />
          <stop offset="1" stopColor="#CBAA65" stopOpacity="0" />
        </radialGradient>
        <clipPath id="mihrab-clip">
          <path d="M66 441V190c0-53 82-102 194-174 112 72 194 121 194 174v251Z" />
        </clipPath>
        <pattern id="mihrab-tile" width="66" height="66" patternUnits="userSpaceOnUse">
          <path d="M33 5 42 24 61 33 42 42 33 61 24 42 5 33 24 24Z" fill="none" stroke="#DCC596" strokeOpacity=".14" strokeWidth="1.1" />
          <path d="M16.5 16.5h33v33h-33z" fill="none" stroke="#DCC596" strokeOpacity=".1" transform="rotate(45 33 33)" />
        </pattern>
      </defs>
      <path d="M53 442V188c0-63 96-121 207-187 111 66 207 124 207 187v254" fill="none" stroke="#C7A76D" strokeOpacity=".32" strokeWidth="1.4" />
      <path d="M66 441V190c0-53 82-102 194-174 112 72 194 121 194 174v251Z" fill="url(#mihrab-fill)" />
      <g clipPath="url(#mihrab-clip)">
        <rect x="66" y="16" width="388" height="425" fill="url(#mihrab-tile)" />
        <rect x="66" y="16" width="388" height="425" fill="url(#mihrab-light)" />
        <path d="M92 442V200c0-46 76-93 168-153 92 60 168 107 168 153v242" fill="none" stroke="#D4B57A" strokeWidth="1.6" strokeOpacity=".68" />
        <path d="M111 442V211c0-38 63-81 149-136 86 55 149 98 149 136v231" fill="none" stroke="#D4B57A" strokeWidth=".9" strokeOpacity=".32" />
        <g transform="translate(260 181)">
          <circle r="87" fill="#E7D2A1" fillOpacity=".08" stroke="#E1C48D" strokeOpacity=".3" />
          <circle r="65" fill="none" stroke="#E1C48D" strokeWidth="1.2" />
          <circle r="52" fill="none" stroke="#E1C48D" strokeWidth=".8" strokeDasharray="3 7" />
          <path d="M0-52 16-16 52 0 16 16 0 52-16 16-52 0-16-16Z" fill="#DCC28E" fillOpacity=".3" stroke="#E1C48D" strokeWidth="1.8" />
          <path d="M-35-35H35V35H-35Z" transform="rotate(45)" fill="none" stroke="#F0DDAF" strokeWidth="1.5" />
          <circle r="14" fill="#D9BA7F" />
          <circle r="5" fill="#FFF5DA" />
        </g>
        <ellipse cx="260" cy="385" rx="135" ry="17" fill="#0A241C" fillOpacity=".38" />
        <path d="m201 386 118-61m0 61-118-61" stroke="#D8B77A" strokeWidth="9" strokeLinecap="round" />
        <path d="M258 332c-30-23-73-32-119-19v-71c42-15 87-7 119 17v73Z" fill="#FFF9EA" stroke="#D2B67E" strokeWidth="4" />
        <path d="M262 332c30-23 73-32 119-19v-71c-42-15-87-7-119 17v73Z" fill="#F7EAD0" stroke="#D2B67E" strokeWidth="4" />
        <path d="M260 258v77" stroke="#B89159" strokeWidth="3" />
        <path d="M162 268c34-4 56 1 78 10m-78 6c34-4 56 1 78 10m-78 6c34-4 56 1 78 10m40-32c22-9 44-14 78-10m-78 26c22-9 44-14 78-10m-78 26c22-9 44-14 78-10" fill="none" stroke="#C6B28B" strokeWidth="2" strokeLinecap="round" strokeOpacity=".72" />
        <path d="M139 314c45-9 86 0 119 22 33-22 74-31 123-22" fill="none" stroke="#C7A267" strokeWidth="3" />
      </g>
      <path d="M66 441V190c0-53 82-102 194-174 112 72 194 121 194 174v251" fill="none" stroke="#B9965A" strokeWidth="3" />
      <path d="M80 441h360" stroke="#B9965A" strokeWidth="2" />
    </svg>
  );
}
