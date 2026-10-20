#!/usr/bin/env node
/** يولّد supabase/seed.sql من المحتوى المضمّن (الأذكار، لحظات واحة، المسارات التعليمية، المصادر). */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { DHIKR_CATEGORIES, ADHKAR } = await import(path.join(ROOT, "src/content/adhkar.ts"));
const { LEARNING_PATHS } = await import(path.join(ROOT, "src/content/learning.ts"));
const MOMENTS = JSON.parse(await readFile(path.join(ROOT, "src/content/oasis-moments.json"), "utf8"));
const { SOURCES } = await import(path.join(ROOT, "src/content/sources.ts"));

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${(a ?? []).map(q).join(", ")}]::text[]`;
const json = (v) => (v ? `${q(JSON.stringify(v))}::jsonb` : "null");

const out = [
  "-- مولّد آليًا عبر: npm run db:seed-sql — لا تعدّله يدويًا.",
  "-- يُدرج المحتوى الافتتاحي ويتجاهل الموجود مسبقًا (on conflict do nothing).",
  "begin;",
];

for (const s of SOURCES) {
  out.push(
    `insert into public.sources (title, author, publisher, url, license, kind, notes) select ${q(s.title)}, ${q(s.author)}, ${q(s.publisher)}, ${q(s.url)}, ${q(s.license)}, ${q(s.kind)}, ${q(s.notes)} where not exists (select 1 from public.sources where title = ${q(s.title)});`,
  );
}
DHIKR_CATEGORIES.forEach((c, i) =>
  out.push(
    `insert into public.adhkar_categories (id, title, description, icon, sort) values (${q(c.id)}, ${q(c.title)}, ${q(c.description)}, ${q(c.icon)}, ${i}) on conflict (id) do nothing;`,
  ),
);
for (const d of ADHKAR) {
  out.push(
    `insert into public.adhkar (id, category_id, title, body, quran, repeat, source_text, virtue, note, sort) values (${q(d.id)}, ${q(d.category)}, ${q(d.title)}, ${q(d.text)}, ${json(d.quran)}, ${d.repeat}, ${q(d.source)}, ${q(d.virtue)}, ${q(d.note)}, ${d.order}) on conflict (id) do nothing;`,
  );
}
for (const m of MOMENTS) {
  out.push(
    `insert into public.oasis_moments (id, surah, ayah_from, ayah_to, meaning, meaning_source, reflection, action, status) values (${q(m.id)}, ${m.surah}, ${m.ayahFrom}, ${m.ayahTo}, ${q(m.meaning)}, ${q(m.meaningSource)}, ${q(m.reflection)}, ${q(m.action)}, 'published') on conflict (id) do nothing;`,
  );
}
LEARNING_PATHS.forEach((p, i) => {
  out.push(
    `insert into public.learning_paths (id, title, description, goals, level, color, sort) values (${q(p.id)}, ${q(p.title)}, ${q(p.description)}, ${arr(p.goals)}, ${q(p.level)}, ${q(p.color)}, ${i}) on conflict (id) do nothing;`,
  );
  p.lessons.forEach((l, j) =>
    out.push(
      `insert into public.lessons (path_id, id, title, summary, minutes, body, sources, sort) values (${q(p.id)}, ${q(l.id)}, ${q(l.title)}, ${q(l.summary)}, ${l.minutes}, ${q(l.body)}, ${arr(l.sources)}, ${j}) on conflict (path_id, id) do nothing;`,
    ),
  );
});
out.push("commit;", "");
await writeFile(path.join(ROOT, "supabase/seed.sql"), out.join("\n"));
console.log(`✓ seed.sql: ${ADHKAR.length} ذكر، ${MOMENTS.length} لحظة، ${LEARNING_PATHS.length} مسارات، ${SOURCES.length} مصادر`);
