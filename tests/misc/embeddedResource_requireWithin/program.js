var test = require("../../test");

var curDir = new java.io.File(__DIR__);
var jarFile = new java.io.File(curDir, "../../../dist/package.jar");

require.paths.push(jarFile.toString());

var injar = require("embedded/injar2");
test.assertEq(injar.peerStatus(), "I'm in a JAR", "should be possible to require another module within a JAR file");
