var SearchTask = require('../tasks/search');
var Command = require('ember-cli/lib/models/command');

module.exports = Command.extend({
  name: 'search',
  description: 'Search the community for the perfect addon.',

  anonymousOptions: [
    '<addon name>'
  ],

  SearchTask,

  run(commandOptions, rawArgs) {
    var SearchTask = this.SearchTask;
    var searchTask = new SearchTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return searchTask.run({
      addonName: String(rawArgs[0]).trim()
    });
  }
});
