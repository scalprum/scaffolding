import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import * as ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { createGeneratedTypes } from './declarations';

async function writeDeclarations(root: string, files: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([name, source]) => {
      const target = join(root, name);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, source);
    }),
  );
}

describe('createGeneratedTypes', () => {
  test('keeps exposed keys and follows every barrel export with correct type semantics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'scalprum-remote-types-declarations-'));
    const files = {
      'ApiModule.d.ts': "export * from './src/index.js';\nexport * from './src/extra.js';\nexport { default } from './src/index.js';\n",
      'src/index.d.ts': "export * from './api';\nexport { Foo } from './types';\nexport default function ApiModule(): void;\n",
      'src/api.d.ts': 'export declare const Api: (props: { id: string }) => void;\n',
      'src/extra.d.ts': 'export declare const Extra: (props: { enabled: boolean }) => void;\n',
      'src/types.d.ts': 'export interface Foo { id: string }\n',
    };

    try {
      const scopeDirectory = join(root, 'app');
      await writeDeclarations(scopeDirectory, files);
      const generated = createGeneratedTypes('app', scopeDirectory, Object.keys(files));

      expect(generated.imports).toEqual(["import type * as RemoteModule0 from './app/ApiModule';"]);
      expect(generated.properties).toEqual([
        '  "app./ApiModule.Api": typeof RemoteModule0.Api;',
        '  "app./ApiModule.Foo": RemoteModule0.Foo;',
        '  "app./ApiModule.Extra": typeof RemoteModule0.Extra;',
        '  "app./ApiModule": typeof RemoteModule0.default;',
      ]);

      const generatedPath = join(root, 'generated.d.ts');
      await writeFile(generatedPath, `${generated.imports.join('\n')}\ninterface RemoteTypes {\n${generated.properties.join('\n')}\n}\n`);
      const program = ts.createProgram([generatedPath], {
        noEmit: true,
        strict: true,
        skipLibCheck: false,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Node10,
      });
      expect(ts.getPreEmitDiagnostics(program)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
