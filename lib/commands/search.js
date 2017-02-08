const RSVP = require('rsvp');
const SearchTask = require('../tasks/addon-search');
const Command = require('ember-cli/lib/models/command');

module.exports = Command.extend({
  name: 'search',
  description: ' ', // This "prettys up" ember search --help
  works: 'everywhere',

  availableOptions: [
    { name: 'addon', type: String, aliases: ['a'], description: 'A partial name of an addon to search for. If combined with --code then this must be the exact addon name' },
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

    if (!commandOptions.addon && !commandOptions.code ) {
      return RSVP.reject('You must pass either --addon or --code')
    }

    return searchTask.run(commandOptions);
  }
});
