exports.print = typeof print !== "undefined" ? print : function () {
  var system = require("system");
  var stdio = system.stdio;
  stdio.print.apply(stdio, arguments);
};

exports.assert = function (guard, message) {
  if (guard) {
    exports.print('PASS ' + message, 'pass');
  } else {
    exports.print('FAIL ' + message, 'fail');
  }
};

exports.assertThrowsWithMessage = function (fun, matcher) {
  try {
    fun();
    exports.print("FAIL - didn't throw", 'fail');
  } catch (e) {
    var isOk;
    if (matcher.test) {
      // RegExp
      isOk = matcher.test(e.message);
    } else {
      isOk = matcher === e.message;
    }
    if (isOk) {
      exports.print('PASS ' + e.message, 'pass');
    } else {
      exports.print('FAIL ' + e.message, 'fail');
    }
  }
};
