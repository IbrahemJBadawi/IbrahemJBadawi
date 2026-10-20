import { AppHeader, BottomNav } from "@/components/layout/AppChrome";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:pb-16">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
