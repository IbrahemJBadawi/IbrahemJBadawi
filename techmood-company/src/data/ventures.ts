import type { Text, TextList } from "@/i18n/config";

/**
 * The products and projects TechMood Technology builds and runs.
 *
 * `status` must follow evidence, not ambition:
 *   - "live":           released and open to everyone;
 *   - "beta":           deployed and usable, still being completed;
 *   - "in-development": being built — code exists, not released;
 *   - "planned":        an idea at the planning stage — nothing built yet.
 * `url` only when the address is the product's own and has been deployed by
 * the owner. Never add a link to make a project look released.
 * `evidence` is for maintainers (not shown on the site): where the status comes from.
 */
export type VentureStatus = "live" | "beta" | "in-development" | "planned";

export type Venture = {
  slug: string;
  name: Text;
  status: VentureStatus;
  field: Text;
  tagline: Text;
  audience: TextList;
  problem: Text;
  solution: Text;
  /** Confirmed scope: what exists, or for planned projects, what is intended. */
  scope: TextList;
  url?: string;
  evidence: string;
};

export const VENTURES: Venture[] = [
  {
    slug: "techmood-platform",
    name: { ar: "منصة TechMood", en: "TechMood Platform" },
    status: "beta",
    field: { ar: "التعلّم والتوجيه المهني والعمل", en: "Learning, mentorship & work" },
    tagline: {
      ar: "منظومة واحدة تربط التعلّم والإرشاد والفرق والعمل وريادة الأعمال.",
      en: "One ecosystem connecting learning, mentorship, teams, work and entrepreneurship.",
    },
    audience: {
      ar: ["الطلاب والمتعلمون", "المرشدون والمدربون", "الفرق والمستقلون", "الشركات ورواد الأعمال"],
      en: ["Students and learners", "Mentors and trainers", "Teams and freelancers", "Companies and founders"],
    },
    problem: {
      ar: "يتنقل المتعلم بين منصات منفصلة للتعلّم والإرشاد والعمل الجماعي والبحث عن الفرص، فلا يتكوّن له سجل مهني واحد يعكس ما أنجزه فعلًا.",
      en: "Learners move between separate platforms for courses, mentorship, teamwork and opportunities, so no single professional record reflects what they have actually achieved.",
    },
    solution: {
      ar: "حساب واحد وهوية مهنية واحدة: أكاديمية بمسارات ودورات عربية، وشهادات تصدر من أعمال مُقيّمة ويمكن التحقق منها، وحجز جلسات الإرشاد، ومساحات عمل للفرق.",
      en: "One account and one professional identity: an academy of Arabic learning paths and courses, certificates issued from evaluated work and verifiable online, mentorship booking, and team workspaces.",
    },
    scope: {
      ar: [
        "أكاديمية بمسارات ودورات ودروس وتكليفات",
        "شهادات مرتبطة بالأعمال المعتمدة مع صفحة تحقق عامة",
        "حجز جلسات الإرشاد",
        "مساحات عمل للفرق بالمهام والدورات الزمنية",
        "واجهة عربية وإنجليزية",
      ],
      en: [
        "An academy with paths, courses, lessons and assignments",
        "Certificates tied to approved work, with a public verification page",
        "Mentorship session booking",
        "Team workspaces with tasks and sprints",
        "Arabic and English interface",
      ],
    },
    url: "https://techmoodtech.vercel.app",
    evidence: "Repo IbrahemJBadawi/techmoodtech: production rebuild, MVP scope (src/lib/scope.ts), SITE_URL techmoodtech.vercel.app (src/lib/contact.ts).",
  },
  {
    slug: "halaqati",
    name: { ar: "حلقتي", en: "Halaqati" },
    status: "beta",
    field: { ar: "التعليم القرآني", en: "Quran education" },
    tagline: {
      ar: "منصة لإدارة حلقات ومراكز تعليم وتحفيظ القرآن الكريم ومتابعة الطلاب.",
      en: "A platform for running Quran memorisation circles and centres, and following each student's progress.",
    },
    audience: {
      ar: ["المحفّظون والمعلمون", "الطلاب", "أولياء الأمور", "المراكز ودور التحفيظ"],
      en: ["Teachers", "Students", "Parents", "Centres and Quran schools"],
    },
    problem: {
      ar: "تعتمد كثير من الحلقات على الدفاتر والمحادثات لمتابعة الحفظ والحضور، فيصعب على المحفّظ وولي الأمر رؤية تقدم الطالب بوضوح.",
      en: "Many circles track memorisation and attendance in notebooks and chats, so teachers and parents struggle to see a student's progress clearly.",
    },
    solution: {
      ar: "سجل منظم للحلقات والجلسات والحضور والتسميع، مع لوحات للطالب والمحفّظ وولي الأمر، وشهادات إنجاز قابلة للتحقق.",
      en: "An organised record of circles, sessions, attendance and recitation, with dashboards for students, teachers and parents, and verifiable achievement certificates.",
    },
    scope: {
      ar: [
        "إنشاء الحلقات وطلبات الانضمام والجلسات والحضور",
        "تسجيل التسميع والواجبات ومتابعة الإتقان",
        "لوحات للطالب والمحفّظ وولي الأمر",
        "شهادات إنجاز برقم فريد وصفحة تحقق",
        "تثبيت المنصة كتطبيق على الهاتف",
      ],
      en: [
        "Circles, join requests, sessions and attendance",
        "Recitation records, assignments and mastery tracking",
        "Dashboards for students, teachers and parents",
        "Achievement certificates with a unique number and a verification page",
        "Installable on the phone as an app",
      ],
    },
    url: "https://halaqati.vercel.app",
    evidence: "This repo: halaqati/ — phases 1–2 complete, later phases pending; deployed by the owner at halaqati.vercel.app (halaqati/docs/STATUS.md).",
  },
  {
    slug: "al-jamal",
    name: { ar: "منصة الجمال", en: "Al Jamal" },
    status: "in-development",
    field: { ar: "التجارة الإلكترونية والأزياء", en: "E-commerce & fashion" },
    tagline: {
      ar: "متجر إلكتروني عربي للأزياء والملابس الأساسية.",
      en: "An Arabic online store for fashion and everyday clothing.",
    },
    audience: {
      ar: ["المتسوقون في المنطقة العربية"],
      en: ["Shoppers across the Arab region"],
    },
    problem: {
      ar: "يحتاج المتسوق العربي متجرًا واضحًا بلغته، بأسعار وشحن وسياسات مفهومة قبل الطلب.",
      en: "Arabic-speaking shoppers need a clear store in their language, with prices, shipping and policies understood before ordering.",
    },
    solution: {
      ar: "متجر عربي بالكامل بتجربة تسوّق بسيطة على الهاتف، ولوحة إدارة للمنتجات والطلبات والموردين.",
      en: "A fully Arabic store with a simple mobile shopping experience, plus an admin dashboard for products, orders and suppliers.",
    },
    scope: {
      ar: [
        "كتالوج المنتجات والتصنيفات والبحث",
        "سلة الشراء وإتمام الطلب وتتبعه",
        "لوحة إدارة للمنتجات والطلبات والموردين والشحن",
        "لا يتضمن الإصدار الحالي دفعًا إلكترونيًا",
      ],
      en: [
        "Product catalogue, categories and search",
        "Cart, checkout and order tracking",
        "Admin dashboard for products, orders, suppliers and shipping",
        "The current version has no online payment",
      ],
    },
    evidence: "This repo: jamal-platform/ — MVP code (manual dropshipping, no online payment); no deployment recorded.",
  },
  {
    slug: "techmood-growth",
    name: { ar: "TechMood Growth", en: "TechMood Growth" },
    status: "planned",
    field: { ar: "النمو والتسويق الرقمي", en: "Growth & digital marketing" },
    tagline: {
      ar: "مشروع لتطوير حلول النمو وتوليد العملاء المحتملين للشركات.",
      en: "A project to build growth and lead-generation solutions for businesses.",
    },
    audience: {
      ar: ["الشركات الصغيرة والمتوسطة", "المشاريع الناشئة"],
      en: ["Small and medium businesses", "Startups"],
    },
    problem: {
      ar: "تجد كثير من الشركات صعوبة في الوصول المنتظم إلى عملاء محتملين مناسبين وقياس ما ينجح من جهودها التسويقية.",
      en: "Many businesses struggle to reach suitable prospects consistently and to measure which marketing efforts actually work.",
    },
    solution: {
      ar: "حلول تجمع بين البيانات والأتمتة والذكاء الاصطناعي لتنظيم مسار اكتساب العملاء وقياسه. النطاق النهائي قيد التحديد.",
      en: "Solutions combining data, automation and AI to organise and measure customer acquisition. The final scope is still being defined.",
    },
    scope: {
      ar: ["المشروع في مرحلة التخطيط، ولم تُطلق منه أي نسخة بعد"],
      en: ["The project is at the planning stage; no version has been released yet"],
    },
    evidence: "Owner's brief only; no code found in the attached repositories.",
  },
  {
    slug: "wahat-al-quran",
    name: { ar: "واحة القرآن", en: "Wahat Al-Quran" },
    status: "planned",
    field: { ar: "التعليم القرآني", en: "Quran education" },
    tagline: {
      ar: "مشروع رقمي تعليمي متعلق بالقرآن الكريم.",
      en: "A digital educational project centred on the Quran.",
    },
    audience: {
      ar: ["متعلمو القرآن الكريم", "الأسر والمعلمون"],
      en: ["Quran learners", "Families and teachers"],
    },
    problem: {
      ar: "يحتاج متعلمو القرآن الكريم إلى محتوى رقمي تعليمي منظم وموثوق ومناسب لمختلف الأعمار.",
      en: "Quran learners need organised, trustworthy digital learning content suited to different ages.",
    },
    solution: {
      ar: "تجربة تعليمية رقمية تكمّل منظومة TechMood في التعليم القرآني. النطاق النهائي قيد التحديد.",
      en: "A digital learning experience that complements TechMood's Quran-education work. The final scope is still being defined.",
    },
    scope: {
      ar: ["المشروع في مرحلة التخطيط، ولم تُطلق منه أي نسخة بعد"],
      en: ["The project is at the planning stage; no version has been released yet"],
    },
    evidence: "Owner's brief only; no code found in the attached repositories.",
  },
];

export const STATUS_ORDER: VentureStatus[] = ["live", "beta", "in-development", "planned"];

export function getVenture(slug: string) {
  return VENTURES.find((venture) => venture.slug === slug);
}
