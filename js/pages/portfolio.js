/* Entry point for the unlisted portfolio room. No nav and no router: it is not
 * part of the site's map, and nothing should link into or out of it. */

import { initTilt } from '../tilt.js';
import { mountBackdrop } from '../backdrop.js';
import { initCrate } from '../crate.js';
import { initScreen } from '../screen.js';

initTilt();
initCrate();
initScreen();
mountBackdrop(document.getElementById('cv'), document.getElementById('bg'));
