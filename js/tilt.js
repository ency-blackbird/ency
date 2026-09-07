/* Cards lean toward the cursor. Delegated, so cards the router swaps in are
 * live without rebinding. Sits still for touch and for reduced motion. */

const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function initTilt() {
  if (reduced) return;

  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const card = e.target.closest?.('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform =
      `rotateX(${(-py * 6.5).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateZ(8px)`;
  }, { passive: true });

  // pointerout also fires moving between a card's children — settle only on
  // a real exit
  document.addEventListener('pointerout', e => {
    const card = e.target.closest?.('.card');
    if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
  }, { passive: true });
}
