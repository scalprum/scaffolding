import { spawnSync } from 'child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { tmpdir } from 'os';
import * as ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { AdmZip } from './adm-zip';
import { ScalprumRemoteTypesPlugin } from './plugin';

function findWorkspaceRoot(): string {
  let directory = resolve(process.cwd());
  while (directory !== dirname(directory)) {
    if (existsSync(join(directory, 'nx.json')) && existsSync(join(directory, 'package-lock.json'))) return directory;
    directory = dirname(directory);
  }
  throw new Error('Unable to find workspace root');
}

async function runConsumerPlugin(root: string, files: Array<[string, string]>, outputDirectory?: string): Promise<string> {
  const archivePath = join(root, 'types.zip');
  const registryPath = join(root, 'fed-modules.json');
  const archive = new AdmZip();
  for (const [entryName, content] of files) archive.addFile(entryName, content);
  archive.writeZip(archivePath);
  await writeFile(registryPath, JSON.stringify({ app: { remoteTypesLocation: 'types.zip' } }));

  let beforeRun: (() => Promise<void>) | undefined;
  new ScalprumRemoteTypesPlugin({
    modulesConfigLocations: [{ scope: 'app', location: registryPath }],
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
  if (!beforeRun) throw new Error('Consumer plugin did not register beforeRun');
  await beforeRun();

  return outputDirectory ?? join(root, 'node_modules/@scalprum/remote-types');
}

async function copyBuiltPackage(root: string): Promise<string> {
  const workspaceRoot = findWorkspaceRoot();
  const packageDirectory = join(root, 'node_modules/@scalprum/remote-types');
  await mkdir(dirname(packageDirectory), { recursive: true });
  await cp(join(workspaceRoot, 'dist/packages/remote-types'), packageDirectory, { recursive: true });

  const packageJson = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  for (const dependency of Object.keys(packageJson.dependencies ?? {})) {
    const dependencyPath = join(root, 'node_modules', dependency);
    await symlink(join(workspaceRoot, 'node_modules', dependency), dependencyPath, 'dir');
  }
  return packageDirectory;
}

function runNode(root: string, args: string[]): void {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  expect(result.status, output).toBe(0);
}

describe('remote types regressions', () => {
  test('leaves a valid empty declaration file when remote types are disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-disabled-regression-'));
    try {
      const outputDirectory = join(root, 'generated');
      let beforeRun: (() => Promise<void>) | undefined;
      new ScalprumRemoteTypesPlugin({ enabled: false, modulesConfigLocations: [], outputDirectory }).apply({
        context: root,
        hooks: {
          beforeRun: {
            tapPromise: (_name, callback) => {
              beforeRun = callback;
            },
          },
        },
      });
      if (!beforeRun) throw new Error('Consumer plugin did not register beforeRun');
      await beforeRun();

      expect(await readFile(join(outputDirectory, 'generated.d.ts'), 'utf8')).toBe('export {};\n');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loads generated declarations from the default package output directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-default-output-regression-'));
    try {
      await copyBuiltPackage(root);
      await runConsumerPlugin(root, [
        ['Widget.d.ts', "export * from './src/widget';\nexport { default } from './src/widget';\n"],
        ['src/widget.d.ts', 'export default function Widget(props: { id: string }): void;\n'],
      ]);
      const consumerPath = join(root, 'consumer.ts');
      await writeFile(
        consumerPath,
        [
          "import type { RemoteType } from '@scalprum/remote-types';",
          "declare const Widget: RemoteType<'app', './Widget'>;",
          'Widget({ wrong: true });',
          '',
        ].join('\n'),
      );

      const program = ts.createProgram([consumerPath], {
        noEmit: true,
        strict: true,
        skipLibCheck: false,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);

      expect(program.getSourceFiles().some((sourceFile) => sourceFile.fileName.endsWith('/node_modules/@scalprum/remote-types/generated.d.ts'))).toBe(
        true,
      );
      expect(diagnostics.map(({ code }) => code)).toEqual([2353]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('loads every published entry from native ESM and CommonJS', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-module-regression-'));
    try {
      await copyBuiltPackage(root);
      runNode(root, [
        '--input-type=module',
        '-e',
        "await import('@scalprum/remote-types'); await import('@scalprum/remote-types/webpack'); await import('@scalprum/remote-types/rspack');",
      ]);
      runNode(root, [
        '-e',
        "require('@scalprum/remote-types'); require('@scalprum/remote-types/webpack'); require('@scalprum/remote-types/rspack');",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
