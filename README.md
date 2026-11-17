# Athirah — Portfolio (Next.js + Tailwind + Motion)

## Run it
1. Install Node.js (LTS) from nodejs.org
2. Open this folder in VS Code → Terminal → `npm install`
3. `npm run dev` → open http://localhost:3000

## Add your fonts
Copy your font files into `public/fonts/` and rename them:
- `Firthe.otf` (or .ttf / .woff2)
- `Vatora.otf`
- `MaisonSalome.otf`
Font roles are set in `src/app/globals.css` (`--font-display`, `--font-accent`, `--font-body`).

## Edit your content
Everything (name, about, skills, links, projects) is in `src/data/site.ts`.
- Photo: put `me.jpg` in `public/` and replace the gradient box in `src/app/about/page.tsx`
- Resume: put `resume.pdf` in `public/`

## Where the animations live
- `components/SplitText.tsx` – word-by-word heading reveal
- `components/Reveal.tsx` – fade-up on scroll
- `components/Cursor.tsx` – custom cursor
- `components/Nav.tsx` – sliding nav pill
- `components/SmoothScroll.tsx` – Lenis smooth scroll
- `app/template.tsx` – page transition

## Deploy
Push to GitHub → import the repo on vercel.com → Deploy.
