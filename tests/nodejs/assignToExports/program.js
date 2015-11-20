var test = require("../../test");
var a = require("./a");
test.assert(a() === 42, "Call required module as function");