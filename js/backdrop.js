/* The mesh as scenery, for a room loaded directly with no gate underneath.
 *
 * Same demotion the lobby performs: blurred, dimmed, half rate, deaf to the
 * mouse, and at half scale so it reads as a motif rather than a wall.
 *
 * `createRibbon` is a global from js/vendor/ribbon.js, which is a classic
 * script rather than a module — it is vendored from the artifact and is
 * deliberately left alone. */

export async function mountBackdrop(canvas, container) {
  let preset = null;
  try {
    const res = await Promise.race([
      fetch('/api/preset', { headers: { accept: 'application/json' } }),
      new Promise(r => setTimeout(() => r(null), 1500)),
    ]);
    if (res && res.ok) preset = (await res.json()).preset;
  } catch { /* defaults are fine back here */ }

  // try/catch for the reason the gate wraps it: a zero-size first layout
  // (hidden tab, restored session) must not take the page down with it
  try {
    const ribbon = createRibbon({
      canvas, container,
      state: { ...(preset || {}), scale: 0.5 },
      skipIntro: true,        // it is scenery; it should already be formed
    });
    ribbon.setState({ mouse: 0 });
    ribbon.setPace(2);
    return ribbon;
  } catch (err) {
    console.warn('backdrop deferred:', err.message);
    return null;
  }
}
