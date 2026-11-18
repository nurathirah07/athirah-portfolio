# DESIGN.md — Interactions & Navigation

> **Read this before any UI work in this repo.** It sits alongside `AGENTS.md`, which still applies:
> state machines for anything with more than two states, the checks (`npx tsc --noEmit -p .`,
> `npx eslint src scripts`, `npm test`), and the commit rules.
>
> - **Look (colours, Manrope, glass/matte surfaces, layout): keep it as it is.** Section 1 records it so you don't drift.
> - **Interactions and navigation: follow this file.** The target feel is the reference site
>   nurfitriazim.com. Copy its *behaviour* (how things move and respond), never its text, name or images.
> - **Reuse before you build.** Section 2 lists the interaction parts that already exist. Extend them;
>   don't write a second cursor, link, reveal or scroll helper.
> - Section 3 lists the interactions built from the reference, and how they were adapted.

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
| Parallax gallery | `components/ParallaxGallery.tsx` | Home, between Featured projects and What I build: project shots in 4 columns (2 on phones) that slide at different speeds while scrolling past. Fed from `projects[].shots`. Half speed on phones, still with reduced motion |
| Marquee | `components/Marquee.tsx` | Tilted amethyst band, 32s loop, pauses on hover |
| Shots strip | `components/ShotRail.tsx` | Machine `drifting / focused / dragging` (`data-mode`) |
| Footer | `components/Footer.tsx` | Glass CTA card: `RiseText` heading, Magnetic "Send a message", copy-email button, roll links, "Back to top" via `scrollToY`. Ends with `FooterName`: the name set huge, letters rising in, slower than the page, gold under the pointer |
| Curtain name | `components/Curtain.tsx` | The name shows in the middle while the screen is fully covered (driven by the disc's size, no extra state) |

**House conventions to keep:**
- Reveal / hover ease: `[0.22, 1, 0.36, 1]`. Page-level ease (curtain, menu): `[0.76, 0, 0.24, 1]`.
- Springs: cursor `500/40`, nav pill `400/32`, magnetic `220/16`, floating preview `260/26`.
- Hover effects are for the mouse only (`e.pointerType === "mouse"`, `(hover: hover) and (pointer: fine)`).
  On phones, use `usePhone()` for gentler versions.
- Check `useReducedMotion()` / `prefers-reduced-motion` in every new effect (see section 5).
- Comments explain *what the visitor sees*, in plain sentences (as in the existing files).

---

## 3. Built from the reference

All six are done; section 2 says where each lives. Where the reference's details clashed with section 1,
the section 1 rules won:

- **3.1 Full-screen menu** (`Menu.tsx`) replaces the phone tab bar. Links have no "01–04" index; the footer
  row is ©, email, GitHub, LinkedIn.
- **3.2 Expertise rows**: the rising fill, without row numbers or an arrow (the rows aren't links).
- **3.3 Parallax gallery** (`ParallaxGallery.tsx`), as specified.
- **3.4 Footer giant name** (`FooterName.tsx`). The footer's bottom padding is `pb-8` now that the tab bar is gone.
- **3.5 Curtain name**: shown in sentence case (`font-display`), not tracked capitals.
- **3.6 Project card details**: the card's own tag chips slide up on hover, rather than a second "A · B · C" line.

## 4. Navigation rules (summary)
- Internal link → `TransitionLink` → Curtain. External links (`target="_blank"`, `mailto:`, resume) → plain `<a>` with `RollText`.
- Same-page link → the Curtain already scrolls to the top instead of transitioning. Keep that.
- Desktop: glass pill + "Let's talk". Below `md`: menu button + full-screen menu (`Menu.tsx`). There's no bottom tab bar.
- In-page jumps and "Back to top" → `scrollToY`.
- Each new page starts at the top (`SmoothScroll` handles this). Hero text uses `SplitText`, which waits 0.5s for the curtain to clear.

## 5. Accessibility and performance — every change must pass
- **Reduced motion:** no circle reveals (use fades), no parallax, no letter or word rising (show the text directly), no magnetic pull. `Curtain` already skips itself — keep it that way.
- **Touch:** no hover-only content. Anything revealed on hover must be visible or reachable by tap on phones.
- **Keyboard:** each hover effect has a `:focus-visible` / `group-focus-within` match. Gold focus ring (global `:focus-visible`).
- Animate only `transform`, `opacity` and `clip-path`. Use `will-change` only on elements that animate on scroll (as in `ProjectStack`).
- Images through `next/image` with real `sizes`. Gallery tiles are lazy.
- After each change, run `npx tsc --noEmit -p .` and `npx eslint src scripts`, and `npm test` if you touched `src/lib/machine.ts`.

## 6. Don't
- Don't change colours, fonts, surfaces or the overall layout.
- Don't write new versions of the cursor, links, reveal, roll text, magnetic or scroll helpers — extend the existing ones.
- Don't use booleans for multi-step UI (menu, transitions). Use `createMachine` / `useMachine`.
- Don't use `window.addEventListener("scroll")` for animation. Use Motion `useScroll`.
- Don't copy the reference site's text, name, photos or project names.
