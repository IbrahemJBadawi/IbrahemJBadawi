"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { promptInstall, useInstallState } from "@/components/pwa/install-store";
import { cx } from "@/components/ui";
import { activeHref, type NavItem } from "@/lib/roles";

export type NavGroup = { label: string; items: NavItem[] };

const all = (groups: NavGroup[]) => groups.flatMap((g) => g.items);

export function SidebarNav({ groups, counts }: { groups: NavGroup[]; counts: Record<string, number> }) {
  const pathname = usePathname();
  const current = activeHref(pathname, all(groups));
  return (
    <nav aria-label="قائمة لوحة التحكم">
      {groups.map((g) => (
        <div key={g.label} className="nav-group">
          <div className="nav-group-label">{g.label}</div>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} className={cx("navlink", current === i.href && "active")} aria-current={current === i.href ? "page" : undefined} title={i.label}>
              <Icon name={i.icon} />
              <span className="navlink-label">{i.label}</span>
              {counts[i.href] ? <span className="nav-count">{counts[i.href]}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function TopbarTitle({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const items = all(groups);
  const current = activeHref(pathname, items);
  return <div className="topbar-title">{items.find((i) => i.href === current)?.label ?? "حلقتي"}</div>;
}

type Theme = "light" | "dark";
const themeListeners = new Set<() => void>();
function readTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const theme = useSyncExternalStore<Theme | null>(
    (cb) => { themeListeners.add(cb); return () => themeListeners.delete(cb); },
    readTheme,
    () => null,
  );
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("halaqati-theme", next); } catch {}
    themeListeners.forEach((l) => l());
  };
  const label = theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن";
  return (
    <button type="button" onClick={toggle} className={withLabel ? "btn btn-secondary" : "icon-button"} aria-label={label} title={label}>
      <Icon name={theme === "dark" ? "sun" : "moon"} />
      {withLabel && <span>{label}</span>}
    </button>
  );
}

/** Closes open header dropdowns on outside click, Escape and navigation. */
export function DropdownCloser() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelectorAll("details.dropdown[open]").forEach((d) => d.removeAttribute("open"));
  }, [pathname]);
  useEffect(() => {
    const close = (keep?: Element | null) =>
      document.querySelectorAll("details.dropdown[open]").forEach((d) => { if (d !== keep) d.removeAttribute("open"); });
    const onClick = (e: MouseEvent) => close((e.target as Element).closest("details.dropdown"));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);
  return null;
}

/** "Install app" — native prompt where available, otherwise the how-to page. */
export function InstallButton({ className = "dropdown-item", withIcon = true }: { className?: string; withIcon?: boolean }) {
  const state = useInstallState();
  if (state === "installed") {
    return <span className={className} aria-disabled="true">{withIcon && <Icon name="check" />}التطبيق مثبّت</span>;
  }
  if (state === "ready") {
    return (
      <button type="button" className={className} onClick={() => void promptInstall()}>
        {withIcon && <Icon name="install" />}تثبيت التطبيق
      </button>
    );
  }
  return <Link href="/app" className={className}>{withIcon && <Icon name="install" />}تثبيت التطبيق</Link>;
}

export function MobileTabBar({
  tabs,
  groups,
  counts,
  extra,
}: {
  tabs: NavItem[];
  groups: NavGroup[];
  counts: Record<string, number>;
  extra: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) setOpen(false);
  const current = activeHref(pathname, all(groups));
  const inTabs = tabs.some((t) => t.href === current);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav className="tabbar" aria-label="التنقل السريع">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={cx("tabbar-item", current === t.href && "is-active")} aria-current={current === t.href ? "page" : undefined}>
            <span className="tabbar-icon"><Icon name={t.icon} size={22} />{counts[t.href] ? <span className="dot-badge">{counts[t.href]}</span> : null}</span>
            <span className="tabbar-label">{t.label}</span>
          </Link>
        ))}
        <button type="button" className={cx("tabbar-item", (open || (!inTabs && current)) && "is-active")} aria-expanded={open} aria-controls="more-sheet" onClick={() => { setOpenedAt(pathname); setOpen(true); }}>
          <span className="tabbar-icon"><Icon name="more" size={22} />{counts.more ? <span className="dot-badge">{counts.more}</span> : null}</span>
          <span className="tabbar-label">المزيد</span>
        </button>
      </nav>
      <div className="sheet-backdrop" hidden={!open} onClick={() => setOpen(false)}>
        <div id="more-sheet" className="sheet" role="dialog" aria-modal="true" aria-label="المزيد" onClick={(e) => {
          e.stopPropagation();
          // Any navigation or submit from the sheet (a tile, a role switch, sign out) closes it.
          if ((e.target as Element).closest("a, button[type=submit]")) setOpen(false);
        }}>
          <div className="sheet-head">
            <span className="sheet-grip" aria-hidden />
            <button type="button" className="icon-button" aria-label="إغلاق" onClick={() => setOpen(false)}><Icon name="close" /></button>
          </div>
          {extra}
          {groups.map((g) => (
            <section key={g.label} className="sheet-group">
              <h2>{g.label}</h2>
              <div className="sheet-grid">
                {g.items.map((i) => (
                  <Link key={i.href} href={i.href} className={cx("sheet-tile", current === i.href && "is-active")} aria-current={current === i.href ? "page" : undefined}>
                    <span className="sheet-tile-icon"><Icon name={i.icon} /></span>
                    <span className="min-w-0 flex-1">{i.label}</span>
                    {counts[i.href] ? <span className="nav-count">{counts[i.href]}</span> : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
