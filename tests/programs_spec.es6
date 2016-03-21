"use strict";
const
  fs = require("fs"),
  path = require("path"),
  exec = require("child_process").exec,
  util = require("util"),
  ansi = require("./ansi"),
  tests = [],
  maybeProgramFilter = process.argv[2];

function matchesProgramFilter(pathToProgram, dir, fileName) {
  // If there is no filter, everything matches
  if (!maybeProgramFilter) return true;

  // Assume the filter is a path to the program directory or the program file. Normalize since we'll compare paths.
  var filterPath = path.normalize(path.join(process.cwd(), maybeProgramFilter));

  // Create a list of paths where the filter should match at least one. Normalize here as well.
  var folderPath = path.normalize(dir);
  var programFilePath = path.normalize(pathToProgram);
  var candidates = [folderPath, programFilePath];

  return candidates.indexOf(filterPath) >= 0;
}

function addProgramTest(pathToProgram, dir, fileName) {
  var testName = "Test program: " + path.basename(path.dirname(pathToProgram));
  tests.push(new SingleTest(testName, (next) => {
    if (!matchesProgramFilter(pathToProgram, dir, fileName)) throw new IgnoredTestProgramError();
    runProgramWithExec(pathToProgram, next);
  }));
}

function runProgramWithExec(pathToProgram, next) {
  if (typeof next !== "function") throw new Error("runProgramWithExec: no 'next' function");
  const cmd = "jjs tests/program-runner.js -- \"" + pathToProgram + "\"";
  exec(cmd, next);
}

function walkDirSync(dir, callback) {
  var list = fs.readdirSync(dir);
  list.forEach((file) => {
    var fullFile = path.resolve(dir, file);
    var stat = fs.statSync(fullFile);
    if (stat && stat.isDirectory()) walkDirSync(fullFile, callback);
    else callback(fullFile, dir, file);
  });
}

function runTests() {
  console.log("Running tests");
  runNextTest(tests.concat());
}

function printSuccess(msg) {
  console.log(ansi.brightGreen(msg));
}

function printFailure(msg) {
  console.log(ansi.brightRed(msg));
}

function printWarning(msg) {
  console.log(ansi.brightYellow(msg));
}

function printTestSuccess(singleTest) {
  printSuccess("\u2713 " + singleTest.name);
}

function printTestFailure(singleTest) {
  printFailure("\u2717 " + singleTest.name);
}

function printTestIgnored(singleTest) {
  printWarning("- " + singleTest.name);
}

function runNextTest(todoList) {
  if (todoList.length === 0) return allDone();
  const singleTest = todoList.shift();
  try {
    singleTest.run((error, stdout, stderr) => {
      if (error || stderr.length) {
        printTestFailure(singleTest);
        singleTest.testFailed(error, stdout, stderr);
      } else {
        printTestSuccess(singleTest);
      }
      runNextTest(todoList);
    });
  } catch (e) {
    if (e instanceof IgnoredTestProgramError) {
      printTestIgnored(singleTest);
      singleTest.testIgnored();
    } else {
      printTestFailure(singleTest);
      singleTest.testFailed(e, new Buffer(0), new Buffer(0));
    }
    runNextTest(todoList);
  }
}

function allDone() {
  console.log("");

  const failedTests = tests.filter((test) => { return test.didFail; });
  const ignoredCount = tests.filter((test) => { return test.ignored; }).length;
  const runTests = tests.length - ignoredCount;

  const summary = util.format("%d tests, %d failures, %d ignored", tests.length, failedTests.length, ignoredCount);
  const didFail = failedTests.length || runTests === 0;
  if (didFail) printFailure(summary); else printSuccess(summary);

  failedTests.forEach((failedTest, idx) => {
    console.log("");
    console.log(util.format("  %d) %s", idx + 1, failedTest.name));
    console.log("");
    console.log("    Error:");
    console.log(indent(failedTest.failure.error.toString(), 6));
    if (failedTest.failure.stdout.length) {
      console.log("");
      console.log("    Stdout:");
      console.log(indent(failedTest.failure.stdout.toString(), 6));
    }
    if (failedTest.failure.stderr.length) {
      console.log("");
      console.log("    Stderr:");
      console.log(indent(failedTest.failure.stderr.toString(), 6));
    }
  });

  if (runTests === 0) {
    printFailure("No tests run at all :-(");
    process.exit(1);
  }

  process.exit(failedTests.length);
}

function indent(text, spaceCount) {
  const spaceString = new Array(spaceCount).join(" ");
  return text.replace(/^/gm, spaceString);
}

class SingleTest {
  constructor(name, testFunction) {
    this.name = name;
    this.testFunction = testFunction;
  }

  run(next) {
    return this.testFunction(next);
  }

  testFailed(error, stdout, stderr) {
    this.failure = {
      error: error,
      stdout: stdout,
      stderr: stderr
    };
  }

  testIgnored() {
    this.ignored = true;
  }

  get didFail() {
    return !!this.failure;
  }
}

function IgnoredTestProgramError() {
  this.name = this.constructor.name;
  this.message = "Ignored";
}

util.inherits(IgnoredTestProgramError, Error);

// =========================================== RUN ===========================================

var programDirs = ["commonjs/tests/modules", "tests/commonjs-missing", "tests/commonjs-optional", "tests/nodejs", "tests/misc"];

programDirs.forEach((programDir) => {
  walkDirSync(programDir, (fullPath, dir, file) => {
    if (file !== "program.js") return;
    addProgramTest(fullPath, dir, file);
  });
});

runTests();