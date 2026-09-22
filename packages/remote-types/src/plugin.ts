import { mkdtemp, mkdir, rename, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { AdmZip } from './adm-zip.js';
import { createGeneratedTypes, extractArchive, getExposeEntryName } from './declarations.js';
import { getArchiveLocation, getOutputDirectory, isFileLocation, isRemoteLocation, readLocation } from './locations.js';
import type { CompilerLike, RegistryEntry, RemoteTypesLocation, ScalprumRemoteTypesPluginOptions } from './plugin-types.js';
import { normalizeRegistryPayload } from './registry.js';

const pluginName = 'ScalprumRemoteTypesPlugin';
const generatedScopesDirectory = 'remotes';
const scopeManifestFilename = '.scalprum-remote-types-scopes.json';

async function clearGeneratedRemoteTypes(outputDirectory: string): Promise<void> {
  await rm(join(outputDirectory, generatedScopesDirectory), { recursive: true, force: true });
  await writeFile(join(outputDirectory, 'generated.d.ts'), 'export interface GeneratedRemoteTypes {}\n');
  await rm(join(outputDirectory, scopeManifestFilename), { force: true });
}

async function commitGeneratedRemoteTypes(outputDirectory: string, stagingDirectory: string): Promise<void> {
  await rm(join(outputDirectory, generatedScopesDirectory), { recursive: true, force: true });
  await rm(join(outputDirectory, 'generated.d.ts'), { force: true });
  await rm(join(outputDirectory, scopeManifestFilename), { force: true });
  await rename(join(stagingDirectory, generatedScopesDirectory), join(outputDirectory, generatedScopesDirectory));
  await rename(join(stagingDirectory, 'generated.d.ts'), join(outputDirectory, 'generated.d.ts'));
  await rename(join(stagingDirectory, scopeManifestFilename), join(outputDirectory, scopeManifestFilename));
}

function validateScope(scope: string): void {
  if (!scope || scope.split(/[\\/]/).some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Invalid remote type scope: ${scope}`);
  }
}

async function prepareRemoteTypes(compiler: CompilerLike, options: ScalprumRemoteTypesPluginOptions): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const outputDirectory = getOutputDirectory(compiler, options);
  await mkdir(outputDirectory, { recursive: true });
  if (options.enabled === false) return clearGeneratedRemoteTypes(outputDirectory);
  const baseDirectory = compiler.context ?? process.cwd();
  const sources: Array<{ location: string | URL; scope: string }> = options.modulesConfigLocations.map(
    ({ scope, location }: RemoteTypesLocation) => ({
      scope,
      location:
        typeof location === 'string' && !isRemoteLocation(location) && !isFileLocation(location) ? resolve(baseDirectory, location) : location,
    }),
  );
  if (!sources.length) throw new Error(`${pluginName} requires at least one modulesConfigLocations entry`);
  sources.forEach(({ scope }) => validateScope(scope));
  const stagingDirectory = await mkdtemp(join(dirname(outputDirectory), '.scalprum-remote-types-'));
  try {
    await mkdir(join(stagingDirectory, generatedScopesDirectory), { recursive: true });
    const entries = (
      await Promise.all(
        sources.map(async ({ location, scope }) =>
          normalizeRegistryPayload(
            JSON.parse((await readLocation(location, timeoutMs)).toString('utf8')),
            location,
            options.remoteTypesFilename ?? '@mf-types.zip',
            scope,
          ),
        ),
      )
    ).flat();
    const imports: string[] = [];
    const properties: string[] = [];
    const scopes: string[] = [];
    const seenScopes = new Set<string>();
    let importOffset = 0;

    for (const { scope, config, registryLocation } of entries as RegistryEntry[]) {
      if (seenScopes.has(scope)) throw new Error(`Duplicate remote type scope: ${scope}`);
      seenScopes.add(scope);
      if (!config.remoteTypesLocation) throw new Error(`Remote type registry entry has no remoteTypesLocation: ${scope}`);
      scopes.push(scope);
      const archive = new AdmZip(await readLocation(getArchiveLocation(config.remoteTypesLocation, registryLocation), timeoutMs));
      const scopeDirectory = join(stagingDirectory, generatedScopesDirectory, scope);
      const archiveEntries = (await extractArchive(archive, scopeDirectory))
        .map(getExposeEntryName)
        .filter((entry): entry is string => entry !== undefined);
      const generated = createGeneratedTypes(scope, scopeDirectory, archiveEntries, importOffset, `${generatedScopesDirectory}/${scope}`);
      importOffset = generated.nextImportOffset;
      imports.push(...generated.imports);
      properties.push(...generated.properties);
    }

    await writeFile(
      join(stagingDirectory, 'generated.d.ts'),
      `export interface GeneratedRemoteTypes {}\n\n${imports.join('\n')}\n\ndeclare module '@scalprum/remote-types' {\n  interface RemoteTypes {\n${properties.join('\n')}\n  }\n}\n\nexport {};\n`,
    );
    await writeFile(join(stagingDirectory, scopeManifestFilename), JSON.stringify(scopes, null, 2));
    await commitGeneratedRemoteTypes(outputDirectory, stagingDirectory);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

export class ScalprumRemoteTypesPlugin {
  private readonly options: ScalprumRemoteTypesPluginOptions;

  constructor(options: ScalprumRemoteTypesPluginOptions) {
    if (!options.modulesConfigLocations?.length && options.enabled !== false) {
      throw new Error(`${pluginName} requires at least one modulesConfigLocations entry`);
    }
    this.options = options;
  }

  apply(compiler: CompilerLike): void {
    const prepare = () => prepareRemoteTypes(compiler, this.options);
    compiler.hooks.beforeRun?.tapPromise(pluginName, prepare);
    compiler.hooks.watchRun?.tapPromise(pluginName, prepare);
  }
}

export { ScalprumRemoteTypesProducerPlugin } from './producer.js';
export type {
  CompilerLike,
  ModuleConfigEntry,
  ModulesConfig,
  RemoteTypesLocation,
  ScalprumRemoteTypesPluginOptions,
  ScalprumRemoteTypesProducerPluginOptions,
} from './plugin-types.js';
