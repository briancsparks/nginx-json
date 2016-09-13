
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

global.location = function(path, options_, fn, parent_) {
  var parent  = parent_   || current;
  var options = options_  || {};
  var reStr   = "";

  if (options.re)            { reStr = '~'; }     // Regular expression
  else if (options.rei)      { reStr = '~*'; }    // Case-insensitive regular expression
  else if (options.trumpRe)  { reStr = '^~'; }    // Trumps re-matched locations
  else if (options.exact)    { reStr = '='; }     // Exact path match

  var level  = depth(parent);
  var config = config_fn({location:[]}, fn);

  var locationLine = _.compact(['location', reStr, path]).join(' ');
  var item = { fn: function() {
    write();
    write(level, locationLine+" {");
    _.each(config.location, function(item) {
      dispatch(item);
    });
    write(level, "}");
  }};
  getConfigFrom(['server'], 'location', parent).push(item);

  return config;
};

global.locationRe = function(path, fn, parent_) {
  return global.location(path, {re:true}, fn, parent_);
};

global.locationRei = function(path, fn, parent_) {
  return global.location(path, {rei:true}, fn, parent_);
};

global.locationExact = function(path, fn, parent_) {
  return global.location(path, {exact:true}, fn, parent_);
};

global.locationTrumpRe = function(path, fn, parent_) {
  return global.location(path, {trumpRe:true}, fn, parent_);
};

global.namedLocation = function(path, fn, parent_) {
  return global.location("@"+path, {}, fn, parent_);
};

global.upstream = function(name, fn, parent_) {
  var parent = parent_ || current;

  var level  = depth(parent);
  var config = config_fn({upstream:[]}, fn);

  var item = { fn: function() {
    write();
    write(level, "upstream "+name+" {");
    _.each(config.upstream, function(item) {
      dispatch(item);
    });
    write(level, "}");
  }};
  getConfigFrom(['http'], 'upstream', parent).push(item);

  return config;
};

global.block = function(/*comment, fn, parent*/) {
  var args      = _.toArray(arguments);
  var comment   = _.isString(args[0]) ? args.shift() : null;
  var fn        = _.isFunction(args[0]) ? args.shift() : function(){};
  var parent    = args.length > 0 ? args.shift() : current;

  var level  = depth(parent);
  var config = config_fn({block:[]}, fn);

  var item = { fn: function() {
    write();
    if (comment) {
      write(level, "# "+comment);
    }

    _.each(config.block, function(item) {
      dispatch(item);
    });
  }};
  getConfigFrom([], 'block', parent).push(item);

  return config;
};


// the nginx global
var nginx = module.exports = function(fn) {
  var config = current = _.extend(root, {g:[], parent: null});
  fn(current);
  return {
    write: function() {
      _.each(root.g, function(item) {
        dispatch(item);
      });
    }
  };
};


// --------------------------------------------------------------------
//  Simple Items
// --------------------------------------------------------------------

global.singleLine = function(elts, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, elts);
  }};
  getConfigFrom([], 'singleLine', parent).push(item);
};

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

global.root = function(rootPath, parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    writeln(level, ["root", rootPath]);
  }};
  getConfigFrom([], 'root', parent).push(item);
};

global.tryFiles = function(names, parent_) {
  if (!_.isArray(names)) { return global.tryFiles([names], parent_); }

  var parent = parent_ || current;
  var level  = depth(parent);

  var writeArgs = _.toArray(names);
  writeArgs.unshift("try_files");

  var item = { fn: function() {
    writeln(level, writeArgs);
  }};
  getConfigFrom(['server'], 'server_name', parent).push(item);
};

global.proxyPass = function(name /*, options, parent*/) {
  var args    = _.rest(arguments);
  var parent  = args.length > 1 ? args.pop() : current;
  var options = args.pop() || {};

  var level  = depth(parent);

  var item = { fn: function() {
    if (options.longHeld) {
      writeln(level, ["proxy_connect_timeout", 5000]);
      writeln(level, ["proxy_send_timeout", 5000]);
      writeln(level, ["proxy_read_timeout", 5000]);
      writeln(level, ["send_timeout", 5000]);
    }

    writeln(level, ["proxy_redirect", "off"]);
    writeln(level, ["proxy_set_header", "X-Real-IP", "$remote_addr"]);
    writeln(level, ["proxy_set_header", "X-Forwarded-For", "$proxy_add_x_forwarded_for"]);
    writeln(level, ["proxy_set_header", "X-Forwarded-Proto", "$scheme"]);
    writeln(level, ["proxy_set_header", "Host", "$http_host"]);
    writeln(level, ["proxy_set_header", "X-NginX-Proxy", true]);
    writeln(level, ["proxy_set_header", "Connection", ""]);
    writeln(level, ["proxy_http_version", "1.1"]);
    writeln(level, ["proxy_pass", "http://"+name]);
  }};
  getConfigFrom([], 'proxy_pass', parent).push(item);
};

global.serverName = function(names, parent_) {
  if (!_.isArray(names)) { return global.serverName([names], parent_); }

  var parent = parent_ || current;
  var level  = depth(parent);

  // TODO: must be able to use an empty string ""
  var writeArgs = _.toArray(names);

  writeArgs.unshift("server_name");

  var item = { fn: function() {
    writeln(level, writeArgs);
  }};
  getConfigFrom(['server'], 'server_name', parent).push(item);
};

global.blankLine = function(parent_) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    write();
  }};
  getConfigFrom([], 'blankLine', parent).push(item);
};

global.append = function(config, parameter /*, args*/) {

  var args = _.rest(arguments, 2);

  args.push(config);
  return parameter.apply(this, args);
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

global.listenSsl = function(port, certPrefix, params_, parent_) {
  var parent = parent_ || current;
  var level  = depth(current);

  var params          = params_ || {};
  var default_server  = params.default_server;

  var item = { fn: function() {
    write();
    writeln(level, ["listen", port, "ssl", default_server && 'default']);
    writeln(level, ["ssl_certificate", certPrefix+".chained.crt"]);
    writeln(level, ["ssl_certificate_key", certPrefix+".key"]);
    writeln(level, ["ssl_protocols", "TLSv1", "TLSv1.1", "TLSv1.2"]);
    writeln(level, ["ssl_ciphers", "HIGH:!aNULL:!MD5"]);
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

// server can be the server block, or a server item in upstream
var serverBlock = global.server;
global.server = function(address, params_, parent_) {
  var parent = parent_ || current;

  if (!getConfigFrom(['upstream'], 'server', parent, {noDie:true})) {
    return serverBlock.apply(this, arguments);
  }

  /* otherwise -- must be a simple server, not the block */
  var level  = depth(parent);

  var params          = params_ || {};
  var weight          = params.weight;
  var maxFails        = params.maxFails;
  var failTimeout     = params.failTimeout;
  var backup          = params.backup;
  var down            = params.down;

  var item = { fn: function() {
    writeln(level, ["server", address, weight && "weight="+weight, maxFails && "max_fails="+maxFails, failTimeout && "fail_timeout="+failTimeout, backup && 'backup', down && 'down']);
  }};
  getConfigFrom([], 'deny', parent).push(item);
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

function getConfigFrom(names, ctxName, obj_, options_) {
  var obj     = obj_      || current;
  var options = options_  || {};

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

  /* otherwise -- not found */
  if (options.noDie) {
    return /*undefined*/;
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

