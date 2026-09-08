/* One audio element for the whole deck, so two tracks can never sound at once.
 * The rows are server-rendered; this only wires behaviour to them. */

export function initPlayer(root = document) {
  const list = root.querySelector('.tracks');
  if (!list) return;

  const audio = new Audio();
  audio.preload = 'none';
  let current = null;                    // the <li> that owns the audio

  const setRow = (row, state) => row.classList.toggle('playing', state);

  function stop() {
    if (!current) return;
    setRow(current, false);
    current.querySelector('.fill').style.width = '0%';
    current = null;
  }

  function play(row) {
    if (current === row) {               // same row: toggle
      if (audio.paused) audio.play(); else audio.pause();
      setRow(row, !audio.paused);
      return;
    }
    stop();
    current = row;
    audio.src = row.dataset.src;
    audio.play().then(() => setRow(row, true)).catch(() => stop());
  }

  list.addEventListener('click', e => {
    const btn = e.target.closest('.play');
    if (!btn) return;
    play(btn.closest('.track'));
  });

  // scrub by clicking the bar
  list.addEventListener('click', e => {
    const bar = e.target.closest('.bar');
    if (!bar || !current || !bar.closest('.track').isSameNode(current)) return;
    const r = bar.getBoundingClientRect();
    if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  });

  audio.addEventListener('timeupdate', () => {
    if (!current || !audio.duration) return;
    current.querySelector('.fill').style.width =
      (audio.currentTime / audio.duration * 100).toFixed(2) + '%';
  });
  audio.addEventListener('ended', stop);
  audio.addEventListener('pause', () => { if (current) setRow(current, false); });
  audio.addEventListener('play', () => { if (current) setRow(current, true); });
}

/* Reels are texture: muted, looping, and only playing while on screen — four
 * videos decoding at once for no reason is how a portfolio page stutters. */
export function initReels(root = document) {
  const vids = [...root.querySelectorAll('.reel video')];
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
