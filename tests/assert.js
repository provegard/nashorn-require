exports.verify = function (condition, message) {
  if (condition)
    print(message + ": ok");
  else {
    print(message + ": FAIL");
    throw new Error(message);
  }
};
