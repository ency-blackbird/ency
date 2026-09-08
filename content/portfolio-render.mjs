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

/* The deck: one row per track, each its own play control. The audio element is
   shared and swapped by the player script, so only one thing ever sounds. */
function renderArmory({ id, note, art, tracks }) {
  const rows = tracks.map((t, i) => `
      <li class="track" data-src="${esc(t.src)}" data-title="${esc(t.title)}">
        <button class="play" type="button" aria-label="Play ${esc(t.title)}">
          <span class="glyph" aria-hidden="true"></span>
        </button>
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="name">${esc(t.title)}</span>
        <span class="bar" aria-hidden="true"><span class="fill"></span></span>
        <span class="len">${esc(t.length)}</span>
      </li>`).join('');

  return section(id, id, note, `<div class="deck">
      <div class="deck-art">
        <img src="${esc(art)}" alt="ARMORY01 artwork" loading="lazy">
      </div>
      <ol class="tracks">${rows}
      </ol>
    </div>`);
}

/* Reels play muted on sight and loop — texture, not something to sit through. */
function renderReels({ note, items }) {
  const cells = items.map(r => `
      <figure class="reel">
        <video src="${esc(r.src)}" poster="${esc(r.poster)}"
               muted loop playsinline preload="none"></video>
        <figcaption>${esc(r.title)}</figcaption>
      </figure>`).join('');
  return section('reels', 'Transmissions', note, `<div class="reel-grid">${cells}
    </div>`);
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
    renderArmory(p.armory),
    renderReels(p.reels),
    renderTools(p.tools),
    renderUnderway(p.underway),
    `<footer class="pf-foot">
    <a href="${esc(p.contact.href)}">${esc(p.contact.label)}</a>
  </footer>`,
  ].join('\n\n  ');
}
