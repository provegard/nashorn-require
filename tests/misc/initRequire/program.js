var test = require("../../test");

try {
  initRequire({
    mainFile: module.id
  });
  test.assert(false, "initRequire should throw when invoked a 2nd time");
} catch (e) {
  test.assert(e.message === "initRequire cannot be called twice", "Unexpected error: " + e.message);
}