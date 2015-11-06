
var currentDir = new java.io.File(__DIR__);
var nashornRequireJs = new java.io.File(currentDir, "../src/nashorn-require.js");
var programJs = new java.io.File(arguments[0].replace(/"/g, ""));

if (!programJs.exists()) throw new Error("Missing: " + programJs);

// Load require, then the test program
load(nashornRequireJs.toString());
load(programJs.toString());
