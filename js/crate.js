/* The crate: flip through the records, and the one at the front is the one
 * that plays.
 *
 * Swiper (vendored, js/vendor/swiper-bundle.min.js) does the part that is
 * genuinely hard to hand-roll well — drag with momentum, touch, keyboard, and
 * the coverflow transform. Everything about audio is ours, and there is still
 * only one Audio object, so two tracks can never sound at once.
 */

import { register, solo } from './solo.js';

export function initCrate(root = document) {
  const crate = root.querySelector('.crate');
  if (!crate || typeof Swiper === 'undefined') return null;

  const slides = [...crate.querySelectorAll('.rec')];
  if (!slides.length) return null;

  const now = crate.querySelector('.now');
  const btn = now.querySelector('.play');
  const elN = now.querySelector('.n');
  const elT = now.querySelector('.t');
  const elLen = now.querySelector('.len');
  const fill = now.querySelector('.fill');
  const bar = now.querySelector('.bar');

  const audio = new Audio();
  audio.preload = 'none';
  let active = 0;

  // No 3D rotation. Coverflow's rotateY foreshortens a square sleeve into a
  // trapezoid, which stops it reading as a record and dates the whole thing.
  // Depth here is scale and opacity only — the covers stay square.
  const swiper = new Swiper(crate.querySelector('.records'), {
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    spaceBetween: 22,
    initialSlide: 0,
    speed: 560,
    keyboard: { enabled: true },
    navigation: {
      prevEl: crate.querySelector('.crate-nav .prev'),
      nextEl: crate.querySelector('.crate-nav .next'),
    },
    a11y: { enabled: true },
  });

  /* ---- what is at the front ---------------------------------------- */

  function paint() {
    const s = slides[active];
    if (!s) return;
    elN.textContent = s.dataset.n;
    elT.textContent = s.dataset.title;
    elLen.textContent = s.dataset.len;
  }

  function stop() {
    audio.pause();
    crate.classList.remove('playing');
    fill.style.width = '0%';
  }

  function toggle() {
    const s = slides[active];
    if (!s) return;
    const want = s.dataset.src;
    if (audio.src.endsWith(want) && !audio.paused) { audio.pause(); return; }
    if (!audio.src.endsWith(want)) { audio.src = want; fill.style.width = '0%'; }
    audio.play().catch(() => stop());
  }

  swiper.on('slideChange', () => {
    // flipping past a record stops it — the front of the crate is the player
    if (swiper.activeIndex !== active) stop();
    active = swiper.activeIndex;
    paint();
  });

  btn.addEventListener('click', toggle);

  // clicking a record that is not at the front brings it forward instead
  crate.querySelector('.records').addEventListener('click', e => {
    const rec = e.target.closest('.rec');
    if (!rec) return;
    const i = slides.indexOf(rec);
    if (i === -1) return;
    if (i === active) toggle(); else swiper.slideTo(i);
  });

  bar.addEventListener('click', e => {
    if (!audio.duration) return;
    const r = bar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    fill.style.width = (audio.currentTime / audio.duration * 100).toFixed(2) + '%';
  });
  audio.addEventListener('play', () => {
    solo(me);                           // a video with sound must yield to this
    crate.classList.add('playing');
  });
  audio.addEventListener('pause', () => crate.classList.remove('playing'));
  audio.addEventListener('ended', stop);

  const me = { pause: stop };
  register(me);

  paint();
  return { swiper, audio };
}
