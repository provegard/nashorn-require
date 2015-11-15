var lint = require("jake-jshint");

var isAsync = { async: true };

desc("Build the code");
task("build", [], function () {
  // tsc uses tsconfig.json
  var cmd = "node node_modules/typescript/bin/tsc";
  var opts = {
    printStdout: true,
    printStderr: true
  };
  jake.exec(cmd, opts, complete);
}, isAsync);

desc("Lint the code");
task("lint", [], function () {
  var files = new jake.FileList();
  files.include("src/*.js");

  var options = {
  };
  var globals = {
    load: false,            // Nashorn load is read-only
  };

  var pass = lint.validateFileList(files.toArray(), options, globals);
  if (!pass) fail("Lint failed");
});

testTask("nashorn-require", ["build", "lint"], function () {
  var fileList = [
    "tests/*.js"
  ];
  this.testFiles.include(fileList);
  this.testFiles.exclude("tests/program-runner.js");
  this.testName = "test";
});