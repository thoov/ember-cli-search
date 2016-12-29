'use strict';
const CoreObject = require('core-object');
const RSVP = require('rsvp');
const chalk = require('chalk');
const debug = require('debug')('ember-cli-search');
const fetch = require('node-fetch');
const moment = require('moment');

const BASE_SEARCH_URL = 'https://api.npms.io/v2/search?from=0&q=keywords%3Aember-addon%20';

module.exports = CoreObject.extend({
  run: function(options) {
    debug('search task: ' + options.addonName);

    return fetch(BASE_SEARCH_URL + options.addonName)
    .then(res => res.json())
    .then(json => {
      if (json.total > 0) {
        json.results.map(item => {
          this.ui.writeLine(chalk.underline(item.package.name) + ' (' + chalk.dim('v' + item.package.version + ' updated ' + moment(item.package.date).fromNow()) + ')');
          this.ui.writeLine(item.package.description);

          if (item.package.links.repository) {
            this.ui.writeLine(item.package.links.repository);
            this.ui.writeLine('');
          }
        });
      }
      else {
        this.ui.writeLine('No addons matched your search.');
      }
    })
    .catch(err => {
      this.ui.writeLine(chalk.red('An error has occurred while searching.'));
      this.ui.writeLine(chalk.red('Please try again later or report this issue to: https://github.com/thoov/ember-cli-search/issues.'));
      this.ui.writeLine('');
      this.ui.writeLine(chalk.red(err.message));
     });
  }
});
