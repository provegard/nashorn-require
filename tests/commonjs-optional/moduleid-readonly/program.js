var test = require("test");
var mid = module.id;
module.id = "foobar";
test.assert(module.id === mid, "module id should be read-only");