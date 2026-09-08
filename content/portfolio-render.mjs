/* Portfolio markup, server-side. Same rule as the rest of content/: the page
 * ships complete, and there is no client-side render path to keep in sync. */

const esc = s => String(s).replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const section = (id, title, note, body) =>
  `<section class="sect" id="${esc(id)}">
    <h2>${esc(title)}</h2>
    <div class="rule"></div>` +
    (note ? `\n    <p class="note">${esc(note)}</p>` : '') +
    `\n    ${body}
  </section>`;

/* The crate. Swiper drives the flip — real drag, momentum, touch and keyboard —
   and the covers are the interface: the front record is the one that plays.
   Server-rendered slides, so the markup is complete before Swiper touches it. */
function renderCrate({ id, note, tracks }) {
  const slides = tracks.map((t, i) => `
        <div class="swiper-slide rec" data-src="${esc(t.src)}"
             data-title="${esc(t.title)}" data-len="${esc(t.length)}"
             data-n="${String(i + 1).padStart(2, '0')}">
          <div class="sleeve">
            <span class="disc" aria-hidden="true"></span>
            <img src="${esc(t.art)}" alt="${esc(t.title)} cover" loading="lazy">
            ${t.artProvisional ? '<span class="prov" title="placeholder cover">art tbd</span>' : ''}
          </div>
        </div>`).join('');

  return section(id, id, note, `<div class="crate">
      <div class="swiper records">
        <div class="swiper-wrapper">${slides}
        </div>
      </div>

      <div class="now">
        <button class="play" type="button" aria-label="Play">
          <span class="glyph" aria-hidden="true"></span>
        </button>
        <span class="n"></span>
        <span class="t"></span>
        <span class="bar"><span class="fill"></span></span>
        <span class="len"></span>
      </div>

      <div class="crate-nav">
        <button class="prev" type="button" aria-label="Previous record">&#8592;</button>
        <button class="next" type="button" aria-label="Next record">&#8594;</button>
      </div>
    </div>`);
}

/* The world: the narrative cuts, in the same crate you flip through. They sit
   on their posters until asked — these are pieces to watch, not wallpaper. */
function renderVisuals(v) {
  const slides = v.reels.map(r => `
          <figure class="swiper-slide vis">
            <div class="frame">
              <video src="${esc(r.src)}" poster="${esc(r.poster)}"
                     loop playsinline preload="none"></video>
              <button class="vplay" type="button" aria-label="Play ${esc(r.title)}">
                <span class="vglyph" aria-hidden="true"></span>
              </button>
            </div>
            <figcaption><span class="vt">${esc(r.title)}</span><span class="vn">${esc(r.note)}</span></figcaption>
          </figure>`).join('');

  return section('visuals', 'The world', null, `<div class="world">
      <p class="world-lede">${esc(v.lede)}</p>
      <p class="world-body">${esc(v.body)}</p>
      <p class="world-arc">${esc(v.arc)}</p>
    </div>

    <div class="screen">
      <div class="swiper reels">
        <div class="swiper-wrapper">${slides}
        </div>
      </div>
      <div class="screen-nav">
        <button class="prev" type="button" aria-label="Previous cut">&#8592;</button>
        <button class="next" type="button" aria-label="Next cut">&#8594;</button>
      </div>
    </div>

    <p class="prov-note">${esc(v.provenance)}</p>`);
}

function renderTools(tools) {
  const cards = tools.map(t => `
      <article class="tool">
        <header>
          <h3>${esc(t.name)}</h3>
          ${t.wip ? '<span class="wip">in progress</span>' : ''}
        </header>
        <p>${esc(t.blurb)}</p>
        ${t.shots.length
          ? `<div class="shots">${t.shots.map(s =>
              `<img src="${esc(s.src)}" alt="${esc(s.alt || '')}" loading="lazy">`).join('')}</div>`
          : '<div class="shots empty" aria-hidden="true"><span>mockups pending</span></div>'}
      </article>`).join('');
  return section('tools', 'Tools', 'Built for the work, and still being built.',
    `<div class="tool-grid">${cards}
    </div>`);
}

function renderUnderway(items) {
  const rows = items.map(i => `
      <li><span class="k">${esc(i.title)}</span><span class="v">${esc(i.body)}</span></li>`).join('');
  return section('underway', 'Underway', null, `<ul class="ledger">${rows}
    </ul>`);
}

export function renderPortfolio(p) {
  const intro = `<header class="pf-head">
    <p class="submission">${esc(p.statement.submission)}</p>
    <h1>${esc(p.statement.lede)}</h1>
    ${p.statement.paragraphs.map(t => `<p class="lede-body">${esc(t)}</p>`).join('\n    ')}
  </header>`;

  return [
    intro,
    renderCrate(p.armory),
    renderVisuals(p.visuals),
    renderTools(p.tools),
    renderUnderway(p.underway),
    `<footer class="pf-foot">
    <a href="${esc(p.contact.href)}">${esc(p.contact.label)}</a>
  </footer>`,
  ].join('\n\n  ');
}
