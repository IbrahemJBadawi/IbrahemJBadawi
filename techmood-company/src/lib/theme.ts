/**
 * Runs in <head> before the first paint, so a dark-mode visitor never sees a
 * white flash. Reads the saved choice (local storage, JSON-encoded) and
 * otherwise follows the device. Kept tiny and dependency-free on purpose.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("tm-theme");var t=s?JSON.parse(s):"system";if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

export type ThemeChoice = "light" | "dark" | "system";

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#060d20" : "#ffffff");
}
