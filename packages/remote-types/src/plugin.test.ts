import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, test } from 'vitest';
import '../test/test-fetch';
import { getOutputDirectory } from './locations';
import { ScalprumRemoteTypesPlugin, ScalprumRemoteTypesProducerPlugin } from './plugin';
import { normalizeRegistryPayload } from './registry';

interface TestZipArchive {
  addFile(entryName: string, content: Buffer | string): void;
  getEntries(): Array<{ entryName: string }>;
  writeZip(targetPath: string): void;
}

const AdmZip = require('adm-zip') as new () => TestZipArchive;

describe('ScalprumRemoteTypesPlugin', () => {
  test('resolves relative output directories from compiler context', () => {
    const compilerContext = join(tmpdir(), 'scalprum-host');
    const outputDirectory = getOutputDirectory(
      { context: compilerContext, hooks: {} },
      { modulesConfigLocations: [], outputDirectory: 'dist/remote-types' },
    );

    expect(outputDirectory).toBe(join(compilerContext, 'dist/remote-types'));
  });

  test('rejects invalid aggregate registry entries', () => {
    expect(() => normalizeRegistryPayload({ inventory: 'invalid' }, '/tmp/registry.json', '@mf-types.zip')).toThrow(
      'Remote type registry entry must be an object: inventory',
    );
  });

  test('loads local MF type archive and creates Scalprum module keys', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-'));
    const outputDirectory = join(root, 'generated');
    const archivePath = join(root, 'types.zip');
    const modulesConfigPath = join(root, 'fed-modules.json');

    try {
      const archive = new AdmZip();
      archive.addFile('ApiModule.d.ts', `export * from './src/modules/apiModule';\nexport { default } from './src/modules/apiModule';\n`);
      archive.addFile(
        'src/modules/apiModule.d.ts',
        `export declare function ApiConsumer(props: { value: string }): JSX.Element;\nexport declare const ApiChanger: (props: { count: number }) => JSX.Element;\ndeclare const DefaultApi: (props: { defaultValue: boolean }) => JSX.Element;\nexport default DefaultApi;\n`,
      );
      archive.addFile('NamedModule.d.ts', `export * from './src/modules/namedModule';\n`);
      archive.addFile('src/modules/namedModule.d.ts', `export declare const Named: (props: { label: string }) => JSX.Element;\n`);
      archive.writeZip(archivePath);
      await writeFile(modulesConfigPath, JSON.stringify({ 'sdk-plugin': { remoteTypesLocation: 'types.zip' } }));

      let beforeRun: (() => Promise<void>) | undefined;
      const compiler = {
        context: root,
        hooks: {
          beforeRun: {
            tapPromise: (_name: string, callback: () => Promise<void>) => {
              beforeRun = callback;
            },
          },
        },
      };

      new ScalprumRemoteTypesPlugin({ modulesConfigLocations: [{ scope: 'sdk-plugin', location: modulesConfigPath }], outputDirectory }).apply(
        compiler,
      );
      await beforeRun?.();

      expect(await readFile(join(outputDirectory, 'remotes', 'sdk-plugin', 'ApiModule.d.ts'), 'utf8')).toContain(
        "export * from './src/modules/apiModule';",
      );
      const generated = await readFile(join(outputDirectory, 'generated.d.ts'), 'utf8');
      expect(generated).toContain(`"sdk-plugin./ApiModule": typeof RemoteModule0.default;`);
      expect(generated).toContain(`declare module '@scalprum/remote-types'`);
      expect(generated).toContain(`"sdk-plugin./ApiModule.ApiConsumer": typeof RemoteModule0.ApiConsumer;`);
      expect(generated).toContain(`"sdk-plugin./ApiModule.ApiChanger": typeof RemoteModule0.ApiChanger;`);
      expect(generated).toContain(`"sdk-plugin./NamedModule.Named": typeof RemoteModule1.Named;`);
      expect(generated).not.toContain(`"sdk-plugin./NamedModule":`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('producer rejects declaration generation failures', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-producer-'));
    let done: (() => Promise<void>) | undefined;
    try {
      const compiler = {
        context: root,
        hooks: {
          done: {
            tapPromise: (_name: string, callback: () => Promise<void>) => {
              done = callback;
            },
          },
        },
      };
      new ScalprumRemoteTypesProducerPlugin({
        scope: 'broken-plugin',
        exposes: { './Missing': join(root, 'missing.ts') },
        sourceRoot: root,
        outputDirectory: 'dist',
      }).apply(compiler);

      await expect(done?.()).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loads multiple registries and derives scope from plugin manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-multi-'));
    const outputDirectory = join(root, 'generated');
    const archivePath = join(root, 'types.zip');
    const registryPath = join(root, 'registry.json');
    const manifestPath = join(root, 'plugin-manifest.json');
    try {
      const archive = new AdmZip();
      archive.addFile('ApiModule.d.ts', `export * from './src/modules/apiModule';\nexport { default } from './src/modules/apiModule';\n`);
      archive.addFile('src/modules/apiModule.d.ts', `export default function ApiModule(props: { message: string }): JSX.Element;\n`);
      archive.writeZip(archivePath);
      await writeFile(registryPath, JSON.stringify({ inventory: { remoteTypesLocation: 'types.zip' } }));
      await writeFile(manifestPath, JSON.stringify({ name: 'billing', remoteTypesLocation: 'types.zip' }));

      let beforeRun: (() => Promise<void>) | undefined;
      new ScalprumRemoteTypesPlugin({
        modulesConfigLocations: [
          { scope: 'inventory', location: registryPath },
          { scope: 'billing', location: manifestPath },
        ],
        outputDirectory,
      }).apply({
        context: root,
        hooks: {
          beforeRun: {
            tapPromise: (_name, callback) => {
              beforeRun = callback;
            },
          },
        },
      });
      await beforeRun?.();
      const generated = await readFile(join(outputDirectory, 'generated.d.ts'), 'utf8');
      expect(generated).toContain('inventory./ApiModule');
      expect(generated).toContain('billing./ApiModule');
      expect(await readFile(join(outputDirectory, '.scalprum-remote-types-scopes.json'), 'utf8')).toContain('billing');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('keeps nested barrel exports under exposed module key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-barrel-'));
    const outputDirectory = join(root, 'generated');
    const archivePath = join(root, 'types.zip');
    const modulesConfigPath = join(root, 'fed-modules.json');
    try {
      const archive = new AdmZip();
      archive.addFile('Widget.d.ts', `export * from './nested/barrel';\nexport { default } from './nested/barrel';\n`);
      archive.addFile(
        'nested/barrel.d.ts',
        `export * from './runtimeA';\nexport * from './runtimeB';\nexport interface Props { value: string; }\nexport { Props };\nexport declare namespace NS { const value: string; }\nexport { default } from './widget';\n`,
      );
      archive.addFile('nested/runtimeA.d.ts', `export declare const runtimeA: string;\n`);
      archive.addFile('nested/runtimeB.d.ts', `export declare const runtimeB: number;\n`);
      archive.addFile('nested/props.d.ts', `export interface Props { value: string; }\n`);
      archive.addFile('nested/widget.d.ts', `declare const Widget: (props: Props) => unknown;\nexport default Widget;\n`);
      archive.writeZip(archivePath);
      await writeFile(modulesConfigPath, JSON.stringify({ integration: { remoteTypesLocation: 'types.zip' } }));

      let beforeRun: (() => Promise<void>) | undefined;
      new ScalprumRemoteTypesPlugin({ modulesConfigLocations: [{ scope: 'integration', location: modulesConfigPath }], outputDirectory }).apply({
        context: root,
        hooks: {
          beforeRun: {
            tapPromise: (_name, callback) => {
              beforeRun = callback;
            },
          },
        },
      });
      await beforeRun?.();

      const generated = await readFile(join(outputDirectory, 'generated.d.ts'), 'utf8');
      expect(generated).toContain('"integration./Widget.runtimeA"');
      expect(generated).toContain('"integration./Widget.runtimeB"');
      expect(generated).toContain('"integration./Widget.Props"');
      expect(generated).toContain('"integration./Widget.NS"');
      expect(generated).not.toContain('"integration./Widget.Props": typeof');
      expect(generated).toContain('"integration./Widget":');
      expect(generated).not.toContain('"integration./nested/barrel.runtimeA"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('rejects duplicate scopes across registries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-duplicate-'));
    try {
      const first = join(root, 'first.json');
      const second = join(root, 'second.json');
      const archive = new AdmZip();
      archive.addFile('ApiModule.d.ts', `export default function ApiModule(): JSX.Element;\n`);
      archive.writeZip(join(root, 'types.zip'));
      await writeFile(first, JSON.stringify({ inventory: { remoteTypesLocation: 'types.zip' } }));
      await writeFile(second, JSON.stringify({ inventory: { remoteTypesLocation: 'types.zip' } }));
      let beforeRun: (() => Promise<void>) | undefined;
      new ScalprumRemoteTypesPlugin({
        modulesConfigLocations: [
          { scope: 'inventory', location: first },
          { scope: 'inventory', location: second },
        ],
        outputDirectory: join(root, 'generated'),
      }).apply({
        context: root,
        hooks: {
          beforeRun: {
            tapPromise: (_name, callback) => {
              beforeRun = callback;
            },
          },
        },
      });
      await expect(beforeRun?.()).rejects.toThrow('Duplicate remote type scope: inventory');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('consumer propagates registry failures when enabled', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-failure-'));
    let beforeRun: (() => Promise<void>) | undefined;
    try {
      new ScalprumRemoteTypesPlugin({
        modulesConfigLocations: [{ scope: 'broken-plugin', location: '/missing/fed-modules.json' }],
        outputDirectory,
      }).apply({
        context: process.cwd(),
        hooks: {
          beforeRun: {
            tapPromise: (_name, callback) => {
              beforeRun = callback;
            },
          },
        },
      });

      await expect(beforeRun?.()).rejects.toThrow();
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });

  test('loads registry and archive over HTTP', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-http-'));
    const outputDirectory = join(root, 'generated');
    const archivePath = join(root, 'types.zip');

    const archive = new AdmZip();
    archive.addFile(
      'ApiModule.d.ts',
      `export * from './apiModule';\nexport { default } from './apiModule';\nexport default function ApiModule(props: { message: string }): JSX.Element;\n`,
    );
    archive.writeZip(archivePath);
    const archiveData = await readFile(archivePath);
    const server = createServer((request, response) => {
      if (request.url === '/fed-modules.json') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ 'sdk-plugin': { remoteTypesLocation: '/types.zip' } }));
        return;
      }
      if (request.url === '/types.zip') {
        response.end(archiveData);
        return;
      }
      response.statusCode = 404;
      response.end();
    });

    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve());
      });
      const { port } = server.address() as AddressInfo;
      let beforeRun: (() => Promise<void>) | undefined;
      const compiler = {
        context: root,
        hooks: {
          beforeRun: {
            tapPromise: (_name: string, callback: () => Promise<void>) => {
              beforeRun = callback;
            },
          },
        },
      };

      new ScalprumRemoteTypesPlugin({
        modulesConfigLocations: [{ scope: 'sdk-plugin', location: `http://127.0.0.1:${port}/fed-modules.json` }],
        outputDirectory,
      }).apply(compiler);
      await beforeRun?.();

      const generated = await readFile(join(outputDirectory, 'generated.d.ts'), 'utf8');
      expect(generated).toContain(`"sdk-plugin./ApiModule": typeof RemoteModule0.default;`);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });
});
