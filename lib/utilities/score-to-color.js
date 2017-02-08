'use strict';

/**
 * Determine the color of the emberobserver score value. The goal is to
 * try and mimic emberaddon.com's color system.
 *
 * @function scoreToColor
 * @param {Number} score - The emberobserver score for an addon
 * @return {String}
 */
module.exports = function scoreToColor(score) {
  let scoreColor = 'red';

  if (score > 6) {
    scoreColor = 'green';
  }
  else if ([4, 5, 6].indexOf(score) !== -1) {
    scoreColor = 'yellow';
  }

  return scoreColor;
};
