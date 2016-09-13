
var _       = require('underscore');

var root        = {};
var current;

// --------------------------------------------------------------------
//  Blocks
// --------------------------------------------------------------------

global.events = function(fn, parent_) {
  var parent = parent_ || current;

  var level  = depth(parent);
  var config = config_fn({events:[]}, fn);

  var item = { fn: function() {
    write();
    write(level, "events {");
    _.each(config.events, function(item) {
      dispatch(item);
    });
    write(level, "}");
  }};
  getConfigFrom(['g'], 'events', parent).push(item);

  return config;
};

global.http = function(fn, parent_) {
  var parent = parent_ || current;

  var level  = depth(parent);
  var config = config_fn({http:[]}, fn);

  var item = { fn: function() {
    write();
    write(level, "http {");
    _.each(config.http, function(item) {
      dispatch(item);
    });
    write(level, "}");
  }};
  getConfigFrom(['g'], 'http', parent).push(item);

  return config;
};

global.server = function(fn, parent_) {
  var parent = parent_ || current;

  var level  = depth(parent);
  var config = config_fn({server:[]}, fn);

  var item = { fn: function() {
    write();
    write(level, "server {");
    _.each(config.server, function(item) {
      dispatch(item);
    });
    write(level, "}");
  }};
  getConfigFrom(['http'], 'server', parent).push(item);

  return config;
};

global.block = function(fn, parent_) {
  var parent = parent_ || current;

  var level  = depth(parent);
  var config = config_fn({block:[]}, fn);

  var item = { fn: function() {
    _.each(config.block, function(item) {
      dispatch(item);
    });
  }};
  getConfigFrom([], 'block', parent).push(item);

  return config;
};


// the nginx global
module.exports = function(fn) {
  var config = current = _.extend(root, {g:[], parent: null});
  fn(current);

  _.each(config.g, function(item) {
    dispatch(item);
  });
};


// --------------------------------------------------------------------
//  Simple Items
// --------------------------------------------------------------------

global.workerConnections = function(count, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["worker_connections", count]);
  }};
  getConfigFrom(['events'], 'workerConnections', parent).push(item);
};

global.user = function(name, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["user", name]);
  }};
  getConfigFrom(['g'], 'user', parent).push(item);
};

global.workerProcesses = function(count, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["worker_processes", count]);
  }};
  getConfigFrom(['g'], 'worker_processes', parent).push(item);
};

global.pid = function(id, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["pid", id]);
  }};
  getConfigFrom(['g'], 'pid', parent).push(item);
};

global.deny = function(name, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["deny", name]);
  }};
  getConfigFrom([], 'deny', parent).push(item);
};

global.include = function(name, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["include", name]);
  }};
  getConfigFrom([], 'include', parent).push(item);
};

global.blankLine = function(parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    write();
  }};
  getConfigFrom([], 'blankLine', parent).push(item);
};

global.append = function(config, fnName /*, args*/) {
  if (!fnName || !global[fnName]) { die(fnName+" is not a known config parameter."); }

  var args = _.rest(arguments, 2);

  // A replacement getConfig function
  args.push(function(names, ctxName) {
    return getConfigFrom(names, ctxName, config);
  });

  return global[fnName].apply(this, args);
};

// --------------------------------------------------------------------
//  Sophisticated Items
// --------------------------------------------------------------------

global.listen = function(port, params_, parent_) {
  var parent = parent_ || current;
  var level  = depth(current);

  var params          = params_ || {};
  var default_server  = params.default_server;
  var ssl             = params.ssl;

  var item = { fn: function() {
    writeln(level, ["listen", port, ssl && "ssl", default_server && 'default']);
  }};
  getConfigFrom(['server'], 'listen', parent).push(item);
};

global.errorLog = function(name, params_, parent_) {
  var parent = parent_ || current;
  var level  = depth(current);

  var params          = params_ || {};
  var level           = params.level;

  if (!name) { die("errorLog requires name"); }

  var item = { fn: function() {
    writeln(level, ["error_log", name, level]);
  }};
  getConfigFrom(['g'], 'errorLog', parent).push(item);
};

// --------------------------------------------------------------------
//  Compound Items
// --------------------------------------------------------------------

global.upload = function(uploadPath, params_, parent_) {
  var parent = parent_ || current;
  var level  = depth(current);

  var params          = params_ || {};
  var default_server  = params.default_server;
  var maxSize         = params.maxSize;

  var item = { fn: function() {
    writeln(level, ["client_body_temp_path", uploadPath]);
    if ('maxSize' in params) {
      writeln(level, ["client_max_body_size", maxSize]);
    }
  }};
  getConfigFrom(['http', 'server'], 'upload', parent).push(item);
};




// --------------------------------------------------------------------
//  Helpers
// --------------------------------------------------------------------


function die(msg) {
  console.error(new Error(msg));
  process.exit(1);
}

function firstKey(o) {
  return _.keys(o)[0];
}

function numKeys(o) {
  return _.keys(o).length;
}

function getConfigFrom(names, ctxName, obj_) {
  var obj = obj_ || current;

  var config, i, name;
  for (i = 0; i < names.length; ++i) {
    name = names[i];

    if ((context = obj[name])) {
      return context;
    }
  }

  // [] for names means any
  if (names.length === 0 && numKeys(obj) > 0) {
    return obj[firstKey(obj)];
  }

  /* otherwise */
  if ('block' in obj) {
    return getConfigFrom(names, ctxName, obj_.parent);
  }

  if (!context) {
    console.error("current:", current);
    die(ctxName+" is not in right block, should be: "+names.join(', or'));
    return;
  }
}

function depth(obj) {
  var curr      = obj;
  var theDepth  = 1;

  while (curr.parent !== null) {
    if (!('block' in curr)) {
      theDepth++;
    }
    curr = curr.parent;
  }

  return theDepth;
}

function config_fn(config, fn) {

  config.parent = current;

  current       = config;
  fn(config);
  current = current.parent;

  return config;
}

function dispatch(item) {
  var fn = item;
  if (_.isFunction(fn)) {
    return fn();
  }

  /* otherwise */
  return dispatch(item.fn);
}

function writeln(a, b) {
  var writeOne = function(line) {
    var i;
    for (i = 1; i < level; ++i) {
      process.stdout.write('  ');
    }
    process.stdout.write(line || "");
    process.stdout.write(';\n');
  };

  var level = a;
  var x     = b;

  if (arguments.length === 1) {
    level = 0;
    x     = a;
  }

  if (_.isArray(x)) {
    writeOne(_.compact(x).join(' '));
  } else {
    writeOne(x);
  }
}

function write(a, b) {
  var writeOne = function(line) {
    var i;
    for (i = 1; i < level; ++i) {
      process.stdout.write('  ');
    }
    process.stdout.write(line || "");
    process.stdout.write('\n');
  };

  var level = a;
  var x     = b;

  if (arguments.length === 1) {
    level = 0;
    x     = a;
  }

  if (_.isArray(x)) {
    writeOne(_.compact(x).join(' '));
  } else {
    writeOne(x);
  }
}

