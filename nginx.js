
var _       = require('underscore');

var stack       = [];
var root        = {};
var current;

// --------------------------------------------------------------------
//  Blocks
// --------------------------------------------------------------------

global.events = function(fn) {

  var parent = getConfig(['g'], 'events');
  var level  = depth(current);
  var config = config_fn({events:[]}, fn);

  parent.push(function() {
    write();
    write(level, "events {");
    _.each(config.events, function(fn) {
      fn();
    });
    write(level, "}");
  });
};

global.http = function(fn) {

  var parent = getConfig(['g'], 'http');
  var level  = depth(current);
  var config = config_fn({http:[]}, fn, level);

  parent.push(function() {
    write();
    write(level, "http {");
    _.each(config.http, function(fn) {
      fn();
    });
    write(level, "}");
  });

  return config;
};

global.server = function(fn) {

  var parent = getConfig(['http'], 'server');
  var level  = depth(current);
  var config = config_fn({server:[]}, fn);

  parent.push(function() {
    write();
    write(level, "server {");
    _.each(config.server, function(fn) {
      fn();
    });
    write(level, "}");
  });
};


// the nginx global
module.exports = function(fn) {
  var config = current = _.extend(root, {g:[], parent: null});
  stack.unshift(config);
  fn(current);

  _.each(config.g, function(fn) {
    fn();
  });
};


// --------------------------------------------------------------------
//  Simple Items
// --------------------------------------------------------------------

global.workerConnections = function(count) {
  var level  = depth(current);

  getConfig(['events'], 'workerConnections').push(function() {
    writeln(level, ["worker_connections", count]);
  });
};

global.user = function(name) {
  var level  = depth(current);

  getConfig(['g'], 'user').push(function() {
    writeln(level, ["user", name]);
  });
};

global.workerProcesses = function(count) {
  var level  = depth(current);

  getConfig(['g'], 'worker_processes').push(function() {
    writeln(level, ["worker_processes", count]);
  });
};

global.pid = function(id) {
  var level  = depth(current);

  getConfig(['g'], 'pid').push(function() {
    writeln(level, ["pid", id]);
  });
};

global.deny = function(name, getConfig_) {
  var ggetConfig  = getConfig_ || getConfig;
  var level       = depth(current);

  ggetConfig([], 'deny').push(function() {
    writeln(level, ["deny", name]);
  });
};

global.include = function(name) {
  var level  = depth(current);

  getConfig([], 'include').push(function() {
    writeln(level, ["include", name]);
  });
};

global.blankLine = function() {
  var level  = depth(current);

  getConfig([], 'blankLine').push(function() {
    write();
  });
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

global.listen = function(port, params_) {
  var parent = getConfig(['server'], 'listen');
  var level  = depth(current);

  var params          = params_ || {};
  var default_server  = params.default_server;
  var ssl             = params.ssl;

  parent.push(function() {
    writeln(level, ["listen", port, ssl && "ssl", default_server && 'default']);
  });
};

global.errorLog = function(name, params_) {
  var parent = getConfig(['g'], 'errorLog');
  var level  = depth(current);

  var params          = params_ || {};
  var level           = params.level;

  if (!name) { die("errorLog requires name"); }

  parent.push(function() {
    writeln(level, ["error_log", name, level]);
  });
};

// --------------------------------------------------------------------
//  Compound Items
// --------------------------------------------------------------------

global.upload = function(uploadPath, params_) {
  var parent = getConfig(['http', 'server'], 'upload');
  var level  = depth(current);

  var params          = params_ || {};
  var default_server  = params.default_server;
  var maxSize         = params.maxSize;

  parent.push(function() {
    writeln(level, ["client_body_temp_path", uploadPath]);
    if ('maxSize' in params) {
      writeln(level, ["client_max_body_size", maxSize]);
    }
  });
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

function getConfig(names, ctxName) {
  return getConfigFrom(names, ctxName, current);

  var stackTop = stack[0];
  if (!stackTop) { die("No context for "+ctxName); }

  var config, i, name;
  for (i = 0; i < names.length; ++i) {
    name = names[i];

    if ((context = stackTop[name])) {
      return context;
    }
  }

  // [] for names means any
  if (names.length === 0 && numKeys(stackTop) > 0) {
    return stackTop[firstKey(stackTop)];
  }

  if (!context) {
    console.error("current:", current);
    die(ctxName+" is not in right block, should be: "+names.join(', or'));
    return;
  }
}

function getConfigFrom(names, ctxName, obj) {

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
    curr = curr.parent;
    theDepth++;
  }

  return theDepth;
}

function config_fn(config, fn, level) {

  config.parent = current;
  current       = config;

  stack.unshift(config);
  fn(config);
  stack.shift();

  current = current.parent;

  if (arguments.length >= 3) {
    _.extend(config, {level: level});
  }

  return config;
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

