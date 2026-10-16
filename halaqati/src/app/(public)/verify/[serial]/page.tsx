import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { LogoMark } from "@/components/brand/Logo";
import { NotConfigured } from "@/components/NotConfigured";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { CERTIFICATE_KIND } from "@/lib/labels";
import { createPublicClient } from "@/lib/supabase/server";
import { ShareButtons } from "./ShareButtons";

type Verified = {
  serial: string; title: string; title_en: string | null; kind: string; description: string | null;
  holder_name: string; teacher_name: string | null; teacher_verified: boolean; halaqa_name: string | null;
  issued_on: string; is_valid: boolean; revoked_at: string | null;
};

async function load(serial: string): Promise<Verified | null> {
  if (!isSupabaseConfigured || !/^HQ-\d{4}-[A-Z0-9]{8}$/i.test(serial)) return null;
  const { data } = await createPublicClient().rpc("verify_certificate", { p_serial: serial });
  return ((data ?? []) as Verified[])[0] ?? null;
}

export async function generateMetadata({ params }: PageProps<"/verify/[serial]">): Promise<Metadata> {
  const c = await load((await params).serial);
  return { title: c ? `شهادة: ${c.title}` : "التحقق من شهادة", robots: { index: false } };
}

export default async function CertificatePage({ params }: PageProps<"/verify/[serial]">) {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const { serial } = await params;
  const c = await load(serial);
  if (!c) notFound();
  const url = `${publicEnv.siteUrl}/verify/${c.serial}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#075b46", light: "#0000" } });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {c.is_valid ? (
        <Alert tone="success">✓ شهادة صحيحة صادرة عبر منصة حلقتي.</Alert>
      ) : (
        <Alert tone="error">هذه الشهادة ملغاة{c.revoked_at ? ` منذ ${formatDate(c.revoked_at)}` : ""} ولم تعد سارية.</Alert>
      )}

      <article className="relative overflow-hidden rounded-2xl border-4 border-double border-gold bg-white p-5 shadow-sm sm:p-10 print:border-gold print:shadow-none" aria-label="الشهادة">
        <div className="flex items-start justify-between gap-3">
          <LogoMark size={64} />
          <div className="text-left text-xs text-muted" dir="ltr">
            <p className="font-bold text-brand-900">Halaqati</p>
            <p>Certificate of Achievement</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="font-semibold text-gold-dark">شهادة {CERTIFICATE_KIND[c.kind]}</p>
          <h1 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">{c.title}</h1>
          {c.title_en && <p className="mt-1 text-lg text-muted" dir="ltr">{c.title_en}</p>}
          <p className="mt-5 text-muted">تشهد منصة حلقتي بأن</p>
          <p className="mt-1 text-2xl font-bold text-ink">{c.holder_name}</p>
          {c.description && <p className="mx-auto mt-3 max-w-xl text-ink">{c.description}</p>}
          <p className="mt-4 text-sm text-muted">
            {c.halaqa_name && <>في {c.halaqa_name} · </>}
            بإشراف المحفّظ {c.teacher_name ?? "—"}{c.teacher_verified && " ✓"}
          </p>
          <p className="mt-1 text-sm text-muted">بتاريخ {formatDate(c.issued_on)}</p>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="text-sm">
            <p className="text-muted">رقم الشهادة</p>
            <p className="font-mono font-bold text-brand-900" dir="ltr">{c.serial}</p>
            <p className="mt-1 text-xs text-muted" dir="ltr">{url.replace(/^https?:\/\//, "")}</p>
          </div>
          <div className="size-24 shrink-0" role="img" aria-label="رمز QR لصفحة التحقق" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </article>

      {c.is_valid && <ShareButtons url={url} text={`الحمد لله، حصلت على شهادة «${c.title}» من منصة حلقتي 🌿`} />}
      <p className="text-sm text-muted print:hidden">لا يظهر الاسم الكامل لصاحب الشهادة إلا إذا اختار ذلك من حسابه.</p>
    </div>
  );
}
