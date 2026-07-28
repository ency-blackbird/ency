# ency

Artist project site. The page is the mesh: a parametric Möbius ribbon rasterized
live into a character grid, which resolves into the arc mark. An email field for
updates, and a lock that opens the studio.

No build step, no dependencies. `npm start` and open the port.

## Layout

| file | what |
|---|---|
| `server.mjs` | the whole backend — static, preset, email capture, auth |
| `ribbon.js` | the renderer, shared by both pages |
| `index.html` | public: fullscreen mesh, email field, lock |
| `studio.html` | gated: the same mesh plus every dial, and publish |
| `mark.svg` | the mark (also embedded in `ribbon.js` as `LOGO_D`) |

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

## Environment

| var | required | notes |
|---|---|---|
| `ADMIN_PASSWORD` | yes | studio is closed if unset |
| `SESSION_SECRET` | yes | random per boot if unset, which drops sessions on restart |
| `DATA_DIR` | prod | `/data` on Railway; defaults to `./data` locally |
| `PORT` | no | defaults to 4720 |

## Data

Two files under `DATA_DIR`:

- `emails.jsonl` — one `{email, ts}` per line, append-only
- `preset.json` — the published mesh settings

Deduped case-insensitively via a `Set` loaded at boot. Emails are never logged,
only written.

**This is deliberately the smallest thing that works.** Move to Postgres when you
want dedupe or analytics across more than one instance, or when the file passes a
few thousand lines. Note that a volume means a single writer: scaling the service
to two instances would interleave writes.

## Security

- password compared with `timingSafeEqual` over SHA-256 digests, so neither the
  content nor the length leaks through timing
- session cookie is `exp.HMAC(exp)` — HttpOnly, SameSite=Strict, `Secure` when
  `x-forwarded-proto` says https
- rate limits: 8 unlock attempts / 15 min, 5 subscribes / min, per IP. In memory,
  so they reset on redeploy — the password is the real control, keep it long.
