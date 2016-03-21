var ANSI_BRIGHT_RED = "\u001B[31;1m";
var ANSI_BRIGHT_GREEN = "\u001B[32;1m";
var ANSI_BRIGHT_YELLOW = "\u001B[33;1m";
var ANSI_RESET = "\u001B[0m";

exports.brightRed = createMessageFn(ANSI_BRIGHT_RED);
exports.brightGreen = createMessageFn(ANSI_BRIGHT_GREEN);
exports.brightYellow = createMessageFn(ANSI_BRIGHT_YELLOW);

function createMessageFn(color) {
  return function (msg) { return color + msg + ANSI_RESET; };
}