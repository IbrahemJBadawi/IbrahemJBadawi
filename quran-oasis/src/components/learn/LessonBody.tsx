import { Fragment, type ReactNode } from "react";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { isValidRef } from "@/lib/quran";

const Q_TOKEN = /^\[\[q:(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\]\]$/;

/** يعرض نص الدرس بتنسيقه البسيط. رموز [[q:..]] تُستبدل بالنص القرآني من المصدر المعتمد. */
export function LessonBody({ body }: { body: string }) {
  const out: ReactNode[] = [];
  const lines = body.split(/\r?\n/);
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(<p key={out.length}>{para.join(" ")}</p>);
    para = [];
  };
  const flushList = () => {
    if (list.length)
      out.push(
        <ul key={out.length} className="list-disc space-y-1 pr-5 marker:text-accent">
          {list.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const q = line.match(Q_TOKEN);
    if (q) {
      flushPara();
      flushList();
      const surah = Number(q[1]);
      const from = Number(q[2]);
      const to = Number(q[3] ?? q[2]);
      if (isValidRef(surah, from) && isValidRef(surah, to)) {
        out.push(
          <div key={out.length} className="rounded-2xl bg-surface-2 px-4 py-3">
            <QuranPassage refs={[{ surah, from, to }]} />
          </div>,
        );
      }
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      out.push(
        <h2 key={out.length} className="pt-2 text-lg font-bold text-fg">
          {line.slice(3)}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      list.push(line.slice(2));
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return <div className="space-y-4 text-[16px] leading-loose text-fg">{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</div>;
}
