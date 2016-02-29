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

// Nashorn globals
declare var print: (_: string) => void;
declare var load: (_: {name: string, script: string}) => any;

((global: any) => {
  var LineSeparator = java.lang.System.getProperty("line.separator");

  var moduleCache: { [id: string]: ModuleContainer; } = {};
  var options: RequireOptions;

  /**
   * Initialize nashorn-require. After this function returns, there is a global 'require' function together with
   * global 'module' and 'exports' objects. The main reason for having manual initialization is that it makes it
   * possible to determine which file is the main file/program. Consider Node as a comparison - when you run a JS
   * file with Node, that file is the main file.
   *
   * @param opts options for configuring nashorn-require
   */
  global.initRequire = function (opts: PublicRequireOptions) {
    global.initRequire = () => { throw new Error("initRequire cannot be called twice"); };
    init(opts);
  };
  // ----------------------

  interface RequireFunction {
    (id: string): ModuleExports

    paths: string[];
  }

  interface RequireOptions {
    paths: string[];
    extensions: string[];
    debug: boolean;

    /**
     * A list of module search paths that the user cannot modify.
     */
    fixedPaths: string[];
  }

  interface PublicRequireOptions {
    mainFile: string;
    extensions: string[];
    debug: boolean;
  }

  class ModuleContainer {
    constructor(location: ModuleLocation) {
      this.location = location;
      this.exports = new ModuleExports();
    };

    exports: ModuleExports;
    location: ModuleLocation;
  }

  /**
   * ExposedModule represents the module API as seen by the required module code. This means that it only contain the
   * minimum required properties to fulfill the needs. For example, it doesn't expose a `location` property like
   * `ModuleContainer` does.
   */
  class ExposedModule {
    constructor(container: ModuleContainer) {

      // Note: The properties are created using Object.defineProperty because they need access to the container
      // object, but we don't want the container object to be a part of the API exposed to the required module.

      // A module should be requirable via 'id', which means we cannot use the original identifier, which may be
      // relative. By using the name of the location, which is an absolute path in the file system case, we get a stable
      // identifier. The only downside is that it's technically not a "top-level id", which the spec talks about.
      Object.defineProperty(this, "id", {
        get: () => container.location.name
      });

      // The exports property is has a setter so that a module can assign to module.exports, e.g. to let the exported
      // API be a function.
      Object.defineProperty(this, "exports", {
        get: () => container.exports,
        set: (value) => container.exports = value
      });
    }

    /**
     * Because `exports` is defined using `Object.defineProperty`, we have to use an indexer to access it within
     * this TS file.
     */
    [index: string]: any;
  }

  class ModuleExports {}

  class ModuleId {
    id: string;

    constructor(id: string) {
      if (!id) throw new RequireError("Module ID cannot be empty");
      this.id = id;
    }

    isRelative(): boolean {
      return this.id[0] === "."; // ./ or ../
    }

    isAbsolutePath(): boolean {
      // Handle both Unix and Windows path, /foo/bar.js and c:\foo\bar.js
      return this.id[0] === "/" || this.id[1] === ":";
    }

    toString(): string {
      return this.id;
    }
  }

  class RequireError extends Error {
    constructor(message: string, cause?: any) {
      super(message);
      this.message = message;
      this.cause = cause;
    }

    cause: any;

    toString(): string {
      var str = this.message;
      if (this.cause) str = str + " [Caused by: " + this.cause + "]";
      return str;
    }
  }

  /**
   * The type of the global 'require' function
   */
  interface Require extends RequireFunction {
    root: string;
    debug: boolean;
    extensions: string[]
  }

  interface ModuleLocation {
    getStream(): java.io.InputStream;
    resolve(id: ModuleId): ModuleLocation;
    exists(): boolean;
    name: string
  }
  class FileSystemBasedModuleLocation implements ModuleLocation {
    private file: java.io.File;
    name: string;

    constructor(file: java.io.File) {
      this.file = file;
      this.name = file.toString();
    }

    getStream() {
      return new java.io.FileInputStream(this.file);
    }

    resolve(id: ModuleId) {
      var parent = this.file.isDirectory() ? this.file : this.file.getParentFile();
      return new FileSystemBasedModuleLocation(newFile(parent, id.id));
    }

    exists() {
      return this.file.exists();
    }

    toString() {
      return "file " + this.name;
    }
  }

  function locateModule(id: ModuleId, parent?: ModuleContainer): ModuleLocation {
    var actions: ((mid: ModuleId) => ModuleLocation)[] = [];
    if (id.isAbsolutePath()) {
      // For an absolute path, just return a file stream provided that the file exists.
      actions.push(mid => new FileSystemBasedModuleLocation(newFile(mid.id)));
    } else if (id.isRelative() && parent) {
      // Resolve the id against the location of the parent module
      actions.push(mid => parent.location.resolve(mid));
    } else {
      // Top-level ID, resolve against the possible roots.
      unique(options.fixedPaths.concat(options.paths)).forEach(root => {
        var tempLocation = new FileSystemBasedModuleLocation(newFile(root));
        actions.push(mid => tempLocation.resolve(mid));
      });
    }
    for (var i: number = 0; i < options.extensions.length; i++) {
      var ext = options.extensions[i];
      var newModuleId = new ModuleId(ensureExtension(id.id, ext));
      for (var j: number = 0; j < actions.length; j++) {
        var location = actions[j](newModuleId);
        if (!location) continue;
        debugLog(`Considering location: ${location}`);
        if (location.exists()) return location;
      }
    }
    throw new RequireError(`Failed to locate module: ${id}`);
  }

  function doRequire(id: string, parent?: ModuleContainer): ModuleExports {
    var moduleId = new ModuleId(id);
    var location = locateModule(moduleId, parent);
    return loadModule(moduleId, location);
  }

  // endsWith - also ES6
  function endsWith(str: string, suffix: string): boolean {
    return str.length >= suffix.length && suffix === str.substr(str.length - suffix.length);
  }

  function debugLog(msg: any): void {
    if (options.debug) print("[require] " + msg);
  }

  function ensureExtension(path: string, extension: string): string {
    if (!extension) return path;
    if (extension[0] !== ".") extension = "." + extension;
    if (endsWith(path, extension)) return path;
    return path + extension;
  }

  function readLocation(location: ModuleLocation): string {
    try {
      return readFromStream(location.getStream());
    } catch (e) {
      throw new RequireError("Failed to read: " + location, e);
    }
  }

  function readFromStream(stream: java.io.InputStream): string {
    // more or less regular java code except for static types
    var
      buf: string = "",
      reader: java.io.Reader;
    try {
      reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream));
      var line: string;
      while ((line = reader.readLine()) !== null) {
        // Make sure to add a line separator (stripped by readLine), so that line numbers are preserved and line
        // comments won't "hide" the remainder of the file.
        buf += line + LineSeparator;
      }
    } finally {
      if (reader) reader.close();
    }
    return buf;
  }

  function loadModule(id: ModuleId, location: ModuleLocation): ModuleExports {
    // Check the cache first. Use the location name since that is suppose to be stable regardless of how the module
    // was requested.
    var cachedModule = moduleCache[location.name];
    if (cachedModule) {
      debugLog(`Using cached module for ${id}`);
      return cachedModule.exports;
    }

    debugLog(`Loading module '${id}' from ${location}`);
    var body = readLocation(location);
    //TODO: , __filename, __dirname
    var wrappedBody = `var moduleFunction = function (exports, module, require) {${body}\n}; moduleFunction`;
    var func = load({
      name: location.name,
      script: wrappedBody
    });
    var module = new ModuleContainer(location);
    var requireFn = createRequireFunction(module);

    // Cache before loading so that cyclic dependencies won't be a problem.
    moduleCache[location.name] = module;

    var exposed = new ExposedModule(module);
    func.apply(module, [exposed["exports"], exposed, requireFn]);
    return module.exports;
  }

  function init(opts: PublicRequireOptions) {
    if (!opts.mainFile) throw new Error("Missing main file");
    var mainFileAsFile = newFile(opts.mainFile);
    if (!mainFileAsFile.exists()) throw new Error("Main file doesn't exist: " + opts.mainFile);
    //TODO: join extensions

    // Set the global options
    options = <RequireOptions>{};
    options.debug = opts.debug || false;
    options.extensions = opts.extensions || [".js", ""]; //TODO: combine
    options.paths = [mainFileAsFile.getParent()]; //TODO: curdir also?

    // Also set the fixed paths. These are not exposed to the outside.
    options.fixedPaths = [mainFileAsFile.getParent()]; //TODO: curdir also?

    // Initialize main module
    //TODO: Reuse wrt loadModule!!
    var location = new FileSystemBasedModuleLocation(mainFileAsFile);
    var module = new ModuleContainer(location);
    var requireFn = createRequireFunction(module);

    moduleCache[location.name] = module; //TODO
    var exposed = new ExposedModule(module);

    Object.defineProperty(requireFn, "main", {
      get: () => exposed,
      set: () => {} // noop
    });

    global.module = exposed;
    global.exports = exposed["exports"];
    global.require = requireFn;
  }

  function createRequireFunction(parent: ModuleContainer): RequireFunction {
    var requireFn = <RequireFunction>((id: string) => doRequire(id, parent));
    //TODO: require.main
    Object.defineProperty(requireFn, "paths", {
      get: () => options.paths,
      set: () => {} // noop
    });
    return requireFn;
  }

  function newFile(parent: string|java.io.File, child?: string) {
    var file: java.io.File;

    if (child) {
      // java.io.File doesn't necessarily recognize an absolute Windows path as an absolute child. Therefore we have
      // to handle that manually. Luckily, isAbsolute() works as expected!
      if (new java.io.File(child).isAbsolute()) file = new java.io.File(child);
      else file = new java.io.File(parent, child);
    } else if (parent) {
      file = new java.io.File(parent);
    } else {
      throw new Error("java.io.File takes one or two arguments");
    }

    // File.exists() works differently under Windows and Unix - on Unix all path parts must exist, even if a part is
    // "negated" by a subsequent ".." part, but Windows is more forgiving. To ensure consistent behavior across
    // system types, we use the canonical path for the final File instance.
    return new java.io.File(file.getCanonicalPath());
  }

  function unique(items: string[]): string[] {
    var dict: { [id: string]: boolean; } = {};
    items.forEach(item => {
      dict[item] = true;
    });
    return Object.keys(dict);
  }
})(this);
