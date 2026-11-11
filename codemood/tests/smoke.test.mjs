import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function start(hash = "#/home") {
  const handlers = {};
  let rendered = "";
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value)
  };
  const location = { hash };
  const document = {
    documentElement: { dataset: {} },
    getElementById(id) {
      if (id === "app") return {
        set innerHTML(value) { rendered = value; },
        get innerHTML() { return rendered; }
      };
      if (id === "code-input") return { value: 'print("CodeMood")' };
      return null;
    },
    addEventListener(name, callback) { handlers[name] = callback; },
    querySelector: () => null,
    createElement: () => ({ setAttribute() {}, remove() {} }),
    body: { appendChild() {} }
  };
  const window = { addEventListener() {}, scrollTo() {} };
  runInNewContext(source, { document, localStorage: storage, location, window, setTimeout: () => 1, clearTimeout() {} });
  const click = (dataset) => handlers.click({ target: { closest: () => ({ dataset }) } });
  const progress = () => JSON.parse(storage.getItem("codemood-demo-v1"));
  return { get rendered() { return rendered; }, click, progress, document };
}

test("renders Arabic RTL dashboard and MentorMood handoff", () => {
  const app = start();
  assert.match(app.rendered, /كل يوم خطوة/);
  assert.match(app.rendered, /Go to MentorMood/);
  assert.match(app.rendered, /bottombar/);
});

test("correct Python challenge awards XP only once", () => {
  const app = start("#/lesson/p1");
  app.click({ action: "check", id: "p1" });
  assert.equal(app.progress().xp, 15);
  assert.deepEqual(Array.from(app.progress().completed), ["p1"]);
  app.click({ action: "check", id: "p1" });
  assert.equal(app.progress().xp, 15);
});

test("dark mode preference persists locally", () => {
  const app = start();
  app.click({ action: "theme" });
  assert.equal(app.progress().theme, "dark");
  assert.equal(app.document.documentElement.dataset.theme, "dark");
});
