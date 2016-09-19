
var _           = require('underscore');
var fs          = require('fs');
var path        = require('path');
var spawnSync   = require('child_process').spawnSync;
var util        = require('util');

require('shelljs/global');

var format      = util.format;

var prefix      = '/etc/nginx/';

var root        = {};
var current;
var outputLines = [];   // the write() function pushes all written lines to this array

// --------------------------------------------------------------------
//  Utilities
// --------------------------------------------------------------------

var setPrefix = global.setPrefix = function(prefix_) {
  prefix = prefix_;
};

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

var writer = function(filename, options_) {
  var options = options_ || {};

  options.prefix && setPrefix(options.prefix);

  write(0, ['# vim: filetype=nginx:']);
  _.each(root.g, function(item) {
    dispatch(item);
  });
  write();

  var contents = outputLines.join('\n');
  if (filename) {
    return fs.writeFileSync(path.join(prefix, filename), contents, {encoding:'utf8', mode:0o644});
  }

  /* otherwise -- just send to stdout */
  process.stdout.write(contents);
};

// the nginx global
var nginx = module.exports = function(fn) {
  var config = current = _.extend(root, {g:[], parent: null});
  fn(current);
  return {
    write: writer
  };
};


// --------------------------------------------------------------------
//  Simple Items
// --------------------------------------------------------------------

var simpleItem = function(myName, validLocNames, parent_, fn) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    return fn(level);
  }};
  getConfigFrom(validLocNames, myName, parent).push(item);

  return item;
};

global.singleLine = function(elts, parent) {
  return simpleItem('single_line', [], parent, function(level) {
    writeln(level, elts);
  });
};

global.workerConnections = function(count, parent) {
  return simpleItem('worker_connections', ['events'], parent, function(level) {
    writeln(level, ["worker_connections", count]);
  });
};

global.user = function(name, parent) {
  return simpleItem('user', ['g'], parent, function(level) {
    writeln(level, ["user", name]);
  });
};

global.workerProcesses = function(count, parent) {
  return simpleItem('worker_process', ['g'], parent, function(level) {
    writeln(level, ["worker_processes", count]);
  });
};

global.pid = function(id, parent) {
  return simpleItem('pid', ['g'], parent, function(level) {
    writeln(level, ["pid", id]);
  });
};

global.deny = function(name, parent) {
  return simpleItem('deny', [], parent, function(level) {
    writeln(level, ["deny", name]);
  });
};

global.allow = function(name, parent) {
  return simpleItem('allow', [], parent, function(level) {
    writeln(level, ["allow", name]);
  });
};

global.internal = function(parent) {
  return simpleItem('internal', ['location'], parent, function(level) {
    writeln(level, ["internal"]);
  });
};

global.include = function(name, parent) {
  return simpleItem('include', [], parent, function(level) {
    writeln(level, ["include", name]);
  });
};

global.root = function(rootPath, parent) {
  return simpleItem('root', [], parent, function(level) {
    writeln(level, ["root", rootPath]);
  });
};

global.proxyBuffering = function(onOrOff, parent) {
  return simpleItem('proxy_buffering', ['location'], parent, function(level) {
    writeln(level, ["proxy_buffering", onOrOff]);
  });
};

global.proxySetHeader = function(headerName, value, parent) {
  return simpleItem('proxy_set_header', ['location'], parent, function(level) {
    writeln(level, ["proxy_set_header", headerName, '"'+value+'"']);
  });
};

global.proxyMethod = function(name, parent) {
  return simpleItem('proxy_method', ['location'], parent, function(level) {
    writeln(level, ["proxy_method", name]);
  });
};

global.proxyPassRequestBody = function(onOrOff, parent) {
  return simpleItem('proxy_pass_request_body', ['location'], parent, function(level) {
    writeln(level, ["proxy_pass_request_body", onOrOff]);
  });
};

global.proxyMaxTempFileSize = function(size, parent) {
  return simpleItem('proxy_max_temp_file_size', ['location'], parent, function(level) {
    writeln(level, ["proxy_max_temp_file_size", +size]);
  });
};

global.set_ = function(varName, value, parent) {
  return simpleItem('set', [], parent, function(level) {
    writeln(level, ["set", varName, '"'+value+'"']);
  });
};

global.proxyPass = function(url, parent) {
  return simpleItem('proxy_pass', ['location'], parent, function(level) {
    write();
    writeln(level, ["proxy_pass", url]);
  });
};

global.internalRedirLocation = function(path, fn, parent_) {

  locationRei(path, function() {
    internal();

    blankLine();
    proxyBuffering("off");
    proxySetHeader("Content-Length", "");
    proxySetHeader("Cookie", "");

    blankLine();
    proxyMethod("GET");
    proxyPassRequestBody("off");
    proxyMaxTempFileSize(0);

    blankLine();

    fn();
  }, parent_ || current);

};






global.tryFiles = function(names, parent_) {
  if (!_.isArray(names)) { return global.tryFiles([names], parent_); }

  var parent = parent_ || current;
  var level  = depth(parent);

  var writeArgs = _.toArray(names);
  writeArgs.unshift("try_files");

  var item = { fn: function() {
    write();
    writeln(level, writeArgs);
  }};
  getConfigFrom(['server'], 'server_name', parent).push(item);
};

