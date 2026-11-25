# مجلس السلام | Peace Council

**TechMood Technology** — لعبة استراتيجية ومحاكاة مبسطة لإعادة إعمار غزة.

> إصدار أول قابل للعب (MVP). الخريطة والبيانات تخطيطية وافتراضية، وليست صورة جغرافية أو اقتصادية موثقة لقطاع غزة.

## الموجود فعليًا

- عالم بناء 2.5D Isometric عبر Canvas؛ سحب وتكبير باللمس والماوس.
- خمس مناطق قابلة للعب مع ميزانية مشتركة، تبدأ في مدينة غزة من مقر مجلس السلام.
- 9 أنواع منشآت أساسية: المنازل، المراكز الصحية، المدارس، محطات المياه، الطاقة، الأسواق، مراكز مواد البناء، الحدائق، والطرق؛ ومشروعا ميناء غزة ومطار ياسر عرفات المستقبليان.
- وضع المباني على أرض صالحة، رصد الميزانية ومواد البناء، الترقية أو الإزالة مع استرداد جزئي.
- محاكاة مبسطة للسكان والتغطية الصحية والتعليم والمياه والكهرباء ورضا السكان.
- دورة يوم داخل اللعبة كل 25 ثانية: إيراد يومي، وإنتاج مواد بناء.
- 7 مهمات تمهيدية تليها سلسلة مهام إجرائية متجددة، وترقيات دون سقف تصميمي.
- حفظ تلقائي محلي، تصدير واستيراد JSON، وإعادة اللعبة، ودليل تشغيل.
- واجهة عربية متجاوبة للهواتف مع دعم تنزيل PWA والعمل دون اتصال بعد التحميل الأول.

## التشغيل

لا تحتاج إلى npm أو أي تبعيات خارجية.

```bash
cd peace-council
python3 -m http.server 4173
```

ثم افتح `http://localhost:4173` في المتصفح. يمكن نشر المجلد كما هو على استضافة ملفات ثابتة.

## حدود النسخة الحالية

- خريطة تنقّل جغرافية للمحافظات الخمس من geoBoundaries (2017)، ولوحات بناء تخطيطية مستقلة؛ لا تمثل قطع الأراضي الحقيقية. المحاكاة الاقتصادية والخدمات مشتركة ومبسطة.
- لا توجد حسابات أو مزامنة سحابية؛ التقدم على الجهاز محلي، ويمكن نقل التقدم بملف JSON.
- لا يوجد لعب جماعي أو محاكاة لاقتصاد غزة الحقيقي أو خريطة مساحية دقيقة.
- المدينة مرسومة بمحرك Canvas مخصص، وليس Phaser أو Unity.
- جميع الأرقام تجريبية ومتوازنة للعبة، ولا تمثل بيانات فعلية.

## الاختبار

افحص صياغة JavaScript: `node --check game.js && node --check service-worker.js`.
اختبر عمليًا: البناء والترقية والإزالة، الخصم، مرور اليوم، المهام، حفظ الصفحة وإعادة تحميلها، الاستيراد والتصدير، واللمس على الهاتف.

## الخطوات التالية

1. اختبار لعب حقيقي عبر الهواتف الاقتصادية وتحسين التوازن.
2. إنشاء أصول فنية منسقة بدل الرسومات الإجرائية.
3. ربط المنطقة بخريطة GIS موثوقة مع فصل المحاكاة عن الواقع.
4. ربط المحافظات جغرافيًا وإضافة خطوط النقل وسلاسل الإمداد.
5. تنفيذ حسابات ومزامنة سحابية على مشروع Supabase مستقل عند الحاجة.
6. بناء تكامل اختياري ومدروس مع ImpactMood دون إظهار التقدم الافتراضي كأنه أثر حقيقي.

حقوق تصميم اللعبة والشفرة الخاصة بهذا النموذج لصالح مشروع المستخدم — TechMood Technology. يستخدم رموز Emoji عامة من الجهاز.

## Visual refresh v2
The v2 UI uses IBM Plex Sans Arabic, coherent outline icons and TechMood's royal-blue accents while retaining the Peace Council dark navy and gold identity. On mobile, the map appears first, followed immediately by the building catalog. Includes accessible button labels and a pause button.

The game is separate from all other TechMood products, with local-only saves and fictional game data.

## Infinite World — المرحلة الأولى
- مستويات المباني والطرق والأبحاث دون سقف تصميمي ثابت؛ الأعداد الصحيحة محدودة تقنيًا بـ Number.MAX_SAFE_INTEGER، وليست لانهائية حسابيًا.
- حفظ v3 مع ترحيل v1 وv2: مباني v1 تبقى في دير البلح ومباني v2 تحتفظ بمحافظاتها، ويضاف المقر في غزة، وملفات الحفظ تبقى محلية.
- خمس لوحات بناء وساحل تخطيطي مختلف لكل محافظة؛ الميناء في غزة على الساحل والمطار في رفح، وهما سيناريوهات مستقبلية لا ادعاء بتشغيلهما الفعلي.
- أربع مدارس بحثية: كفاءة الخدمات (اليابان)، كلفة البناء (تركيا)، إنتاج المواد (الصين)، إيرادات التجارة (أمريكا). التأثيرات افتراضية للعبة وليست تقييمًا للدول.
- بعد المهمات التمهيدية تتولد أهداف متزايدة من البناء والترقية والبحث.
- التصميم البصري يتدرج ضمن حدود العرض؛ لم تُضف أصول بصرية جديدة لكل مستوى. لا يوجد لعب جماعي بعد.
- اختبار آلي: `node --test peace-council/infinite-world.test.cjs` من جذر المستودع.

