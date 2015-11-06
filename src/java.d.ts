
//declare var java: typeof __java;

//declare var java: Java.java;

declare namespace java {
  export namespace lang {
    interface System {
      getProperty(propertyName: string): string
    }
    export var System: System;
  }

  export namespace io {
    export interface Reader {
      readLine(): string;
      close(): void;
    }
    interface BufferedReader extends Reader {
      new(inner: Reader): BufferedReader
    }
    interface InputStreamReader extends Reader {
      new(stream: InputStream): InputStreamReader
    }
    interface FileInputStream extends InputStream {
      new(file: string|File): FileInputStream
    }
    export interface InputStream {
    }

    export interface File {
      new(parent: string|File, child?: string): File

      getCanonicalPath(): string
      exists(): boolean
      isAbsolute(): boolean
      getParent(): String
      getName(): String
    }

    //export var InputStream: InputStream;
    export var FileInputStream: FileInputStream;
    export var BufferedReader: BufferedReader;
    export var InputStreamReader: InputStreamReader;
    export var File: File;
  }
}
