"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { LocalVaultPanel } from "./LocalVaultPanel";

type Field = { key: string; label: string; large?: boolean; wide?: boolean; kind?: "date" | "number" | "text" };
type Template = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  fields: Field[];
  columns?: string[];
  rows?: number;
  footer?: Field[];
  help?: string;
};
const templates: Template[] = [
  {
    id: "registration", title: "استمارة تسجيل طالب", icon: "users",
    description: "طلب التحاق وموافقة ولي الأمر واعتماد الإدارة.",
    fields: [
      { key: "student", label: "اسم الطالب رباعيًا", wide: true },
      { key: "birth", label: "تاريخ الميلاد", kind: "date" },
      { key: "age", label: "العمر", kind: "number" },
      { key: "address", label: "السكن" },
      { key: "grade", label: "الصف الدراسي" },
      { key: "school", label: "اسم المدرسة" },
      { key: "studentId", label: "رقم هوية الطالب" },
      { key: "studentPhone", label: "جوال الطالب (إن وجد)" },
      { key: "homePhone", label: "هاتف المنزل" },
      { key: "parentPhone", label: "جوال ولي الأمر" },
      { key: "previousMemory", label: "مقدار الحفظ السابق" },
      { key: "previousGrade", label: "تقدير الفصل الماضي" },
      { key: "parent", label: "اسم ولي الأمر" },
      { key: "teacher", label: "محفّظ الطالب" },
      { key: "registeredAt", label: "تاريخ التسجيل", kind: "date" },
      { key: "registrationNo", label: "رقم التسجيل" },
    ],
    footer: [
      { key: "consent", label: "موافقة ولي الأمر / توقيعه" },
      { key: "accepted", label: "قرار الإدارة (مقبول / قيد المراجعة)" },
      { key: "stamped", label: "اعتماد الإدارة / الختم" },
    ],
    help: "شروط الالتحاق في النموذج المرجعي: المواظبة والحضور بإذن عند الغياب، الالتزام بالحفظ والمراجعة، والمشاركة في الأنشطة. تُعدّل السياسات وفق نظام المركز.",
  },
  {
    id: "daily", title: "كشف المتابعة اليومي", icon: "calendar",
    description: "اسم المحفّظ والحلقة والفصل، والمتابعة اليومية مع المجاميع.",
    fields: [
      { key: "teacher", label: "اسم المحفّظ" }, { key: "halaqa", label: "اسم الحلقة" },
      { key: "level", label: "مرحلة الحلقة" }, { key: "term", label: "الفصل والعام" },
      { key: "day1", label: "تاريخ اليوم الأول", kind: "date" },
      { key: "day2", label: "تاريخ اليوم الثاني", kind: "date" },
      { key: "day3", label: "تاريخ اليوم الثالث", kind: "date" },
    ],
    columns: ["اسم الطالب", "اليوم الأول", "اليوم الثاني", "اليوم الثالث", "إجمالي صفحات الحفظ", "إجمالي صفحات المراجعة"],
    rows: 25,
    footer: [
      { key: "supervisorNotes", label: "ملاحظات مشرف المركز", large: true, wide: true },
      { key: "directorNotes", label: "ملاحظات أمير المركز", large: true, wide: true },
    ],
    help: "في النموذج الأصلي يُعبأ الكشف أولًا بأول، وتُعرض 25 خانة للطلاب، مع ملاحظات المشرف والأمير.",
  },
  {
    id: "exam", title: "كشف لجنة الاختبارات", icon: "certificate",
    description: "توثيق اللجنة والأسئلة والأحكام ونتائج الطلاب.",
    fields: [
      { key: "committee", label: "رقم اللجنة" }, { key: "examDate", label: "التاريخ", kind: "date" },
      { key: "examTime", label: "الساعة" }, { key: "chair", label: "رئيس اللجنة" },
      { key: "members", label: "أعضاء اللجنة", large: true, wide: true },
      { key: "category", label: "فئة الاختبار (جزء، 3، 5، 10 أجزاء)" },
      { key: "questions", label: "عدد الأسئلة المعتمد", kind: "number" },
      { key: "tajweed", label: "درجة الأحكام المعتمدة", kind: "number" },
    ],
    columns: ["اسم الطالب", "الجزء / السلسلة", "محفّظ الطالب", "س 1", "س 2", "س 3", "س 4", "الأحكام", "العلامة النهائية"],
    rows: 20,
    footer: [
      { key: "chairSign", label: "توقيع رئيس اللجنة" },
      { key: "centerSeal", label: "ختم المركز" },
    ],
    help: "تنبيه: تختلف نسختا نموذج لجنة الاختبار المرفقتان في عدد أسئلة فئة «جزء» (2 أو 3). لهذا تُكتب أعداد الأسئلة والدرجات يدويًا وفق سياسة الدار قبل الاعتماد، ولا يُحسب مجموع تلقائيًا.",
  },
  {
    id: "report", title: "تقرير الطالب الشهري / الفصلي", icon: "stats",
    description: "الحفظ والمراجعة والانضباط والتوصيات لأولياء الأمور.",
    fields: [
      { key: "student", label: "اسم الطالب" }, { key: "parent", label: "ولي الأمر" },
      { key: "term", label: "الشهر / الفصل / العام" }, { key: "teacher", label: "المحفّظ" },
      { key: "memorizeFrom", label: "الحفظ: من سورة" }, { key: "memorizeTo", label: "الحفظ: إلى سورة" },
      { key: "memorizePages", label: "صفحات الحفظ", kind: "number" }, { key: "memorizeGrade", label: "تقدير الحفظ" },
      { key: "reviewFrom", label: "المراجعة: من سورة" }, { key: "reviewTo", label: "المراجعة: إلى سورة" },
      { key: "reviewPages", label: "صفحات المراجعة", kind: "number" }, { key: "reviewGrade", label: "تقدير المراجعة" },
      { key: "officialDays", label: "أيام الدوام الرسمية", kind: "number" },
      { key: "attendedDays", label: "أيام حضور الطالب", kind: "number" },
      { key: "absences", label: "مرات الغياب", kind: "number" },
      { key: "missingRecitations", label: "مرات عدم التسميع", kind: "number" },
      { key: "activities", label: "تقييم الالتزام بالدورات والأنشطة", wide: true },
    ],
    footer: [
      { key: "recommendation", label: "رسالة المحفّظ وتوصيته لولي الأمر", large: true, wide: true },
      { key: "parentResponse", label: "رد ولي الأمر", large: true, wide: true },
      { key: "teacherSign", label: "توقيع المحفّظ" },
      { key: "parentSign", label: "توقيع ولي الأمر" },
      { key: "directorStamp", label: "ختم الإدارة" },
    ],
    help: "النموذج المرفق يحمل عنوان «التقرير الشهري» داخل ملف اسمه «التقرير الفصلي»؛ لذلك أُتيح تحديد الفترة يدويًا.",
  },
  {
    id: "staff", title: "بطاقة بيانات محفظ / إداري", icon: "user",
    description: "بيانات العامل والمؤهلات والخبرات والدورات واعتماد الإدارة.",
    fields: [
      { key: "name", label: "الاسم رباعيًا", wide: true },
      { key: "identity", label: "رقم الهوية" }, { key: "birth", label: "تاريخ الميلاد", kind: "date" },
      { key: "address", label: "عنوان السكن" }, { key: "phone", label: "رقم الجوال" },
      { key: "marital", label: "الحالة الاجتماعية" }, { key: "children", label: "عدد الأبناء", kind: "number" },
      { key: "juz", label: "الحفظ الكلي بالأجزاء", kind: "number" },
      { key: "years", label: "سنوات الخبرة", kind: "number" },
      { key: "qualification", label: "المؤهل العلمي / التخصص / التقدير / جهة الإصدار / السنة", wide: true, large: true },
      { key: "experience", label: "الخبرات (الوظيفة / التخصص / الفترة / المكان)", wide: true, large: true },
      { key: "courses", label: "الدورات (الدورة / الفترة / الجهة المشرفة)", wide: true, large: true },
      { key: "job", label: "الوظيفة الإدارية أو التعليمية" },
      { key: "halaqaNo", label: "رقم الحلقة (للمحفّظ)" },
    ],
    footer: [
      { key: "updated", label: "تاريخ التحديث", kind: "date" },
      { key: "staffSign", label: "توقيع العامل" },
      { key: "approval", label: "اعتماد الإدارة / ختمها" },
    ],
  },
  {
    id: "meeting", title: "محضر اجتماع", icon: "building",
    description: "اجتماع الإدارة والحضور والمحاور والتوصيات والتكليفات.",
    fields: [
      { key: "meetingNo", label: "رقم الاجتماع" },
      { key: "date", label: "التاريخ", kind: "date" },
      { key: "time", label: "الساعة" },
      { key: "attendees", label: "أسماء الحضور", wide: true, large: true },
    ],
    columns: ["المحور", "أبرز التوصيات والتكليفات", "المكلّف بالتنفيذ"],
    rows: 8,
    footer: [
      { key: "author", label: "حرّره" },
      { key: "seal", label: "ختم الإدارة" },
    ],
  },
];

