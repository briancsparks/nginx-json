
var nginx         = require('./nginx');
var _             = require('underscore');
var path          = require('path');

var fileRoot      = "/home/scotty/tmp/nginx";
var errorLogFile  = path.join(fileRoot, "log", "error.log");
var pidFile       = path.join(fileRoot, "nginx.pid");
var uploadPath    = path.join(fileRoot, "client_body_temp");

var webroot       = "/var/www";

var blueCoat      = ["8.28.16.0/24", "103.246.38.0/24"];

var blueCoatDenyBlock;

var config = nginx(function() {
  user("scotty");
  workerProcesses(2);

  blankLine();
  errorLog(errorLogFile);
  errorLog(errorLogFile, {msgLevel:'notice'});

  blankLine();
  pid(pidFile);

  events(function() {
    workerConnections(23);
  });

  http(function() {
    upload(uploadPath, {maxSize: "25M"});

    blankLine();
    include("blockips.conf");

    blueCoatDenyBlock = block("Go away blue-coat", function() {
    });

    upstream('pcl_upstream', function() {
      server('10.0.0.10:8100', {failTimeout: 3600});
    });

    server(function() {
      serverName(['foo.example.com', '*.example.com', '']);
      root(webroot);

      block(function() {
        listenSsl(443, "/home/scotty/tmp/nginx/partner.example.com");
      });

      theItem = block(function() {
        listen(80, {default_server: true});
      });

      internalRedirLocation("^/secret_internal_rev_proxy/(.*)", function() {
        blankLine();
        set("$download_uri", "$1");

        blankLine();
        proxyPass("http://127.0.0.1/$download_uri");

      });

      internalRedirLocation("^/secret_internal_balanceto/(.*)/(.*)", function() {
        blankLine();
        set("$download_host", "$1");
        set("$download_path", "$2");

        blankLine();
        proxyPass("http://$download_host/$download_path");

      });

      internalRedirLocation("^/secret_external_rev_proxy/(.*?)/(.*)", function() {
        blankLine();
        set("$download_host", "$1");
        set("$download_uri", "$2");
        set("$download_url", "http://$download_host/$download_uri");

        blankLine();
        proxySetHeader("Host", "$download_host");

        blankLine();
        proxyPass("http://$download_url");

      });

      block("New locations here", function() {
        locationRe("^/poll", function() {
          singleLine(["access_log", "off"]);

          blankLine();
          proxyPassEx("pcl_upstream");
        });
      });

      locationRe("/rip", function() {
        proxyPassEx("pcl_upstream", {longHeld:true});
      });

      blankLine();
      tryFiles(["maintenance.html", "@mario_router_loc"]);

      namedLocation("mario_router_loc", function() {
        proxyPassEx("pcl_upstream");
      });

    });

  });
});

// Append the BlueCoat IPs
_.each(blueCoat, function(ip) {
  append(blueCoatDenyBlock, deny, ip);
});

config.write();