global.proxyPassEx = function(name /*, options, parent*/) {
  var args    = _.rest(arguments);
  var parent  = args.length > 1 ? args.pop() : current;
  var options = args.pop() || {};

  var level  = depth(parent);

  var item = { fn: function() {
    write();

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

global.blankLine = function(parent) {
  return simpleItem('blank_line', [], parent, function(level) {
    write();
  });
};

global.append = function(config, parameter /*, args*/) {

  var args = _.rest(arguments, 2);

  args.push(config);
  return parameter.apply(this, args);
};

// --------------------------------------------------------------------
//  Sophisticated Items
// --------------------------------------------------------------------

var notSoSimpleItem = function(myName, validLocNames, paramNames, params, parent_, fn) {
  var parent = parent_ || current;
  var level  = depth(parent);

  var item = { fn: function() {
    var args = [level];
    _.each(paramNames, function(name) {
      args.push(params[name]);
    });
    return fn.apply(this, args);
  }};
  getConfigFrom(validLocNames, myName, parent).push(item);

  return item;
};

global.listen = function(port, params, parent) {
  var names = "default_server,ssl".split(',');
  return notSoSimpleItem('listen', ['server'], names, params || {}, parent, function(level, default_server, ssl) {
    write();
    writeln(level, ["listen", port, ssl && "ssl", default_server && 'default']);
  });
};

global.listenSsl = function(port, certPrefix, params, parent) {
  var names = "default_server,cn".split(',');
  return notSoSimpleItem('listen_ssl', ['server'], names, params || {}, parent, function(level, default_server, cn_) {
    var cn        = cn_ || '';
    var proc;
    var certFile  = certPrefix+".chained.crt";
    var keyFile   = certPrefix+".key";

    write();
    writeln(level, ["listen", port, "ssl", default_server && 'default']);
    writeln(level, ["ssl_certificate", certFile]);
    writeln(level, ["ssl_certificate_key", keyFile]);
    writeln(level, ["ssl_protocols", "TLSv1", "TLSv1.1", "TLSv1.2"]);
    writeln(level, ["ssl_ciphers", "HIGH:!aNULL:!MD5"]);

    // From: http://www.codenes.com/blog/?p=300 (one of the comments)
    // openssl req -nodes -x509 -newkey rsa:4096 -keyout key.pem -out cert.crt -days 356 -subj "/C=US/ST=California/L=San Diego/O=IT/CN="

    // If the cert does not exist, create a self-signed cert
    if (!test('-f', certFile)) {

      // Need CN
      if (!cn) {
        console.warn('Cert '+certFile+' specified, but not present, and no CN.');
        return;
      }

      /* otherwise */
      var subj = "/C=US/ST=California/L=San Diego/O=IT/CN="+cn;

      mkdir('-p', certPrefix);

      args = ['req', '-nodes', '-x509', '-newkey', 'rsa:4096', '-keyout', keyFile, '-out', certFile, '-days', 365, '-subj', subj];
      proc = spawnSync('openssl', args);
      if (proc.error || proc.status !== 0 || proc.signal) {
        console.error(format("Trying to create self-signed cert: %s -- err: %s, exitCode: %d, signal: %s", certFile, JSON.stringify(proc.error), +proc.status, proc.signal || 'NOSIGNAL'));
      }
    }
  });
};

global.errorLog = function(name, params, parent) {
  var names = "msgLevel".split(',');
  return notSoSimpleItem('error_log', ['g'], names, params || {}, parent, function(level, msgLevel) {
    writeln(level, ["error_log", name, msgLevel]);
  });
};

// --------------------------------------------------------------------
//  Compound Items
// --------------------------------------------------------------------

global.upload = function(uploadPath, params, parent) {
  var names = "maxSize".split(',');
  return notSoSimpleItem('upload', ['http', 'server'], names, params || {}, parent, function(level, maxSize) {
    writeln(level, ["client_body_temp_path", uploadPath]);
    if ('maxSize' in params) {
      writeln(level, ["client_max_body_size", maxSize]);
    }
  });
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

/**
 *  Does not eliminate zeros or empty strings.
 */
function _compact(arr) {
  return _.chain(arr).map(function(item) {
    if (item === '')  { return '""'; }
    return item;
  }).filter(function(item) {
    if (item === 0)   { return true; }
    if (item === '')  { return true; }

    return item;
  }).value();
}

function writeln(a, b) {
  var level = a;
  var x     = b;

  if (arguments.length === 1) {
    level = 0;
    x     = a;
  }

  var last = x.pop();
  if (last === '') {
    last = '""';
  } else if (_.isUndefined(last)) {
    last = '';
  }
  x.push(last+';');

  return write(level, x);
}

function write(a, b) {
  var writeOne = function(line) {
    var i, str = '';
    for (i = 1; i < level; ++i) {
      str += '  ';
    }
    str += line || '';
    outputLines.push(str);
  };

  var level = a;
  var x     = b;

  if (arguments.length === 1) {
    level = 0;
    x     = a;
  }

  if (_.isArray(x)) {
    writeOne(_compact(x).join(' '));
  } else {
    writeOne(x);
  }
}

