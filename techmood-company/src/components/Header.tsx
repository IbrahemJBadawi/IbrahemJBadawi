import Link from "next/link";
import { href, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { Logo } from "./Logo";
import { HeaderShell } from "./client/HeaderShell";
import { LanguageSwitch } from "./client/LanguageSwitch";
import { MobileMenu } from "./client/MobileMenu";
import { MainNav } from "./client/NavLinks";
import { ThemeToggle } from "./client/ThemeToggle";
import { UpdatesBell } from "./client/UpdatesBell";

export function Header({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <HeaderShell>
      <div className="container header-inner">
        <Link href={href(locale, "/")} className="brand" aria-label={t("TechMood Technology — الصفحة الرئيسية", "TechMood Technology — home")}>
          <Logo />
        </Link>
        <MainNav />
        <div className="header-actions">
          <UpdatesBell />
          <ThemeToggle />
          <LanguageSwitch />
          <Link href={href(locale, "/contact")} className="btn btn-primary btn-sm header-cta">
            {t("ابدأ مشروعًا", "Start a project")}
          </Link>
          <MobileMenu />
        </div>
      </div>
    </HeaderShell>
  );
}
