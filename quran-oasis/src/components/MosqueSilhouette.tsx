/** صورة ظلية هادئة لمسجد بقباب ومآذن — تُستخدم في بطاقات البطل (زخرفية فقط). */
export function MosqueSilhouette({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 400 120" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <g fill={color}>
        <rect x="40" y="30" width="10" height="90" rx="2" />
        <path d="M37 32h16l-8-18z" />
        <circle cx="45" cy="11" r="2.5" />
        <rect x="350" y="30" width="10" height="90" rx="2" />
        <path d="M347 32h16l-8-18z" />
        <circle cx="355" cy="11" r="2.5" />
        <path d="M150 120V78c0-28 22-46 50-58 28 12 50 30 50 58v42z" />
        <rect x="197" y="6" width="6" height="16" rx="3" />
        <path d="M90 120V92c0-13 11-22 25-28 14 6 25 15 25 28v28z" />
        <path d="M260 120V92c0-13 11-22 25-28 14 6 25 15 25 28v28z" />
        <rect x="60" y="100" width="280" height="20" />
        <rect x="0" y="112" width="400" height="8" />
      </g>
    </svg>
  );
}
