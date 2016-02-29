var test = require("../../test");
var a = require("./a");

test.assert(require.main === module, "require.main should be the module in the main module");

test.assert(!a.isMain(), "require.main should not refer to the module itself for a child module");

delete require.main;
test.assert(require.main === module, "require.main should not be deletable");

require.main = "foobar";
test.assert(require.main === module, "require.main should be read-only");