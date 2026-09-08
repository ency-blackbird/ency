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
  items: [],
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
