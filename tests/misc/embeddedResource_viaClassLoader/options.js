// Using Thread.getContextClassLoader() didn't work, so we need to use a marker class
var Marker = Java.type("Marker");
this.options = {
  classLoader: new Marker().getClass().getClassLoader()
};