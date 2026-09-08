/* Entry point for the unlisted portfolio room. No nav and no router: it is not
 * part of the site's map, and nothing should link into or out of it. */

import { initTilt } from '../tilt.js';
import { mountBackdrop } from '../backdrop.js';
import { initPlayer, initReels } from '../player.js';

initTilt();
initPlayer();
initReels();
mountBackdrop(document.getElementById('cv'), document.getElementById('bg'));
