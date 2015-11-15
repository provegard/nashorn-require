exports.foo = function() {};
exports.bar = require("./submodule/b").call_me(module.id);