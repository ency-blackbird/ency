/* The chrome every page wears: the corner nav and the links row, plus the
 * behaviour the interior pages share.
 *
 * One copy of the icon set, injected into all three pages, so a changed
 * handle is a one-line edit rather than a hunt through three files.
 *
 *   encyChrome()                     -> the gate: nav, no way "back"
 *   encyChrome({ current: 'tools' }) -> an interior page: back arrow on top,
 *                                       soft routing between rooms, card tilt
 */

(function () {
  'use strict';

  const PAGES = [
    ['tools', '/tools'],
    ['music', '/music'],
  ];
  const INTERIOR = new Set(PAGES.map(p => p[1]));

  // [label, href, svg body] — stroke-only marks at the padlock's weight, so
  // they sit as quietly over the mesh as the rest of the furniture does
  const LINKS = [
    ['Instagram', 'https://instagram.com/en.cy_',
      '<rect x="3" y="3" width="18" height="18" rx="5"></rect>' +
      '<circle cx="12" cy="12" r="4"></circle>' +
      '<circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none"></circle>'],
    ['TikTok', 'https://www.tiktok.com/@en.cy_',
      '<path d="M14.4 3v10.6a4.2 4.2 0 1 1-3.1-4.06"></path>' +
      '<path d="M14.4 3c.35 2.4 2.05 4.1 4.45 4.45"></path>'],
    ['SoundCloud', 'https://soundcloud.com/encymusic',
      '<path d="M3 14.4v3.1"></path><path d="M6.4 12.1v5.4"></path>' +
      '<path d="M9.8 9.6v7.9"></path>' +
      '<path d="M13.2 17.5V8.5c2.4.3 4.2 2.2 4.4 4.6h.6a2.2 2.2 0 0 1 0 4.4z"></path>'],
    ['Email', 'mailto:noah@ency.world',
      '<rect x="2.5" y="5" width="19" height="14" rx="2.5"></rect>' +
      '<path d="M3.2 7.2 12 13.2l8.8-6"></path>'],
  ];

  const reduced = window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = body =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';

  function navMarkup(current) {
    // interior pages get a way back; the gate is already home
    let html = current
      ? '<a class="back" href="/" aria-label="Back to the gate" title="back">&#8592;</a>'
      : '';
    for (const [label, href] of PAGES) {
      html += '<a href="' + href + '"' +
              (current === label ? ' class="on" aria-current="page"' : '') +
              '>' + label + '</a>';
    }
    return html;
  }

  let navEl = null;

  function setNav(current) {
    if (navEl) navEl.innerHTML = navMarkup(current);
  }

  window.encyChrome = function encyChrome(opts) {
    const current = (opts && opts.current) || null;

    const nav = navEl = document.createElement('nav');
    nav.className = 'nav';
    nav.setAttribute('aria-label', 'Sections');
    nav.innerHTML = navMarkup(current);

    const links = document.createElement('nav');
    links.className = 'links';
    links.setAttribute('aria-label', 'Elsewhere');
    links.innerHTML = LINKS.map(([label, href, body]) => {
      const external = href.slice(0, 6) !== 'mailto';
      return '<a href="' + href + '"' +
             (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
             ' aria-label="' + label + '" title="' + label.toLowerCase() + '">' +
             svg(body) + '</a>';
    }).join('');

    document.body.appendChild(nav);
    document.body.appendChild(links);

    // the gate runs the router too — it is the shell the rooms open inside
    initRouter();
    initTilt();
  };

  /* ---- soft routing ---------------------------------------------------
   * No navigation between the gate and the rooms, or between the rooms, is a
   * document load — so the canvas is never torn down and the mesh never
   * restarts. The gate is the shell: opening a room fills its <main> and
   * demotes its mesh (the blur/dim/half-rate move bootLobby already makes);
   * closing one puts the gate's furniture back. A room loaded directly is a
   * standalone page with its own backdrop, and its back arrow is a real
   * navigation home. Any failure falls through to a normal load. */

  let busy = false;

  async function go(path, push) {
    if (busy) return;
    busy = true;
    try {
      const r = await fetch(path, { headers: { accept: 'text/html' } });
      if (!r.ok) { location.href = path; return; }
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const next = doc.querySelector('main');
      const cur = document.querySelector('main');
      if (!next || !cur) { location.href = path; return; }

      cur.innerHTML = next.innerHTML;
      cur.hidden = false;
      document.title = doc.title;
      if (push) history.pushState({ ency: 1 }, '', path);

      setNav(path === '/tools' ? 'tools' : 'music');
      window.scrollTo(0, 0);
    } catch {
      location.href = path;
    } finally {
      busy = false;
    }
  }

  const roomOpen = () => {
    const m = document.querySelector('main');
    return !!m && !m.hidden;
  };

  function enterRoom(path, push) {
    // demote only on the way in; room-to-room leaves the mesh alone
    if (window.encyGate && !roomOpen()) window.encyGate.demote();
    return go(path, push);
  }

  function leaveRoom(push) {
    const m = document.querySelector('main');
    if (m) { m.hidden = true; m.innerHTML = ''; }
    if (window.encyGate) window.encyGate.restore();
    setNav(null);
    document.title = 'ency';
    if (push) history.pushState({ ency: 1 }, '', '/');
    window.scrollTo(0, 0);
  }

  function initRouter() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target) return;
      const href = a.getAttribute('href');

      if (INTERIOR.has(href)) {
        // on the shell, before the gate script has finished booting, there is
        // nothing to demote yet — let the browser do a real navigation
        if (document.getElementById('room') && !window.encyGate) return;
        e.preventDefault();
        if (href !== location.pathname) enterRoom(href, true);
        return;
      }
      // on the shell the back arrow closes the room; on a directly-loaded
      // room there is no gate underneath, so let it navigate for real
      if (href === '/' && window.encyGate && roomOpen()) {
        e.preventDefault();
        leaveRoom(true);
      }
    });

    window.addEventListener('popstate', function () {
      const p = location.pathname;
      if (INTERIOR.has(p)) enterRoom(p, false);
      else if (window.encyGate) leaveRoom(false);
      else location.reload();
    });
  }

  /* ---- the cards lean toward the cursor ---------------------------- */

  function initTilt() {
    if (reduced) return;

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      const card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        'rotateX(' + (-py * 6.5).toFixed(2) + 'deg) ' +
        'rotateY(' + (px * 8).toFixed(2) + 'deg) translateZ(8px)';
    }, { passive: true });

    // pointerout fires moving between children too — only settle on real exits
    document.addEventListener('pointerout', function (e) {
      const card = e.target.closest && e.target.closest('.card');
      if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
    }, { passive: true });
  }

  /* ---- the mesh, demoted to backdrop -------------------------------
   * The same demotion the lobby performs: blurred, dimmed, half rate, deaf to
   * the mouse. Wrapped in try/catch for the reason the gate wraps it: a
   * zero-size first layout must not take the page down with it. */

  window.encyBackdrop = async function encyBackdrop(canvas, container) {
    let preset = null;
    try {
      const r = await Promise.race([
        fetch('/api/preset', { headers: { accept: 'application/json' } }),
        new Promise(res => setTimeout(() => res(null), 1500)),
      ]);
      if (r && r.ok) preset = (await r.json()).preset;
    } catch { /* defaults are fine back here */ }

    try {
      const ribbon = createRibbon({
        canvas, container,
        state: Object.assign({}, preset || {}, { scale: 0.5 }),
        skipIntro: true,          // it is scenery; it should already be formed
      });
      ribbon.setState({ mouse: 0 });
      ribbon.setPace(2);          // blurred anyway — half rate is invisible
      return ribbon;
    } catch (err) {
      console.warn('backdrop deferred:', err.message);
      return null;
    }
  };
})();
