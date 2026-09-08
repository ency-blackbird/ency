/* Site content, as data. Server-side only — never served to the browser.
 *
 * A section renders one card per slot: an entry from `items` where there is
 * one, a coming-soon placeholder where there is not. Shipping a release means
 * adding to `items` here, not editing markup. */

export const MUSIC_SECTIONS = [
  {
    id: 'ARMORY01',
    slots: 6,
    items: [
      // { title: '…', href: '…', art: '/art/….jpg' }
    ],
  },
];

export const TOOLS = {
  slots: 2,
  wide: true,
  items: [
    { title: 'Cuts', href: '/cuts', art: '/media/cuts/card.png' },
  ],
};

/* Cuts — the Mac app, on its own room off tools. `available` gates the
 * download button: flip it when a signed build is on GitHub. */
export const CUTS = {
  available: false,
  version: '0.3.0',
  download: 'https://github.com/chunbucket/cuts/releases/latest/download/Cuts.dmg',
  source: 'https://github.com/chunbucket/cuts',
  lede: 'A menu bar record player that turns a YouTube link into a FLAC in your sample folder.',
  body:
    'Drag a link from the address bar onto the icon. The record spins while it cuts, ' +
    'then the file is filed with the art, title and source inside. Open the shelf to ' +
    'play it, scrub it, or drag it straight into Ableton.',
  steps: [
    { k: 'drag', v: 'a YouTube link onto the menu bar icon, or the tray that slides in' },
    { k: 'cut',  v: 'yt-dlp pulls the best audio, ffmpeg presses it to FLAC' },
    { k: 'file', v: 'into your cuts folder, with art and the source link embedded' },
  ],
  requires: 'Apple silicon · macOS 14 or later · free · open source',
  network:
    'It talks to YouTube for the cut and to GitHub once a day to see if there is a ' +
    'newer version. Nothing else, and nothing is sent anywhere.',
};

/* Services — offered work, on its own room off the gate. Deliberately thin:
 * no rates, turnaround or credits until they are real. */
export const SERVICES = {
  lede: 'Mixing and mastering, available for booking.',
  body:
    'I master my own records for release and for DJ sets, and I take on work ' +
    'for other artists.',
  items: [
    { name: 'Mixing',    note: 'balance, space, and the low end' },
    { name: 'Mastering', note: 'loud enough for a club, intact on headphones' },
  ],
  cta: { label: 'Enquire', href: 'mailto:noah@ency.world?subject=Mixing%20%2F%20mastering' },
};
