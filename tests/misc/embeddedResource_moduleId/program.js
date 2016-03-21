var test = require("../../test");

var curDir = new java.io.File(__DIR__);
var jarFile = new java.io.File(curDir, "../../../dist/package.jar");

require.paths.push(jarFile.toString());

var a = require("embedded/moduleId/a");
var b = require("embedded/moduleId/b");
test.assert(a.foo === b.foo, "a should be requirable via its module id");