# The Dig

A portfolio you dig through.

The page is a cross-section of the ground, cut open. Every visitor leaves **one token** — an emoji
and a word — and lets it go; it falls with physics, bounces, settles, and **stays forever**. New
tokens land on old ones, so the pile is sedimentary: the deeper you scroll, the further back you are
looking at who came before. Strata lines on the shaft wall are labelled by month, from where the
tokens actually rest.

What's buried in it is Rajan Hasija's work — project slabs cut into the rock, fossils for
achievements, veins for skills, strata for the timeline — always readable, with the tokens piling
around the text, never over it. **Dig** by dragging tokens aside; a few seconds after you let go they
heal back to where they were. The record is what people left, not what they pushed.

It's alive: a live count of who's here, other visitors' cursors as dots carrying their emoji, and
when someone anywhere drops a token, you watch it fall on your screen. Once per visit there's an
earthquake. Everything heals.

The site gets better with age.

Two front-ends over one content source:

| | |
|---|---|
| **`/`** — the Dig | Physics, realtime, the headlamp. |
| **`/flat`** — Read it flat | The same content, server-rendered, **zero canvas**. What Google indexes; the fallback for low-power devices. |

## Architecture

- **Physics:** Matter.js, sleeping bodies. Tokens are pills; content slabs are static bodies the
  pile rests around. Healing is a spring per displaced token toward its stored rest pose, applied
  only while it is displaced — so a pile nobody touches costs nothing.
- **Rendering:** one fixed Canvas 2D for tokens and the headlamp; each distinct token is rasterised
  once to a sprite (emoji text is expensive to draw per frame). **Slabs are DOM** in page space
  above the canvas, so the case studies are selectable, indexable and reachable by assistive tech.
- **Camera:** page scroll. World units are fixed (`WORLD_W = 1000`) and scaled to the viewport, which
  is what makes a rest pose written on one screen correct on every other. No scroll-jacking.
- **Consistency across clients:** the client that drops a token simulates it to rest, then writes
  `{x, y, angle}` exactly once. Everyone else places the token *at its rest pose*, asleep — there is
  no cross-client simulation to drift. Live drops broadcast the release point so viewers watch it
  fall, then snap to the authoritative pose when it lands.
- **Alive:** one Supabase Realtime channel: `postgres_changes` on `drops`, a `release` broadcast, and
  presence for cursors and the count.
- **Sound:** synthesised in WebAudio, opt-in, no files.

```
app/page.tsx              server: content (cached) + the pile (never cached, behind Suspense)
dig/
  Dig.tsx                 client root: canvas, scroll camera, drop flow, live wiring
  world.ts                Matter world: walls, floor, slabs, tokens, heal springs, earthquake
  tokens.ts               sprite cache and sizing
  camera.ts               world ↔ screen
  live.ts                 Realtime: changes, broadcast, presence
  strata.ts               month bands from rest poses
  Slab.tsx                DOM slabs; layout of Rajan's content in the shaft
  Surface.tsx             sky, marker stone, signpost, live count, Leave-something
  Presence.tsx            other visitors' cursors
lib/actions/drops.ts      dropToken / settleToken — the only way a token enters the dig
lib/moderation.ts         palette, charset, deny-list
lib/data/                 cached, tagged content reads; drops read
lib/db/                   Drizzle schema + RLS policies
scripts/                  migrate, seed, shoot (walkthrough), verify
```

## Security model

`NEXT_PUBLIC_SUPABASE_ANON_KEY` ships in the client bundle, so Supabase's PostgREST endpoint is
publicly reachable no matter what this app does. So:

- `drops` is **fully public to read** and contains nothing that shouldn't be — which is what lets
  Realtime broadcast its rows safely. Anything secret (the IP hash for rate limiting, the edit token
  for the single rest-pose write) lives in `drop_secrets`, which has RLS on and **no policies**: it
  is invisible through the API entirely.
- The browser **never writes** either table. `dropToken` and `settleToken` are server actions on the
  privileged connection: moderation, one drop per IP per 24h (salted hash), and a rest pose that is
  accepted exactly once, within world bounds, only with the matching edit token.
- All of this is verified against the anon key directly, not trusted: `npm run verify`.

## Performance budgets

- Initial JS ≤ 300KB gzipped. Currently **266KB** for the dig (Matter + supabase-js + React),
  **173KB** for flat mode.
- The newest ~2,000 tokens are simulated bodies; older ones are drawn as bedrock. Sleeping bodies
  cost nothing; the loop pauses when the tab is hidden; physics runs in fixed 60Hz substeps.
- Flat mode ships zero canvas and zero physics, verified against the built output.

## Local development

```bash
cp .env.local.example .env.local   # Supabase credentials + a DROP_SALT
npm install
npm run db:setup                   # migrate, apply RLS policies, seed
npm run dev
```

| | |
|---|---|
| `npm run db:generate` / `db:migrate` | Schema changes |
| `npm run db:policies` | RLS, grants, realtime publication (idempotent) |
| `npm run db:seed` | Profile + projects |
| `npm run shoot` | Two visitors in real Chrome: drop, settle, persist, live count, dig-and-heal, reload |
| `npm run verify` | RLS on the public door, secrets invisible, moderation, rate limit, indexability, mobile, flat |

## Roadmap

- Hover cards on tokens (word, date, visitor number); mobile drag tuning; bedrock baking past 2,000.
- Achievement fossils, skill veins and timeline strata light up as that content is published.
- Admin portal: content editing, delete a drop, ban an IP hash.
