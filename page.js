/* The chrome every page wears: the corner nav and the links row.
 *
 * One copy of the icon set, injected into all three pages, so a changed
 * handle is a one-line edit rather than a hunt through three files.
 *
 *   encyChrome()                  -> the gate: nav without a way "back"
 *   encyChrome({ current: 'tools' }) -> an interior page: nav with ency on top
 */

(function () {
  'use strict';

  const PAGES = [
    ['tools', '/tools'],
    ['music', '/music'],
  ];

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

  const svg = body =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';

  window.encyChrome = function encyChrome(opts) {
    const current = (opts && opts.current) || null;

    const nav = document.createElement('nav');
    nav.className = 'nav';
    nav.setAttribute('aria-label', 'Sections');
    // interior pages get a way back; the gate is already home
    let html = current ? '<a class="home" href="/">ency</a>' : '';
    for (const [label, href] of PAGES) {
      html += '<a href="' + href + '"' + (current === label ? ' class="on" aria-current="page"' : '') +
              '>' + label + '</a>';
    }
    nav.innerHTML = html;

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
  };

  /* The mesh as backdrop on interior pages — the same demotion the lobby
   * performs: blurred, dimmed, half rate, and deaf to the mouse. Wrapped in
   * try/catch for the same reason the gate wraps it: a zero-size first layout
   * must not take the page down with it. */
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
