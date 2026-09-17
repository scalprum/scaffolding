declare module 'adm-zip' {
  interface ZipEntry {
    entryName: string;
    isDirectory: boolean;
    getData(): Buffer;
    getDataAsText(): string;
  }

  export default class AdmZip {
    constructor(input?: string | Buffer);
    addFile(entryName: string, content: Buffer | string): void;
    addLocalFile(localPath: string): void;
    getEntries(): ZipEntry[];
    writeZip(targetPath: string): void;
  }
}
