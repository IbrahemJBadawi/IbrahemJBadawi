import "server-only";

/** Server configuration. Integrations are optional and reported honestly. */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  authProvider: (process.env.AUTH_PROVIDER === "supabase" ? "supabase" : "local") as "supabase" | "local",
  databaseKind: process.env.DATABASE_URL ? "postgres" : "local",
  resendKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  geminiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  vapidPublic: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  vapidPrivate: process.env.VAPID_PRIVATE_KEY || "",
  vapidSubject: process.env.VAPID_SUBJECT || "",
  cronSecret: process.env.CRON_SECRET || "",
  isProduction: process.env.NODE_ENV === "production",
};

export const integrations = {
  email: Boolean(env.resendKey && env.emailFrom),
  ai: Boolean(env.geminiKey),
  push: Boolean(env.vapidPublic && env.vapidPrivate && env.vapidSubject),
};
