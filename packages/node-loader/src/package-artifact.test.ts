import { access, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { resolve } from 'path';
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

const workspaceRoot = process.cwd();
const sourceManifestPath = resolve(workspaceRoot, 'packages/node-loader/package.json');
const artifactPath = resolve(workspaceRoot, 'dist/packages/node-loader');

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
});
