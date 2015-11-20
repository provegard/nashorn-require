
var currentDir = new java.io.File(__DIR__);
var nashornRequireFile = new java.io.File(currentDir, "../dist/nashorn-require.js");

// The path to program.js is passed as argument by the commonjs.js test file
var programFile = new java.io.File(this.arguments[0].replace(/"/g, ""));
var programDirPath = programFile.getParent();

if (!programFile.exists()) throw new Error("Missing: " + programFile);

try {
  // Load require, then require the test program
  //print("--> Loading " + nashornRequireFile);
  load(nashornRequireFile.toString());

  print("TEST FILE: " + programFile);
  withFailDetectingPrint(function () {
    withRoot(programDirPath, function () {
      //require.debug = true; //TODO: Set via Jake
      require("program");
    });
  });
} catch (e) {
  if (e.stack && e.stack.indexOf(e.message) >= 0) print(e.stack);
  else print(e.message);
  throw new Error("Abort");
} finally {
  // Emit an empty line between test programs to make the output easier to read.
  print("");
}

function withRoot(root, closure) {
  var oldRoot = require.root;
  require.root = root;
  try {
    closure();
  } finally {
    require.root = oldRoot;
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
    if (msg.toString().toLowerCase().indexOf("fail") >= 0) {
      // Collect failures - to be acted upon after the test run for the program is finished.
      // This means that all failures are printed, *then* there will be a stopping failure.
      printFun.failures.push(msg);
    }
    oldPrint(msg);
  };
  printFun.failures = [];
  return printFun;
}