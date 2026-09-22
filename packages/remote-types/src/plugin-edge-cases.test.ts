import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, test } from 'vitest';
import { ScalprumRemoteTypesPlugin } from './plugin';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createRemote(root: string, scope = 'remote'): Promise<void> {
  const archive = new AdmZip();
  archive.addFile('Widget.d.ts', 'export default function Widget(props: { value: string }): unknown;\n');
  archive.writeZip(join(root, 'types.zip'));
  await writeFile(join(root, 'fed-modules.json'), JSON.stringify({ [scope]: { remoteTypesLocation: 'types.zip' } }));
}

async function runPlugin(root: string, outputDirectory: string, location = 'fed-modules.json', scope = 'remote'): Promise<void> {
  let beforeRun: (() => Promise<void>) | undefined;
  new ScalprumRemoteTypesPlugin({ modulesConfigLocations: [{ location, scope }], outputDirectory }).apply({
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
}

describe('ScalprumRemoteTypesPlugin edge cases', () => {
  test('resolves relative registry locations from compiler context', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-plugin-relative-registry-'));
    roots.push(root);
    await createRemote(root);

    await runPlugin(root, join(root, 'generated'));

    await expect(readFile(join(root, 'generated', 'generated.d.ts'), 'utf8')).resolves.toContain('remote./Widget');
  });

  test('fails when requested scope has no remote type location', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-plugin-missing-location-'));
    roots.push(root);
    await writeFile(join(root, 'fed-modules.json'), JSON.stringify({ remote: {} }));

    await expect(runPlugin(root, join(root, 'generated'))).rejects.toThrow('remoteTypesLocation');
  });

  test('does not delete package files when scope matches package directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-plugin-scope-collision-'));
    roots.push(root);
    await createRemote(root, 'esm');
    const outputDirectory = join(root, 'generated');
    await runPlugin(root, outputDirectory, 'fed-modules.json', 'esm');
    await mkdir(join(outputDirectory, 'esm'), { recursive: true });
    await writeFile(join(outputDirectory, 'esm', 'package-marker'), 'keep');

    await runPlugin(root, outputDirectory, 'fed-modules.json', 'esm');

    await expect(readFile(join(outputDirectory, 'esm', 'package-marker'), 'utf8')).resolves.toBe('keep');
  });

  test('rejects path traversal in scope names', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-plugin-scope-traversal-'));
    roots.push(root);
    await createRemote(root);

    await expect(runPlugin(root, join(root, 'generated'), 'fed-modules.json', '../escape')).rejects.toThrow('Invalid remote type scope');
  });

  test('preserves previous generated types when refresh fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-plugin-stale-types-'));
    roots.push(root);
    await createRemote(root);
    const outputDirectory = join(root, 'generated');
    await runPlugin(root, outputDirectory);
    const generated = await readFile(join(outputDirectory, 'generated.d.ts'), 'utf8');

    await expect(runPlugin(root, outputDirectory, 'missing.json')).rejects.toThrow();

    await expect(readFile(join(outputDirectory, 'generated.d.ts'), 'utf8')).resolves.toBe(generated);
  });
});
