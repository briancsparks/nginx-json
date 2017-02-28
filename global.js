
var _         = require('underscore')

var nginx     = require('./nginx-n');

_.each(nginx, function(value, key) {
  global[key] = value;
});

