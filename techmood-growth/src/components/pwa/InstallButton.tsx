"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { promptInstall, useInstallState } from "./install-store";

/** Install the app (native prompt where supported; instructions otherwise). */
export function InstallButton({ variant = "secondary", compact }: { variant?: "primary" | "secondary"; compact?: boolean }) {
  const state = useInstallState();
  if (state === "installed") return compact ? null : <p className="text-sm font-semibold text-ok">التطبيق مثبّت على هذا الجهاز ✓</p>;
  if (state === "ready") {
    return (
      <button type="button" className={`btn btn-${variant}${compact ? " btn-sm" : ""}`} onClick={() => void promptInstall()}>
        <Download size={18} aria-hidden />
        تثبيت التطبيق
      </button>
    );
  }
  return (
    <Link href="/install" className={`btn btn-${variant}${compact ? " btn-sm" : ""}`}>
      <Download size={18} aria-hidden />
      طريقة التثبيت
    </Link>
  );
}