function EditableField({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  return (
    <label className={`forms-field ${field.wide ? "forms-field-wide" : ""}`}>
      <span>{field.label}</span>
      {field.large ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={field.kind ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function FormsWorkspace() {
  const [selected, setSelected] = useState("registration");
  const [values, setValues] = useState<Record<string, string>>({});
  const current = templates.find((t) => t.id === selected) ?? templates[0];
  const keyFor = (key: string) => `${selected}:${key}`;
  const update = (key: string, value: string) => setValues((old) => ({ ...old, [keyFor(key)]: value }));
  const read = (key: string) => values[keyFor(key)] ?? "";

  return (
    <>
      <nav className="forms-tools forms-pills" aria-label="اختيار النموذج">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={`forms-pill ${template.id === selected ? "is-active" : ""}`}
            aria-pressed={template.id === selected}
            onClick={() => setSelected(template.id)}
          >
            <Icon name={template.icon} size={19} />
            {template.title}
          </button>
        ))}
      </nav>
      <div className="forms-tools forms-summary">
        <div><strong>{current.title}</strong><p>{current.description}</p></div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="certificate" size={18} /> طباعة / حفظ PDF
        </button>
      </div>
      <LocalVaultPanel templateId={selected} templateTitle={current.title} values={values} onRestore={(record) => {
        setSelected(record.templateId);
        setValues((previous) => ({
          ...Object.fromEntries(Object.entries(previous).filter(([name]) => !name.startsWith(record.templateId + ":"))),
          ...record.values,
        }));
      }} />
      <article className="forms-sheet" aria-label={current.title}>
        <div className="forms-letterhead">
          <div className="forms-header-mark"><Icon name="bookOpen" size={28} /></div>
          <div className="forms-brand">حلقتي <small>Halaqati · TechMood Technology</small></div>
          <div className="forms-letterhead-fields">
            <label>اسم الدار / المؤسسة<input value={read("org")} onChange={(e) => update("org", e.target.value)} /></label>
            <label>اسم المركز<input value={read("center")} onChange={(e) => update("center", e.target.value)} /></label>
          </div>
        </div>
        <div className="forms-paper-heading">
          <span>نموذج إداري وتعليمي</span>
          <h2>{current.title}</h2>
          <p>{current.description}</p>
        </div>
        <div className="forms-fields">
          {current.fields.map((field) => (
            <EditableField key={field.key} field={field} value={read(field.key)} onChange={(value) => update(field.key, value)} />
          ))}
        </div>
        {current.id === "registration" && (
          <p className="forms-consent">أوافق بصفتي ولي أمر الطالب على طلب الالتحاق والتعاون مع إدارة المركز في المتابعة، مع مراعاة أن اعتماد التسجيل النهائي من صلاحيات الإدارة.</p>
        )}
        {current.columns && (
          <div className="forms-table-wrap">
            <table className="forms-table">
              <thead><tr><th scope="col">#</th>{current.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              <tbody>{Array.from({ length: current.rows ?? 0 }, (_, row) => (
                <tr key={row}>
                  <th scope="row">{row + 1}</th>
                  {current.columns!.map((column, col) => (
                    <td key={col}>
                      <input aria-label={`${column}، صف ${row + 1}`} value={read(`cell-${row}-${col}`)} onChange={(e) => update(`cell-${row}-${col}`, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {current.footer && (
          <section className="forms-footer-fields" aria-label="التوصيات والتواقيع">
            <h3>ملاحظات واعتمادات</h3>
            <div className="forms-fields">
              {current.footer.map((field) => (
                <EditableField key={field.key} field={field} value={read(field.key)} onChange={(value) => update(field.key, value)} />
              ))}
            </div>
          </section>
        )}
        {current.help && <p className="forms-help">{current.help}</p>}
        <footer className="forms-paper-footer">
          <span>حلقتي · نماذج المراكز والدور</span>
          <span>ملف عمل داخلي · لا يُنشر دون تفويض</span>
        </footer>
      </article>
      <p className="forms-tools forms-bottom-note">للحفاظ على بياناتك بعد إغلاق الصفحة، افتح القاعدة المحلية واضغط «حفظ نسخة من النموذج الحالي». المدخلات غير المحفوظة قد تُفقد عند المغادرة.</p>
    </>
  );
}
