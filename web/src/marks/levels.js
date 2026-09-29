// A felt score as a 0..1 "how good" level for the marks (fullness + brightness),
// read off the app's intensity ladder (scoreOpacity) so marks and fills agree.
import { scoreOpacity, INTENSITY } from "../lib/senses.js";

const LO = INTENSITY[0], HI = INTENSITY[INTENSITY.length - 1];
export const levelOf = (v) => Math.max(0, Math.min(1, (scoreOpacity(v) - LO) / (HI - LO)));
