import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { CompilerLike, ScalprumRemoteTypesPluginOptions } from './plugin-types';

export function getOutputDirectory(compiler: CompilerLike, options: ScalprumRemoteTypesPluginOptions): string {
  return resolve(options.outputDirectory ?? `${compiler.context ?? process.cwd()}/node_modules/@scalprum/remote-types`);
}

export function isRemoteLocation(location: string | URL): boolean {
  return location instanceof URL ? location.protocol === 'http:' || location.protocol === 'https:' : /^https?:\/\//.test(location);
}

export function isFileLocation(location: string | URL): boolean {
  return location instanceof URL ? location.protocol === 'file:' : /^file:\/\//.test(location);
}

export function getArchiveLocation(location: string | URL, registryLocation: string | URL): string | URL {
  if (location instanceof URL) {
    return location;
  }
  if (isRemoteLocation(location) || isFileLocation(location)) {
    return new URL(location).href;
  }
  if (isFileLocation(registryLocation)) {
    return new URL(location, registryLocation.toString());
  }
  if (isRemoteLocation(registryLocation)) {
    return new URL(location, registryLocation.toString()).href;
  }
  return resolve(dirname(registryLocation.toString()), location);
}

export async function readLocation(location: string | URL, timeoutMs: number): Promise<Buffer> {
  if (!isRemoteLocation(location)) {
    const localPath = isFileLocation(location) ? fileURLToPath(new URL(location.toString())) : location.toString();
    return readFile(localPath);
  }
  const response = await fetch(location, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
