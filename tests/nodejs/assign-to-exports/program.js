var assert = require("../../assert");
var a = require("./a");
assert.verify(a() === 42, "Call required module as function");