## بيانات الخريطة
geoBoundaries gbOpen PSE ADM2، مرجع 2017، Open Data Watch، CC BY 4.0. الإصدار المثبت 9469f09592ced973a3448cf66b6100b741b64c0d. الحدود الإدارية ليست خريطة لواقع الميدان أو الملكيات العقارية. الخريطة تفاعلية للتنقل، والبناء محاكاة تخطيطية.

## Visual Alpha v4
- Game-first HUD with five functional tool tabs; compact phone layout.
- Construction and upgrades reserve a crew, charge immediately, complete after simulated days, and award XP upon completion. Existing saves v1–v3 migrate to v4; projects remain in saved state. Time advances while the game is active, not while closed.
- Construction sites, moving vehicles on connected roads, subtle water motion and evening tint. Canvas remains the renderer; this is a transitional visual alpha, not PixiJS or a commercial 3D release.
- No new paid dependencies or third-party art. Online accounts, multiplayer, store releases, actual connected street-level maps and original 3D asset production remain pending.

## GPU Visual Alpha v5
- Independent PixiJS 8.14.3 WebGL scene draws terrain, roads, buildings, trees, construction, traffic, selection and night tint; cached static layers and adaptive resolution. Original Canvas remains input surface and compatibility renderer. Toggle between engines in the game header; no gameplay or save changes.
- Browser dependency pinned to CDN version, loaded asynchronously; failed loads/context loss automatically fall back to Canvas. Local test harness serves exact npm package. Offline startup can use Canvas when GPU library is unavailable.
- Procedural 2.5D graphics, not imported 3D models. Production-ready commercial art, street-level world, multiplayer and store distribution remain separate milestones.
- PixiJS MIT license: https://github.com/pixijs/pixijs/blob/v8.14.3/LICENSE

## Art direction v6
Original shared vector model library: 12 building categories, four visual generations (1–5, 6–24, 25–99, 100+), 48 category/tier combinations (roads use connectivity on the map; catalog road variants share a design), four vehicle colors, local limestone/flat roofs, water tanks, arches, palms, olives, rooftop solar, council civic architecture, port cranes and containers, future airport terminal and aircraft. Shared Canvas/PixiJS rendering and actual asset previews in the build catalog. No external art or paid assets. These are procedural 2.5D vector models, not handcrafted 3D mesh files or reproductions of real landmarks. Buildings continue to level up beyond the visual tier thresholds; further visual styles may be added without save migration.

## Connected World v7
- One georeferenced overview with five governorate polygons, 11 named public place markers, clickable locality focus within the existing regional construction grids, and two schematic civilian corridors inspired by Salah al-Din and Al-Rashid.
- Eight upgradeable regional links form a graph; investments connect regions to Gaza City and add daily income/material bonuses through connected capacity and operating commerce. Regions remain accessible to protect existing saves. Route improvements are instant investments, not engineering-crew jobs.
- Save v5 migrates v1–v4, preserves ongoing v4 construction, and stores selected locality and corridor levels. No fixed design-level cap on corridor upgrades.
- Public reference: GeoNames Palestine locality coordinates (https://www.geonames.org/); general geographical corridor names based on historical public OCHA maps. Markers are approximate reference locations; corridors are game abstractions, not road survey geometry or live access information. Local boards remain stylized regional grids, not a seamless street-level GIS construction surface.

## Economic simulation v8
Nine regional inventory goods, ten new buildings (eight production recipes, storage and bank), 22 construction categories, finite worker allocation, storage capacities, food consumption, automatic bounded shipments over built links, stock-sensitive five-unit buy/sell transactions and a simple repayable fictional development loan. Production consumes inputs before outputs, unfinished buildings inactive, wages deducted daily, food shortfalls affect happiness. Save v6 migrates older games, preserves links and jobs. Existing baseline shared-budget income remains; trade is manual and local, not real-world commerce or a live global exchange. No real payments, accounts, or financial services. Economic balancing and population agents remain later work.

## Living City v9
Road-graph BFS routes connect homes to reachable jobs and clinics, schools, markets and parks. Estimated household counts and service access are derived from existing population; route demand and road-level capacity generate congestion, which slows representative agents and modestly affects happiness. Buildable bus stops enable bus mode, connected businesses generate trucks, completed future ports/airports generate local ship/plane animations. Six shared vector transport/people styles and bounded agents (64 per region) work with both renderers. No individual household identity, persistent vehicles, actual passenger scheduling, interregional navigation or real traffic data; economic production remains the separate workforce model. Save version stays v6 because mobility is derived and busstop is an additive category.
