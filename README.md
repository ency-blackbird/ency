# ency

Artist project site. The page is the mesh: a parametric Möbius ribbon rasterized
live into a character grid, which resolves into the arc mark. Below it, a gate:
say the word (`sarang` unless rotated), leave your number, and you're beamed
through a wormhole into the lobby — a small pixel minimap in the corner where
every number that has ever joined wanders as a tiny body, live. A lock opens
the studio.

No build step, no dependencies. `npm start` and open the port.

## Layout

| file | what |
|---|---|
| `server.mjs` | the whole backend — static, preset, gate/join, lobby stream, auth |
| `ribbon.js` | the mesh renderer, shared by both pages |
| `lobby.js` | the wormhole beam-in + the minimap lobby panel |
| `index.html` | public: fullscreen mesh, the gate → number flow, lock |
| `studio.html` | gated: the same mesh plus every dial, publish, and both lists |
| `mark.svg` | the mark (also embedded in `ribbon.js` as `LOGO_D`) |

## The lobby

One tiny pixel body per phone number, grayscale on the site's ink, with the
mesh's own diffraction rainbow (`wl2rgb` ported from `ribbon.js`) firing only
on joins and the odd glint. Joins arrive live over `/api/lobby/stream` (SSE) —
the stream only ever carries a **count**, never a number. Arrows/WASD or tap
inside the panel to move. A device that has joined once skips the gate
(`localStorage.ency_joined`) and gets the panel on arrival.

No texts are sent yet: numbers are collected into `phones.jsonl` and that's
all. When the first text should go out, register a toll-free number with an
SMS provider (Twilio is the boring, right answer) and wire it then — nothing
in this repo needs to change shape for that.

## The renderer

`ribbon.js` is ported from the **ㄴ + ㅅ — ASCII Ribbon Morph** artifact:
<https://claude.ai/code/artifact/30226fb8-9091-4143-88a1-7a52ceb6c557>

The geometry, z-buffer shading, morph staggering and idle motion are unchanged
from there. Three things differ:

1. it takes a canvas and container instead of reaching for control markup by id,
   so the public page and the studio share one copy;
2. `paper` is part of the state object (it was a CSS variable in the artifact);
3. the focal length is `min(W*0.60, H*0.80)` rather than `W*0.60` — identical at
   the artifact's 4:3 (both 432 at 720×540) but it stops the ribbon overflowing
   on a fullscreen wide viewport.

**This is a copy, not a link.** Fixes made in the artifact do not arrive here.

## Studio

`/studio`, behind the lock on the public page. Every dial from the artifact,
live on the real page, plus **publish** — which writes the current settings as
what the public sees. `revert` returns to the last published state, so you can
explore without committing.

One dial is not from the artifact: **size** (`scale`, 0.4–2×). It multiplies the
ribbon's focal length and the mark's fit by the same factor so they stay in
proportion through the morph. Past roughly 1.4× the mark starts to overlap the
gate field on a laptop viewport.

## Environment

| var | required | notes |
|---|---|---|
| `ADMIN_PASSWORD` | yes | studio is closed if unset |
| `SESSION_SECRET` | yes | random per boot if unset, which drops sessions on restart |
| `GATE_PASSWORD` | no | the fan gate; defaults to `sarang`, set to rotate without a deploy |
| `DATA_DIR` | prod | `/data` on Railway; defaults to `./data` locally |
| `PORT` | no | defaults to 4720 |

## Data

Three files under `DATA_DIR`:

- `emails.jsonl` — one `{email, ts}` per line, append-only (the old list; the
  field is gone from the page but the data and `/api/subscribers` remain)
- `phones.jsonl` — one `{phone, ts}` per line, append-only, E.164-normalized
  (bare US 10-digit gets `+1`)
- `preset.json` — the published mesh settings

Deduped via a `Set` loaded at boot. Emails and numbers are never logged, only
written, and numbers only leave the box through studio-authed `/api/phones`.

**This is deliberately the smallest thing that works.** Move to Postgres when you
want dedupe or analytics across more than one instance, or when the file passes a
few thousand lines. Note that a volume means a single writer: scaling the service
to two instances would interleave writes.

## Security

- password compared with `timingSafeEqual` over SHA-256 digests, so neither the
  content nor the length leaks through timing
- session cookie is `exp.HMAC(exp)` — HttpOnly, SameSite=Strict, `Secure` when
  `x-forwarded-proto` says https
- rate limits: 8 unlock attempts / 15 min, 15 gate attempts / 10 min,
  6 joins / min, 5 subscribes / min, per IP. In memory, so they reset on
  redeploy — the passwords are the real control.
- the SSE lobby stream is public but stateless: count only, capped at 200
  concurrent connections, heartbeat every 25s so proxies keep them open.
