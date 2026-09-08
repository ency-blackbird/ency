/* One sound at a time on the page.
 *
 * The crate plays audio and the world carousel plays video with sound. Without
 * this they would happily talk over each other — starting either one stops
 * everything else that is making noise. */

const players = new Set();

export function register(player) {
  players.add(player);
  return () => players.delete(player);
}

export function solo(active) {
  for (const p of players) if (p !== active) p.pause();
}
