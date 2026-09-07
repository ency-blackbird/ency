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

  window.encyChrome = function encyChrome(opts) {
    const current = (opts && opts.current) || null;

    const nav = document.createElement('nav');
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

    if (current) { initRouter(); initTilt(); }
  };

  /* ---- soft routing between the interior rooms -----------------------
   * Moving between tools and music swaps <main> instead of loading a
   * document, so the mesh behind it is never torn down and rebuilt — the
   * animation just keeps running. The gate is deliberately excluded: it is a
   * different page with a different mesh (full size, interactive, and owning
   * the join flow), so going there stays a real navigation.
   * Any failure falls through to a normal load. */

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

      cur.replaceWith(next);
      document.title = doc.title;
      if (push) history.pushState({ ency: 1 }, '', path);

      for (const a of document.querySelectorAll('.nav a')) {
        const on = a.getAttribute('href') === path;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
      window.scrollTo(0, 0);
    } catch {
      location.href = path;
    } finally {
      busy = false;
    }
  }

  function initRouter() {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target) return;
      const href = a.getAttribute('href');
      if (!INTERIOR.has(href)) return;          // the gate, and anything off-site
      e.preventDefault();
      if (href !== location.pathname) go(href, true);
    });

    window.addEventListener('popstate', function () {
      if (INTERIOR.has(location.pathname)) go(location.pathname, false);
      else location.reload();                   // back into the gate: real load
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
