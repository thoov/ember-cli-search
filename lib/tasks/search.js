'use strict';

var chalk = require('chalk');
var fetch = require('node-fetch');
var CoreObject = require('core-object');
var AddonInstallTask = require('ember-cli/lib/tasks/addon-install');
var distanceInWordsToNow = require('date-fns/distance_in_words_to_now');

module.exports = CoreObject.extend({
  /**
   * Search tasks run method. Build such that it can be recursively called if a search
   * has more than one page of results.
   *
   * @param {Object} options - Configurable options which go to npm's search
   * @param {number} options.from - The starting index of the result set
   * @param {number} options.size - The number of results to fetch
   * @param {string} options.query - The search query
   */
  run: function(options) {
    var task = this;

    if (!options.from) {
      options.from = 0;
    }

    if (!options.size) {
      options.size = 5;
    }

    return task.fetchResults(options.from, options.size, options.query).then(function(json) {
      var totalResults = json.total;
      var results = json.results;

      results.map(function(item) {
        task.packageOutput(item.package);
      });

      if (totalResults > options.from + options.size) {
        task.showingXofYaddons(options.from + options.size, totalResults)

        return task.promptViewMore().then(function(choice) {
          if (choice.viewMore) {
            return task.run({
              from: options.from + options.size,
              size: options.size,
              query: options.query
            });
          }
        });
      }
      else if (totalResults === 0) {
        task.noResultsOuput();
      }
    });
  },

  /**
   * Uses the query param to search npm (https://api-docs.npms.io) for a given
   * addon. The search is filtered by packages with ember-addon in the keywords property.
   *
   * @param {number} from - The starting index of the result set
   * @param {number} size - The number of results to fetch
   * @param {string} query - The search query
   */
  fetchResults: function(from, size, query) {
    var task = this;

    task.ui.startProgress('searching...');

    return fetch('https://api.npms.io/v2/search?from='+ from +'&size=' + size + '&q=keywords%3Aember-addon%20' + query)
      .then(function(response) {
        task.ui.stopProgress();
        return response.json();
      })
      .catch(function(err) {
        task.ui.stopProgress();
        throw new Error(err);
      });
  },

  /**
   * Prompts the user if they want to view more results.
   */
  promptViewMore: function() {
    return this.ui.prompt({
      name: 'viewMore',
      message: 'View the next page of results?',
      type: 'confirm'
    })
    .catch(function(error) {
      throw new Error(error);
    });
  },

  /**
   * Displays all of the important information to the console about an individual package.
   *
   * @param {object} pkg - The npm package object
   * @param {string} pkg.name - The npm name of the package
   * @param {string} pkg.version - The latest package version
   * @param {date} pkg.date - The date when the package was last updated
   * @param {object} pkg.links - The important links related to the package
   * @param {string} pkg.repository - The github repository link
   */
  packageOutput: function(pkg) {
    // Spacer
    this.ui.writeLine('');

    // Line 1
    this.ui.writeLine(
      chalk.cyan(pkg.name) +
      ' ' +
      '(' + chalk.gray('v' + pkg.version + ' updated ' + distanceInWordsToNow(pkg.date)) + ')'
    );

    // Line 2
    this.ui.writeLine(chalk.gray(pkg.description));

    // Line 3 (optional)
    if (pkg.links.repository) {
      this.ui.writeLine(chalk.gray(pkg.links.repository));
    }
  },

  /**
   * Display what page of results the user is viewing.
   *
   * @param {number} currentAmount - The amount of results already shown to the user
   * @param {number} total - The total number of results that are possible from a given query
   */
  showingXofYaddons: function(currentAmount, total) {
    this.ui.writeLine('Showing ' + currentAmount + ' of ' + total + ' addons.');
  },

  /**
   * Output for when there are no results found.
   */
  noResultsOuput: function() {
    this.ui.writeLine('No addons matched your search.');
  }
});
