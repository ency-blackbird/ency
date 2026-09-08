/* The chrome every page wears: the corner nav and the links row.
 *
 * One copy of the icon set for the whole site, so a changed handle is a
 * one-line edit rather than a hunt through three files. */

export const PAGES = [
  ['tools', '/tools'],
  ['music', '/music'],
  ['services', '/services'],
];

export const INTERIOR = new Set(PAGES.map(([, href]) => href));

/** Label for a path, or null for the gate. */
export const labelFor = path => (PAGES.find(([, href]) => href === path) || [null])[0];

// [label, href, svg body] — stroke-only marks at the padlock's weight, so they
// sit as quietly over the mesh as the rest of the furniture does
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

function navMarkup(current) {
  // a room gets a way back; the gate is already home
  let html = current
    ? '<a class="back" href="/" aria-label="Back to the gate" title="back">&#8592;</a>'
    : '';
  for (const [label, href] of PAGES) {
    html += `<a href="${href}"${current === label ? ' class="on" aria-current="page"' : ''}>${label}</a>`;
  }
  return html;
}

let navEl = null;

/** Re-render the nav for a section name, or null for the gate. */
export function setNav(current) {
  if (navEl) navEl.innerHTML = navMarkup(current);
}

/** Put the nav and the links row on the page. */
export function mountChrome(current = null) {
  navEl = document.createElement('nav');
  navEl.className = 'nav';
  navEl.setAttribute('aria-label', 'Sections');
  navEl.innerHTML = navMarkup(current);

  const links = document.createElement('nav');
  links.className = 'links';
  links.setAttribute('aria-label', 'Elsewhere');
  links.innerHTML = LINKS.map(([label, href, body]) => {
    const external = !href.startsWith('mailto');
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}` +
           ` aria-label="${label}" title="${label.toLowerCase()}">${svg(body)}</a>`;
  }).join('');

  document.body.append(navEl, links);
}
