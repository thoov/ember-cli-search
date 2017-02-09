'use strict';

const RSVP = require('rsvp');
const chalk = require('chalk');
const SearchTask = require('../tasks/addon-search');

module.exports = {
  name: 'search',
  description: ' ', // This "prettys up" ember search --help
  works: 'everywhere',

  availableOptions: [
    { name: 'addon', type: String, aliases: ['a'], description: 'A partial name of an addon to search for. If combined with --code then this must be an exact addon name match' },
    { name: 'code', type: String, aliases: ['c'], description: 'A code snippet to search addons for' },
  ],

  SearchTask,

  run(commandOptions, rawArgs) {
    const AddonSearchTask = this.SearchTask;
    const searchTask = new AddonSearchTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
    });

    if (!commandOptions.addon && !commandOptions.code) {
      return RSVP.reject(chalk.yellow(`The \`ember ${this.name}\` command requires --addon or --code to be specified. For more details, use \`ember ${this.name} --help\`.`));
    }

    return searchTask.run(commandOptions);
  }
};
