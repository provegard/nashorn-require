
var currentDir = new java.io.File(__DIR__);
var nashornRequireJs = new java.io.File(currentDir, "../dist/nashorn-require.js");

// The path to program.js is passed as argument by the commonjs.js test file
var programJs = new java.io.File(this.arguments[0].replace(/"/g, ""));

if (!programJs.exists()) throw new Error("Missing: " + programJs);

try {
// Load require, then require the test program
  print("--> Loading " + nashornRequireJs);
  load(nashornRequireJs.toString());
  print("--> Requiring " + programJs);
  require(programJs.toString());
} catch (e) {
  if (e.stack && e.stack.indexOf(e.message) >= 0) print(e.stack);
  else print(e.message);
  throw new Error("Abort");
}