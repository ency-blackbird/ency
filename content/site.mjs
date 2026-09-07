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
