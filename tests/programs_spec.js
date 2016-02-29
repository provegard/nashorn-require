var
  fs = require("fs"),
  path = require("path"),
  tests = {};

var programDirs = ["commonjs/tests/modules", "tests/commonjs-missing", "tests/commonjs-optional", "tests/nodejs", "tests/misc"];

programDirs.forEach(function (programDir) {
  walkDirSync(programDir, function (fullPath, dir, file) {
    if (file !== "program.js") return;
    addProgramTest(fullPath, file);
  });
});

module.exports = tests;

function addProgramTest(pathToProgram, fileName) {
  // Note: Cannot use colon in test name! https://github.com/jakejs/jake/issues/252
  var testName = "Test program - " + path.basename(path.dirname(pathToProgram));
  tests[testName] = function (next) {
    runProgramWithJjs(pathToProgram, next);
  };
}

function runProgramWithJjs(pathToProgram, next) {
  var cmd = "jjs tests/program-runner.js -- \"" + pathToProgram + "\"";
  var opts = {
    printStdout: true,
    printStderr: true
  };
  // Apparently if the runner throws an exception jake will stop/fail, which is fine.
  jake.exec(cmd, opts, next);
}

function walkDirSync(dir, callback) {
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
    var fullFile = path.resolve(dir, file);
    var stat = fs.statSync(fullFile);
    if (stat && stat.isDirectory()) walkDirSync(fullFile, callback);
    else callback(fullFile, dir, file);
  });
}