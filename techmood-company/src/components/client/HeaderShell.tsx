"use client";

import { useEffect, useState, type ReactNode } from "react";

/** The sticky header; draws its bottom line once the page has scrolled. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>{children}</header>;
}
