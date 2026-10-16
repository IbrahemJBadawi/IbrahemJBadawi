import { Fragment } from "react";

/**
 * Tiny, safe renderer for the subset of Markdown used by policy pages:
 * "## " headings, "- " bullet lists and paragraphs. No HTML is ever injected.
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-jamal">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.length === 1 && lines[0].startsWith("## ")) return <h2 key={i}>{lines[0].slice(3)}</h2>;
        if (lines[0].startsWith("## ")) {
          return (
            <Fragment key={i}>
              <h2>{lines[0].slice(3)}</h2>
              <SimpleMarkdown text={lines.slice(1).join("\n")} />
            </Fragment>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
