export interface ScalprumRemoteTypesPluginOptions {
  /** Registry or plugin manifest sources. One array entry per remote scope. */
  modulesConfigLocations: RemoteTypesLocation[];
  /** Archive filename used when a plugin manifest omits remote type metadata. */
  remoteTypesFilename?: string;
  /** Defaults to node_modules/@scalprum/remote-types. */
  outputDirectory?: string;
  /** Maximum time spent waiting for one registry or archive request. */
  timeoutMs?: number;
  /** Disable remote type loading and restore generic Scalprum fallback types. */
  enabled?: boolean;
}

export interface RemoteTypesLocation {
  scope: string;
  location: string | URL;
}

export interface ScalprumRemoteTypesProducerPluginOptions {
  /** Unique Scalprum scope for remote type declarations. */
  scope: string;
  exposes?: Record<string, string>;
  sourceRoot?: string;
  tsConfigPath?: string;
  outputDirectory: string;
  archiveFilename?: string;
  sourceArchiveFilename?: string;
  registryFilename?: string;
}

export interface ModuleConfigEntry {
  remoteTypesLocation?: string | URL;
}

export interface RegistryEntry {
  scope: string;
  config: ModuleConfigEntry;
  registryLocation: string | URL;
}

export type ModulesConfig = Record<string, ModuleConfigEntry>;

export interface CompilerLike {
  context?: string;
  hooks: {
    beforeRun?: { tapPromise(name: string, callback: () => Promise<void>): void };
    watchRun?: { tapPromise(name: string, callback: () => Promise<void>): void };
    done?: { tapPromise(name: string, callback: () => Promise<void>): void };
  };
}
