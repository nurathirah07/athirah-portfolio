// Collects the source shown in the Code view (src/components/CodeView.tsx).
//
// Each section of the site marked with data-code="Name" shows its own file:
// the file path, its first comment block (written in plain sentences about what
// visitors see, so it doubles as the explanation) and the first lines of the
// component itself. They are read here, at build time, and written to
// src/data/code-snippets.json; the site never fetches source while running.
//
// Runs before `npm run dev` and `npm run build`. Add a line to SECTIONS when you
// mark a new section with data-code.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LINES = 25;

// data-code name -> the file that builds that section
const SECTIONS = {
  Hero: "src/components/Hero.tsx",
  Intro: "src/app/page.tsx",
  ProjectCard: "src/components/ProjectCard.tsx",
  ParallaxGallery: "src/components/ParallaxGallery.tsx",
  ExpertiseList: "src/components/ExpertiseList.tsx",
  Marquee: "src/components/Marquee.tsx",
  ProjectStack: "src/components/ProjectStack.tsx",
  ShotRail: "src/components/ShotRail.tsx",
  Footer: "src/components/Footer.tsx",
  Assistant: "src/components/Assistant.tsx",
};

// The comment just above the file's main export (or its first comment block).
function explanation(lines, exportAt) {
  const block = [];
  for (let i = exportAt - 1; i >= 0 && /^\s*\/\//.test(lines[i]); i--) block.unshift(lines[i]);
  if (block.length) return block;
  const first = lines.findIndex((l) => /^\s*\/\//.test(l));
  if (first < 0) return [];
  const out = [];
  for (let i = first; i < lines.length && /^\s*\/\//.test(lines[i]); i++) out.push(lines[i]);
  return out;
}

const snippets = {};
for (const [name, file] of Object.entries(SECTIONS)) {
  const lines = (await readFile(path.join(root, file), "utf8")).replace(/\r/g, "").split("\n");
  let at = lines.findIndex((l) => /^export default function/.test(l));
  if (at < 0) at = lines.findIndex((l) => /^export /.test(l));
  if (at < 0) at = 0;
  snippets[name] = {
    file,
    // Joined into paragraphs: the line breaks in the source only fit the editor.
    // Blank lines and "- " list items keep their own lines.
    comment: explanation(lines, at)
      .map((l) => l.replace(/^\s*\/\/ ?/, ""))
      .join("\n")
      .replace(/\n(?!\n|\s*- )/g, " ")
      .replace(/ {2,}/g, " ")
      .trim(),
    code: lines.slice(at, at + LINES).join("\n"),
    start: at + 1, // line number of the first code line
  };
}

const out = path.join(root, "src", "data", "code-snippets.json");
await writeFile(out, `${JSON.stringify(snippets, null, 2)}\n`);
console.log(`code view: ${Object.keys(snippets).length} sections written to src/data/code-snippets.json`);
