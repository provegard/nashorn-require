# nashorn-require

## Overview

A Nashorn implementation of [CommonJS Modules/1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1).

The initial goal was to pass all [CommonJS Modules tests](https://github.com/commonjs/commonjs/tree/master/tests/modules/1.0). Since that test suite is not complete with respect to the specification, the missing tests have been added. In addition, parts of the [NodeJS module specification](https://nodejs.org/api/modules.html) have been implemented as well. Furthermore, since we're in Java land, nashorn-require can load modules from inside JAR files.

The following test blocks exists:

* `commonjs/tests/modules` - the modules tests from the CommonJS repo (as a sub module).
* `tests/commonjs-missing` - tests missing from the CommonJS repo for mandatory features.
* `tests/commonjs-optional` - tests missing from the CommonJS repo for optional features.
* `tests/nodesjs` - tests for NodeJS-specific features.
* `tests/misc` - tests for other things, for example implementation details.

## Implemented features

TBD

## How to use

Make the `nashorn-require.js` file available somewhere for your code to access.

Invoke the following Nashorn code:

```
var nashornRequirePath = ...; // you're on your own here

var nashornRequireOptions = {}; // see below

var initRequire = load(nashornRequirePath);

initRequire(nashornRequireOptions);
```

### Options

The following options are recognized:

* `mainFile` (**required**) - the path to the main module of the application. This is the module for which `require.main` doesn't return `undefined`. Its parent directory is used as the initial top-level path (against which to resolve non-relative module paths).
* `extensions` - list of extensions to search when a module is required. Defaults to `['.js', '']`, which means that a module required without extension may exist without the extension or with a ".js" extensions. Note that currently specifying this option will overwrite the default list.
* `debug` - set to `true` to enable debug output.

### Additional configuration

* Items added to `require.paths` will be treated as top-level paths. It's possible to add a path to a JAR file.

## How to develop

Use `npm test` to run all tests. This will build and lint the code first.

Use `npm run lint` to just lint. This will build the code first.

Use `npm run build` to build the code. The resulting file will be in the `dist` folder.

## How to contribute

* Open an issue for something you feel is broken or missing.
* Submit a PR if you want to help fix an issue. Please discuss the issue before doing that.

There are no explicit code guidelines. Make sure the linter is happy and that all code is test-driven! :-)

## Related projects

* [jvm-npm](https://github.com/nodyn/jvm-npm)

I have tried to use this require implementation, but I encountered problems with Windows paths. I also
found the implementation a bit inflexible, e.g. when it comes to which class loader to use when loading
embedded resources. On the plus side, it supports Rhino.

* [commonjs-modules-javax-script](https://github.com/walterhiggins/commonjs-modules-javax-script)

Didn't try this one, but there are no tests and the author's comments towards the end of the README
are a bit disheartening.
