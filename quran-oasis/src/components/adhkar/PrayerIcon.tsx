/** أيقونة محراب بسيطة لأذكار ما بعد الصلاة */
export function Prayer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V11a7 7 0 0 1 14 0v10" />
      <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
      <path d="M3 21h18" />
      <path d="M12 2v2" />
    </svg>
  );
}
