var test = require("../../test");

test.assert(module.main === module, "module.main should refer to the module itself");

delete module.main;
test.assert(module.main === module, "module.main should not be deletable");

module.main = "foobar";
test.assert(module.main === module, "module.main should be read-only");