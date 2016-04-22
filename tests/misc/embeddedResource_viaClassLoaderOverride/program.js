var test = require("../../test");

var curDir = new java.io.File(__DIR__);
var jarFile = new java.io.File(curDir, "../../../dist/package.jar");

require.paths.push(jarFile.toString());

var injar = require("embedded/injar");
test.assertEq(injar.status(), "I'm in a JAR", "should use a JAR file in require.paths before the init class loader");
