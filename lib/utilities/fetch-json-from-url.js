'use strict';

const fetch = require('node-fetch');

module.exports = function(url) {
  return fetch(url).then(response => {
    if (!response.ok) {
      throw new Error(`Recieved [${response.status}] status from ${url}`);
    }

    return response.json();
  })
  .catch(error => { throw new Error(error); });
}
