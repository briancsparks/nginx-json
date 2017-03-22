
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
  var redirPath = format('/secret_internal_fullbalanceto/%s:%s/%s/%s', ip, port, method, path);
  if (msg) {
    console.log(msg+" routing: ", urlLib.parse(req.url).pathname, ' to ', redirPath);
  }

  res.setHeader('X-Accel-Redirect', redirPath);
  res.end('');
};


_.each(lib, function(value, key) {
  exports[key] = value;
});

