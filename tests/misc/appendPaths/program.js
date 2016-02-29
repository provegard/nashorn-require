var test = require("../../test");

var currentDir = new java.io.File(__DIR__);
var subDir = new java.io.File(currentDir, "sub");

require.paths.push(subDir.toString());
var a = require("a");
test.assert(a.alive() === "yes", "it should be possible to add new root paths");
