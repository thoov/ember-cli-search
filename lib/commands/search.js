const SearchTask = require('../tasks/addon-search');
const Command = require('ember-cli/lib/models/command');

module.exports = Command.extend({
  name: 'search',
  description: 'Search npm for ember addons.',
  works: 'everywhere',

  availableOptions: [
    { name: 'code', type: String, aliases: ['c'] },
    { name: 'addon', type: String, aliases: ['a'] },
  ],

  anonymousOptions: [
    '<keyword or addon>'
  ],

  SearchTask,

  run(commandOptions, rawArgs) {
    const AddonSearchTask = this.SearchTask;
    const searchTask = new AddonSearchTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project,
    });

    return searchTask.run({
      query: rawArgs.join(' ').trim(),
      code: commandOptions.code,
      addon: commandOptions.addon,
    });
  }
});
