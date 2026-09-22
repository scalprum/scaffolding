import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import * as ts from 'typescript';
import webpack from 'webpack';
import AdmZip from 'adm-zip';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import * as rspack from '@rspack/core';
import { ScalprumRemoteTypesPlugin } from './plugin';
import '../test/test-fetch';

type Compiler = {
  run(callback: (error: Error | null, stats?: { hasErrors(): boolean; toString(options: object): string }) => void): void;
  close(callback: () => void): void;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const mockRoot = join(root, 'federation-cdn-mock');
let fixtureRoot: string;

const fixtures = {
  valid: {
    'get-module.ts': `import { getModule } from '@scalprum/core';
export async function validGetModule() {
  const component = await getModule('sdk-plugin', './SDKComponent', 'PluginSDKComponent');
  component({ name: 'valid' });
  const hook = await getModule('sdk-plugin', './useCounterHook');
  return hook({ initialValue: 1, step: 2 }).count;
}
`,
    'component.tsx': `import { ScalprumComponent } from '@scalprum/react-core';
export const ValidComponent = () => <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="PluginSDKComponent" name="valid" />;
`,
    'remote-hook.tsx': `import { useRemoteHook } from '@scalprum/react-core';
export const ValidRemoteHook = () => {
  const result = useRemoteHook({ scope: 'sdk-plugin', module: './useCounterHook', args: [{ initialValue: 1, step: 2 }] });
  return result.hookResult?.count;
};
`,
    'use-module.tsx': `import { useModule } from '@scalprum/react-core';
export const ValidUseModule = () => {
  const component = useModule('sdk-plugin', './SDKComponent', undefined, 'PluginSDKComponent');
  component?.({ name: 'valid' });
  return null;
};
`,
    'full-manifest.tsx': `import { ScalprumComponent } from '@scalprum/react-core';
export const ValidFullManifest = () => <ScalprumComponent scope="full-manifest" module="./SDKComponent" />;
`,
    'multi-scope.tsx': `import { ScalprumComponent } from '@scalprum/react-core';
export const ValidMultiScope = () => (
  <>
    <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="PluginSDKComponent" name="sdk" />
    <ScalprumComponent scope="full-manifest" module="./SDKComponent" />
  </>
);
`,
    'use-load-module.tsx': `import { useLoadModule } from '@scalprum/react-core';
export const ValidUseLoadModule = () => {
  const [component] = useLoadModule({ scope: 'sdk-plugin', module: './SDKComponent', importName: 'PluginSDKComponent' });
  component?.({ name: 'valid' });
  return null;
};
`,
  },
  invalid: {
    'get-module.ts': `import { getModule } from '@scalprum/core';
export async function InvalidGetModule() {
  const component = await getModule('sdk-plugin', './SDKComponent', 'PluginSDKComponent');
  component({ name: 42 });
}
`,
    'component.tsx': `import { ScalprumComponent } from '@scalprum/react-core';
export const InvalidComponent = () => <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="PluginSDKComponent" name={42} />;
`,
    'remote-hook.tsx': `import { useRemoteHook } from '@scalprum/react-core';
export const InvalidRemoteHook = () => useRemoteHook({ scope: 'sdk-plugin', module: './useCounterHook', args: [{ initialValue: 'bad', step: 2 }] });
`,
    'use-module.tsx': `import { useModule } from '@scalprum/react-core';
export const InvalidUseModule = () => {
  const component = useModule('sdk-plugin', './SDKComponent', undefined, 'PluginSDKComponent');
  component?.({ name: 42 });
  return null;
};
`,
    'use-load-module.tsx': `import { useLoadModule } from '@scalprum/react-core';
export const InvalidUseLoadModule = () => {
  const [component] = useLoadModule({ scope: 'sdk-plugin', module: './SDKComponent', importName: 'PluginSDKComponent' });
  component?.({ name: 42 });
  return null;
};
`,
    'multi-scope.tsx': `import { ScalprumComponent } from '@scalprum/react-core';
export const InvalidMultiScope = () => (
  <>
    <ScalprumComponent scope="sdk-plugin" module="./SDKComponent" importName="PluginSDKComponent" name={42} />
    <ScalprumComponent scope="full-manifest" module="./SDKComponent" />
  </>
);
`,
  },
};

async function writeFixtures(rootDirectory: string): Promise<void> {
  for (const [kind, files] of Object.entries(fixtures)) {
    const directory = join(rootDirectory, kind);
    await mkdir(directory, { recursive: true });
    await Promise.all(Object.entries(files).map(([fileName, source]) => writeFile(join(directory, fileName), source)));
  }
}

function runCompiler(compiler: Compiler): Promise<void> {
  return new Promise((resolveRun, reject) => {
    compiler.run((error, stats) => {
      const close = () => compiler.close(() => undefined);
      if (error) {
        close();
        reject(error);
        return;
      }
      if (stats?.hasErrors()) {
        const message = stats.toString({ errors: true, warnings: false });
        close();
        reject(new Error(message));
        return;
      }
      close();
      resolveRun();
    });
  });
}

function compilerDiagnostics(fixture: string, generatedTypes: string) {
  const program = ts.createProgram({
    rootNames: [fixture, generatedTypes].filter((fileName) => existsSync(fileName)),
    options: {
      allowSyntheticDefaultImports: true,
      baseUrl: root,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      noEmit: true,
      paths: {
        '@scalprum/core': ['packages/core/src/index.ts'],
        '@scalprum/react-core': ['packages/react-core/src/index.ts'],
        '@scalprum/remote-types': ['packages/remote-types/src/index.ts'],
        react: ['node_modules/@types/react/index.d.ts'],
        'react/jsx-runtime': ['node_modules/@types/react/jsx-runtime.d.ts'],
        'react/jsx-dev-runtime': ['node_modules/@types/react/jsx-dev-runtime.d.ts'],
      },
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2020,
      types: ['node', 'react'],
    },
  });

  return ts.getPreEmitDiagnostics(program);
}

function diagnosticText(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
}

function diagnosticSummaries(diagnostics: readonly ts.Diagnostic[]): string[] {
  return diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnosticText(diagnostic)}`);
}

function expectDiagnostic(fixture: string, generatedTypes: string, code: number, message: string): void {
  const diagnostics = compilerDiagnostics(fixture, generatedTypes);
  const formatted = diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnosticText(diagnostic)}`);
  const matching = formatted.filter((diagnostic) => diagnostic.startsWith(`${code}:`) && diagnostic.includes(message));
  expect(matching, `Expected diagnostic ${code} containing "${message}". Actual diagnostics:\n${formatted.join('\n')}`).not.toHaveLength(0);
}

