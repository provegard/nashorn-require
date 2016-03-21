declare namespace java {
  export namespace lang {
    interface System {
      getProperty(propertyName: string): string;
    }
    export interface Class {
      isInstance(x: any): boolean;
    }
    export interface ClassLoader {
      new(): ClassLoader;
      getResourceAsStream(name: string): io.InputStream;

      "class": java.lang.Class;
    }
    export var System: System;
    export var Class: Class;
    export var ClassLoader: ClassLoader;
  }

  export namespace io {
    export interface Reader {
      readLine(): string;
      close(): void;
    }
    interface BufferedReader extends Reader {
      new(inner: Reader): BufferedReader;
    }
    interface InputStreamReader extends Reader {
      new(stream: InputStream): InputStreamReader;
    }
    interface FileInputStream extends InputStream {
      new(file: string|File): FileInputStream;
    }
    export interface InputStream {
      close(): void;
    }

    export interface File {
      new(parent: string|File, child?: string): File;

      getCanonicalPath(): string;
      exists(): boolean;
      isAbsolute(): boolean;
      isDirectory(): boolean;
      isFile(): boolean;
      getParent(): string;
      getParentFile(): File;
      getCanonicalPath(): string;
      getName(): string;
      toURI(): net.URI;

      "class": java.lang.Class;
    }

    export var FileInputStream: FileInputStream;
    export var BufferedReader: BufferedReader;
    export var InputStreamReader: InputStreamReader;
    export var File: File;
  }

  export namespace net {
    export interface URL {
    }
    export interface URI {
      toURL(): URL;
    }
    export interface URLClassLoader extends lang.ClassLoader {
      new(urls: URL[]): URLClassLoader;
    }

    export var URLClassLoader: URLClassLoader;
    export var URL: URL;
    export var URI: URI;
  }
}
