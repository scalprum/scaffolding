import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { pathToFileURL } from 'url';

const execFileAsync = promisify(execFile);

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: {
    '.': {
      import: string;
      require: string;
      types: string;
    };
  };
  main?: string;
  module?: string;
  peerDependencies?: Record<string, string>;
  types?: string;
};

type PackResult = { filename: string }[];

const workspaceRoot = process.cwd();
const sourceManifestPath = resolve(workspaceRoot, 'packages/node-loader/package.json');
const artifactPath = resolve(workspaceRoot, 'dist/packages/node-loader');
const npmPackTimeoutMs = 30_000;
const npmInstallTimeoutMs = 240_000;
const runtimeTimeoutMs = 30_000;
const typecheckTimeoutMs = 60_000;

async function readManifest(path: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path, 'utf8')) as PackageManifest;
}

describe('@scalprum/node-loader package boundary', () => {
  it('declares host-provided runtimes and package-local Node types only', async () => {
    const manifest = await readManifest(sourceManifestPath);
    const coreManifest = await readManifest(resolve(workspaceRoot, 'packages/core/package.json'));

    expect(manifest.peerDependencies).toEqual({
      '@module-federation/enhanced': '^2.9.0',
      '@openshift/dynamic-plugin-sdk': '^9.1.0',
    });
    expect(manifest.devDependencies?.['@openshift/dynamic-plugin-sdk']).toBe(manifest.peerDependencies?.['@openshift/dynamic-plugin-sdk']);
    expect(manifest.peerDependencies?.['@openshift/dynamic-plugin-sdk']).toBe(coreManifest.dependencies?.['@openshift/dynamic-plugin-sdk']);
    expect(manifest.dependencies ?? {}).not.toHaveProperty('@scalprum/core');
    expect(manifest.dependencies ?? {}).not.toHaveProperty('@openshift/dynamic-plugin-sdk');
    expect(manifest.dependencies ?? {}).not.toHaveProperty('@module-federation/enhanced');
    expect(manifest.devDependencies).toHaveProperty('@types/node');
  });

  it('builds an isolated artifact whose declared entrypoints exist', async () => {
    const manifest = await readManifest(resolve(artifactPath, 'package.json'));
    const entrypoints = [
      manifest.main,
      manifest.module,
      manifest.types,
      manifest.exports?.['.'].import,
      manifest.exports?.['.'].require,
      manifest.exports?.['.'].types,
    ];

    expect(entrypoints.every((entrypoint) => typeof entrypoint === 'string')).toBe(true);
    await Promise.all(entrypoints.map((entrypoint) => access(resolve(artifactPath, entrypoint as string))));
    expect(await readManifest(resolve(artifactPath, 'esm/package.json'))).toEqual({ type: 'module' });
    expect(manifest.dependencies ?? {}).not.toHaveProperty('@scalprum/core');
    expect(manifest.peerDependencies).toEqual({
      '@module-federation/enhanced': '^2.9.0',
      '@openshift/dynamic-plugin-sdk': '^9.1.0',
    });

    const cjsPath = resolve(artifactPath, manifest.main as string);
    const esmPath = resolve(artifactPath, manifest.exports?.['.'].import as string);
    await execFileAsync(process.execPath, [
      '--eval',
      `const value = require(${JSON.stringify(cjsPath)}); if (Object.keys(value).length) process.exit(1);`,
    ]);
    await execFileAsync(process.execPath, [
      '--input-type=module',
      '--eval',
      `const value = await import(${JSON.stringify(pathToFileURL(esmPath).href)}); if (Object.keys(value).length) process.exit(1);`,
    ]);
  });

  it('runs as an installed package from an isolated consumer', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'scalprum-node-loader-consumer-'));
    const consumerRoot = join(temporaryRoot, 'consumer');

    try {
      await mkdir(consumerRoot);
      const manifest = await readManifest(resolve(artifactPath, 'package.json'));
      const peerDependencies = Object.entries(manifest.peerDependencies ?? {});
      expect(peerDependencies.length).toBeGreaterThan(0);

      const packResult = await execFileAsync('npm', ['pack', artifactPath, '--pack-destination', temporaryRoot, '--json'], {
        cwd: workspaceRoot,
        timeout: npmPackTimeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
      const [{ filename }] = JSON.parse(packResult.stdout) as PackResult;
      const tarballPath = join(temporaryRoot, filename);

      await writeFile(resolve(consumerRoot, 'package.json'), JSON.stringify({ name: 'node-loader-consumer', private: true }, null, 2));
      await execFileAsync(
        'npm',
        [
          'install',
          '--no-save',
          '--package-lock=false',
          '--no-audit',
          '--no-fund',
          '--offline=false',
          tarballPath,
          ...peerDependencies.map(([name, range]) => `${name}@${range}`),
        ],
        { cwd: consumerRoot, timeout: npmInstallTimeoutMs, maxBuffer: 10 * 1024 * 1024 },
      );

      await execFileAsync(
        process.execPath,
        [
          '--eval',
          `const value = require('@scalprum/node-loader'); if (Object.keys(value).length !== 0) throw new Error('Expected empty CommonJS exports');`,
        ],
        { cwd: consumerRoot, timeout: runtimeTimeoutMs },
      );
      await execFileAsync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `import * as value from '@scalprum/node-loader'; if (Object.keys(value).length !== 0) throw new Error('Expected empty ESM exports');`,
        ],
        { cwd: consumerRoot, timeout: runtimeTimeoutMs },
      );

      const typescriptPath = resolve(workspaceRoot, 'node_modules/typescript/bin/tsc');
      await writeFile(
        resolve(consumerRoot, 'consumer.cts'),
        "import loader = require('@scalprum/node-loader');\nconst empty: typeof loader = {};\nexport {};\n",
      );
      await writeFile(
        resolve(consumerRoot, 'consumer.mts'),
        "import * as loader from '@scalprum/node-loader';\nconst empty: typeof loader = {};\nexport {};\n",
      );
      await writeFile(
        resolve(consumerRoot, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              strict: true,
              noEmit: true,
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              target: 'ES2022',
              types: [],
            },
            files: ['consumer.cts', 'consumer.mts'],
          },
          null,
          2,
        ),
      );
      await execFileAsync(process.execPath, [typescriptPath, '--project', 'tsconfig.json'], {
        cwd: consumerRoot,
        timeout: typecheckTimeoutMs,
      });
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 450_000);
});
