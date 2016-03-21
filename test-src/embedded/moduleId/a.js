exports.foo = function() {};
exports.bar = require("./b").call_me(module.id);