// Zero-dependency static site builder.
// Assembles src/pages/*.html with shared partials into dist/, and copies assets/.
//
// Directives available inside pages:
//   <!-- @head title="..." description="..." -->
//   <!-- @header active="products" -->      (active: home|products|solution|company|contact)
//   <!-- @footer -->
//   <!-- @icon name -->
//   <!-- @avatars -->
//   <!-- @logo -->

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const out = join(root, "dist");

const partial = (name) => readFileSync(join(src, "partials", `${name}.html`), "utf8");
const attrs = (s = "") =>
  Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

const icons = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 010 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  lock: '<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  building: '<path d="M4 21V5l8-2v18M12 21V9l8 2v10M2 21h20M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
const icon = (name) => {
  if (!icons[name]) throw new Error(`Unknown icon: ${name}`);
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
};

function render(html, file) {
  return html
    .replace(/<!--\s*@head\b\s*(.*?)-->/g, (_, a) => {
      const { title, description = "" } = attrs(a);
      return partial("head").replaceAll("{{title}}", title).replaceAll("{{description}}", description);
    })
    .replace(/<!--\s*@header\b\s*(.*?)-->/g, (_, a) => {
      const { active = "" } = attrs(a);
      return partial("header").replace(/ data-nav="(\w+)"/g, (_, n) =>
        n === active ? ' aria-current="page"' : ""
      );
    })
    .replace(/<!--\s*@footer\s*-->/g, () => partial("footer"))
    .replace(/<!--\s*@avatars\s*-->/g, () => partial("avatars"))
    .replace(/<!--\s*@logo\s*-->/g, () => partial("logo"))
    .replace(/<!--\s*@icon\s+(\w+)\s*-->/g, (_, n) => icon(n))
    .replace(/<!--\s*@(\w+)[^>]*-->/g, (m, d) => {
      throw new Error(`Unknown directive @${d} in ${file}`);
    });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const pages = readdirSync(join(src, "pages")).filter((f) => f.endsWith(".html"));
for (const file of pages) {
  // Header/footer are expanded before @logo/@icon, so directives inside partials resolve in one pass.
  const html = render(readFileSync(join(src, "pages", file), "utf8"), file);
  writeFileSync(join(out, file), html);
  console.log(`built ${file}`);
}

cpSync(join(root, "assets"), join(out, "assets"), { recursive: true });
console.log(`copied assets -> dist/assets`);
