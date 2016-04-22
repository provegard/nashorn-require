exports.call_me = function(moduleId) {
  exports.foo = require(moduleId).foo;
};