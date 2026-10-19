import type { Text, TextList } from "@/i18n/config";
import type { IconName } from "@/components/Icon";

/**
 * The services TechMood Technology offers. Each one gets a card on /services
 * and its own page at /services/[slug]. Add a service by adding an entry —
 * no page needs to change. No prices, guarantees or promised results here.
 */
export type Service = {
  slug: string;
  icon: IconName;
  title: Text;
  summary: Text;
  problem: Text;
  audience: TextList;
  deliverables: TextList;
};

export const SERVICES: Service[] = [
  {
    slug: "ai-automation",
    icon: "spark",
    title: { ar: "الذكاء الاصطناعي والأتمتة", en: "AI & Automation" },
    summary: {
      ar: "نحوّل المهام المتكررة وتدفق المعلومات إلى أنظمة ذكية تعمل باستمرار.",
      en: "Turning repetitive work and scattered information into intelligent systems that keep running.",
    },
    problem: {
      ar: "تستهلك المهام اليدوية المتكررة وقت الفريق، وتبقى البيانات والمستندات متفرقة لا يُستفاد منها في القرار أو خدمة العملاء.",
      en: "Repetitive manual work eats the team's time, while data and documents stay scattered and unused for decisions or customer service.",
    },
    audience: {
      ar: ["الشركات الصغيرة والمتوسطة", "فرق خدمة العملاء والعمليات", "المؤسسات التعليمية"],
      en: ["Small and medium businesses", "Customer service and operations teams", "Educational institutions"],
    },
    deliverables: {
      ar: [
        "تحليل سير العمل وتحديد ما يمكن أتمتته فعليًا",
        "مساعدات ذكية مبنية على محتوى الجهة ومستنداتها",
        "أتمتة التدفقات بين الأدوات والأنظمة المستخدمة",
        "توثيق وتدريب للفريق على الاستخدام والمتابعة",
      ],
      en: [
        "Workflow analysis that identifies what can realistically be automated",
        "AI assistants grounded in the organisation's own content and documents",
        "Automated flows between the tools and systems already in use",
        "Documentation and team training for day-to-day use",
      ],
    },
  },
  {
    slug: "software-development",
    icon: "code",
    title: { ar: "تطوير البرمجيات وتطبيقات الويب", en: "Software & Web Development" },
    summary: {
      ar: "تطبيقات ويب ومنصات رقمية حديثة، سريعة وآمنة وقابلة للتوسع.",
      en: "Modern web applications and digital platforms — fast, secure and built to grow.",
    },
    problem: {
      ar: "فكرة واضحة أو عملية قائمة تحتاج منتجًا رقميًا موثوقًا، لا قالبًا جاهزًا يتعطل عند أول توسع.",
      en: "A clear idea or an existing operation needs a dependable digital product — not a template that breaks at the first sign of growth.",
    },
    audience: {
      ar: ["رواد الأعمال وأصحاب الأفكار", "الشركات التي تحتاج نظامًا داخليًا أو منصة", "المشاريع الناشئة"],
      en: ["Entrepreneurs and idea owners", "Companies that need an internal system or a platform", "Startups"],
    },
    deliverables: {
      ar: [
        "تحليل المتطلبات وتصميم تجربة المستخدم",
        "تطبيقات ويب متجاوبة تدعم العربية والإنجليزية",
        "لوحات إدارة بصلاحيات وحماية للبيانات",
        "إعداد النشر والمتابعة والتحسين بعد الإطلاق",
      ],
      en: [
        "Requirements analysis and user-experience design",
        "Responsive web applications in Arabic and English",
        "Admin dashboards with permissions and data protection",
        "Deployment set-up, monitoring and post-launch improvements",
      ],
    },
  },
  {
    slug: "digital-transformation",
    icon: "transform",
    title: { ar: "التحول الرقمي", en: "Digital Transformation" },
    summary: {
      ar: "ننقل العمليات الورقية والمتفرقة إلى منظومة رقمية مترابطة وواضحة.",
      en: "Moving paper-based and fragmented operations into one connected, legible digital system.",
    },
    problem: {
      ar: "العمل موزّع على أوراق ومحادثات وجداول منفصلة، فيصعب تتبع التقدم ومعرفة الصورة الكاملة.",
      en: "Work is spread across paper, chats and separate spreadsheets, so progress is hard to track and nobody sees the full picture.",
    },
    audience: {
      ar: ["المؤسسات التعليمية والمراكز", "الجمعيات والمبادرات", "الشركات الصغيرة والمتوسطة"],
      en: ["Educational institutions and centres", "Non-profits and initiatives", "Small and medium businesses"],
    },
    deliverables: {
      ar: [
        "تقييم الوضع الحالي وخريطة للعمليات",
        "خطة تحول مرحلية بأولويات واضحة",
        "اختيار الأدوات أو بناء الحلول المناسبة",
        "مرافقة الفريق في التبنّي والتدريب",
      ],
      en: [
        "Current-state assessment and a process map",
        "A phased transformation plan with clear priorities",
        "Choosing the right tools or building fitting solutions",
        "Supporting the team through adoption and training",
      ],
    },
  },
  {
    slug: "data-analytics",
    icon: "chart",
    title: { ar: "تحليل البيانات وذكاء الأعمال", en: "Data Analytics & BI" },
    summary: {
      ar: "لوحات مؤشرات وتقارير تجعل البيانات أداة يومية لاتخاذ القرار.",
      en: "Dashboards and reports that make data an everyday tool for decisions.",
    },
    problem: {
      ar: "البيانات موجودة لكنها لا تجيب عن الأسئلة المهمة: ما الذي ينمو؟ ما الذي يتعثر؟ وأين يجب التركيز؟",
      en: "The data exists but doesn't answer the questions that matter: what is growing, what is stalling, and where to focus.",
    },
    audience: {
      ar: ["الإدارات وفرق المبيعات والتسويق", "المشاريع الناشئة", "المؤسسات التعليمية"],
      en: ["Management, sales and marketing teams", "Startups", "Educational institutions"],
    },
    deliverables: {
      ar: [
        "تحديد المؤشرات الأساسية المرتبطة بالأهداف",
        "تنظيف البيانات وتوحيد مصادرها",
        "لوحات مؤشرات تفاعلية وتقارير دورية",
        "تدريب الفريق على قراءة البيانات واستخدامها",
      ],
      en: [
        "Defining the key indicators tied to your goals",
        "Cleaning data and unifying its sources",
        "Interactive dashboards and periodic reports",
        "Training the team to read and use the data",
      ],
    },
  },
  {
    slug: "product-agile-management",
    icon: "kanban",
    title: { ar: "إدارة المنتجات والفرق الرشيقة", en: "Product & Agile Management" },
    summary: {
      ar: "من الرؤية إلى خطة منتج واضحة، وفرق تعمل بإيقاع منتظم ونتائج قابلة للقياس.",
      en: "From vision to a clear product plan, with teams working at a steady rhythm toward measurable outcomes.",
    },
    problem: {
      ar: "مشاريع تتأخر وأولويات تتغير باستمرار، وفريق لا يعرف ما الأهم الآن ولماذا.",
      en: "Projects slip, priorities keep shifting, and the team isn't sure what matters most right now — or why.",
    },
    audience: {
      ar: ["فرق التطوير والمنتجات", "المشاريع الناشئة", "مديرو المشاريع الجدد"],
      en: ["Product and development teams", "Startups", "New project managers"],
    },
    deliverables: {
      ar: [
        "صياغة رؤية المنتج وخارطة الطريق",
        "إعداد إطار عمل Scrum أو Kanban مناسب للفريق",
        "تنظيم قائمة المهام والأولويات ومعايير الإنجاز",
        "مرافقة الفريق في الدورات الأولى وتحسين الأداء",
      ],
      en: [
        "Product vision and roadmap",
        "A Scrum or Kanban set-up that fits the team",
        "A prioritised backlog with clear definitions of done",
        "Coaching through the first cycles and continuous improvement",
      ],
    },
  },
  {
    slug: "technology-education",
    icon: "cap",
    title: { ar: "التعليم التقني والمهارات الرقمية", en: "Technology Education" },
    summary: {
      ar: "برامج تعلّم عملية مبنية على مشاريع حقيقية، باللغة العربية.",
      en: "Practical, project-based learning programmes, in Arabic.",
    },
    problem: {
      ar: "كثير من المحتوى التقني نظري أو مجزأ، ولا يربط المتعلم بمهارات يطلبها سوق العمل فعلًا.",
      en: "Much technical content is theoretical or fragmented, and doesn't connect learners with the skills the job market actually asks for.",
    },
    audience: {
      ar: ["الطلاب والخريجون", "المؤسسات التعليمية", "الشركات الراغبة في تطوير فرقها"],
      en: ["Students and graduates", "Educational institutions", "Companies developing their teams"],
    },
    deliverables: {
      ar: [
        "مسارات تعليمية مصممة حسب الهدف والمستوى",
        "ورش عمل ومعسكرات تطبيقية",
        "تكليفات ومشاريع عملية مع تقييم ومتابعة",
        "مواد تدريبية قابلة لإعادة الاستخدام",
      ],
      en: [
        "Learning paths designed around the goal and level",
        "Hands-on workshops and bootcamps",
        "Practical assignments and projects with feedback",
        "Reusable training material",
      ],
    },
  },
  {
    slug: "startup-product-development",
    icon: "rocket",
    title: { ar: "بناء المشاريع الناشئة والمنتجات الرقمية", en: "Startup & Digital Product Development" },
    summary: {
      ar: "نرافق الفكرة من التحقق إلى نسخة أولى قابلة للإطلاق والتجربة.",
      en: "Taking an idea from validation to a first version ready to launch and test.",
    },
    problem: {
      ar: "فكرة واعدة لكن الطريق غير واضح: ما الذي يُبنى أولًا؟ وكيف نعرف أن الناس يحتاجونه قبل استثمار الكثير؟",
      en: "A promising idea, but an unclear path: what to build first, and how to know people need it before investing too much.",
    },
    audience: {
      ar: ["رواد الأعمال وأصحاب الأفكار", "الأفراد الراغبون في إطلاق منتج رقمي", "المشاريع الناشئة في مراحلها الأولى"],
      en: ["Entrepreneurs and idea owners", "Individuals who want to launch a digital product", "Early-stage startups"],
    },
    deliverables: {
      ar: [
        "جلسات تحديد المشكلة والفئة المستهدفة ونموذج العمل",
        "تحديد نطاق النسخة الأولى (MVP) وأولوياتها",
        "تصميم وتطوير النسخة الأولى",
        "خطة إطلاق وقياس وتحسين بناءً على ملاحظات المستخدمين",
      ],
      en: [
        "Sessions to define the problem, the audience and the business model",
        "Scoping the first version (MVP) and its priorities",
        "Designing and building the first version",
        "A launch, measurement and iteration plan driven by user feedback",
      ],
    },
  },
];

