var lint = require("jake-jshint");

desc("Lint the code");
task("lint", [], function () {
  var files = new jake.FileList();
  files.include("src/*.js");

  var options = {
  };
  var globals = {
    load: false             // Nashorn load is read-only
  ,
  };

  var pass = lint.validateFileList(files.toArray(), options, globals);
  if (!pass) fail("Lint failed");
});

testTask('nashorn-require', ['lint'], function () {
  var fileList = [
    'tests/*'
  ];
  this.testFiles.include(fileList);
  this.testFiles.exclude('tests/jjs-runner.js');
  this.testName = 'test';
});