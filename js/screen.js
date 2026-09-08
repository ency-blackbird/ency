/* The world carousel: the narrative cuts, in the same crate you flip through.
 *
 * Deliberately no autoplay. These are pieces to watch, not wallpaper — they sit
 * on their poster until asked, then play with sound and native controls. */

import { register, solo } from './solo.js';

export function initScreen(root = document) {
  const wrap = root.querySelector('.screen');
  if (!wrap || typeof Swiper === 'undefined') return null;

  const slides = [...wrap.querySelectorAll('.vis')];
  if (!slides.length) return null;

  const swiper = new Swiper(wrap.querySelector('.reels'), {
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 18,
    grabCursor: true,
    speed: 520,
    keyboard: { enabled: true },
    navigation: {
      prevEl: wrap.querySelector('.screen-nav .prev'),
      nextEl: wrap.querySelector('.screen-nav .next'),
    },
    a11y: { enabled: true },
  });

  const stopAll = () => stopOthers(null);

  // stop everything except one slide. Flipping away still stops the cut you
  // left (it is no longer the one kept), while a cut we are deliberately
  // starting survives the slideChange that brought it to the front.
  function stopOthers(keep) {
    for (const s of slides) {
      if (s === keep) continue;
      s.querySelector('video').pause();
      s.classList.remove('on');
    }
  }

  const me = { pause: stopAll };
  register(me);

  for (const slide of slides) {
    const video = slide.querySelector('video');
    const btn = slide.querySelector('.vplay');

    btn.addEventListener('click', () => {
      // pressing play plays. If the cut is not at the front, bring it forward
      // and start it in the same gesture — making people click twice is how
      // this read as broken.
      const i = slides.indexOf(slide);
      if (swiper.activeIndex !== i) swiper.slideTo(i);

      if (!video.paused) { video.pause(); return; }

      solo(me);                     // silence the crate before we make noise
      stopOthers(slide);
      video.muted = false;
      video.controls = true;
      slide.classList.add('on');
      video.play().catch(() => slide.classList.remove('on'));
    });

    video.addEventListener('pause', () => slide.classList.remove('on'));
    video.addEventListener('play', () => slide.classList.add('on'));
    video.addEventListener('ended', () => { slide.classList.remove('on'); video.controls = false; });
  }

  // flipping away from a playing cut stops it, same rule as the crate
  swiper.on('slideChange', () => stopOthers(slides[swiper.activeIndex]));

  return { swiper };
}
