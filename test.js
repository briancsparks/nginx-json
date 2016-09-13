
var nginx         = require('./nginx');
var _             = require('underscore');
var path          = require('path');

var fileRoot      = "/home/scotty/tmp/nginx";
var errorLogFile  = path.join(fileRoot, "log", "error.log");
var pidFile       = path.join(fileRoot, "nginx.pid");
var uploadPath    = path.join(fileRoot, "client_body_temp");

var blueCoat      = ["8.28.16.0/24", "103.246.38.0/24"];

var theHttp;

nginx(function() {
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
    _.each(blueCoat, function(ip) {
      deny(ip);
    });

    blankLine();
    include("blockips.conf");

    server(function() {
      listen(80, {ssl: true, default_server: true});
    });
  });

  //append(theHttp, "deny", "199.91.135.0/24");
});

