import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { AdmZip } from './adm-zip.js';
import { createGeneratedTypes, extractArchive, getExposeEntryName } from './declarations.js';
import { getArchiveLocation, getOutputDirectory, readLocation } from './locations.js';
import type { CompilerLike, RegistryEntry, RemoteTypesLocation, ScalprumRemoteTypesPluginOptions } from './plugin-types.js';
import { normalizeRegistryPayload } from './registry.js';

const pluginName = 'ScalprumRemoteTypesPlugin';
const scopeManifestFilename = '.scalprum-remote-types-scopes.json';

async function clearGeneratedRemoteTypes(outputDirectory: string): Promise<void> {
  const scopeManifestPath = join(outputDirectory, scopeManifestFilename);
  let scopes: string[] = [];
  try {
    scopes = JSON.parse(await readFile(scopeManifestPath, 'utf8')) as string[];
  } catch {
    // No previous generated manifest.
  }
  await Promise.all(scopes.map((scope) => rm(join(outputDirectory, scope), { recursive: true, force: true })));
  await rm(join(outputDirectory, 'generated.d.ts'), { force: true });
  await rm(scopeManifestPath, { force: true });
}

async function prepareRemoteTypes(compiler: CompilerLike, options: ScalprumRemoteTypesPluginOptions): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const outputDirectory = getOutputDirectory(compiler, options);
  await mkdir(outputDirectory, { recursive: true });
  await clearGeneratedRemoteTypes(outputDirectory);
  if (options.enabled === false) return;
  const sources: Array<{ location: string | URL; scope: string }> = options.modulesConfigLocations.map(
    ({ scope, location }: RemoteTypesLocation) => ({
      scope,
      location,
    }),
  );
  if (!sources.length) throw new Error(`${pluginName} requires at least one modulesConfigLocations entry`);
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
    if (!config.remoteTypesLocation) continue;
    scopes.push(scope);
    const archive = new AdmZip(await readLocation(getArchiveLocation(config.remoteTypesLocation, registryLocation), timeoutMs));
    const scopeDirectory = join(outputDirectory, scope);
    const entries = (await extractArchive(archive, scopeDirectory)).map(getExposeEntryName).filter((entry): entry is string => entry !== undefined);
    const generated = createGeneratedTypes(scope, scopeDirectory, entries, importOffset);
    importOffset = generated.nextImportOffset;
    imports.push(...generated.imports);
    properties.push(...generated.properties);
  }

  await writeFile(
    join(outputDirectory, 'generated.d.ts'),
    `${imports.join('\n')}\n\ndeclare module '@scalprum/remote-types' {\n  interface RemoteTypes {\n${properties.join('\n')}\n  }\n}\n\nexport {};\n`,
  );
  await writeFile(join(outputDirectory, scopeManifestFilename), JSON.stringify(scopes, null, 2));
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
