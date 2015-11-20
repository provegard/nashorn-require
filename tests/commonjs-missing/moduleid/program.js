var test = require("../../test");
var a = require("./a");
var b = require("submodule/b");
test.assert(a.foo === b.foo, "a should be requirable via its module id");