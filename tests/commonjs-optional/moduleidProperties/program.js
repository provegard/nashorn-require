var test = require("../../test");
var mid = module.id;

delete module.id;
test.assert(module.id === mid, "module id should not be deletable");

module.id = "foobar";
test.assert(module.id === mid, "module id should be read-only");