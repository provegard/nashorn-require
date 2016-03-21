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
  const LineSeparator: string = java.lang.System.getProperty("line.separator");

  const moduleCache: { [id: string]: ModuleContainer; } = {};
  const classLoaderCache: { [id: string]: java.lang.ClassLoader; } = {};
  let options: RequireOptions;

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
    (id: string): ModuleExports;

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
        get: () => <any>container.location.name
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
      let str = this.message;
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
    extensions: string[];
  }

  interface ModuleLocation {
    getStream(): java.io.InputStream;
    resolve(id: ModuleId): ModuleLocation;
    exists(): boolean;
    name: string;
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
      const parent = this.file.isDirectory() ? this.file : this.file.getParentFile();
      return new FileSystemBasedModuleLocation(newFile(parent, id.id));
    }

    exists() {
      return this.file.exists();
    }

    toString() {
      return "file " + this.name;
    }
  }

  function isFile(x: any): x is java.io.File {
    return java.io.File.class.isInstance(x);
  }
  function isClassLoader(x: any): x is java.lang.ClassLoader {
    return java.lang.ClassLoader.class.isInstance(x);
  }
  function getOrCreateClassLoader(file: java.io.File): java.lang.ClassLoader {
    const url = file.toURI().toURL();
    const id = url.toString();
    const cachedLoader = classLoaderCache[id];
    if (cachedLoader) return cachedLoader;
    return classLoaderCache[id] = new java.net.URLClassLoader([url]);
  }
  function reject<T>(message: string): T {
    throw new Error(message);
  }

  class ResourceBasedModuleLocation implements ModuleLocation {
    private classLoader: java.lang.ClassLoader;
    private resourcePath: string;
    private basePath: string;
    name: string;

    constructor(jarFileOrClassLoader: java.io.File|java.lang.ClassLoader, maybeResourcePath?: string, basePath?: string) {
      if (isFile(jarFileOrClassLoader)) {
        if (maybeResourcePath || basePath) throw new Error("Multiple arguments passed to ResourceBasedModuleLocation(java.io.File)");
        this.resourcePath = null;
        this.classLoader = getOrCreateClassLoader(jarFileOrClassLoader);
        this.basePath = jarFileOrClassLoader.toString() + "!";
        this.name = this.basePath;
      } else if (isClassLoader(jarFileOrClassLoader)) {
        this.classLoader = jarFileOrClassLoader;
        this.resourcePath = maybeResourcePath || reject<string>("ResourceBasedModuleLocation needs a base path");
        this.basePath = basePath || reject<string>("ResourceBasedModuleLocation needs a base path");
        this.name = basePath + maybeResourcePath;
      } else throw new Error("Unknown ResourceBasedModuleLocation argument: " + jarFileOrClassLoader);
    }

    getStream() {
      if (!this.resourcePath) return null;
      return this.classLoader.getResourceAsStream(this.resourcePath);
    }

    resolve(id: ModuleId) {
      if (this.resourcePath) {
        // Treat the current resource path as a file, so get its "directory parent". Note that embedded resources use
        // forward slash as directory separator at all times, so some manual handling here.
        const directoryPart = new java.io.File(this.resourcePath).getParent().replace(/\\/g, "/");
        // We know that the module ID is relative (otherwise we would be a top-level location and have no resource path),
        // so we can safely strip off the leading dot of the ID.
        const newResourcePath = directoryPart + id.id.substr(1);
        return new ResourceBasedModuleLocation(this.classLoader, newResourcePath, this.basePath);
      }
      return new ResourceBasedModuleLocation(this.classLoader, id.id, this.basePath);
    }

    exists() {
      if (!this.resourcePath) return false;
      let stream: java.io.InputStream;
      try {
        stream = this.getStream();
        return !!stream;
      } finally {
        if (stream) stream.close();
      }
    }

    toString() {
      return "resource " + this.name;
    }
  }

  function locateModule(id: ModuleId, parent?: ModuleContainer): ModuleLocation {
    const actions: ((mid: ModuleId) => ModuleLocation)[] = [];
    if (id.isAbsolutePath()) {
      // For an absolute path, just return a file stream provided that the file exists.
      actions.push(mid => new FileSystemBasedModuleLocation(newFile(mid.id)));
    } else if (id.isRelative() && parent) {
      // Resolve the id against the location of the parent module
      actions.push(mid => parent.location.resolve(mid));
    } else {
      // Top-level ID, resolve against the possible roots.
      unique(options.fixedPaths.concat(options.paths)).forEach(root => {
        let tempLocation: ModuleLocation;
        if (root.lastIndexOf(".jar") === root.length - 4) {
          tempLocation = new ResourceBasedModuleLocation(newFile(root));
        } else {
          tempLocation = new FileSystemBasedModuleLocation(newFile(root));
        }
        actions.push(mid => tempLocation.resolve(mid));
      });
    }
    for (let i: number = 0; i < options.extensions.length; i++) {
      const ext = options.extensions[i];
      const newModuleId = new ModuleId(ensureExtension(id.id, ext));
      for (let j: number = 0; j < actions.length; j++) {
        const location = actions[j](newModuleId);
        if (!location) continue;
        debugLog(`Considering location ${location} for module ${id}`);
        if (location.exists()) return location;
      }
    }
    throw new RequireError(`Failed to locate module: ${id}`);
  }

  function doRequire(id: string, parent?: ModuleContainer): ModuleExports {
    const moduleId = new ModuleId(id);
    const location = locateModule(moduleId, parent);
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
    let
      buf: string = "",
      reader: java.io.Reader;
    try {
      reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream));
      let line: string;
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
    const cachedModule = moduleCache[location.name];
    if (cachedModule) {
      debugLog(`Using cached module for ${id}`);
      return cachedModule.exports;
    }

    debugLog(`Loading module '${id}' from ${location}`);
    const body = readLocation(location);
    // TODO: , __filename, __dirname
    const wrappedBody = `var moduleFunction = function (exports, module, require) {${body}\n}; moduleFunction`;
    const func = load({
      name: location.name,
      script: wrappedBody
    });
    const module = new ModuleContainer(location);
    const requireFn = createRequireFunction(module);

    // Cache before loading so that cyclic dependencies won't be a problem.
    moduleCache[location.name] = module;

    const exposed = new ExposedModule(module);
    func.apply(module, [exposed["exports"], exposed, requireFn]);
    return module.exports;
  }

  function init(opts: PublicRequireOptions) {
    if (!opts.mainFile) throw new Error("Missing main file");
    const mainFileAsFile = newFile(opts.mainFile);
    if (!mainFileAsFile.exists()) throw new Error("Main file doesn't exist: " + opts.mainFile);
    // TODO: join extensions

    // Set the global options
    options = <RequireOptions>{};
    options.debug = opts.debug || false;
    options.extensions = opts.extensions || [".js", ""]; // TODO: combine
    options.paths = [mainFileAsFile.getParent()]; // TODO: curdir also?

    // Also set the fixed paths. These are not exposed to the outside.
    options.fixedPaths = [mainFileAsFile.getParent()]; // TODO: curdir also?

    // Initialize main module
    // TODO: Reuse wrt loadModule!!
    const location = new FileSystemBasedModuleLocation(mainFileAsFile);
    const module = new ModuleContainer(location);
    const requireFn = createRequireFunction(module);

    moduleCache[location.name] = module; // TODO
    const exposed = new ExposedModule(module);

    Object.defineProperty(requireFn, "main", {
      get: () => exposed,
      set: () => {} // noop
    });

    global.module = exposed;
    global.exports = exposed["exports"];
    global.require = requireFn;
  }

  function createRequireFunction(parent: ModuleContainer): RequireFunction {
    const requireFn = <RequireFunction>((id: string) => doRequire(id, parent));
    // TODO: require.main
    Object.defineProperty(requireFn, "paths", {
      get: () => options.paths,
      set: () => {} // noop
    });
    return requireFn;
  }

  function newFile(parent: string|java.io.File, child?: string) {
    let file: java.io.File;

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
    const dict: { [id: string]: boolean; } = {};
    items.forEach(item => {
      dict[item] = true;
    });
    return Object.keys(dict);
  }
})(this);
