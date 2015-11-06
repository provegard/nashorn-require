/**
 * Copyright (c) 2015 Per Rovegard
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (global) {
    var require = global.require = createRequire();
    var Module = (function () {
        function Module(id) {
            this.id = id.id;
            this.exports = new ModuleExports();
        }
        ;
        return Module;
    })();
    var ModuleExports = (function () {
        function ModuleExports() {
        }
        return ModuleExports;
    })();
    var ModuleId = (function () {
        function ModuleId(id) {
            if (!id)
                throw new RequireError("Module ID cannot be empty");
            this.id = id;
        }
        ModuleId.prototype.isRelative = function () {
            return this.id[0] === "."; // ./ or ../
        };
        ModuleId.prototype.isAbsolutePath = function () {
            // Handle both Unix and Windows path, /foo/bar.js and c:\foo\bar.js
            return this.id[0] === "/" || this.id[1] === ":";
        };
        return ModuleId;
    })();
    var RequireError = (function (_super) {
        __extends(RequireError, _super);
        function RequireError(message, cause) {
            _super.call(this, message);
            this.message = message;
            this.cause = cause;
        }
        RequireError.prototype.toString = function () {
            var str = this.message;
            if (this.cause)
                str = str + " [Caused by: " + this.cause + "]";
            return str;
        };
        return RequireError;
    })(Error);
    var FileSystemBasedModuleLocation = (function () {
        function FileSystemBasedModuleLocation(file) {
            this.file = file;
            this.name = file.toString();
        }
        FileSystemBasedModuleLocation.prototype.getStream = function () {
            return new java.io.FileInputStream(this.file);
        };
        FileSystemBasedModuleLocation.prototype.resolve = function (id) {
            return new FileSystemBasedModuleLocation(newFile(this.file, id.id));
        };
        FileSystemBasedModuleLocation.prototype.exists = function () {
            return this.file.exists();
        };
        FileSystemBasedModuleLocation.prototype.toString = function () {
            return "file " + this.name;
        };
        return FileSystemBasedModuleLocation;
    })();
    function locateModule(id, parent) {
        var action;
        if (id.isAbsolutePath()) {
            // For an absolute path, just return a file stream provided that the file exists.
            action = function (mid) { return new FileSystemBasedModuleLocation(newFile(mid.id)); };
        }
        else if (id.isRelative() && parent) {
            // Resolve the id against the id of the parent module
            action = function (mid) { return parent.location.resolve(mid); };
        }
        else {
            // Top-level ID, resolve against root (TODO: multiple roots)
            var tempLocation = new FileSystemBasedModuleLocation(newFile(require.root));
            action = function (mid) { return tempLocation.resolve(mid); };
        }
        for (var i; i < require.extensions.length; i++) {
            var ext = require.extensions[i];
            var newModuleId = new ModuleId(ensureExtension(id.id, ext));
            var location = action(newModuleId);
            if (location !== null)
                return location;
        }
        throw new RequireError("Failed to locate module: " + id.id);
    }
    function doRequire(id, parent) {
        var moduleId = new ModuleId(id);
        var location = locateModule(moduleId, parent);
        return loadModule(moduleId, location);
    }
    function createRequire() {
        var require = (function (id) { return doRequire(id); });
        require.root = java.lang.System.getProperty("user.dir");
        require.debug = true;
        require.extensions = ["", ".js"];
        return require;
    }
    // endsWith - also ES6
    function endsWith(str, suffix) {
        return str.length >= suffix.length && suffix === str.substr(str.length - suffix.length);
    }
    function debugLog(msg) {
        if (require.debug)
            print("[require] " + msg);
    }
    function ensureExtension(path, extension) {
        if (!extension)
            return path;
        if (extension[0] !== ".")
            extension = "." + extension;
        if (endsWith(path, extension))
            return path;
        return path + extension;
    }
    function readLocation(location) {
        try {
            return readFromStream(location.getStream());
        }
        catch (e) {
            throw new RequireError("Failed to read: " + location, e);
        }
    }
    function readFromStream(stream) {
        // more or less regular java code except for static types
        var buf = "", reader;
        try {
            reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream));
            var line = null;
            while ((line = reader.readLine()) !== null) {
                buf += line + "\n";
            }
        }
        finally {
            if (reader)
                reader.close();
        }
        return buf;
    }
    function loadModule(id, location) {
        var body = readLocation(location);
        //TODO: , __filename, __dirname
        var wrappedBody = 'var moduleFunction = function (exports, module, require) {' + body + '\n}; moduleFunction';
        var func = load({
            name: location.name,
            script: wrappedBody
        });
        var module = new Module(id);
        var requireFn = (function (id) { return doRequire(id, module); });
        //var moduleFile = newFile(descriptor.path);
        //var dirName = moduleFile.getParent();
        //var fileName = moduleFile.getName();
        //TODO: expose public part of module only!!
        func.apply(module, [module.exports, module, requireFn]);
        return module.exports;
    }
    function newFile(parent, child) {
        var file;
        if (child) {
            // java.io.File doesn't necessarily recognize an absolute Windows path as an absolute child. Therefore we have
            // to handle that manually. Luckily, isAbsolute() works as expected!
            if (new java.io.File(child).isAbsolute())
                file = new java.io.File(child);
            else
                file = new java.io.File(parent, child);
        }
        else if (parent) {
            file = new java.io.File(parent);
        }
        else {
            throw new Error("java.io.File takes one or two arguments");
        }
        // File.exists() works differently under Windows and Unix - on Unix all path parts must exist, even if a part is
        // "negated" by a subsequent ".." part, but Windows is more forgiving. To ensure consistent behavior across
        // system types, we use the canonical path for the final File instance.
        return new java.io.File(file.getCanonicalPath());
    }
})(this);
