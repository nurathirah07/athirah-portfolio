# DESIGN.md — Voice, Experience, Transitions & Interactions

> **Read this before any UI or copy work in this repo.** It sits alongside `AGENTS.md`, which still applies:
> state machines for anything with more than two states, the checks (`npx tsc --noEmit -p .`,
> `npx eslint src scripts`, `npm test`), and the commit rules.
>
> - **Look (colours, Manrope, glass/matte surfaces, layout): keep it as it is.** Section 1 records it so you don't drift.
> - **Reuse before you build.** Section 2 lists what already exists. Extend it; don't write a second cursor,
>   link, reveal, scroll helper or video player.
> - **References — copy the behaviour, never the content.** Never copy a reference's text, names, photos,
>   projects or code.
>
>   | Reference | What to take from it | Section |
>   |---|---|---|
>   | justkamalthings.com | **Language**: a personal, specific, lightly playful voice backed by proof | 3 |
>   | melon.studio | **Experience**: the work moves. Project videos everywhere, playing only when seen | 4 |
>   | inacionakiti.com (`?v=site`) | **Transitions**, especially its dashboard (`</>` code view): the page turns into a live blueprint | 5 |
>   | nurfitriazim.com | Navigation and hover patterns. Already built (section 8) | 8 |
>
> - Section 7 is the to-do list, in order.

Stack: Next.js 16 (App Router; read `node_modules/next/dist/docs/` as AGENTS.md says), Tailwind v4,
`motion/react` (Motion 14), Lenis.

---

## 1. Look — keep as is

**Colours** (`@theme` in `src/app/globals.css`): `ink #000f08` page · `cream #f3efdd` text ·
`gold #e0ca3c` accent, buttons, cursor · `spruce #136f63` cool glow, borders · `amethyst #3e2f5b` glows, marquee band ·
`flame #f34213` hover and small highlights (the `btn-gloss` hover, the progress bar end).

**Type:** Manrope for everything. Use `font-display` for headings and `font-accent` for small labels,
buttons and nav. `font-accent` is **sentence case** (no capitals, no wide tracking); labels are 13px or larger.

