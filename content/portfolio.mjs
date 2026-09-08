/* The portfolio room. Unlisted — reachable only at its own path, never linked
 * from the site, and served with X-Robots-Tag: noindex, nofollow.
 *
 * Everything here is content, not markup. The tools are deliberately marked
 * `wip: true` so they read as in-progress rather than as finished claims;
 * fill in `shots` as the mockups exist and the flag can come off.
 */

export const PORTFOLIO = {
  path: '/ency-portfolio-v1',
  title: 'ency — portfolio',

  /* Noah's own words, kept as written. */
  statement: {
    submission: 'Portfolio submission — Gumroad creators-in-residence',
    lede:
      'I go by Ency, a progressive house and techno producer and DJ based in ' +
      'New York City.',
    paragraphs: [
      'I treat my productions as tools for DJ sets, to fill in the gaps in ' +
      'setlists I build and develop an entirely new sound bridging classic ' +
      'soul sounds with ethereal, futuristic sound design.',

      'I am building a world in which my platform is represented as a ' +
      'spaceship, with supporting DJs, audiences, and collaborators all being ' +
      'included as part of my crew as we travel through space and time to find ' +
      'family and glory.',
    ],
  },

  /* The record. Seven originals, mastered — the centre of the submission. */
  armory: {
    id: 'ARMORY01',
    note: 'Seven originals, mastered. First release schedule runs through the end of the year.',
    art: '/media/art/armory01.jpg',
    tracks: [
      { title: 'Cyclone',  src: '/media/audio/cyclone.mp3',  length: '6:36' },
      { title: 'Destiny',  src: '/media/audio/destiny.mp3',  length: '6:06' },
      { title: 'Jinx',     src: '/media/audio/jinx.mp3',     length: '6:40' },
      { title: 'Rebound',  src: '/media/audio/rebound.mp3',  length: '7:18' },
      { title: 'Sarang',   src: '/media/audio/sarang.mp3',   length: '6:15' },
      { title: 'Sentinel', src: '/media/audio/sentinel.mp3', length: '5:37' },
      { title: 'Solstice', src: '/media/audio/solstice.mp3', length: '7:40' },
    ],
  },

  /* Found footage. Muted, looping, playing on sight — they are texture. */
  reels: {
    note: 'Found footage cut for the release — the world the records live in.',
    items: [
      { title: 'Intro',       src: '/media/reels/intro.mp4',             poster: '/media/reels/intro.jpg' },
      { title: 'Rebound',     src: '/media/reels/rebound.mp4',           poster: '/media/reels/rebound.jpg' },
      { title: 'Rebound — opening', src: '/media/reels/rebound-intro.mp4', poster: '/media/reels/rebound-intro.jpg' },
      { title: 'Transmission 0906', src: '/media/reels/transmission-0906.mp4', poster: '/media/reels/transmission-0906.jpg' },
    ],
  },

  /* Software. Both genuinely in progress — the flag is what keeps this honest. */
  tools: [
    {
      name: 'Cuts',
      wip: true,
      blurb:
        'An app for sharing music links and building a community around what ' +
        'people are actually playing.',
      shots: [],       // add { src, alt } as mockups exist
    },
    {
      name: 'Mastering engine',
      wip: true,
      blurb:
        'A reference-matching mastering tool for emerging producers who want ' +
        'cleaner mixdowns without paying studio rates.',
      shots: [],
    },
  ],

  /* What is already scheduled — evidence rather than intention. */
  underway: [
    {
      title: 'Release schedule',
      body: 'Tracks scheduled through the end of the year.',
    },
    {
      title: 'November release party',
      body: 'Debuting the tracks in the context of a live mix.',
    },
    {
      title: 'Dance class series',
      body:
        'A class concept incorporating a live house choreographer and DJ, to ' +
        'educate the New York City community about the origins of house music ' +
        'and the foundational principles of PLUR underpinning electronic music.',
    },
  ],

  contact: { label: 'noah@ency.world', href: 'mailto:noah@ency.world' },
};
