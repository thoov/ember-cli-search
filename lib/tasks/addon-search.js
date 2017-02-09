'use strict';

const RSVP = require('rsvp');
const chalk = require('chalk');
const CoreObject = require('core-object');
const scoreToColor = require('../utilities/score-to-color');
const fetchJSONFrom = require('../utilities/fetch-json-from-url');
const wordsFromNow = require('date-fns/distance_in_words_to_now');

module.exports = CoreObject.extend({
  /**
   * Entry point of the task. This looks at the arguments being passed from the command and
   * determines what type of search to perform.
   *
   * @method run
   * @param {Object} options
   * @param {Number} options.addon - The name of the addon to search by or limit the scope of the code search
   * @param {String} options.code - A snippet of code to search by
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
   * Searches ember observers addons based on their name or description that matches the given query.
   * This method recieves an already sorted and search array of addons which allow this method to be called recursively
   * to allow for paging.
   *
   * ember search --addon 'websocket'
   *
   * @method addonSearch
   * @param {Object} options
   * @param {Number} options.addon - A partial addon name to search by
   * @param {Array} filteredAddons - A sorted list of addons that matched then query and have been sorted by score
   * @param {Number} from - Where the paging should start from
   * @param {Number} size - How many results per page to show
   */
  addonSearch({ addon }, filteredAddons, from=0, size=10) {
    const length = filteredAddons.length;

    if (length === 0 && from === 0) {
      return this.displayNoResults();
    }

    filteredAddons.slice(from, from + size).forEach(addon => this.displayAddonMeta(addon));

    if (length > from + size) {
      return this.promptViewMore(`Showing page ${(from / size) + 1} of ${Math.ceil(length / size)}. View next page?`).then(choice => {
        if (choice.viewMore) {
          return this.addonSearch({ addon }, filteredAddons, from + size);
        }
      });
    }
  },

  /**
   * Searches ember observer's code search for all addons that contain the given code snippet.
   *
   * ember search --code 'socketFor'
   *
   * @method codeSearchAll
   * @param {Object} options
   * @param {Number} options.code - The code snippet to search by
   */
  codeSearchAll({ code }) {
    return this.searchAddonsForCode(code).then(({ results }) => {
      this.spacer();

      if (results.length === 0) {
        this.ui.writeLine(`No addons contained '${code}'.`);
        this.ui.writeLine(`Please try a different code snippet.`);
        return false;
      }

      results.forEach(({ addon, count }) => this.ui.writeLine(`${chalk.cyan(addon)} contains ${count} occurrences`));

      this.spacer();
      this.ui.writeLine(`For more information run: ${chalk.yellow(`ember search --addon ${chalk.cyan('addon-name')} --code ${code}`)}`);
    });
  },

  /**
   * Searches ember observer's code search an addon that contain the given code snippet and matches the addon name.
   *
   * ember search --addon 'ember-websockets' --code 'socketFor'
   *
   * @method codeSearch
   * @param {Object} options
   * @param {String} options.addon - The exact name of the addon to limit the code search by
   * @param {String} options.code - The code snippet to search by
   * @param {Number} from - The starting page for pagination
   * @param {Number} size - The number of results to show per page
   */
  codeSearch({ addon, code }, from=0, size=5) {
    return this.searchAddonsForCode(code, addon).then(({results}) => {
      if (results.length === 0) {
        this.spacer();
        this.ui.writeLine(`No occurrences of '${code}' found for ${addon}.`);
        this.ui.writeLine(`Please make sure that ${chalk.cyan(addon)} is spelt correctly.`);
        return false;
      }

      results.slice(from, from + size).map(result => this.displayCodeSearch(result, addon));

      if (results.length > from + size) {
        return this.promptViewMore(`Viewing ${from + size} of ${results.length} occurrences. View the next page?`).then(choice => {
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
   * Fetches all addons from emberobserver.com.
   *
   * @method retrieveEmberObserverAddons
   * @return {Promise}
   */
  retrieveEmberObserverAddons() {
    return fetchJSONFrom('https://emberobserver.com/api/addons');
  },

  /**
   * Searches a given array for a query that matches either the name or description of the individual array item.
   *
   * @method searchBy
   * @param {String} query - The query to filter on
   * @param {Array} array - The array to search over
   * @return {Array}
   */
  searchBy(query, array) {
    const regexp = new RegExp(query, 'gi');
    return array.filter(({name, description}) => name.match(regexp) || description.match(regexp));
  },


  /**
   * Sorts a given array by the score property.
   *
   * @method sortBy
   * @param {String} key - The property to sort by
   * @param {Array} array - The array to sort over
   * @return {Array}
   */
  sortBy(key, array) {
    return array.sort((a, b) => b[key] - a[key]);
  },

  /**
   * Prompts the user if they want to view more results.
   *
   * @method promptViewMore
   * @param {String} message - The message to prompt the user with
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
   * @param {Object} pkg
   * @param {String} pkg.name - The name of the addon
   * @param {String} pkg.score - The ember observer score of the addon
   * @param {String} pkg.description - The description of the addon
   * @param {Date} pkg.latest_version_date - The last time the addon was updated
   */
  displayAddonMeta(pkg) {
    const { score, name, description, latest_version_date } = pkg;
    this.spacer();

    // Line 1
    const updateDate = `updated ${wordsFromNow(latest_version_date)} ago`;
    this.ui.writeLine(`${chalk[scoreToColor(score)](score || 0)} ${chalk.cyan(name)} ${chalk.gray(updateDate)}`);

    // Line 2
    this.ui.writeLine(chalk.gray(description));
  },

  /**
   * Display the code search information to the console.
   *
   * @method displayCodeSearch
   * @param {Object} result
   * @param {String} result.filename - The name of the file where the code snippet was found
   * @param {Array} result.lines - The array of lines around the line where the snippet was found
   * @param {Number} result.line_number - The line number where the snippet was found
   */
  displayCodeSearch({ filename, lines, line_number }, addonName) {
    this.spacer();
    this.ui.writeLine(chalk.cyan(`${addonName}/${filename}:${line_number}`));

    lines.forEach(codeLine => {
      if(codeLine.number === line_number) {
        this.ui.write(chalk.yellow(`${codeLine.number} ${codeLine.text}`));
      }
      else {
        this.ui.write(`${codeLine.number} ${codeLine.text}`);
      }
    });
  },

  /**
   * Displays the search loading text based off of what arguments where passed via the search command.
   *
   * @method displayLoadingText
   *
   * @param {String} addon - The addon name or partial name being searched for
   * @param {String} code - The code snippet that is being searched for
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
   * Output for when there are no results.
   *
   * @method displayNoResults
   */
  displayNoResults() {
    this.spacer();
    this.ui.writeLine('No results matched your search.');
  },

  /**
   * Wrapper around displaying a blank line.
   *
   * @method spacer
   */
  spacer() { this.ui.writeLine(''); }
});
