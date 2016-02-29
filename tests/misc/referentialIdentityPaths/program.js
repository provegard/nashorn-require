var test = require("../../test");

var a = require("./sub/a");

test.assert(require.paths === a.paths(), "require.paths should be referentially identical in all modules");