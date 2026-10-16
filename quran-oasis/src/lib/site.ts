export const SITE = {
  name: "واحة القرآن",
  nameEn: "Quran Oasis",
  tagline: "كل يوم خطوة أقرب إلى القرآن.",
  description:
    "واحة القرآن منصة عربية هادئة تساعدك على قراءة القرآن الكريم وبناء وردك اليومي والمحافظة على الأذكار والتدبّر والحفظ، في تجربة واحدة بسيطة.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
};
