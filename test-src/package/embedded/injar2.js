module.exports = {
  status: function() {
    return "I'm in a JAR";
  },
  peerStatus: function () {
    var a = require("./injar");
    return a.status();
  }
};
