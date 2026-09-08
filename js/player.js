/* Video behaviour for the portfolio. Audio lives in crate.js. */

/* Reels are texture: muted, looping, and only playing while on screen — four
 * videos decoding at once for no reason is how a portfolio page stutters. */
export function initReels(root = document) {
  const vids = [...root.querySelectorAll('.reel video, .vis video')];
  if (!vids.length) return;

  if (!('IntersectionObserver' in window)) { vids.forEach(v => v.play().catch(() => {})); return; }

  const start = () => {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        const v = en.target;
        if (en.isIntersecting && en.intersectionRatio >= 0.2) {
          v.preload = 'auto';
          v.play().catch(() => {});          // a refused autoplay just leaves the poster
        } else {
          v.pause();
        }
      }
    }, { threshold: [0, 0.2, 0.6] });
    vids.forEach(v => io.observe(v));
  };

  // Wait for layout before observing. Ahead of load the artwork has no box, the
  // page collapses, and every reel reports as on-screen — which starts all four
  // decoding at once, the exact thing this is here to avoid.
  if (document.readyState === 'complete') requestAnimationFrame(start);
  else addEventListener('load', () => requestAnimationFrame(start), { once: true });
}