/** How a collaboration runs — the same for every service. */
export const COLLABORATION_STEPS: { title: Text; body: Text }[] = [
  {
    title: { ar: "التواصل وفهم الاحتياج", en: "Conversation" },
    body: {
      ar: "ترسل الطلب، ثم نتواصل لفهم الهدف والسياق والقيود.",
      en: "You send a request; we follow up to understand the goal, the context and the constraints.",
    },
  },
  {
    title: { ar: "التحليل والمقترح", en: "Analysis & proposal" },
    body: {
      ar: "نحدد النطاق والمخرجات والمراحل في مقترح مكتوب وواضح.",
      en: "We define the scope, deliverables and phases in a clear written proposal.",
    },
  },
  {
    title: { ar: "التنفيذ على مراحل", en: "Phased delivery" },
    body: {
      ar: "نعمل بدورات قصيرة، مع مراجعة النتائج معك في كل مرحلة.",
      en: "We work in short cycles and review the results with you at every stage.",
    },
  },
  {
    title: { ar: "التسليم والتحسين", en: "Handover & improvement" },
    body: {
      ar: "نسلّم العمل موثقًا، ونتابع التحسين بناءً على الاستخدام الفعلي.",
      en: "We hand over documented work and keep improving it based on real use.",
    },
  },
];

export function getService(slug: string) {
  return SERVICES.find((service) => service.slug === slug);
}
