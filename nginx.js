
var _       = require('underscore');

var stack       = [];

// --------------------------------------------------------------------
//  Blocks
// --------------------------------------------------------------------

global.events = function(fn) {

  var parent = getConfig(['g'], 'events');
  var level  = stack.length;
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
  var level  = stack.length;
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
  var level  = stack.length;
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
  var config = {g:[]};
  stack.unshift(config);
  fn();

  _.each(config.g, function(fn) {
    fn();
  });
};


// --------------------------------------------------------------------
//  Simple Items
// --------------------------------------------------------------------

global.workerConnections = function(count) {
  var level  = stack.length;

  getConfig(['events'], 'workerConnections').push(function() {
    writeln(level, ["worker_connections", count]);
  });
};

global.user = function(name) {
  var level  = stack.length;

  getConfig(['g'], 'user').push(function() {
    writeln(level, ["user", name]);
  });
};

global.workerProcesses = function(count) {
  var level  = stack.length;

  getConfig(['g'], 'worker_processes').push(function() {
    writeln(level, ["worker_processes", count]);
  });
};

global.pid = function(id) {
  var level  = stack.length;

  getConfig(['g'], 'pid').push(function() {
    writeln(level, ["pid", id]);
  });
};

global.deny = function(name, getConfig_) {
  var ggetConfig  = getConfig_ || getConfig;
  var level       = stack.length;

  ggetConfig([], 'deny').push(function() {
    writeln(level, ["deny", name]);
  });
};

global.include = function(name) {
  var level  = stack.length;

  getConfig([], 'include').push(function() {
    writeln(level, ["include", name]);
  });
};

global.blankLine = function() {
  var level  = stack.length;

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
  var level  = stack.length;

  var params          = params_ || {};
  var default_server  = params.default_server;
  var ssl             = params.ssl;

  parent.push(function() {
    writeln(level, ["listen", port, ssl && "ssl", default_server && 'default']);
  });
};

global.errorLog = function(name, params_) {
  var parent = getConfig(['g'], 'errorLog');
  var level  = stack.length;

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
  var level  = stack.length;

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
    die(ctxName+" is not in right block, should be: "+names.join(', or'));
    return;
  }
}

function config_fn(config, fn, level) {

  stack.unshift(config);
  fn();
  stack.shift();

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

