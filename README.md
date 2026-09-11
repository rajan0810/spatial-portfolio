# Spatial Portfolio

A portfolio that behaves like the thing it is about. The work is VR on Meta Quest, so you don't visit
this site — **you put on a headset.**

The page opens on a desk. A headset rests on it under a lamp. You pick it up; it rises to meet your
eyes and the screen goes dark. It boots. Because it has never been worn, it sets itself up — a
completely straight-faced replay of first-time headset setup, except every step is real: you **draw
your Guardian** by tracing a boundary on the floor, and that polygon becomes the actual boundary that
appears around you whenever you cross between stations. You confirm floor level by touching the
floor. Then you are in the environment, and everything you see is seen *through the lenses* — barrel
distortion, chromatic fringing at the edges, and the faint screen-door grid every headset owner has
learned to stop noticing. Taking the headset off is flat mode.

A returning visitor's headset remembers its setup, exactly as a real one would.

Two front-ends over one content source:

| | |
|---|---|
| **`/`** — the Experience | Desk → put on → boot → draw your Guardian → confirm floor → a WebGL environment on a scroll-driven camera rail, rendered through a lens pass. Curved glass panels, comfort menu, live frame-budget HUD. |
| **`/flat`** — Flat mode | The same content, server-rendered, **zero WebGL**. What a recruiter with forty seconds reads, what Google indexes, and the fallback for low-power devices and reduced-motion. |

Flat mode is not a consolation prize. The experience is the argument; flat mode is the evidence.

## Architecture

**WebGL carries the environment; the DOM carries the prose.** Panels, video, effects and the floor
grid are rendered in three.js. All paragraph text lives in a DOM overlay above the canvas, where it
stays crisp, selectable, translatable and reachable by a screen reader. Only short labels that must
sit *in space* are drawn as SDF text.

**Nothing that changes every frame touches React.** Scroll position, pointer parallax and render
stats live in mutable module singletons (`lib/store/rail.ts`, `lib/store/perf.ts`) that the render
loop reads and writes directly. Zustand holds only discrete state — comfort settings, active
station, unlocked achievements. Fading four stations through the reconciler at 60fps would cost more
than the entire 3D scene.

**One data access layer.** `lib/data` is the only module that reads content, and both front-ends
consume it. That is what stops the two modes from drifting into different sites.

```
app/            routes — experience, flat mode, per-project case studies
scene/          WebGL: Rig (camera on rail), panels/, stations/, effects/
ui/             DOM overlay: prose, comfort menu, perf HUD, achievement toasts
lib/data/       cached, tagged content reads   <-- both modes read only this
lib/db/         Drizzle schema + RLS policies
scripts/        migrate, seed, screenshot, verify
```

`scene/panels/Panel.tsx` is the load-bearing abstraction — nearly every visual in the scene is one
curved, rounded, edge-lit panel, drawn in a single pass by one shader.

The visit itself is a small state machine in `lib/store/experience.ts`:
`desk → donning → boot → guardian → floor → live → doffing`. `scene/desk/` is the only lit, shaded
scene in the site and unmounts the moment the headset is on. `scene/setup/` holds the two
first-time-setup interactions; `scene/effects/Guardian.tsx` turns the polygon you drew into walls;
`scene/effects/LensPass.tsx` is the full-screen pass everything is seen through.

Two hard-won rules, each of which cost a silent, error-free blank scene to learn:

- **Own your `ShaderMaterial`.** Passing `uniforms` to a `<shaderMaterial>` element does not
  guarantee the rendered material keeps that object; mutate an orphan and nothing changes. Every
  custom material here is constructed in `useMemo` and attached with `<primitive>`.
- **three's raycaster ignores `visible`.** A hidden object with an `onClick` still swallows clicks
  that pass through it. The `Canvas` uses an event filter that drops hits on anything hidden anywhere
  in its ancestry.

## Security model

Content is editable at runtime through a hidden admin portal, so this matters.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` ships inside the client bundle, which means Supabase's PostgREST
endpoint is publicly reachable no matter what this app does. **Row Level Security is what makes that
surface safe**, and it is verified directly against the anon key rather than trusted: drafts and
soft-deleted rows are invisible, writes are refused, and the admin allow-list table is unreadable.

The app's own Drizzle connection authenticates as a privileged role and therefore *bypasses* RLS.
Security on that path comes from explicit `published = true and deleted_at is null` filters in
`lib/data` and from auth checks in server actions. Two doors, two locks — see the comment in
`lib/db/index.ts`.

The forthcoming secret code that reveals `/admin` is deliberately **obscurity, not security**: it is
compared server-side against a hashed env var and rate-limited, and it protects nothing. The real
lock is a Supabase Auth session enforced in middleware.

## Performance budgets

Enforced, not aspirational — a VR developer's portfolio dropping frames undercuts the whole argument.

- Initial JS ≤ 300KB gzipped. Currently **184KB** for the experience, **173KB** for flat mode.
- three + R3F + SDF text + the scene (~283KB gz) is a deferred chunk that arrives while you look at
  the desk.
- Flat mode ships zero WebGL, verified against the built output.
- One light in the whole site — the desk lamp — and it unmounts with the desk. The environment is
  all emissive glass; no shadow maps anywhere.
- The lens pass is a single extra full-screen fragment pass, off on coarse-pointer devices.
- dpr capped at 1.75; MSAA off, since the panel shader antialiases its own silhouette.
- Stations are culled by visibility, so the rail costs as much as the one station you are looking at.

## Local development

```bash
cp .env.local.example .env.local   # then fill in Supabase credentials
npm install
npm run db:setup                   # migrate, apply RLS policies, seed
npm run dev
```

### Scripts

| | |
|---|---|
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:policies` | Apply RLS, grants and triggers (idempotent) |
| `npm run db:seed` | Seed profile + projects |
| `npm run shoot` | Screenshot every station in a real browser |
| `npm run verify` | Assert reduced-motion, inert, mobile and flat-mode guarantees |

`shoot` and `verify` drive the running dev server through locally installed Chrome. They exist
because a scroll-driven WebGL scene cannot be verified by a passing build — shader compile failures,
texture CORS rejections and z-index mistakes are invisible until something renders. All three of the
worst bugs in this project's history were found this way, and none of them produced a build error.

## Roadmap

- **Phase 2** — the secret admin portal: magic-link auth, ADB-styled editor, direct-to-storage uploads
- **Phase 3** — remaining projects, toolbench, trophy shelf, timeline, spatial audio
- **Phase 4** — WebXR: `Enter VR` on a real Quest
- **Phase 5** — gamepad haptics, MR passthrough, stereo easter egg
