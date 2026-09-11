# Spatial Portfolio

A portfolio that behaves like the thing it is about. The work is VR on Meta Quest, built in a game
engine every day — so the site **opens as the editor, with one scene loaded: Rajan.**

- **Hierarchy** is the site map: `Rajan (Player)`, `Projects/JustiX`, `Skills`, `Achievements`,
  `Timeline`, `Contact`. Click to select; double-click or `F` to frame.
- **Scene view** is the live 3D world under a free-orbit camera, with an orange selection outline
  and a **move gizmo you can drag**. The **Game** tab shows exactly what a player sees.
- **Inspector** shows the selection's components — `Transform`, `Project (Script)`, `Tech`,
  `Highlights`, `Demo (VideoPlayer)`, `Links`. **Fields are live-bound**: rename a tech surface and
  the label on the 3D panel changes. Nothing is saved; the asterisk in the title bar and **Revert**
  are the whole persistence story, as they should be for an editor with no Save.
- **Console** logs selection, transforms, play/stop and every achievement unlocked in the game.
- **▶ Play** runs the scene as the game: a headset on a desk. Pick it up; it boots; draw your
  Guardian; confirm the floor; you are in the environment, through the lenses, with a tracked hand
  for a cursor and panels you can grab and throw. **■ Stop** returns to the editor with the scene
  where you left it. **⏸** halts the render loop for real; **⏭** advances exactly one frame.
  `⌘P` toggles. **Build** is flat mode.
- Inside Play: **use your hands.** Opt in and the webcam tracks your hand in the browser — your
  index finger is the pointer, a pinch is a press, raise your hand to travel forward. It emits the
  same pointer events the mouse does, so the hand cursor, grabbable panels and buttons all work
  without knowing. The model and WASM (~8MB) load only on opt-in; frames never leave the device;
  the camera setting is never persisted, so it is a fresh, deliberate choice every visit.

A recruiter gets the inspector — a structured résumé denser than any flat page. A developer gets the
joke instantly and starts poking. Both get the same data, from one access layer.

Two front-ends over one content source:

| | |
|---|---|
| **`/`** — the Editor | Hierarchy · Scene/Game view · Inspector · Console · ▶ Play. |
| **`/flat`** — Flat mode ("Build") | The same content, server-rendered, **zero WebGL**. What Google indexes, and the fallback for low-power devices and reduced-motion. |

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
app/            routes — the editor, flat mode, per-project case studies
ui/editor/      EditorShell, TopBar, Hierarchy, Inspector, Console, Viewport
scene/          WebGL: EditorCamera, Selection (gizmo), Rig (rail camera), PauseLoop,
                panels/, stations/, effects/, desk/, setup/, input/, preview/
ui/             the game's DOM layer: prose, setup, comfort, HUD, toasts, sound
lib/store/      editor (mode, selection, overrides, console) · experience (phases,
                comfort, guardian) · rail/hand/perf (per-frame singletons) · sceneRegistry
lib/data/       cached, tagged content reads   <-- both modes read only this
lib/db/         Drizzle schema + RLS policies
scripts/        migrate, seed, screenshot, verify
```

**The render loop is owned by one component.** Any `useFrame` with a positive priority switches off
R3F's automatic render. `LensPass` is therefore always mounted and is *the* renderer — drawing
through the lens in Play and straight to the screen otherwise. Forgetting this produces a black
viewport whose HUD still reports draw calls (from the courtroom's offscreen render).

`scene/panels/Panel.tsx` is the load-bearing abstraction — nearly every visual in the scene is one
curved, rounded, edge-lit panel, drawn in a single pass by one shader.

The visit itself is a small state machine in `lib/store/experience.ts`:
`desk → donning → boot → guardian → floor → live → doffing`. `scene/desk/` is the only lit, shaded
scene in the site and unmounts the moment the headset is on. `scene/setup/` holds the two
first-time-setup interactions; `scene/effects/Guardian.tsx` turns the polygon you drew into walls;
`scene/effects/LensPass.tsx` is the full-screen pass everything is seen through.
`scene/input/HandCursor.tsx` is the hand; `lib/store/hand.ts` is the pointer state it reads, written
by panels from their handlers. Grab physics live inside `Panel` itself (`grabbable`), as a spring
integrated in `useFrame` — nothing touches React while a panel is in flight. `scene/effects/mood.ts`
is the per-station palette every atmospheric layer reads; `scene/preview/Courtroom.tsx` is the
render-to-texture scene; `lib/audio.ts` is the synthesiser.

Two hard-won rules, each of which cost a silent, error-free blank scene to learn:

- **Own your `ShaderMaterial`.** Passing `uniforms` to a `<shaderMaterial>` element does not
  guarantee the rendered material keeps that object; mutate an orphan and nothing changes. Every
  custom material here is constructed in `useMemo` and attached with `<primitive>`.
- **Hover state that a hand reads must be self-correcting.** A counter incremented on pointer-over
  and decremented on pointer-out drifts the first time a hovered panel unmounts; the ray then stays
  lit forever. Each panel remembers whether *it* is hovered and cleans up after itself.
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

- Initial JS ≤ 300KB gzipped. Currently **194KB** for the editor, **173KB** for flat mode.
- three + R3F + drei + the scene (~299KB gz) is a deferred chunk that arrives into the viewport
  while the editor chrome is already interactive. Audio adds nothing: it is synthesised.
- Flat mode ships zero WebGL, verified against the built output.
- One light in the whole site — the desk lamp — and it unmounts with the desk. The environment is
  all emissive glass; no shadow maps anywhere.
- The lens pass is a single extra full-screen fragment pass, off on coarse-pointer devices.
- The courtroom preview renders only while its station is on screen, at 768×432.
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
| `npm run shoot` | Screenshot the editor, then Play through the whole arc — including starting hand tracking on Chrome's fake camera — in a real browser |
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
