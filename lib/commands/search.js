const SearchTask = require('../tasks/search');

module.exports = {
  name: 'search',
  description: 'Search the community for the perfect addon.',
  anonymousOptions: [
    '<addon name>'
  ],

  SearchTask,

  run(commandOptions, rawArgs) {
    const SearchTask = this.SearchTask;
    const searchTask = new SearchTask({
      ui: this.ui
    });

    return searchTask.run({
      addonName: String(rawArgs[0]).trim()
    });
  }
};
