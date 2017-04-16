
/**
 *  Helpers for Node.js apps that are referred to by the nginx conf file.
 */

var sg                  = require('sgsg');
var _                   = sg._;
var util                = require('util');
var format              = util.format;
var urlLib              = require('url');


var lib = {};

/**
 *  Helper function to send the X-Accel-Redirect that nginx wants.
 *
 *  @param {Request}  req         - The Node.js req parameter.
 *  @param {Response} res         - The Node.js res parameter.
 *  @param {string}   ip          - The IP of the machine to redirect to.
 *  @param {number}   [port=80]   - The port of the service being redirected to.
 *  @param {string}   path        - The new path being redirected to.
 *  @param {string}   [msg]       - Any message to log.
 *
 */
lib.balanceTo = function(req, res, ip, a /*[port]*/, b /*path*/, c) {
  var port = a, path = b, msg = c;

  if (!_.isNumber(port))      { port = 80; path = a; msg = b; }

  var method    = req.method;
  var redirPath = format('/internal_fullbalanceto/%s/%s:%s/%s', method, ip, port, path);
  if (msg) {
    console.log(msg+" routing: ", urlLib.parse(req.url).pathname, ' to ', redirPath);
  }

  res.setHeader('X-Accel-Redirect', redirPath);
  res.end('');
};

/**
 *  Helper function to send the X-Accel-Redirect that nginx wants.
 *
 *  @param {Request}  req         - The Node.js req parameter.
 *  @param {Response} res         - The Node.js res parameter.
 *  @param {string}   service     - A full service string like from js-cluster (http://10.11.21.200:8001)
 *  @param {string}   path        - The new path being redirected to.
 *  @param {string}   [msg]       - Any message to log.
 *
 */
lib.balanceToService = function(req, res, service, path, msg) {

  var url       = urlLib.parse(service);
  var method    = req.method;
  var redirPath = format('/internal_fullbalanceto/%s/%s:%s/%s', method, url.hostname, url.port, path);
  if (msg) {
    console.log(msg+" routing: ", urlLib.parse(req.url).pathname, ' to ', redirPath);
  }

  res.setHeader('X-Accel-Redirect', redirPath);
  res.end('');
};

/**
 *  Helper function to send the X-Accel-Redirect that nginx wants.
 *
 *  @param {Request}  req         - The Node.js req parameter.
 *  @param {Response} res         - The Node.js res parameter.
 *  @param {string}   path        - The new path being redirected to.
 *  @param {object}   options     - Options.
 *
 */
lib.instrumentedBalanceTo = function(req, res, path, options_) {
  var options         = options_ || {}, redirPath;
  var method          = req.method;
  var ip              = options.ip;
  var port            = options.port;
  var root            = options.root;
  var parent          = options.parent;
  var sampled         = options.sampled;
  var msg             = options.msg;

  if (options.service) {
    ip    = urlLib.parse(options.service).hostname;
    port  = urlLib.parse(options.service).port;
  }

  // /.../POST/root/parent/sampled/host/path
  if (!parent) {
    redirPath = format('/internal_xraybalanceto/%s/%s/%s/%s:%s/%s', method, root, ''+sampled, ip, ''+port, path);
  } else {
    redirPath = format('/internal_xraybalanceto/%s/%s/%s/%s/%s:%s/%s', method, root, parent, ''+sampled, ip, ''+port, path);
  }

  if (msg) {
    console.log(msg+" routing: ", urlLib.parse(req.url).pathname, ' to ', redirPath);
  }

  res.setHeader('X-Accel-Redirect', redirPath);
  res.end('');
};

/**
 *  Helper function to send the X-Accel-Redirect that nginx wants.
 *
 *  @param {Request}  req         - The Node.js req parameter.
 *  @param {Response} res         - The Node.js res parameter.
 *  @param {string}   ip          - The IP of the machine to redirect to.
 *  @param {number}   [port=80]   - The port of the service being redirected to.
 *  @param {string}   path        - The new path being redirected to.
 *  @param {string}   id          - The id of the instrumentation trace.
 *  @param {string}   [msg]       - Any message to log.
 *
 */
lib.instrumentedBalanceToX = function(req, res, ip, a /*[port]*/, b /*path*/, c /*id*/, d /*msg*/) {
  var port = a, path = b, id = c, msg = d;

  if (!_.isNumber(port))      { port = 80; path = a; id = b; msg = c; }

  // If the original request had an ID, use it, instead
  if (req.headers['x-amzn-trace-id']) {
    id = req.headers['x-amzn-trace-id'];
  }

  var method    = req.method;
  var redirPath = format('/internal_xraybalanceto/%s/1/%s/%s:%s/%s', method, id, ip, port, path);
  if (msg) {
    console.log(msg+" routing: ", urlLib.parse(req.url).pathname, ' to ', redirPath);
  }

  res.setHeader('X-Accel-Redirect', redirPath);
  res.end('');
};

/**
 *  Helper function to send the X-Accel-Redirect that nginx wants.
 *
 *  @param {Request}  req         - The Node.js req parameter.
 *  @param {Response} res         - The Node.js res parameter.
 *  @param {string}   service     - A full service string like from js-cluster (http://10.11.21.200:8001)
 *  @param {string}   path        - The new path being redirected to.
 *  @param {string}   id          - The id of the instrumentation trace.
 *  @param {string}   [msg]       - Any message to log.
 *
 */
lib.instrumentedBalanceToService = function(req, res, service, path, id, msg) {

  // If the original request had an ID, use it, instead
  if (req.headers['x-amzn-trace-id']) {
    id = req.headers['x-amzn-trace-id'];
  }

  var url       = urlLib.parse(service);
  var method    = req.method;
  var redirPath = format('/internal_xraybalanceto/%s/1/%s/%s:%s/%s', method, id, url.hostname, url.port, path);
  if (msg) {
    console.log(msg+" routing: ", urlLib.parse(req.url).pathname, ' to ', redirPath);
  }

  res.setHeader('X-Accel-Redirect', redirPath);
  res.end('');
};


_.each(lib, function(value, key) {
  exports[key] = value;
});

