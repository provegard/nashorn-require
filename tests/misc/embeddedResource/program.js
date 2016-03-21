var test = require("../../test");

var curDir = new java.io.File(__DIR__);
var jarFile = new java.io.File(curDir, "../../../dist/package.jar");

require.paths.push(jarFile.toString());

var injar = require("embedded/injar");
test.assert(injar.status() === "I'm in a JAR", "should be possible to include an embedded resource module");

test.assertThrowsWithMessage(function () {
  require("embedded/foobar");
}, /^Failed to locate module/);
