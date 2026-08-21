/* lobby.js — the room behind sarang.
 *
 * Two pieces, both drawn from the mesh's own materials (same character ramp,
 * same monospace, same ink-on-paper, and the holo math ported straight from
 * ribbon.js so any flash of color is the site's actual iridescence):
 *
 *   createWormhole(opts, onDone)  the beam-in: the mesh's characters collapse
 *                                 into a spiral tunnel, your digits fly in
 *                                 first — then the whole tunnel collapses
 *                                 into the little lobby panel.
 *
 *   createLobby(opts)             a small HUD-minimap window, centered, with
 *                                 the mesh playing on behind it. Grayscale,
 *                                 one tiny pixel body per phone number; yours
 *                                 is the white one with the heading wedge.
 *                                 New numbers pop in live off
 *                                 /api/lobby/stream.
 *
 * Holo restraint is deliberate: it fires on joins, on the odd ambient glint,
 * and nowhere else. Everything else in here is grays.
 */
(function (global) {
  'use strict';

  var RAMP = ' .·:-=+*ox%#@';
  var MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

  // ---- holo: wavelength→rgb + summed diffraction orders, desaturated to
  // 0.62 — lifted from ribbon.js so this is the same rainbow, not a hue cycle
  function wl2rgb(w) {
    var r, g, b;
    if      (w < 440) { r = (440 - w) / 60; g = 0; b = 1; }
    else if (w < 490) { r = 0; g = (w - 440) / 50; b = 1; }
    else if (w < 510) { r = 0; g = 1; b = (510 - w) / 20; }
    else if (w < 580) { r = (w - 510) / 70; g = 1; b = 0; }
    else if (w < 645) { r = 1; g = (645 - w) / 65; b = 0; }
    else              { r = 1; g = 0; b = 0; }
    var a = 1;
    if (w < 420) a = 0.3 + 0.7 * (w - 380) / 40;
    if (w > 700) a = 0.3 + 0.7 * (780 - w) / 80;
    function cl(v) { return Math.max(0, Math.min(1, v)) * a; }
    return [cl(r), cl(g), cl(b)];
  }

  function holoRGB(u, v, t) {
    var sd = Math.sin(u * 5.1 + v * 8.3 + (t || 0) * 0.6) * 0.9;
    var r = 0, g = 0, b = 0;
    for (var mo = 1; mo <= 3; mo++) {
      var w = 1600 * Math.abs(sd) / mo;
      if (w > 380 && w < 780) { var c = wl2rgb(w), k = 1.3 / mo; r += c[0]*k; g += c[1]*k; b += c[2]*k; }
    }
    var mx = Math.max(r, g, b, 1); r /= mx; g /= mx; b /= mx;
    var lum = r*0.2126 + g*0.7152 + b*0.0722, SAT = 0.62;
    r = lum + (r-lum)*SAT; g = lum + (g-lum)*SAT; b = lum + (b-lum)*SAT;
    return [(r*255)|0, (g*255)|0, (b*255)|0];
  }

  function holoCss(u, v, t, a) {
    var c = holoRGB(u, v, t);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ==================================================== wormhole ==== */

  function createWormhole(opts, onDone) {
    var reduced = !!opts.reduced;
    var text = String(opts.text || '');
    var from = opts.fromRect || null;

    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight);
    cv.width = vw * dpr; cv.height = vh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var CX = vw / 2, CY = vh / 2;
    var R0 = Math.min(vw, vh) * 0.2;
    var DUR = reduced ? 900 : 2700;

    // the collapsing swarm: mesh-flavored characters pulled off the page into
    // the ring — they orbit tighter as they fall in
    var N = reduced ? 0 : 240;
    var swarm = [];
    for (var i = 0; i < N; i++) {
      swarm.push({
        r: rand(R0 * 1.6, Math.hypot(vw, vh) * 0.62),
        a: rand(0, Math.PI * 2),
        spin: rand(1.6, 3.4) * (Math.random() < 0.5 ? -1 : 1),
        fall: rand(0.55, 1),
        ch: RAMP[3 + ((Math.random() * 6) | 0)],
      });
    }

    // your digits, flying from the field into the hole first
    var digits = [];
    if (from && text && !reduced) {
      var adv = Math.min(11, (from.width - 8) / Math.max(1, text.length));
      for (var d = 0; d < text.length; d++) {
        digits.push({
          x: from.left + 10 + d * adv,
          y: from.top + from.height / 2,
          ch: text[d],
          delay: d * 26,
        });
      }
    }

    var t0 = performance.now();
    var done = false;

    function frame(now) {
      if (done) return;
      var t = (now - t0) / DUR;                    // 0..1 over the whole beam
      if (t >= 1) { finish(); return; }
      ctx.clearRect(0, 0, vw, vh);

      if (reduced) {                               // reduced motion: a plain iris
        var rr = Math.hypot(vw, vh) * 0.6 * (1 - t);
        ctx.fillStyle = '#161616';
        ctx.beginPath(); ctx.arc(CX, CY, Math.max(0, rr), 0, 7); ctx.fill();
        requestAnimationFrame(frame);
        return;
      }

      var shake = t > 0.35 ? Math.min(1, (t - 0.35) / 0.4) * 2.4 : 0;
      ctx.save();
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
      ctx.font = '13px ' + MONO;
      ctx.textAlign = 'center';

      // the hole itself: opens from nothing, darker than the paper
      var hole = Math.min(1, t / 0.3);
      var holeR = R0 * 0.55 * hole * (1 + Math.max(0, t - 0.55) * 6);
      ctx.fillStyle = '#141414';
      ctx.beginPath(); ctx.arc(CX, CY, holeR, 0, 7); ctx.fill();

      // swarm collapsing into orbit
      for (var i = 0; i < swarm.length; i++) {
        var s = swarm[i];
        var p = Math.min(1, t / (0.85 * s.fall + 0.15));
        var ease = 1 - Math.pow(1 - p, 2.6);
        var r = s.r + (R0 - s.r) * ease;
        var a = s.a + s.spin * t * (1 + ease * 2.2);
        var x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.86;
        var k = Math.round((1 - ease * 0.75) * (RAMP.length - 1));
        ctx.fillStyle = 'rgba(192,192,192,' + (0.16 + ease * 0.5) + ')';
        ctx.fillText(RAMP[Math.max(2, k)], x, y);
      }

      // tunnel rings, once the throat is open: they sweep outward past the
      // edges, which is what reads as falling in
      if (t > 0.32) {
        var tt = (t - 0.32) / 0.68;
        var zoom = 1 + tt * tt * 5.5;
        for (var ring = 0; ring < 9; ring++) {
          var z = ((ring / 9) + tt * 1.7) % 1;      // depth cycles toward the eye
          var rr2 = R0 * (0.3 + z * 2.4) * zoom * 0.5;
          if (rr2 > Math.hypot(vw, vh) * 0.75) continue;
          var m = 10 + ((rr2 / 26) | 0) * 4;
          var rot = tt * 3 * (ring % 2 ? 1 : -1) + ring;
          var depthA = Math.max(0, 0.75 - z * 0.65) * Math.min(1, tt * 3);
          var ch = RAMP[Math.max(3, Math.round((1 - z) * (RAMP.length - 1)))];
          for (var q = 0; q < m; q++) {
            var ang = (q / m) * Math.PI * 2 + rot;
            var x2 = CX + Math.cos(ang) * rr2, y2 = CY + Math.sin(ang) * rr2 * 0.86;
            // restraint: one or two chars per ring catch the diffraction
            if (q === (ring * 3) % m && z < 0.4) {
              ctx.fillStyle = holoCss(x2 / vw, y2 / vh, now / 1000, depthA);
            } else {
              ctx.fillStyle = 'rgba(192,192,192,' + depthA + ')';
            }
            ctx.fillText(ch, x2, y2);
          }
        }
      }

      // your digits spiral in ahead of you
      ctx.font = '12px ' + MONO;
      for (var d2 = 0; d2 < digits.length; d2++) {
        var dg = digits[d2];
        var pd = Math.min(1, Math.max(0, (now - t0 - dg.delay) / 1100));
        if (pd >= 1) continue;
        var ez = 1 - Math.pow(1 - pd, 2.2);
        var curl = Math.sin(pd * Math.PI) * 60 * (d2 % 2 ? 1 : -1);
        var xx = dg.x + (CX - dg.x) * ez + Math.cos(pd * 6 + d2) * curl * (1 - ez);
        var yy = dg.y + (CY - dg.y) * ez + Math.sin(pd * 6 + d2) * curl * 0.5 * (1 - ez);
        var kk = Math.round((1 - ez) * (RAMP.length - 1));
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - ez * 0.7) + ')';
        ctx.fillText(pd < 0.25 ? dg.ch : RAMP[Math.max(1, kk)], xx, yy);
      }

      ctx.restore();
      requestAnimationFrame(frame);
    }

    // The landing: onDone builds the lobby panel and hands it back, and the
    // whole tunnel collapses into it — you arrive inside the small thing.
    function finish() {
      if (done) return;
      done = true;
      var panel = onDone ? onDone() : null;
      if (panel && panel.getBoundingClientRect && !reduced) {
        var r = panel.getBoundingClientRect();
        var s = Math.max(0.08, r.width / vw);
        cv.style.transformOrigin = '0 0';
        cv.style.transition = 'transform 560ms cubic-bezier(0.5, 0, 0.2, 1), opacity 560ms ease';
        var tx = r.left + r.width / 2 - (vw / 2) * s;
        var ty = r.top + r.height / 2 - (vh / 2) * s;
        cv.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
        cv.style.opacity = '0';
        setTimeout(function () { cv.remove(); }, 620);
      } else {
        cv.style.transition = 'opacity 500ms ease';
        cv.style.opacity = '0';
        setTimeout(function () { cv.remove(); }, 550);
      }
    }

    requestAnimationFrame(frame);
    // rAF stalls in hidden tabs — if someone backgrounds mid-beam, land them
    // anyway so the lobby is there when they come back
    setTimeout(finish, DUR + 500);
    return { cancel: finish };
  }

  /* ==================================================== lobby ==== */
  //
  // A small fixed panel, bottom-left — the mesh stays the page. Fixed 24x14
  // tile world at 10px per tile internally (240x140), scaled by CSS with
  // pixelated rendering, exactly like the approved mock.

  function createLobby(opts) {
    opts = opts || {};
    var reduced = !!opts.reduced;
    var streamUrl = opts.stream || '/api/lobby/stream';
    var W = 24, H = 14, S = 10;
    var PAD = { x: 12.5, y: 8.5 };
    var RENDER_CAP = 150;             // bodies drawn; the counter is always true

    // ---- the floor plan: a main hall with two side rooms off it, carved
    // into a tile mask so nothing has to be an exact box
    var FLOOR = new Uint8Array(W * H);
    function carve(x0, y0, x1, y1) {
      for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) FLOOR[y * W + x] = 1;
    }
    carve(5, 3, 20, 13);    // main hall
    carve(1, 6, 4, 12);     // left room
    carve(2, 5, 4, 6);      //   its top notch
    carve(4, 8, 5, 10);     //   doorway
    carve(21, 4, 23, 9);    // right room
    carve(21, 9, 22, 11);   //   its lower leg
    carve(20, 5, 21, 7);    //   doorway

    var floorTiles = [];
    for (var fy = 0; fy < H; fy++) for (var fx = 0; fx < W; fx++)
      if (FLOOR[fy * W + fx]) floorTiles.push({ x: fx + 0.5, y: fy + 0.5 });
    function anyTile(filter) {
      var t, guard = 0;
      do { t = floorTiles[(Math.random() * floorTiles.length) | 0]; } while (filter && !filter(t) && ++guard < 40);
      return t;
    }

    function walkable(x, y) {
      var gx = x | 0, gy = y | 0;
      if (x < 0 || gx >= W || y < 0 || gy >= H) return false;
      return !!FLOOR[gy * W + gx];
    }
    function canStand(x, y) {
      return walkable(x - 0.25, y) && walkable(x + 0.25, y) &&
             walkable(x, y - 0.2) && walkable(x, y + 0.15);
    }

    // rooms + doorways: two-leg waypoint routing instead of pathfinding
    var DOOR_L = { x: 4.5, y: 9 }, DOOR_R = { x: 20.5, y: 6 };
    function roomOf(x) { var gx = x | 0; return gx <= 3 ? 1 : gx >= 21 ? 2 : 0; }
    function routeTo(c, tx, ty) {
      c.tx = tx; c.ty = ty; c.wp = [];
      var a = roomOf(c.x), b = roomOf(tx);
      if (a === b) return;
      if (a === 1 || b === 1) c.wp.push(DOOR_L);
      if (a === 2 || b === 2) c.wp.push(DOOR_R);
      if (a === 2) c.wp.reverse();   // leaving the right room, its door comes first
    }

    // ---- dom: one small window, centered — the blurred mesh plays behind it
    var panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;' +
      'width:min(400px, 86vw);aspect-ratio:12/7;border-radius:16px;overflow:hidden;' +
      'border:1px solid rgba(255,255,255,0.13);background:#1c1c1c;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,0.1), 0 26px 64px rgba(0,0,0,0.5);' +
      'opacity:0;transition:opacity 700ms ease;' +
      'touch-action:none;user-select:none;-webkit-user-select:none;';
    document.body.appendChild(panel);

    var cv = document.createElement('canvas');
    cv.width = W * S; cv.height = H * S;
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;' +
      'image-rendering:pixelated;image-rendering:crisp-edges;';
    panel.appendChild(cv);
    var ctx = cv.getContext('2d');

    var plate = document.createElement('div');
    plate.style.cssText = 'position:absolute;top:7px;left:7px;' +
      'font:9px/1 ' + MONO + ';letter-spacing:0.18em;color:#d0d0d0;' +
      'background:#2a2a2a;border:1px solid #454545;border-radius:2px;' +
      'padding:5px 7px 4px;box-shadow:1px 1px 0 rgba(0,0,0,0.45);pointer-events:none;';
    plate.textContent = '— aboard';
    panel.appendChild(plate);

    // ---- population
    var SHADES = ['#8a8a8a', '#9a9a9a', '#aaaaaa', '#7c7c7c', '#b4b4b4'];
    function makeChar(x, y, isYou) {
      return {
        x: x, y: y, tx: x, ty: y, wp: [], you: !!isYou,
        shade: SHADES[(Math.random() * SHADES.length) | 0],
        pause: rand(0.5, 3), speed: rand(1.1, 1.9),
        moving: false, face: 1,
      };
    }

    var chars = [];
    var you = makeChar(PAD.x, PAD.y, true);
    chars.push(you);

    var count = Math.max(1, opts.count | 0);
    var rings = [], floats = [], glints = [];

    function syncCount(n, celebrate) {
      var prev = count;
      count = Math.max(1, n | 0);
      plate.textContent = count + ' aboard';
      while (chars.length < Math.min(count, RENDER_CAP)) {
        var t = anyTile();
        var x = t.x + rand(-0.15, 0.15), y = t.y + rand(-0.15, 0.15);
        var c = makeChar(x, y, false);
        c.pause = 1.4;
        chars.push(c);
        if (celebrate && count > prev) {
          rings.push({ x: x, y: y, t: 0 });
          floats.push({ x: x, y: y - 1.2, t: 0 });
        }
      }
    }
    syncCount(count, false);

    // ---- input: tap inside the map, or arrows/wasd anywhere
    var keys = {};
    function onKeyDown(e) {
      if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;  // the studio modal types here
      var k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].indexOf(k) >= 0) {
        keys[k] = true; e.preventDefault();
      }
    }
    function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);

    function onPointerDown(e) {
      var r = panel.getBoundingClientRect();
      var tx = (e.clientX - r.left) / r.width * W;
      var ty = (e.clientY - r.top) / r.height * H;
      if (!walkable(tx, ty)) {           // tapped a wall or the void → nearest floor
        var best = null, bd = 1e9;
        for (var i = 0; i < floorTiles.length; i++) {
          var ft = floorTiles[i], dd = (ft.x - tx) * (ft.x - tx) + (ft.y - ty) * (ft.y - ty);
          if (dd < bd) { bd = dd; best = ft; }
        }
        tx = best.x; ty = best.y;
      }
      routeTo(you, tx, ty);
    }
    panel.addEventListener('pointerdown', onPointerDown);

    // ---- live joins
    var es = null;
    if ('EventSource' in window) {
      es = new EventSource(streamUrl);
      es.onmessage = function (ev) {
        try {
          var n = JSON.parse(ev.data).count;
          if (typeof n === 'number') syncCount(n, true);
        } catch { /* ignore a torn frame */ }
      };
    }

    // ---- sim + draw
    var glintTimer = rand(8, 20);
    var simT = 0, last = performance.now(), raf = 0, alive = true;

    // walk toward the current waypoint (or the target), sliding along walls;
    // returns false once fully arrived
    function stepMove(c, dt, speed) {
      var t = c.wp.length ? c.wp[0] : null;
      var tx = t ? t.x : c.tx, ty = t ? t.y : c.ty;
      var dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      if (d < 0.12) {
        if (t) { c.wp.shift(); return true; }
        c.moving = false; return false;
      }
      var nx = c.x + dx / d * speed * dt, ny = c.y + dy / d * speed * dt;
      if (canStand(nx, c.y)) c.x = nx;
      if (canStand(c.x, ny)) c.y = ny;
      c.moving = true; if (Math.abs(dx) > 0.02) c.face = dx > 0 ? 1 : -1;
      return true;
    }

    function step(dt) {
      simT += dt;

      var vx = 0, vy = 0;
      if (keys['arrowleft'] || keys['a']) vx -= 1;
      if (keys['arrowright'] || keys['d']) vx += 1;
      if (keys['arrowup'] || keys['w']) vy -= 1;
      if (keys['arrowdown'] || keys['s']) vy += 1;
      if (vx || vy) {
        var n = Math.max(1, Math.hypot(vx, vy));
        var nx = you.x + vx / n * 4.4 * dt, ny = you.y + vy / n * 4.4 * dt;
        if (canStand(nx, you.y)) you.x = nx;
        if (canStand(you.x, ny)) you.y = ny;
        you.tx = you.x; you.ty = you.y; you.wp = [];
        you.moving = true; if (vx) you.face = vx > 0 ? 1 : -1;
      } else {
        stepMove(you, dt, 4.4);
      }

      for (var i = 1; i < chars.length; i++) {
        var c = chars[i];
        if (c.pause > 0) { c.pause -= dt; c.moving = false; continue; }
        if (!stepMove(c, dt, c.speed)) {
          c.pause = rand(1.5, 6);
          var t = Math.random() < 0.25
            ? anyTile(function (q) { return q.y < 4.5 && roomOf(q.x) === 0; })  // drift to the consoles
            : anyTile();
          routeTo(c, t.x, t.y);
        }
      }

      glintTimer -= dt;
      if (glintTimer <= 0) {
        glintTimer = rand(8, 20);
        var gt = anyTile();
        glints.push({ x: gt.x, y: gt.y, t: 0 });
      }
      var j;
      for (j = rings.length - 1; j >= 0; j--)  { rings[j].t  += dt; if (rings[j].t  > 1)   rings.splice(j, 1); }
      for (j = floats.length - 1; j >= 0; j--) { floats[j].t += dt; if (floats[j].t > 1.4) floats.splice(j, 1); }
      for (j = glints.length - 1; j >= 0; j--) { glints[j].t += dt; if (glints[j].t > 0.7) glints.splice(j, 1); }
    }

    function draw() {
      var iw = W * S, ih = H * S, gx, gy;
      ctx.fillStyle = '#161616'; ctx.fillRect(0, 0, iw, ih);   // the void

      // the carved floor, then a wall band wherever floor meets void
      ctx.fillStyle = '#202020';
      for (gy = 0; gy < H; gy++) for (gx = 0; gx < W; gx++)
        if (FLOOR[gy * W + gx]) ctx.fillRect(gx * S, gy * S, S, S);
      ctx.fillStyle = '#464646';
      for (gy = 0; gy < H; gy++) for (gx = 0; gx < W; gx++) {
        if (!FLOOR[gy * W + gx]) continue;
        var X = gx * S, Y = gy * S;
        if (!gy || !FLOOR[(gy - 1) * W + gx]) ctx.fillRect(X, Y - 2, S, 2);
        if (gy === H - 1 || !FLOOR[(gy + 1) * W + gx]) ctx.fillRect(X, Y + S, S, 2);
        if (!gx || !FLOOR[gy * W + gx - 1]) ctx.fillRect(X - 2, Y, 2, S);
        if (gx === W - 1 || !FLOOR[gy * W + gx + 1]) ctx.fillRect(X + S, Y, 2, S);
      }

      // three consoles against the hall's top wall. Each unit's dot beeps in
      // the mesh's diffraction colors, one phase apart.
      for (var u = 0; u < 3; u++) {
        var bx = 57 + u * 48;
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(bx, 9, 30, 19);
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(bx + 4, 12, 22, 7);
        ctx.fillStyle = ((simT * 2 + u) | 0) % 3
          ? holoCss(u / 3, 0.2, simT * 0.8 + u * 2.1, 0.95)
          : '#303030';
        ctx.fillRect(bx + 4, 22, 3, 3);
      }

      // the pad: the scar where the wormhole set you down
      ctx.strokeStyle = 'rgba(200,200,200,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(PAD.x * S, PAD.y * S, 11, 0, 7); ctx.stroke();

      // viewport corner brackets
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      var B = 7;
      ctx.fillRect(6, 6, B, 2); ctx.fillRect(6, 6, 2, B);
      ctx.fillRect(iw - 6 - B, 6, B, 2); ctx.fillRect(iw - 8, 6, 2, B);
      ctx.fillRect(6, ih - 8, B, 2); ctx.fillRect(6, ih - 6 - B, 2, B);
      ctx.fillRect(iw - 6 - B, ih - 8, B, 2); ctx.fillRect(iw - 8, ih - 6 - B, 2, B);

      // bodies, back to front
      var sorted = chars.slice().sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < sorted.length; i++) {
        var c = sorted[i];
        var x = Math.round(c.x * S), y = Math.round(c.y * S);
        var f = c.moving && !reduced ? ((simT * 7 + c.x * 3) | 0) % 2 : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillStyle = c.you ? '#ffffff' : c.shade;
        ctx.fillRect(x - 1, y - 4, 2, 3);                       // body
        ctx.fillRect(x - 1, y - 6, 2, 2);                       // head
        if (f) ctx.fillRect(x - 1 + (c.face > 0 ? 1 : -1), y - 1, 1, 1);  // step
        if (c.you) {
          ctx.fillRect(x + (c.face > 0 ? 2 : -3), y - 4, 1, 1); // heading wedge
          if (((simT * 2) | 0) % 2 === 0) ctx.fillRect(x - 1, y - 9, 2, 1);
        }
      }

      // holo, where it's allowed: joins and the rare glint
      for (var r = 0; r < rings.length; r++) {
        var rg = rings[r];
        ctx.strokeStyle = holoCss(rg.x / W, rg.y / H, simT, 1 - rg.t);
        ctx.beginPath(); ctx.arc(rg.x * S, rg.y * S, (reduced ? 8 : rg.t * 22), 0, 7); ctx.stroke();
      }
      for (var g = 0; g < glints.length; g++) {
        var gl = glints[g];
        ctx.fillStyle = holoCss(gl.x / W, gl.y / H, simT, (1 - gl.t / 0.7) * 0.9);
        ctx.fillRect((gl.x * S) | 0, (gl.y * S) | 0, 1, 1);
      }
      ctx.font = '7px ' + MONO; ctx.textAlign = 'center';
      for (var fl = 0; fl < floats.length; fl++) {
        var ff = floats[fl];
        ctx.fillStyle = holoCss(ff.x / W, ff.y / H, simT, 1 - ff.t);
        ctx.fillText('+1', ff.x * S, (ff.y - (reduced ? 0 : ff.t * 1.2)) * S);
      }
    }

    function frame(now) {
      if (!alive) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }

    requestAnimationFrame(function () { panel.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);

    return {
      panel: panel,
      setCount: function (n) { syncCount(n, false); },
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        if (es) es.close();
        removeEventListener('keydown', onKeyDown);
        removeEventListener('keyup', onKeyUp);
        panel.remove();
      },
    };
  }

  global.createWormhole = createWormhole;
  global.createLobby = createLobby;
})(window);
