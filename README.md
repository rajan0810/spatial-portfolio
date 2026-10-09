# An island of the work

A portfolio you walk around.

The site opens on a small island drawn entirely in code — no sprites, no 3D models, no art files.
You control a character; every building is a piece of the work, and the shape of the building tells
you what is inside before you read the sign. A **courthouse** holds the VR courtroom simulator. A
**fire station** holds the fire-safety trainer. A **playhouse** holds the exposure-therapy stage. A
**foundry** holds the mixed-reality factory overlay. Walk to a door, press `E`, and the project
opens as a proper case study.

Twelve places: a cottage (about), a hall of fame (awards and the patent), a workshop (skills), an
academy (work and study), a lighthouse (contact), and seven project buildings.

The island runs on **your** clock. Arrive in the evening and the lamps are lit, the windows are
warm, the lighthouse beam sweeps the water and the clock tower shows your actual local time.

| | |
|---|---|
| **`/`** — the island | Walk it. `WASD`/arrows, shift to run, click the ground to go there, `M` for the map. |
| **`/flat`** — the page | The same content, server-rendered, no canvas. What Google indexes and what a screen reader reads top to bottom. |

## How it is drawn

**The island is a signed distance field.** An ellipse pushed around by two octaves of value noise
gives the coastline; the same field, sampled on a grid, gives collision. The painted terrain and
the walkable terrain come from one source, so they can never disagree. The whole island is rendered
once into an offscreen canvas at half resolution and blitted each frame; everything on top of it —
trees, buildings, the character — is drawn live from paths.

**Depth is one sorted list.** Props, buildings, the fountain and the player all go into the same
array each frame, ordered by the y of whatever they stand on, so you pass behind a tree and in
front of a house without any special cases.

**Night is a pass, not a palette.** The frame is drawn normally, a tint is laid over it, and then
every lamp and doorway is punched back through with `globalCompositeOperation = "lighter"`. Lighting
the scene before darkening it would just make the lights dark too.

```
world/
  Island.tsx     the loop: simulate, sort, draw; all per-frame state in one ref
  terrain.ts     the island SDF, the painted image, the collision grid
  layout.ts      where the twelve places are, the paths between them, the scatter
  draw/          buildings (one silhouette each), props, the character, shared shapes
  camera.ts      follow and clamp · sky.ts  the day/night curve · input.ts  keys, stick, click
  HUD.tsx        prompts, the map, the thumbstick · Panel.tsx  what is inside a building
lib/content/     the actual content: profile, projects, achievements, timeline, skills
lib/data/        the one module both front-ends read
scripts/         shoot (walk it in Chrome), verify (the non-negotiables)
```

## Content, and why there is no database

Content lives in `lib/content` as typed modules, and `lib/data` is the only thing that reads it.

Earlier versions of this site kept content in Postgres so it could be edited without a redeploy.
The database was then deleted out from under the site. A portfolio changes a few times a year, and
a paused free-tier database should never be able to take it down — so the content moved into the
repo, the runtime dependency list dropped to **`next`, `react`, `react-dom`**, and the site now has
nothing to fail. When the admin portal comes back, it slots in behind the same `lib/data` functions,
against a schema written to match those types.

## Budgets

- Initial JS **185 KB** gzipped for the island, **173 KB** for the page. Nothing but the framework.
- **61 fps** with ~2,600 props scattered across the island, measured in the running page.
- Terrain generation is a one-off ~100 ms at load, behind a "drawing the island" state.
- Zero image, font or model assets beyond the two Geist faces.

## Running it

```bash
npm install
npm run dev
```

| | |
|---|---|
| `npm run shoot` | Walks the island in real Chrome at noon and at night, photographing it |
| `npm run verify` | 16 checks: the island generates, the sea stops you, the beach is walkable, every place is reachable, panels carry the real case studies, discovery persists, Tab reaches the skip link, flat mode is canvas-free and fully indexable, no overflow on a phone, and the frame rate holds |

`verify` is where the real bugs have surfaced — including a map shortcut bound to `Tab`, which
silently made the entire site unnavigable by keyboard.

## Next

- Ambient sound: footsteps, a door, gulls. The synthesiser is already in `lib/audio.ts`.
- A minimap in the corner, and footprints in the sand.
- The admin portal, against a live database.
