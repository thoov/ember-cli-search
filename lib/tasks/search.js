'use strict';

var RSVP = require('rsvp');
var chalk = require('chalk');
var fetch = require('node-fetch');
var CoreObject = require('core-object');
var AddonInstallTask = require('ember-cli/lib/tasks/addon-install');
var distanceInWordsToNow = require('date-fns/distance_in_words_to_now');

// https://api-docs.npms.io/
var BASE_SEARCH_URL = 'https://api.npms.io/v2/search?from=0&size=10&q=keywords%3Aember-addon%20';

module.exports = CoreObject.extend({
  run: function(options) {
    var task = this;

    return new RSVP.Promise(function(resolve, reject) {
      fetch(BASE_SEARCH_URL + options.addonName)
      .then(function(res) {
        return res.json()
      })
      .then(function(json) {
        var totalResults = json.total;
        var results = json.results;

        task.ui.writeLine('');
        results.map(function(item) {
          task.packageOutput(item);
        });

        if (totalResults > 0) {
          task.promptInstall(resolve, reject, results);
        }
        else {
          task.noResultsOuput();
        }
      })
      .catch(function(err) {
        reject(err);
      });
    });
  },

  promptInstall: function(resolve, reject, results) {
    var task = this;

    task.ui.prompt({
      name: 'addon',
      message: 'Would you like to install an addon?',
      type: 'list',
      choices: ['Nope'].concat(results.map(function(i) { return i.package.name; }))
    }).then(function(choice) {
      if (choice.addon !== 'Nope') {
        var addonInstall = new AddonInstallTask({
          ui:             task.ui,
          analytics:      task.analytics,
          project:        task.project
        });

        return addonInstall.run({
          'blueprintOptions': {
            'save': true
          },
          'packages': [choice.addon]
        });
      }

      return resolve();
    })
    .catch(function(error) {
      reject(error);
    });
  },

  packageOutput: function(item) {
    var pkg = item.package;

    this.ui.writeLine(chalk.underline(pkg.name) + ' (' + chalk.dim('v' + pkg.version + ' updated ' + distanceInWordsToNow(pkg.date)) + ')');
    this.ui.writeLine(pkg.description);

    if (pkg.links.repository) {
      this.ui.writeLine(pkg.links.repository);
    }

    this.ui.writeLine('');
  },

  noResultsOuput: function() {
    this.ui.writeLine('No addons matched your search.');
  }
});
