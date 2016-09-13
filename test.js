
var nginx         = require('./nginx');
var _             = require('underscore');
var path          = require('path');

var fileRoot      = "/home/scotty/tmp/nginx";
var errorLogFile  = path.join(fileRoot, "log", "error.log");
var pidFile       = path.join(fileRoot, "nginx.pid");
var uploadPath    = path.join(fileRoot, "client_body_temp");
var rootPath      = path.join(fileRoot, "fileroot");

var blueCoat      = ["8.28.16.0/24", "103.246.38.0/24"];

var blueCoatDenyBlock;

var config = nginx(function() {
  user("scotty");
  workerProcesses(2);

  blankLine();
  errorLog(errorLogFile);
  errorLog(errorLogFile, {level:'notice'});

  blankLine();
  pid(pidFile);

  events(function() {
    workerConnections(23);
  });

  theHttp = http(function() {
    upload(uploadPath, {maxSize: "25M"});

    blankLine();
    include("blockips.conf");

    blankLine();
    blueCoatDenyBlock = block("Go away blue-coat", function() {
    });

    upstream('pcl_upstream', function() {
      server('10.0.0.10:8100', {failTimeout: 3600});
    });

    server(function() {
      serverName(['foo.example.com', '*.example.com', '']);
      root(rootPath);
      theItem = block(function() {
        listen(80, {ssl: true, default_server: true});
      });

      locationRe("/rip", function() {
        proxyPass("pcl_upstream", {longHeld:true});
      });

      blankLine();
      tryFiles(["maintenance.html", "@mario_router_loc"]);

      namedLocation("mario_router_loc", function() {
        proxyPass("pcl_upstream");
      });

    });
  });
});

// Append the BlueCoat IPs
_.each(blueCoat, function(ip) {
  append(blueCoatDenyBlock, deny, ip);
});

config.write();

