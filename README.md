# nashorn-require

## Overview

A Nashorn implementation of CommonJS Modules/1.1

## How to use

TBD

## Related projects

* [jvm-npm](https://github.com/nodyn/jvm-npm)

I have tried to use this require implementation, but I encountered problems with Windows paths. I also
found the implementation a bit inflexible, e.g. when it comes to which class loader to use when loading
embedded resources. On the plus side, it supports Rhino.

* [commonjs-modules-javax-script](https://github.com/walterhiggins/commonjs-modules-javax-script)

Didn't try this one, but there are no tests and the author's comments towards the end of the README
are a bit disheartening.