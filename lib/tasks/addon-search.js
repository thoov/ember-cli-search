'use strict';

const RSVP = require('rsvp');
const chalk = require('chalk');
const Task = require('ember-cli/lib/models/task');
const scoreToColor = require('../utilities/score-to-color');
const fetchJSONFrom = require('../utilities/fetch-json-from-url');
const wordsFromNow = require('date-fns/distance_in_words_to_now');

module.exports = Task.extend({
  /**
   * Search tasks run method. Build such that it can be recursively called if a search
   * has more than one page of results.
   *
   * @method run
   * @param {Object} options
   * @param {Number} options.addon -
   * @param {String} options.code -
   */
  run({ addon, code }) {
    this.ui.startProgress(this.displayLoadingText(addon, code));

    if (addon && code) {
      return this.codeSearch({ addon, code });
    } else if (!addon && code) {
      return this.codeSearchAll({ code });
    }

    return this.retrieveEmberObserverAddons()
      .then(({ addons }) => this.addonSearch({ addon }, this.sortBy('score', this.searchBy(addon, addons))))
      .catch(error => this.ui.stopProgress());
  },

  /**
   *
   * @method addonSearch
   * @param {Object} options
   * @param {Number} options.addon -
   * @param {Object} filteredAddons -
   * @param {Number} from -
   * @param {Number} size -
   */
  addonSearch({ addon }, filteredAddons, from=0, size=10) {
    if (filteredAddons.length === 0 && from === 0) {
      return this.displayNoResults();
    }

    filteredAddons.slice(from, from + size).forEach(addon => this.displayAddonMeta(addon));

    if (filteredAddons.length > from + size) {
      return this.promptViewMore(`Showing page ${(from / size) + 1} of ${Math.ceil(filteredAddons.length / size)}. View next page?`).then(choice => {
        if (choice.viewMore) {
          return this.addonSearch({ addon }, filteredAddons, from + size);
        }
      });
    }
  },

  /**
   *
   * @method codeSearchAll
   * @param {Object} options
   * @param {Number} options.addon -
   * @param {Number} options.code -
   * @param {Object} filteredAddons -
   * @param {Number} from -
   * @param {Number} size -
   */
  codeSearchAll({ code }, from=0, size=1) {
    return this.searchAddonsForCode(code).then(({ results }) => {

      this.spacer();

      results.forEach(({ addon, count }) => this.ui.writeLine(`${chalk.cyan(addon)} contains ${count} occurrences`));

      this.spacer();

      this.ui.writeLine(`For more information run: ${chalk.yellow(`ember search --addon addonName --code ${code}`)}`);
    });
  },

  /**
   * @method codeSearch
   * Wrapper around displaying a blank line.
   */
  codeSearch({ addon, code }, from=0, size=5, mode='default') {
    return this.searchAddonsForCode(code, addon).then((r) => {

      const occurences = r.results.reduce((a, b) => a + b.count, 0);

      r.results.slice(from, from + size).map((i) => {this.displayCodeSearch(i, addon)});

      if (r.results.length > from + size) {
        return this.promptViewMore().then(choice => {
          if (choice.viewMore) {
            return this.codeSearch({ addon, code }, from + size);
          }
        });
      }
    });
  },

  /**
   * Searches addons by a given code snippet from emberobserver.com.
   *
   * @method searchAddonsForCode
   * @param {String} code - The code snippet to search by
   * @param {String} addonName - The addonName to restrict the code search to
   * @return {Promise}
   */
  searchAddonsForCode(code, addonName) {
    const encodedCode = encodeURIComponent(code);

    if (!addonName) {
      return fetchJSONFrom(`https://emberobserver.com/api/search/addons?query=${encodedCode}&sort=usages`);
    }

    return fetchJSONFrom(`https://emberobserver.com/api/search/source?addon=${addonName}&query=${encodedCode}`);
  },

  /**
   * @method searchBy
   * Wrapper around displaying a blank line.
   */
  retrieveEmberObserverAddons() {
    return fetchJSONFrom('https://emberobserver.com/api/addons');
  },

  /**
   * @method searchBy
   * Wrapper around displaying a blank line.
   */
  searchBy(query, array) {
    const regexp = new RegExp(query, 'gi');
    return array.filter(({name, description}) => name.match(regexp) || description.match(regexp));
  },


  /**
   * @method sortBy
   * Wrapper around displaying a blank line.
   */
  sortBy(key, array) {
    return array.sort((a, b) => b[key] - a[key]);
  },

  /**
   * Prompts the user if they want to view more results.
   *
   * @method promptViewMore
   * @param {string} message - The message to prompt the user with
   * @return {Promise}
   */
  promptViewMore(message='View the next page of results?') {
    return this.ui.prompt({
      name: 'viewMore',
      type: 'confirm',
      message,
    }).catch(error => { throw new Error(error); });
  },

  /**
   * Displays all of the important information to the console about an individual package.
   *
   * @method displayAddonMeta
   * @param {object} pkg - The npm package object
   * @param {string} pkg.name - The npm name of the package
   * @param {string} pkg.version - The latest package version
   */
  displayAddonMeta(emberObserverMeta) {
    const { score, name, description, latest_version_date } = emberObserverMeta;

    this.spacer();

    // Line 1
    const updateDate = `updated ${wordsFromNow(latest_version_date)} ago`
    this.ui.writeLine(`${chalk[scoreToColor(score)](score || 0)} ${chalk.cyan(name)} ${chalk.gray(updateDate)}`);

    // Line 2
    this.ui.writeLine(chalk.gray(description));
  },

  /**
   * Display the code search information to the console.
   *
   * @method displayCodeSearch
   *
   */
  displayCodeSearch(result, addonName) {
    this.ui.writeLine('');

    this.ui.writeLine('Addon: ' + chalk.red(addonName) + ' File: ' + chalk.cyan(result.filename));
    this.ui.writeLine('');

    result.lines.forEach(codeLine => {
      if(codeLine.number === result.line_number) {
        this.ui.write(chalk.yellow(`${codeLine.number} ${codeLine.text}`));
      }
      else {
        this.ui.write(`${codeLine.number} ${codeLine.text}`);
      }
    });
  },

  /**
   * @method displayLoadingText
   *
   * @param {String} addon -
   * @param {String} code -
   * @return {String}
   */
  displayLoadingText(addon, code) {
    if (!code) {
      return `searching addons that contain: '${addon}'`;
    }
    else if (!addon) {
      return `searching all addons that contain the code: '${code}'`;
    }

    return `searching '${addon}' for the code: '${code}'`;
  },

  /**
   * @method displayNoResults
   * Output for when there are no results.
   */
  displayNoResults() {
    this.spacer();
    this.ui.writeLine('No results matched your search.');
  },

  /**
   * @method spacer
   * Wrapper around displaying a blank line.
   */
  spacer() { this.ui.writeLine(''); }
});
