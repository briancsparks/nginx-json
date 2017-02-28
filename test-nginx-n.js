
var test        = require('ava');

var libNginx    = require('./nginx-n');
var Nginx       = libNginx.Nginx;
var mkNginx     = libNginx.nginx;

test('sanity', function(t) {
  t.pass();
});

test('event', function(t) {
  var nginx = mkNginx();
  nginx.events(function(n) {
    n.workerConnections(5);
  });

  nginx.write();
});

