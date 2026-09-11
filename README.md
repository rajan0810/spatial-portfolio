# Spatial Portfolio

A portfolio that behaves like the thing it is about. The work is VR on Meta Quest, so the site is a
Quest home environment you travel through — and from a later phase, one you can actually enter in a
headset.

Two front-ends over one content source:

| | |
|---|---|
| **`/`** — the Experience | A WebGL environment on a scroll-driven camera rail. Boot sequence, curved glass panels, guardian boundary, comfort menu, live frame-budget HUD. |
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

- Initial JS ≤ 300KB gzipped. Currently **183KB** for the experience, **173KB** for flat mode.
- three + R3F + SDF text (~450KB gz) is a deferred chunk that downloads *behind the boot overlay*.
- Flat mode ships zero WebGL, verified against the built output.
- No lights and no shadow maps anywhere. Every surface is emissive glass.
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
