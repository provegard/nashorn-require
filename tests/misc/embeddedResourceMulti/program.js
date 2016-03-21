var test = require("../../test");

var curDir = new java.io.File(__DIR__);
var jarFile = new java.io.File(curDir, "../../../dist/package.jar");

require.paths.push(jarFile.toString());

var injar = require("embedded/injar");
var injar2 = require("embedded/injar2");
test.assert(injar.status() === injar2.status(), "should be possible to include multiple embedded resources from the same JAR");