**Keep it from looking templated (these were removed on purpose; don't bring them back):**
- No single highlighted word in a heading. Headings are one colour; emphasis comes from size and weight.
  (`RiseText` still accepts `accent`, but don't use it.)
- No eyebrow labels above headings, and no "(Label)" brackets. Add a label only when it names what follows
  (for example `Label` "Built with" above tags).
- Numbers only for real sequences: the Journey ("Chapter 1 of 3", "2 of 5"). Not on lists of skills,
  services, projects or menu links, and no big faded watermark numbers.
- No "A · B" meta lines: separate the parts (two spans with a gap or a small dot shape) or use a comma.
- No "→" typed after link text. Arrows are icons inside buttons (the SVG in `ViewButton`) or point a real
  direction (previous / next project, the strip's slide buttons).
- Gold marks what you can act on (buttons, links, focus, the current page), not decoration.

**Surfaces (reuse these classes):** `.glass` (glossy frosted glass: bright top rim, corner reflection,
glossy upper half; lighter blur on phones), `.glass-solid` (the same look without the see-through blur, for
cards that stack or move while scrolling, like the Work stack), `.glass-dark` (nav, menu button),
`.glass-hover` (gold rim + sheen sweep), `.matte` (cream paper panel), `.btn-gloss` (gold → flame on hover),
`.band-gloss`, `.chip` (every tag), `.tech-grid`, `.fade-bottom`, `.grain`.

**Shapes:** pill buttons and nav (`rounded-full`); cards `rounded-3xl` / `rounded-[1.75rem]` / `rounded-[2rem]`.

---

## 2. What already exists — reuse it

| Part | File | What it does / how to use it |
|---|---|---|
| Intro loader | `layout.tsx` + `.intro*` CSS | Beads + % counter, pure CSS, once per full load. Leave it |
| Page transition | `components/Curtain.tsx` | A disc with a gold→flame rim grows from the click point, the route changes behind it, then the disc closes. State machine `idle → covering → revealing` (`data-phase`). Ease `[0.76,0,0.24,1]`, 0.6s |
| Transition links | `components/TransitionLink.tsx` | **Every internal link must use this**, never plain `next/link`. It sends `curtain:go` with the click point |
| Smooth scroll | `components/SmoothScroll.tsx`, `lib/scroll.ts` | Lenis on mouse/trackpad only (off on touch and reduced motion). Jump with `scrollToY(y, duration)`; stop the page scrolling under a full-screen panel with `lockScroll(true/false)`. Never use `window.scrollTo` directly |
| Nav | `components/Nav.tsx` | Wide screens: glass pill with a sliding gold `layoutId="nav-pill"` and a "Let's talk" `btn-gloss`. Phones and tablets: the `Menu` button instead. Both: a gold→flame scroll progress bar and the header fading to a backdrop after 40px |
| Menu | `components/Menu.tsx` | Below `md`: a menu button (two lines → ✕) opens a full-screen panel as a circle growing from the button; Home / About / Work / Contact rise in, the current page is gold, pointing at one dims the others. Machine `closed → opening → open → closing` (`data-phase` on `#site-menu`); locks scroll, keeps focus inside, closes on Esc and on page change |
| Cursor | `components/Cursor.tsx` | Gold dot. Over `a, button` it grows to a ring; over `data-cursor="reveal"` it becomes an open ring; over `data-cursor-label="View"` it becomes a gold badge with that word. **Use the attributes; don't add listeners** |
| Magnetic | `components/Magnetic.tsx` | Wraps a button and pulls it toward the pointer (mouse only). `strength` defaults to 0.3 |
| Roll text | `components/RollText.tsx` + `.roll` CSS | The label rolls up on hover and its copy comes in gold (`roll-plain` keeps the colour). Use it on every text link and button label |
| Word rise | `components/RiseText.tsx` | Heading words rise from a mask when scrolled into view (stagger 0.07s, 0.85s). Don't use `accent` (see section 1) |
| Word rise on load | `components/SplitText.tsx` | Same effect, but on page load after the curtain (0.5s delay). For hero headings |
| Scroll-lit words | `components/ScrollWords.tsx` | Words light up one by one as the sentence scrolls through. For intro statements |
| Reveal | `components/Reveal.tsx` | Fade + rise 40px, once. For blocks and paragraphs |
| Project stack | `components/ProjectStack.tsx` | Sticky cards that slide over each other; cards underneath shrink and dim; collages spread apart on hover |
| Project card | `components/ProjectCard.tsx` | Glass card that lifts 6px, with a gold spotlight following the pointer and the device shots rising on hover. On desktop its tags slide up into view on hover or keyboard focus; phones always show them |
| Expertise list | `components/ExpertiseList.tsx` | A dark fill rises up the row from its bottom edge on hover (and `focus-within`); a project screenshot floats beside the cursor. Rows aren't links, so no arrow |
| Parallax gallery | `components/ParallaxGallery.tsx`, `lib/gallery.ts` | Home, between Featured projects and What I build: photos in 4 columns (2 on phones) that slide at different speeds while scrolling past. **The photos are whatever is in `public/images/gallery/`** (filename order; tall 2:3 photos look best), not project screenshots. Decorative, so no links. Hidden while the folder is empty. Half speed on phones, still with reduced motion |
| Marquee | `components/Marquee.tsx` | Tilted amethyst band, 32s loop, pauses on hover |
| Shots strip | `components/ShotRail.tsx` | Machine `drifting / focused / dragging` (`data-mode`) |
| Footer | `components/Footer.tsx` | Glass CTA card: `RiseText` heading, Magnetic "Send a message", copy-email button, roll links, "Back to top" via `scrollToY`. (The giant footer name was removed at Athirah's request; don't bring it back) |
| Curtain name | `components/Curtain.tsx` | The name shows in the middle while the screen is fully covered (driven by the disc's size, no extra state) |
| Reels | `components/VideoBackdrop.tsx` | The one video component (6.3). Machine `idle → loading → paused ⇄ playing`, plus `failed`; `data-state="still"` when it shows the poster only. Used by the `/work` cards, the project page's full-screen opening (`ProjectIntro`), the home cards (`videoMode="hover"`) and the previous/next links |
| Story mode | `components/StoryMode.tsx`, `lib/siteMode.ts` | Picked with **Site / Story** in the dock (reference: the video `public/animations/example of dashboard.mp4`). The dark site gives way to a cream page while thousands of dots gather into the name (they part around the pointer); below: the tagline with its first clause in extra-bold, the true numbers from `careerFacts()` (they flicker, then settle), and the services as tabs that move on by themselves with line drawings that draw themselves in. Esc, "Site" or a page change go back. Machine `site → entering → story → leaving`; the normal site is `inert` meanwhile and the Code view is off. Copy comes only from `site.ts` |
| Dock + Code view | `components/Dock.tsx`, `components/CodeView.tsx`, `lib/codeView.ts` | 5.1–5.2. The dock is always shown on `md+`: `</>`, a divider, then Site / Story with a cream pill sliding to the current one. The shared machine lives in `lib/codeView.ts`; the code comes from `scripts/code-snippets.mjs` (run by `predev` and `prebuild`) into `data/code-snippets.json`. Mark a new section with `data-code="Name"` and add it to that script's `SECTIONS` |

**House conventions to keep:**
- Reveal / hover ease: `[0.22, 1, 0.36, 1]`. Page-level ease (curtain, menu): `[0.76, 0, 0.24, 1]`.
- Springs: cursor `500/40`, nav pill `400/32`, magnetic `220/16`, floating preview `260/26`.
- Hover effects are for the mouse only (`e.pointerType === "mouse"`, `(hover: hover) and (pointer: fine)`).
  On phones, use `usePhone()` for gentler versions.
- Check `useReducedMotion()` / `prefers-reduced-motion` in every new effect (see section 10).
- Comments explain *what the visitor sees*, in plain sentences (as in the existing files).

---

## 3. Voice — how the site talks (reference: justkamalthings.com)

**What the reference does:** it sounds like one real person talking, not a company. Every claim comes with
proof ("receipts, not vibes"). Headings are short and confident, and the small text (buttons, labels, loading
lines, empty states) has personality. It's playful, but never vague.

**Athirah's voice, in four rules:**
1. **First person, plain words.** "I built", "I fixed", "I'm still learning". No "passionate", "leveraging",
   "cutting-edge", "innovative solutions", "seamless". If a sentence would fit on anyone's portfolio, rewrite it.
2. **Proof over adjectives.** Swap a quality for a fact the visitor can check: who uses it, what it replaced,
   how many screens, which stack, what broke and how it was fixed. Every number must be true. If there's no
   number, describe the real situation ("used by the shop staff every day") instead of making one up.
3. **Short and confident.** Headings are 2–6 words. Body paragraphs are 1–3 sentences. Say one idea, then stop.
4. **One smile per section, at most.** A light, honest line is welcome in small places: the loader, the
   404 page, the copy-email toast, empty states, the Curtain name, the footer sign-off. Never in project facts,
   and never at anyone's expense. No emoji in headings or body copy (they also clash with section 1). An emoji
   is fine inside Mira's chat replies if it fits the conversation.

**Where each kind of copy lives:** `src/data/site.ts` (tagline, statement, services, journey) and
`src/data/projects.json` (each project's `summary`, edited in the admin). Change copy there, never hard-coded in components.

**Project copy pattern** (`summary`, plus the optional new `story` lines, see 6.1):
- **Summary (one sentence):** what it is + who it's for + the one thing it does well.
- **Story (3 short lines, shown on the project page):** *The problem* → *What I built* → *What happened*
  (it went live, who uses it, what you'd do next). Facts only.

**Examples of the tone** (rewrites of existing lines, to adapt rather than paste as-is):

| Where | Now | In the voice |
|---|---|---|
| `site.statement` | I build web and mobile software for day-to-day business work, such as stock control, sales and repair tracking. | I build the software small businesses run on every day: the stock count, the till, the repair ticket. Then I make it pleasant to use. |
| `site.expertiseIntro` | The kinds of work I take on. | What I'm hired to build, and what I'd happily build again. |
| HQ Inventory summary | (write from facts) | Stock and point-of-sale for two shops, built during my internship and still running at the counter today. |
| Copy-email toast | Copied ✓ | Copied. Your move ✓ |
| 404 | (current) | This page wandered off. The rest of the site is right where I left it. |
| Curtain / loader | (name only) | Keep the name. The loader may add one small line under it, e.g. "Loading the good stuff". Never a percentage joke. |

**Don't:** fake metrics, buzzwords, "Hi, I'm a passionate…", emoji in headings, jokes inside project facts,
calling school or internship work "client work". Label it honestly (`kind`: Academic project, Internship, Personal).

---

## 4. Experience — the work moves (reference: melon.studio)

**What the reference does:** every project is shown as a short, silent video, not a still. Videos load only when
they're near the screen and play only while visible. On the home page each project is a large video panel that
bends slightly with scroll speed, with the project name set large across it. The rest of the page stays calm:
big type, lots of space and one thing at a time, so the moving work is what you notice.

**Rules for this site:**
- **Every project has a reel** (section 6). Wherever a project appears large, its reel plays in place of the
  still screenshot, with the screenshot as the poster.
- **Only what's visible moves.** At most 2 videos playing at once. Pause when off screen or the tab is hidden.
  Load the file only when it's within one screen of view.
- **Hover = preview.** On mouse devices, small project cards show the poster, and the reel starts when the
  pointer enters (with a 150ms fade) and pauses on leave. On phones, a card's reel plays while the card is in the
  middle 60% of the screen.
- **Scroll-velocity bend (desktop only, optional):** large project panels skew `skewY` between −2° and 2° and
  scale between 0.98 and 1, following scroll speed (`useVelocity(scrollY)` → `useSpring` 300/40). They settle when
  scrolling stops. Off on phones and with reduced motion.
- **Calm around the motion.** Don't add new decorative animation next to a playing video: no drifting glows or
  marquees in the same viewport.

---

## 5. Transitions (reference: inacionakiti.com, especially its dashboard)

**What the reference does:**
- **A floating dock** (bottom centre) switches the whole page between modes. Switching plays a transition that
  belongs to the page, rather than a plain reload.
- **The dashboard / code view (`</>`)**: the page dims and is overlaid with tall blueprint columns. Every section
  gets an outline with a code-style tag (element, height, how many elements). A glass panel slides in from the
  right with **live numbers measured in your browser** (largest paint, layout shift, page weight, frames per
  second, element count) and **the source code of the section under the pointer**. Leaving reverses it all.
- **Selected work** is a pinned full-screen stage: as you scroll, each project's media takes over the background
  (with a dot/halftone texture over it), the title changes and a small counter moves. Then the page releases.

For a developer portfolio this is the strongest idea of the three: it shows that you can build, not just that you can design. Build it like this:

### 5.1 The dock
- `components/Dock.tsx`: a `glass-dark` pill fixed at the bottom centre (`bottom-[max(1rem,env(safe-area-inset-bottom))]`), shown on `md+` after the hero (fades in when the hero has scrolled 60% away).
- It has one control for now: the **Code view** toggle (an `</>` icon button, label "Show the code" / "Hide the code" on a hover tooltip).
  Leave room for a later Mira button (open the assistant) and a sound toggle, but don't add them now.
- Wrap it in `Magnetic`. Buttons use the cursor's link state.

### 5.2 Code view — the transition
State machine `off → entering → on → leaving → off` (`components/CodeView.tsx`, `data-phase` on its root;
add a row to the AGENTS.md table). Events: `TOGGLE`, `ENTERED`, `LEFT`, `ESC`. `TOGGLE` is ignored mid-transition.

**Entering (≈0.9s total), in this order:**
1. **Blueprint columns sweep down**: 12 columns (6 below `lg`) the height of the viewport, `fixed inset-0 z-[140]`,
   each `bg-spruce/10` with a 1px `cream/10` right edge. They run `scaleY 0 → 1` from the top, `origin-top`,
   0.5s, stagger 0.035s, ease `[0.76,0,0.24,1]`.
2. **The page dims**: one overlay `bg-ink/55` fades in (0.4s). Don't use CSS `filter` on `<main>`; it repaints the whole page.
3. **Section outlines**: every element with `data-code="ComponentName"` gets a 1px dashed `gold/60` outline drawn
   *around* it (an absolutely placed box measured with `getBoundingClientRect`, updated on scroll and resize, not
   an outline on the element itself). A small mono tag sits on its top-left corner:
   `<Hero> · 738px · 56 elements`, typed in letter by letter (0.012s per character).
4. **Panel slides in**: `glass-dark` panel, `fixed right-4 top-20 bottom-24 w-[380px]`, `x: 110% → 0`, spring 260/30.

**On:**
- Panel top — **"Measured in your browser, right now"**, with live numbers:
  - **Largest paint**: `PerformanceObserver('largest-contentful-paint')`
  - **Layout shift**: sum of `layout-shift` entries without recent input
  - **Page weight**: `performance.getEntriesByType('resource')` `transferSize` + navigation
  - **Frames / s**: rAF counter, updated every 500ms
  - **Elements**: `document.querySelectorAll('*').length`

  Numbers count up when they change (`animate` from the old value to the new one, 0.4s).
- Panel bottom — **the code of the section under the pointer**: file path (`src/components/Hero.tsx`) plus its
  first comment block and the first ~25 lines, in `font-mono text-xs`, with simple keyword colouring
  (gold strings, spruce keywords, cream/60 comments). Hovering a different outlined section crossfades the code
  (0.25s). On touch, tap a section to show its code.
  - The code comes from a **build-time JSON**: `scripts/code-snippets.mjs` reads every file listed by a `data-code`
    name and writes `src/data/code-snippets.json`. It runs before `dev` and `build`, the way `predev` runs the
    voice script. Never fetch source at runtime.
  - The comments in this repo are written in plain sentences describing what visitors see, so they double as
    the explanation. Keep writing them that way.
- `Esc`, the toggle, or a route change → `leaving`.

**Leaving (≈0.6s):** panel out (`x → 110%`), outlines and tags fade (0.2s), the dim fades, then the columns retract
`scaleY 1 → 0` from the **bottom** (`origin-bottom`), with the stagger reversed.

**Rules:** desktop and tablet only (`md+`). It's off for reduced motion only in the sense that steps 1 and 4 become
fades; the view itself still works. Scroll stays active while it's on, so you can scroll and inspect.
Mark sections with `data-code` on: `Hero`, the intro section, `ProjectCard` grid, `ParallaxGallery`,
`ExpertiseList`, `Marquee`, `ProjectStack`, `ShotRail`, `Footer`, `Assistant`.

### 5.3 Pinned showcase (home "Featured projects", optional, after 7.1–7.5)
Replaces the 3-card grid on the home page only. `/work` keeps `ProjectStack`.
- The section is `h-[300svh]` (one screen per featured project), with a `sticky top-0 h-svh` stage inside.
- The stage background is the current project's reel (`VideoBackdrop`, section 6.3) under a **dot texture**: reuse
  `WorkBackdrop`'s 22px dot field, at full coverage and `opacity .35`, plus the usual ink vignette, so the text stays readable.
- As scroll passes each third: the old background fades and scales `1 → 1.04`, the new one fades in from
  `scale 1.08 → 1` (0.9s, ease `[0.22,1,0.36,1]`). The title changes with `RiseText`-style rising words, and the
  summary and tags with `Reveal`.
- Progress: a thin vertical bar on the left that fills per project (no "01 / 04" numbers; see section 1).
- The whole stage links to the project (`TransitionLink`, `data-cursor-label="View"`).
- Phones: no pinning. Each project is its own `h-[80svh]` panel with its reel playing while centred.

---

## 6. Project videos (reels)

You don't need to film anything. Reels are made from the screenshots already in the admin.

### 6.1 Data
Add to `Project` in `src/data/site.ts` and to `normalizeProject` (optional fields, so older entries still load):
```ts
video?: { mp4: string; webm?: string; poster: string };   // e.g. /videos/cozy-crumb.mp4
story?: { problem: string; built: string; outcome: string }; // section 3 project copy pattern
```
- The admin (`app/admin`) gets a **Video** field per project: upload an `.mp4`/`.webm` (≤ 8 MB) plus a poster,
  stored under `public/videos/`, the same way shots are stored under `images/work/uploads/`.
- Keep `scripts/auto-commit.mjs` behaviour (admin saves commit).

### 6.2 Making reels — `scripts/reel/`
`scripts/reel/make_reel.py` + `scripts/reel/stage.html` (already in the repo) build a **9-second, silent, seamlessly looping** reel:
two browser windows float over the site's dark green glow, and each 3-second beat shows a new pair of screens
panning gently down the page. Output: `public/videos/<slug>.mp4` (H.264, ~1 MB), `.webm` (VP9, ~0.8 MB) and
`-poster.webp` (the first frame).
```bash
pip install playwright && python -m playwright install chromium   # once
python scripts/reel/make_reel.py cozy-crumb                        # one project
python scripts/reel/make_reel.py cozy-crumb --shots 0,1,2,10,3,4   # choose the screenshots
python scripts/reel/make_reel.py --all                             # every website project
```
Then add the `video` entry for that project (admin or `projects.json`).

**To do in the generator:**
- **Phone layout** for `platform: "mobile"`: three phones instead of browser windows (reuse the `Phone` frame
  proportions from `DeviceFrames.tsx`). The script currently skips mobile-only projects.
- **"both"**: a browser window with a phone in front, like `ComboCollage`.
- Optionally port it to Node (`playwright` + `ffmpeg-static`) and add `npm run reels`.

**Better still, a live recording** (what the voice reference does: "recorded live, zero mockups"): when a project
runs locally (XAMPP/Tomcat/Laravel), a Playwright script can open it, scroll and click through a real flow (log in,
add to cart, check out) with `recordVideo`, then trim it to 8–12s with ffmpeg. Use the same output names, so it
drops straight in. Prefer this over the screenshot reel when it's possible.

**Reel rules:** 8–12s, silent, loop seamlessly, 1280×720 (≤ 1.5 MB mp4), no text burnt in (the site sets the
title over it), the first frame works as the poster, and no visitor or customer personal data on screen.

### 6.3 `VideoBackdrop` — the one video component
`components/VideoBackdrop.tsx`. **Use it everywhere a reel shows; never put a bare `<video>` in a page.**
- Markup: `<video muted loop playsInline preload="none" poster={poster} aria-hidden>` with `<source>` webm, then mp4.
  `object-cover`, fills its parent.
- State machine `idle → loading → playing ⇄ paused`, plus `failed` (`data-state`):
  - It loads when within one viewport (IntersectionObserver `rootMargin: "100% 0px"`), plays when ≥ 40% visible,
    and pauses when it leaves or when `document.hidden`.
  - A shared counter allows at most **2 playing** at once; the oldest pauses.
- **Poster only** (never load the video) when: `prefers-reduced-motion`, `navigator.connection.saveData`, or the
  project has no `video`. In that case, fall back to the first screenshot.
- Props: `video`, `fallback` (a `Shot`), `mode: "auto" | "hover"`, `dim` (0–1, default 0.45), `dots` (boolean: the
  halftone texture), `className`.
- Readability layers on top, always: `bg-ink/{dim}`, a vignette `radial-gradient(… transparent 35%, rgb(0 15 8/0.8))`,
  and a gradient to `ink` under any text. Text over video must keep ≥ 4.5:1 contrast. Check it at the brightest frame.

### 6.4 Where reels go (this replaces the plain backgrounds)
| Place | Now | With a reel |
|---|---|---|
| **/work: each `ProjectStack` card** | `glass-solid` card, text left, screenshot collage right | **Built as:** the reel fills the whole card and the kind, extra-bold title, summary, button and tags sit **in the middle** over a soft dark pool; the whole card opens the project. (Originally specified:) The **card's background becomes the reel** (`VideoBackdrop mode="auto" dim={0.55} dots`), full-bleed inside the rounded card, with an `ink` gradient from the left (`from-ink/95 via-ink/70 to-transparent` across the text column) so the text stays sharp. The collage on the right is **removed** for projects that have a reel (the reel already shows the screens) and kept for those that don't. Keep the stacking scale and dim. The card's dim overlay also dims the video as it's covered |
| **/work/[slug]: `ProjectIntro`** | Text beside a device | **The reel is the full-screen background** of the first screen (dim 0.5, a dark pool in the middle, fading into the page below), with everything **centred**: the title in very large extra-bold type, the summary in semibold, the facts and tools as glass chips. No device frame |
| **Home `ProjectCard` (small cards)** | Device shots rise on hover | `VideoBackdrop mode="hover"` inside the `Browser` frame's screen: poster at rest, plays on hover or focus. Phones: play while centred |
| **Home pinned showcase (5.3)** | — | Full-screen background with dots |
| **Neighbour links** (prev/next on project pages) | Thumbnail | Poster; on hover, the reel plays in the thumbnail |

---

## 7. To do, in order
1. ~~**6.1** `video` and `story` fields (+ admin upload) and reels for every project.~~ Done: all six have a reel.
   The admin edits both; a new upload must come with a poster.
2. ~~**6.3** `VideoBackdrop`.~~ Done.
3. ~~**6.4** Reels in the `/work` cards, the `ProjectIntro` stage and the home `ProjectCard` hover~~, plus the
   previous/next links. Done. The stage's blurred background uses the reel's poster (not a second playing video),
   so it doesn't count toward the 2-playing limit.
4. **3** Copy pass in `site.ts` and `projects.json` in the new voice. **Waiting for Athirah to approve the wording**,
   and for the facts the `story` lines need (who uses each project, what happened after).
5. ~~**5.1–5.2** The dock and the Code view, plus `scripts/code-snippets.mjs`.~~ Done.
6. ~~**6.2** Phone and "both" layouts in the generator.~~ Done. Still to do: live recordings where a project can run locally.
   The generator converts frames to the standard ("tv") colour range: without it some ffmpeg builds produce VP9
   Chrome can't decode and H.264 that Safari shows washed out.
7. **5.3** Pinned home showcase (optional). **4** Scroll-velocity bend (optional). Not started.

---

## 8. Built from the reference (nurfitriazim.com)

All six are done; section 2 says where each lives. Where the reference's details clashed with section 1,
the section 1 rules won:

- **3.1 Full-screen menu** (`Menu.tsx`) replaces the phone tab bar. Links have no "01–04" index; the footer
  row is ©, email, GitHub, LinkedIn.
- **3.2 Expertise rows**: the rising fill, without row numbers or an arrow (the rows aren't links).
- **3.3 Parallax gallery** (`ParallaxGallery.tsx`), now with photos from `public/images/gallery/` instead of project shots.
- **3.4 Footer giant name**: built, then removed at Athirah's request. The footer's bottom padding is `pb-8`.
- **3.5 Curtain name**: shown in sentence case (`font-display`), not tracked capitals.
- **3.6 Project card details**: the card's own tag chips slide up on hover, rather than a second "A · B · C" line.

## 9. Navigation rules (summary)
- Internal link → `TransitionLink` → Curtain. External links (`target="_blank"`, `mailto:`, resume) → plain `<a>` with `RollText`.
- Same-page link → the Curtain already scrolls to the top instead of transitioning. Keep that.
- Desktop: glass pill + "Let's talk". Below `md`: menu button + full-screen menu (`Menu.tsx`). There's no bottom tab bar.
- In-page jumps and "Back to top" → `scrollToY`.
- Each new page starts at the top (`SmoothScroll` handles this). Hero text uses `SplitText`, which waits 0.5s for the curtain to clear.

## 10. Accessibility and performance — every change must pass
- **Reduced motion:** no circle reveals (use fades), no parallax, no letter or word rising (show the text directly), no magnetic pull. `Curtain` already skips itself — keep it that way.
- **Touch:** no hover-only content. Anything revealed on hover must be visible or reachable by tap on phones.
- **Keyboard:** each hover effect has a `:focus-visible` / `group-focus-within` match. Gold focus ring (global `:focus-visible`).
- Animate only `transform`, `opacity` and `clip-path`. Use `will-change` only on elements that animate on scroll (as in `ProjectStack`).
- Images through `next/image` with real `sizes`. Gallery tiles are lazy.
- **Video:** only through `VideoBackdrop`; muted, `playsInline`, `preload="none"`, poster always set, at most 2 playing, paused off screen and in hidden tabs, poster only for reduced motion and Save-Data. A reel is never the only place information appears (it's `aria-hidden`; the text says what it shows).
- **Code view:** keyboard reachable (the dock button, `Esc` to leave, focus moves to the panel and back), and the panel is `role="dialog"` with `aria-label="Code view"`.
- After each change, run `npx tsc --noEmit -p .` and `npx eslint src scripts`, and `npm test` if you touched `src/lib/machine.ts`.

## 11. Don't
- Don't change colours, fonts, surfaces or the overall layout.
- Don't write new versions of the cursor, links, reveal, roll text, magnetic or scroll helpers — extend the existing ones.
- Don't use booleans for multi-step UI (menu, transitions). Use `createMachine` / `useMachine`.
- Don't use `window.addEventListener("scroll")` for animation. Use Motion `useScroll`.
- Don't copy any reference site's text, names, photos, projects or code.
- Don't put a bare `<video>` in a page, autoplay with sound, or burn text into reels.
- Don't fake numbers, in copy or in the Code view. Every metric shown must be measured live or be true.
