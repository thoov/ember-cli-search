'use strict';

const RSVP = require('rsvp');
const chalk = require('chalk');
const Task = require('ember-cli/lib/models/task');
const fetchJSONFrom = require('../utilities/fetch-json-from-url');
const wordsFromNow = require('date-fns/distance_in_words_to_now');

module.exports = Task.extend({
  /**
   * Search tasks run method. Build such that it can be recursively called if a search
   * has more than one page of results.
   *
   * @method run
   * @param {Object} options - Configurable options which go to npm's search
   * @param {Number} options.size - The number of results to fetch
   * @param {String} options.query - The search query
   */
  run(options) {
    this.ui.startProgress(`searching for: '${options.code || options.query}'`);

    const { query, code, size, addonName } = options;

    return this.retrieveEmberObserverAddons().then(({ addons }) => {

      if (code) {
        return this.searchAddonsForCode(code, addonName).then((r) => {
          console.log(r);
        });
      }


      const filteredResults = this.sortBy('score', this.searchBy(query, addons));

      if (filteredResults.length === 0) {
        return this.noResultsOuput();
      }


      filteredResults.map(addon => this.displayAddonMeta(addon));
    })
    .catch(error => {
      // TODO log error
      this.ui.stopProgress();
    });

    // return this.searchNpmPackage(from, size, query).then(json => {
    //   const totalResults = json.total;
    //   const results = json.results;
    //
    //   const promises = results.map(item => {
    //     if (code) {
    //       return this.searchAddonsForCode(item.package.name, options.code);
    //     }
    //
    //     return this.fetchMetaForAddon(item.package.name);
    //   });
    //
    //   return RSVP.all(promises).then(resolvedArray => {
    //     this.ui.stopProgress();
    //
    //     if (code) {
    //       resolvedArray.map(item => this.displayCodeSearch(item.results));
    //
    //       return true;
    //     }
    //
    //     resolvedArray.map((item, index) => this.displayAddonMeta(results[index].package, item.addon));
    //
    //     if (totalResults > 0) {
    //       this.showingXofYresults(from + results.length, totalResults);
    //     }
    //
    //     if (totalResults > from + size) {
    //       return this.promptViewMore().then(choice => {
    //         if (choice.viewMore) {
    //           return this.run({
    //             from: from + size,
    //             size,
    //             query,
    //           });
    //         }
    //       });
    //     } else if (totalResults === 0) {
    //       this.noResultsOuput();
    //     }
    //   })
    //   .catch(error => {
    //     // TODO log error
    //     this.ui.stopProgress();
    //   });
    // });
  },


  /**
   * Uses the query param to search npm (https://api-docs.npms.io) for a given
   * package. The search is filtered by packages with ember-addon in the keyword property.
   *
   * @method searchNpmPackage
   * @param {Number} from - The starting index of the result set
   * @param {Number} size - The number of results to fetch
   * @param {String} query - The search query
   * @return {Promise}
   */
  searchNpmPackage(from, size, query) {
    return fetchJSONFrom(`https://api.npms.io/v2/search?from=${from}&size=${size}&q=keywords%3Aember-addon%20${query}`);
  },

  /**
   * Fetches meta data about an addon from emberobserver.com.
   *
   * @method fetchMetaForAddon
   * @param {String} addonName - The name of the addon to get meta data about
   * @return {Promise}
   */
  fetchMetaForAddon(addonName) {
    return fetchJSONFrom(`https://emberobserver.com/api/addons?name=${addonName}`);
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

  retrieveEmberObserverAddons() {
    return fetchJSONFrom('https://emberobserver.com/api/addons');
  },

  searchBy(query, array) {
    const regexp = new RegExp(query, 'gi');
    return array.filter(({name, description}) => name.match(regexp) || description.match(regexp));
  },

  sortBy(key, array) {
    return array.sort((a, b) => b[key] - a[key]);
  },

  /**
   * Prompts the user if they want to view more results.
   *
   * @method promptViewMore
   * @return {Promise}
   */
  promptViewMore() {
    return this.ui.prompt({
      name: 'viewMore',
      message: 'View the next page of results?',
      type: 'confirm',
    })
    .catch(error => { throw new Error(error); });
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

    // Spacer
    this.ui.writeLine('');

    // Line 1
    const updateDate = `updated ${wordsFromNow(latest_version_date)} ago`
    this.ui.writeLine(`${chalk[this.scoreToColor(score)](score || 0)} ${chalk.cyan(name)} ${chalk.gray(updateDate)}`);

    // Line 2
    this.ui.writeLine(chalk.gray(description));
  },

  /**
   * Display the code search information to the console.
   */
  displayCodeSearch(item) {
    item.forEach(i => {
      this.ui.writeLine('');
      this.ui.writeLine('');

      this.ui.writeLine('File: ' + chalk.cyan(i.filename));
      this.ui.writeLine('');

      i.lines.forEach(codeLine => {
        if(codeLine.number === i.line_number) {
          this.ui.write(chalk.yellow(`${codeLine.number} ${codeLine.text}`));
        }
        else {
          this.ui.write(`${codeLine.number} ${codeLine.text}`);
        }
      });
    })

  },

  /**
   * Determine the color of the emberobserver score value. The goal is to
   * try and mimic emberaddon.com's color system.
   *
   * @method scoreToColor
   * @param {Number} score - The emberobserver score for an addon
   * @return {String}
   */
  scoreToColor(score) {
    let scoreColor = 'red';

    if (score > 6) {
      scoreColor = 'green';
    }
    else if ([4, 5, 6].indexOf(score) !== -1) {
      scoreColor = 'yellow';
    }

    return scoreColor;
  },

  /**
   * Display what page of results the user is viewing.
   *
   * @method showingXofYresults
   * @param {Number} currentAmount - The amount of results already shown to the user
   * @param {Number} total - The total number of results that are possible from a given query
   */
  showingXofYresults(currentAmount, total) {
    this.ui.writeLine('');
    this.ui.writeLine(`Showing ${currentAmount} of ${total} addons.`);
  },

  /**
   * @method noResultsOuput
   * Output for when there are no results found.
   */
  noResultsOuput() {
    this.ui.writeLine('No results matched your search.');
  },
});
