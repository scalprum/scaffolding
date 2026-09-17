import { mkdtemp, mkdir, readdir, rm } from 'fs/promises';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve, sep } from 'path';
import { tmpdir } from 'os';
import * as ts from 'typescript';
import { AdmZip } from './adm-zip';
import type AdmZipType from 'adm-zip';
import type { CompilerLike, ScalprumRemoteTypesProducerPluginOptions } from './plugin-types';

const producerPluginName = 'ScalprumRemoteTypesProducerPlugin';

async function addDeclarationFiles(archive: AdmZipType, directory: string, rootDirectory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) await addDeclarationFiles(archive, filePath, rootDirectory);
    else if (entry.name.endsWith('.d.ts')) archive.addFile(relative(rootDirectory, filePath).split(sep).join('/'), readFileSync(filePath));
  }
}

function hasDefaultExport(declarationPath: string): boolean {
  const sourceFile = ts.createSourceFile(declarationPath, readFileSync(declarationPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sourceFile.statements.some((statement) => {
    if (ts.isExportAssignment(statement)) return true;
    return ts.canHaveModifiers(statement) && Boolean(ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
  });
}

async function generateRemoteTypesArchive(options: ScalprumRemoteTypesProducerPluginOptions, context: string, archivePath: string): Promise<void> {
  if (!options.exposes) throw new Error(`${producerPluginName} cannot generate archive without exposes`);
  const sourceRoot = resolve(context, options.sourceRoot ?? './src');
  const declarationDirectory = await mkdtemp(join(tmpdir(), 'scalprum-mf-types-'));
  try {
    const program = ts.createProgram(
      Object.values(options.exposes).map((source) => resolve(context, source)),
      {
        declaration: true,
        emitDeclarationOnly: true,
        outDir: declarationDirectory,
        rootDir: sourceRoot,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
      },
    );
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: () => context,
          getNewLine: () => '\n',
        }),
      );
    }
    program.emit();
    const archive = new AdmZip();
    await addDeclarationFiles(archive, declarationDirectory, declarationDirectory);
    for (const [exposedModule, source] of Object.entries(options.exposes)) {
      const declarationPath = relative(sourceRoot, resolve(context, source))
        .replace(/\.(tsx?|jsx?)$/, '.d.ts')
        .split(sep)
        .join('/');
      const modulePath = exposedModule.replace(/^\.\//, '');
      const moduleTarget = declarationPath.replace(/\.d\.ts$/, '');
      const compiledDeclaration = join(declarationDirectory, declarationPath);
      const defaultExport = hasDefaultExport(compiledDeclaration);
      const defaultReExport = defaultExport ? `export { default } from './${moduleTarget}';\n` : '';
      archive.addFile(`${modulePath}.d.ts`, Buffer.from(`export * from './${moduleTarget}';\n${defaultReExport}`));
    }
    await mkdir(dirname(archivePath), { recursive: true });
    const temporaryArchivePath = `${archivePath}.${process.pid}.tmp`;
    archive.writeZip(temporaryArchivePath);
    renameSync(temporaryArchivePath, archivePath);
  } finally {
    await rm(declarationDirectory, { recursive: true, force: true });
  }
}

export class ScalprumRemoteTypesProducerPlugin {
  private readonly options: ScalprumRemoteTypesProducerPluginOptions;

  constructor(options: ScalprumRemoteTypesProducerPluginOptions) {
    if (!options.scope) throw new Error(`${producerPluginName} requires scope`);
    this.options = options;
  }

  apply(compiler: CompilerLike): void {
    compiler.hooks.done?.tapPromise(producerPluginName, async () => {
      const outputDirectory = resolve(compiler.context ?? process.cwd(), this.options.outputDirectory);
      const archiveFilename = this.options.archiveFilename ?? '@mf-types.zip';
      const sourceArchiveFilename = this.options.sourceArchiveFilename ?? '@mf-types.zip';
      const registryFilename = this.options.registryFilename ?? 'fed-modules-generated.json';
      mkdirSync(outputDirectory, { recursive: true });
      const sourceArchivePath = join(outputDirectory, sourceArchiveFilename);
      const archivePath = join(outputDirectory, archiveFilename);
      if (this.options.exposes) await generateRemoteTypesArchive(this.options, compiler.context ?? process.cwd(), sourceArchivePath);
      if (existsSync(sourceArchivePath) && sourceArchivePath !== archivePath) copyFileSync(sourceArchivePath, archivePath);
      if (!existsSync(archivePath)) throw new Error(`${producerPluginName} archive not found: ${archivePath}`);
      const registryPath = join(outputDirectory, registryFilename);
      let registry: Record<string, { remoteTypesLocation: string }> = {};
      if (existsSync(registryPath)) {
        try {
          registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Record<string, { remoteTypesLocation: string }>;
        } catch (error) {
          throw new Error(`Invalid remote type registry at ${registryPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      registry[this.options.scope] = { remoteTypesLocation: archiveFilename };
      writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    });
  }
}
