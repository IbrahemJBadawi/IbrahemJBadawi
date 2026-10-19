import type { Text, TextList } from "@/i18n/config";
import type { IconName } from "@/components/Icon";

/** Who TechMood Technology works with, and how — shown on /solutions. */
export type Solution = {
  id: string;
  icon: IconName;
  title: Text;
  challenge: Text;
  howWeHelp: TextList;
  /** Service slugs from src/data/services.ts */
  services: string[];
};

export const SOLUTIONS: Solution[] = [
  {
    id: "smb",
    icon: "building",
    title: { ar: "الشركات الصغيرة والمتوسطة", en: "Small & medium businesses" },
    challenge: {
      ar: "فريق صغير ومهام كثيرة، وأدوات متفرقة لا تتحدث مع بعضها.",
      en: "A small team, a lot to do, and tools that don't talk to each other.",
    },
    howWeHelp: {
      ar: ["أتمتة المهام المتكررة وخدمة العملاء", "لوحات مؤشرات تبيّن أداء العمل", "أنظمة داخلية بسيطة مصممة لطريقة عملكم"],
      en: ["Automating repetitive tasks and customer service", "Dashboards that show how the business is doing", "Simple internal systems designed around how you work"],
    },
    services: ["ai-automation", "data-analytics", "digital-transformation"],
  },
  {
    id: "founders",
    icon: "lightbulb",
    title: { ar: "رواد الأعمال وأصحاب الأفكار", en: "Entrepreneurs & idea owners" },
    challenge: {
      ar: "فكرة واعدة تحتاج طريقًا واضحًا من التحقق إلى أول نسخة يستخدمها الناس.",
      en: "A promising idea that needs a clear path from validation to a first version people use.",
    },
    howWeHelp: {
      ar: ["تحديد المشكلة والفئة المستهدفة ونموذج العمل", "تحديد نطاق النسخة الأولى وبناؤها", "خطة إطلاق وقياس وتحسين"],
      en: ["Defining the problem, audience and business model", "Scoping and building the first version", "A launch, measurement and iteration plan"],
    },
    services: ["startup-product-development", "software-development"],
  },
  {
    id: "education",
    icon: "school",
    title: { ar: "المؤسسات التعليمية", en: "Educational institutions" },
    challenge: {
      ar: "متابعة الطلاب والمعلمين والبرامج بأدوات ورقية أو متفرقة.",
      en: "Following students, teachers and programmes with paper or scattered tools.",
    },
    howWeHelp: {
      ar: ["منصات لإدارة الحلقات والدورات والمتابعة", "برامج تدريب تقنية عملية", "تقارير تساعد الإدارة على القرار"],
      en: ["Platforms for running classes, courses and follow-up", "Practical technical training programmes", "Reports that help leadership decide"],
    },
    services: ["digital-transformation", "technology-education", "software-development"],
  },
  {
    id: "startups",
    icon: "rocket",
    title: { ar: "المشاريع الناشئة", en: "Startups" },
    challenge: {
      ar: "الحاجة إلى التحرك بسرعة دون التضحية بجودة المنتج أو وضوح الأولويات.",
      en: "Moving fast without sacrificing product quality or clarity of priorities.",
    },
    howWeHelp: {
      ar: ["إدارة المنتج وخارطة الطريق", "إعداد فرق تعمل بأسلوب Agile", "تطوير المزايا وتحسين الأداء"],
      en: ["Product management and roadmap", "Setting teams up to work the Agile way", "Building features and improving performance"],
    },
    services: ["product-agile-management", "software-development", "ai-automation"],
  },
  {
    id: "individuals",
    icon: "user",
    title: { ar: "الأفراد الراغبون في تطوير منتجات رقمية", en: "Individuals building digital products" },
    challenge: {
      ar: "مهارة أو خبرة يمكن أن تتحول إلى منتج رقمي، دون معرفة تقنية كافية للبدء.",
      en: "A skill or expertise that could become a digital product, without enough technical know-how to start.",
    },
    howWeHelp: {
      ar: ["تحويل الخبرة إلى فكرة منتج قابلة للتنفيذ", "بناء نسخة أولى بسيطة", "تعلّم المهارات الرقمية اللازمة لإدارتها"],
      en: ["Turning expertise into a workable product idea", "Building a simple first version", "Learning the digital skills to run it"],
    },
    services: ["startup-product-development", "technology-education"],
  },
];
