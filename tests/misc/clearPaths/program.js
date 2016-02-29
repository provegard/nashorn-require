var test = require("../../test");

require.paths.length = 0;

var a = require("a");
test.assert(a.alive() === "yes", "clearing paths should not affect main root path");
