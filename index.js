/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-cli-search',

  includedCommands: function() {
    return {
      search: require('./lib/commands/search')
    };
  }
};
