import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import * as ts from 'typescript';
import { expect, test } from 'vitest';

const execFileAsync = promisify(execFile);

test('generated declarations are reachable through package type entry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-package-'));
  const packageRoot = join(root, 'remote-types');
  try {
    await cp(resolve(process.cwd(), 'dist/packages/remote-types'), packageRoot, { recursive: true });
    await mkdir(join(packageRoot, 'integration'), { recursive: true });
    await writeFile(
      join(packageRoot, 'integration', 'Widget.d.ts'),
      'declare const Widget: (props: { value: string }) => unknown;\nexport default Widget;\n',
    );
    await writeFile(
      join(packageRoot, 'generated.d.ts'),
      `export interface GeneratedRemoteTypes {}\n\nimport type * as RemoteModule0 from './integration/Widget';\ndeclare module '@scalprum/remote-types' {\n  interface RemoteTypes {\n    'integration./Widget': typeof RemoteModule0.default;\n  }\n}\nexport {};\n`,
    );
    const consumer = join(root, 'consumer.ts');
    await writeFile(
      consumer,
      `import type { RemoteType } from '@scalprum/remote-types';\nconst Widget: RemoteType<'integration', './Widget'> = null as never;\nWidget({ value: 42 });\n`,
    );

    const program = ts.createProgram([consumer], {
      baseUrl: root,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      paths: { '@scalprum/remote-types': [join(packageRoot, 'index.d.ts')] },
      strict: true,
      target: ts.ScriptTarget.ES2022,
      types: ['node'],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const messages = diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    expect(messages).toContain("Type 'number' is not assignable to type 'string'.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loads native ESM webpack entrypoint', async () => {
  const esmPackage = JSON.parse(await readFile(resolve(process.cwd(), 'dist/packages/remote-types/esm/package.json'), 'utf8')) as { type?: string };
  expect(esmPackage.type).toBe('module');
  const webpackEntrypoint = pathToFileURL(resolve(process.cwd(), 'dist/packages/remote-types/esm/webpack.js')).href;
  await execFileAsync(process.execPath, ['--input-type=module', '--eval', `import(${JSON.stringify(webpackEntrypoint)})`]);
});
