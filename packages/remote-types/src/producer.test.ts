import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, test } from 'vitest';
import { ScalprumRemoteTypesProducerPlugin } from './producer';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function runProducer(root: string, exposes: Record<string, string>): Promise<AdmZip> {
  let done: (() => Promise<void>) | undefined;
  new ScalprumRemoteTypesProducerPlugin({
    exposes,
    outputDirectory: 'dist',
    scope: 'remote',
    sourceRoot: './src',
    archiveFilename: 'types.zip',
    sourceArchiveFilename: 'types.zip',
  }).apply({
    context: root,
    hooks: {
      done: {
        tapPromise: (_name, callback) => {
          done = callback;
        },
      },
    },
  });
  await done?.();
  return new AdmZip(join(root, 'dist', 'types.zip'));
}

describe('ScalprumRemoteTypesProducerPlugin', () => {
  test('keeps compiled declarations separate from expose wrappers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-producer-collision-'));
    roots.push(root);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'Widget.ts'), 'export default function Widget(props: { label: string }) { return props.label; }');

    const archive = await runProducer(root, { './Widget': './src/Widget.ts' });
    const entries = archive.getEntries().map((entry) => entry.entryName);
    const wrapper = archive.getEntry('Widget.d.ts')?.getData().toString('utf8');

    expect(entries).toContain('compiled-types/Widget.d.ts');
    expect(wrapper).toContain("export * from './compiled-types/Widget';");
  });

  test('resolves nested expose wrapper paths relative to wrapper directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-producer-nested-'));
    roots.push(root);
    await mkdir(join(root, 'src', 'impl'), { recursive: true });
    await writeFile(join(root, 'src', 'impl', 'Widget.ts'), 'export default function Widget() { return null; }');

    const archive = await runProducer(root, { './components/Widget': './src/impl/Widget.ts' });
    const wrapper = archive.getEntry('components/Widget.d.ts')?.getData().toString('utf8');

    expect(archive.getEntries().map((entry) => entry.entryName)).toContain('compiled-types/impl/Widget.d.ts');
    expect(wrapper).toContain("export * from '../compiled-types/impl/Widget';");
  });

  test.each([
    ['./src/Widget', 'compiled-types/Widget.d.ts'],
    ['./src/Widget/index', 'compiled-types/Widget/index.d.ts'],
  ])('resolves extensionless expose source %s', async (source, expectedDeclaration) => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-producer-resolution-'));
    roots.push(root);
    const sourceFile = source.endsWith('/index') ? join(root, 'src', 'Widget', 'index.ts') : join(root, 'src', 'Widget.ts');
    await mkdir(join(sourceFile, '..'), { recursive: true });
    await writeFile(sourceFile, 'export default function Widget() { return null; }');

    const archive = await runProducer(root, { './Widget': source });

    expect(archive.getEntries().map((entry) => entry.entryName)).toContain(expectedDeclaration);
  });

  test('uses project tsconfig paths and ambient declarations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-producer-tsconfig-'));
    roots.push(root);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/*'] }, module: 'esnext', target: 'es2020' },
        include: ['src/**/*.ts'],
      }),
    );
    await writeFile(join(root, 'src', 'util.ts'), 'export const label = "ok";');
    await writeFile(join(root, 'src', 'assets.d.ts'), "declare module '*.svg' { const source: string; export default source; }");
    await writeFile(
      join(root, 'src', 'Widget.ts'),
      `import { label } from '@app/util';\nimport logo from './logo.svg';\nexport default function Widget() { return label + logo; }\n`,
    );

    const archive = await runProducer(root, { './Widget': './src/Widget.ts' });

    expect(archive.getEntries().map((entry) => entry.entryName)).toContain('compiled-types/Widget.d.ts');
  });
});
