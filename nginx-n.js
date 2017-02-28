
var _             = require('underscore');
var path          = require('path');
var util          = require('util');

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
    parent.children.push(function() {
      return child.write();
    });

    return result;
  };

  self.workerConnections = function(count, parent) {
    return addChild(parent, function(level) {
      writeln(level, ["worker_connections", count]);
    });
  };

  self.write = function() {
    console.log(util.inspect(self, {depth:null, colors:true}));
    _.each(self.data.children, function(child) {
      console.log(util.inspect(child, {depth:null, colors:true}));
      child();
    });
  };

  var addChild = function(parent, fn) {
    var level = depth(parent || current);

    var child   = { write: function() {
      return fn(level);
    }};

    return child;
  };

  var callAsChild = function(fn, child) {
    child.parent  = current;
    current       = child;

    fn(self);

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

  var writeln = function(/*indent, value*/) {
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
    output.push(str+';');
  };
};

nginx.nginx = function() {
  return new Nginx();
};

_.each(nginx, function(value, key) {
  exports[key] = value;
});

