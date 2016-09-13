
var nginx         = require('./nginx');
var _             = require('underscore');
var path          = require('path');

var fileRoot      = "/home/scotty/tmp/nginx";
var errorLogFile  = path.join(fileRoot, "log", "error.log");
var pidFile       = path.join(fileRoot, "nginx.pid");
var uploadPath    = path.join(fileRoot, "client_body_temp");

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

    server(function() {
      theItem = block(function() {
        listen(80, {ssl: true, default_server: true});
      });
    });
  });
});

// Append the BlueCoat IPs
_.each(blueCoat, function(ip) {
  append(blueCoatDenyBlock, deny, ip);
});

config.write();

