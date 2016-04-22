var ansi;

var currentDir = new java.io.File(__DIR__);
var nashornRequireFile = new java.io.File(currentDir, "../dist/nashorn-require.js");

// The path to program.js is passed as argument by the commonjs.js test file
var programFile = new java.io.File(this.arguments[0].replace(/"/g, ""));
var programDirPath = programFile.getParent();

if (!programFile.exists()) throw new Error("Missing: " + programFile);

var optionsJs = programDirPath + "/options.js";

try {
  var loadedOptions = {};
  if (new java.io.File(optionsJs).exists()) {
    load(optionsJs);
    loadedOptions = this.options; // as load doesn't return anything of value
    if (!loadedOptions) throw new Error("Failed to load options from " + optionsJs);
  }

  // Load require, then require the test program
  //print("--> Loading " + nashornRequireFile);
  var initRequire = load(nashornRequireFile.toString());
  var initOpts = {
    mainFile: programFile, //__FILE__,
    debug: true
  };
  // Add loaded options
  for (var k in loadedOptions) {
    initOpts[k] = loadedOptions[k];
  }
  initRequire(initOpts);

  // Load color support for printing messages
  withRoot(currentDir, function () {
    ansi = require("ansi"); // require as top-level
  });

  print("TEST FILE: " + programFile);
  withFailDetectingPrint(function () {
    withRoot(programDirPath, function () {
      load(programFile);
    });
  });
} catch (e) {
  // Print the stack if there is one, otherwise just the message
  if (e.stack) {
    // Print the message unless the stack contains it already
    if (e.stack.indexOf(e.message) < 0)
      print(e.message);
    print(e.stack);
  } else print(e.message);
  throw new Error("Abort");
} finally {
  // Emit an empty line between test programs to make the output easier to read.
  print("");
}

function withRoot(root, fun) {
  require.paths.push(root);
  try {
    fun();
  } finally {
    require.paths.pop();
  }
}

function withFailDetectingPrint(closure) {
  var oldPrint = this.print;
  var replacementPrint = createPrintWithFailureDetection(oldPrint);
  this.print = replacementPrint;
  try {
    closure();
  } finally {
    this.print = oldPrint;
  }
  if (replacementPrint.failures.length) {
    throw new Error("There were failures!")
  }
}

function createPrintWithFailureDetection(oldPrint) {
  var printFun = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var msg = args.join(" ");
    if (msg.toString().toLowerCase().indexOf("fail") === 0) {
      // Collect failures - to be acted upon after the test run for the program is finished.
      // This means that all failures are printed, *then* there will be a stopping failure.
      printFun.failures.push(msg);
    }
    // Replace occurrences of uppercase PASS/FAIL with colored versions
    msg = msg.replace(/PASS/g, ansi.brightGreen("PASS")).replace(/FAIL/g, ansi.brightRed("FAIL"));
    oldPrint(msg);
  };
  printFun.failures = [];
  return printFun;
}
