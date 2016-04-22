var test = require("../../test");

// Should be loaded via the context classloader (see options.js)
var injar = require("embedded/injar");
test.assertEq(injar.status(), "From the classpath", "should be possible to include an embedded resource module from a class loader passed as init option");