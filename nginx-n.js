
var _             = require('underscore');
var path          = require('path');

var join          = path.join;

var nginx = {};

var Nginx = nginx.Nginx = function() {
  var self = this;

  var output  = [];
  var config  = self.config = {};
  var data    = self.data   = {parent:null, children: []};
  var current = data;

  // Defaults
  config.prefix = join('', 'etc', 'nginx');

  self.prefix = function(prefix) {
    config.prefix = prefix;
  };

  self.events = function(fn, parent_) {
    var parent  = parent_ || current;
    var level   = depth(parent);
    var result  = callAsChild(fn, {events: []});

    var child   = { write: function() {
      write();
      write('events {');
      _.each(result.events, function(event) {
        dispatch(event);
      });
      write('}');
      write();
    }};
    result.events.push(child);

    return result;
  };

  var callAsChild = function(fn, child) {
    child.parent  = current;
    current       = child;

    fn(self, current);

    current       = current.parent;

    return child;
  };

  var dispatch = function(obj) {
    if (_.isFunction(obj.write)) {
      obj.write();
    }
  };

  var depth = function(obj) {
    var curr      = obj;
    var theDepth  = 1;

    while (curr.parent !== null) {
      if (!('block' in curr)) {
        theDepth++;
      }
      curr = curr.parent;
    }

    return theDepth;
  };

  var write = function(/*indent, value*/) {
    var args    = _.rest(arguments, 0);
    var value   = args.pop() || '';
    var indent  = args.pop() || 0;
    var str     = '', i;

    for (i = 0; i < indent; ++i) {
      str += '  ';
    }

    if (_.isArray(value)) {
      value = value.join(' ');
    }

    str += value;
    output.push(str);
  };
};

nginx.nginx = function() {
  return new Nginx();
};

_.each(nginx, function(value, key) {
  exports[key] = value;
});