describe('remote type integration', () => {
  let generatedRoot: string;
  let webpackTypes: string;
  let rspackTypes: string;

  beforeAll(async () => {
    generatedRoot = await mkdtemp(join(tmpdir(), 'scalprum-remote-type-integration-'));
    fixtureRoot = join(generatedRoot, 'fixtures');
    await writeFixtures(fixtureRoot);
    webpackTypes = join(generatedRoot, 'webpack');
    rspackTypes = join(generatedRoot, 'rspack');

    const mockConfig = require(join(mockRoot, 'webpack.config.js'))();
    mockConfig.context = mockRoot;
    mockConfig.cache = false;
    await runCompiler(webpack(mockConfig) as unknown as Compiler);

    const registry = join(mockRoot, 'dist/fed-modules-generated.json');
    const registryData = JSON.parse(await readFile(registry, 'utf8')) as Record<string, { remoteTypesLocation: string }>;
    expect(Object.keys(registryData)).toEqual(expect.arrayContaining(['sdk-plugin', 'full-manifest']));
    const archive = new AdmZip(join(mockRoot, 'dist/sdk-plugin-mf-types.zip'));
    const fullManifestArchive = new AdmZip(join(mockRoot, 'dist/full-manifest-mf-types.zip'));
    expect(archive.getEntries().some((entry) => entry.entryName === 'SDKComponent.d.ts')).toBe(true);
    expect(fullManifestArchive.getEntries().some((entry) => entry.entryName === 'SDKComponent.d.ts')).toBe(true);

    const consumer = {
      context: root,
      mode: 'development' as const,
      entry: {
        getModule: join(fixtureRoot, 'valid/get-module.ts'),
        component: join(fixtureRoot, 'valid/component.tsx'),
        hook: join(fixtureRoot, 'valid/remote-hook.tsx'),
        useModule: join(fixtureRoot, 'valid/use-module.tsx'),
        fullManifest: join(fixtureRoot, 'valid/full-manifest.tsx'),
        multiScope: join(fixtureRoot, 'valid/multi-scope.tsx'),
      },
      module: { rules: [{ test: /\.tsx?$/, type: 'asset/source' }] },
    };

    await runCompiler(
      webpack({
        ...consumer,
        output: { path: join(generatedRoot, 'webpack-build'), filename: '[name].js' },
        plugins: [
          new ScalprumRemoteTypesPlugin({
            modulesConfigLocations: [
              { scope: 'sdk-plugin', location: registry },
              { scope: 'full-manifest', location: registry },
            ],
            outputDirectory: webpackTypes,
          }),
        ],
      }) as unknown as Compiler,
    );

    await runCompiler(
      rspack.rspack({
        ...consumer,
        output: { path: join(generatedRoot, 'rspack-build'), filename: '[name].js' },
        plugins: [
          new ScalprumRemoteTypesPlugin({
            modulesConfigLocations: [
              { scope: 'sdk-plugin', location: registry },
              { scope: 'full-manifest', location: registry },
            ],
            outputDirectory: rspackTypes,
          }),
        ],
      }) as unknown as Compiler,
    );
  }, 120_000);

  afterAll(async () => {
    if (generatedRoot) {
      await rm(generatedRoot, { recursive: true, force: true });
    }
  });

  test('Webpack and Rspack generate same remote type contract', async () => {
    const [webpackGenerated, rspackGenerated] = await Promise.all([
      readFile(join(webpackTypes, 'generated.d.ts'), 'utf8'),
      readFile(join(rspackTypes, 'generated.d.ts'), 'utf8'),
    ]);

    expect(webpackGenerated).toContain('sdk-plugin./SDKComponent.PluginSDKComponent');
    expect(webpackGenerated).toContain('sdk-plugin./useCounterHook');
    expect(webpackGenerated).toMatch(/"sdk-plugin\.\/useApiHook\.UseApiOptions": RemoteModule\d+\.UseApiOptions;/);
    expect(webpackGenerated).not.toMatch(/"sdk-plugin\.\/useApiHook\.UseApiOptions": typeof/);
    expect(webpackGenerated).toContain('full-manifest./SDKComponent');
    expect(rspackGenerated).toContain('sdk-plugin./SDKComponent.PluginSDKComponent');
    expect(rspackGenerated).toContain('sdk-plugin./useCounterHook');
    expect(rspackGenerated).toContain('full-manifest./SDKComponent');
  });

  test('disabled consumer removes declarations and preserves generic fallback', async () => {
    const disabledOutput = join(generatedRoot, 'disabled');
    let beforeRun: (() => Promise<void>) | undefined;
    new ScalprumRemoteTypesPlugin({
      enabled: false,
      modulesConfigLocations: [{ scope: 'sdk-plugin', location: join(mockRoot, 'dist/fed-modules-generated.json') }],
      outputDirectory: disabledOutput,
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
    // Keep package type entry valid while disabled mode removes remote-specific declarations.
    expect(existsSync(join(disabledOutput, 'generated.d.ts'))).toBe(true);
    expect(await readFile(join(disabledOutput, 'generated.d.ts'), 'utf8')).toBe('export interface GeneratedRemoteTypes {}\n');
    const diagnostics = compilerDiagnostics(join(fixtureRoot, 'valid/component.tsx'), join(disabledOutput, 'generated.d.ts'));
    expect(diagnosticSummaries(diagnostics), 'disabled mode diagnostics').toEqual([]);
  });

  test('valid core and React fixtures compile', () => {
    for (const fixture of [
      'get-module.ts',
      'component.tsx',
      'remote-hook.tsx',
      'use-module.tsx',
      'use-load-module.tsx',
      'full-manifest.tsx',
      'multi-scope.tsx',
    ]) {
      const diagnostics = compilerDiagnostics(join(fixtureRoot, 'valid', fixture), join(webpackTypes, 'generated.d.ts'));
      expect(diagnosticSummaries(diagnostics), `${fixture} diagnostics`).toEqual([]);
    }
  });

  test('invalid getModule props fail with TypeScript diagnostic', () => {
    expectDiagnostic(
      join(fixtureRoot, 'invalid/get-module.ts'),
      join(webpackTypes, 'generated.d.ts'),
      2322,
      "number' is not assignable to type 'string",
    );
  });

  test('invalid ScalprumComponent props fail with TypeScript diagnostic', () => {
    expectDiagnostic(
      join(fixtureRoot, 'invalid/component.tsx'),
      join(webpackTypes, 'generated.d.ts'),
      2769,
      "number' is not assignable to type 'string",
    );
  });

  test('invalid useRemoteHook args fail with TypeScript diagnostic', () => {
    expectDiagnostic(
      join(fixtureRoot, 'invalid/remote-hook.tsx'),
      join(webpackTypes, 'generated.d.ts'),
      2769,
      "string' is not assignable to type 'number",
    );
  });

  test('invalid useModule props fail with TypeScript diagnostic', () => {
    expectDiagnostic(
      join(fixtureRoot, 'invalid/use-module.tsx'),
      join(webpackTypes, 'generated.d.ts'),
      2322,
      "number' is not assignable to type 'string",
    );
  });

  test('invalid useLoadModule props fail with TypeScript diagnostic', () => {
    expectDiagnostic(
      join(fixtureRoot, 'invalid/use-load-module.tsx'),
      join(webpackTypes, 'generated.d.ts'),
      2322,
      "number' is not assignable to type 'string",
    );
  });

  test('invalid multi-scope fixture fails with TypeScript diagnostic', () => {
    expectDiagnostic(
      join(fixtureRoot, 'invalid/multi-scope.tsx'),
      join(webpackTypes, 'generated.d.ts'),
      2769,
      "number' is not assignable to type 'string",
    );
  });
});
