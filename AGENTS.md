<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## State machines

Anything with more than two states is an explicit state machine, not a set of booleans. A machine is a transition table (`createMachine` in `src/lib/machine.ts`, `useMachine` in components): for each state, the events it accepts. Events not in the table are ignored, so callers don't guard against double clicks or stale replies themselves. To change behaviour, change the table; never set a phase directly.

| Machine | Where | States | Visible in the DOM as |
|---|---|---|---|
| Mira's conversation | `src/lib/miraMachine.ts` | welcome, asking, sending, sent, drafted, failed | `data-phase`, `data-step`, `data-ready` on `section[aria-labelledby=assistant-title]` |
| Mira's questions | `steps`, `nextStep`, `previousStep`, `withAnswer`, `withoutAnswer` in `src/data/assistant.ts` | greeting … summary | `data-step` (same section) |
| Page transition | `src/components/Curtain.tsx` | idle, covering, revealing | `data-phase` on the curtain |
| Phone and tablet menu | `src/components/Menu.tsx` | closed, opening, open, closing | `data-phase` on `#site-menu` |
| Project reel | `src/components/VideoBackdrop.tsx` | idle, loading, paused, playing, failed (or `still`: poster only) | `data-state` on the reel |
| Screens strip | `Mode` in `src/components/ShotRail.tsx` | drifting, focused, dragging | `data-mode` on the strip |

In browser tests, wait on these attributes (for Mira: `data-phase="asking"` and `data-ready="true"`) instead of sleeping or reading CSS classes.

## Checks

- `npm test`: Mira's machines, question order and written replies, and that every line she says has a recording. No browser needed; run it after any change to `src/lib/mira*`, `src/lib/machine.ts` or `src/data/assistant.ts`.
- `npm run voice`: records new or changed lines from `src/data/assistant.ts` in Mira's voice (also runs before `npm run dev`). A line without a recording is spoken in a fallback voice, and `npm test` fails.
- `npx tsc --noEmit -p .` and `npx eslint src scripts` must both be clean.

## Commits

Changes are committed automatically (`scripts/auto-commit.mjs`): by a Claude Code Stop hook after each turn (`.claude/settings.json`, generic "Auto-save" message), and by the admin after each save, delete or reorder (project list and uploads only). To give a change a meaningful message, commit it yourself before the turn ends; the hook then finds nothing left to commit.
