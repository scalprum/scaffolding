import { mkdir, writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { dirname, join, posix } from 'path';
import * as ts from 'typescript';
import type AdmZip from 'adm-zip';

export function getExposeEntryName(entryName: string): string | undefined {
  const normalized = entryName.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.endsWith('.d.ts') && !normalized.includes('/node_modules/') ? normalized : undefined;
}

function isExposeEntry(source: string): boolean {
  const sourceFile = ts.createSourceFile('remote-entry.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exports = sourceFile.statements.filter(ts.isExportDeclaration);
  return exports.some((statement) => statement.moduleSpecifier && !statement.exportClause);
}

function getReferencedDeclaration(source: string, entryName: string, files: Map<string, string>): string | undefined {
  const sourceFile = ts.createSourceFile('remote-entry.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exportAll = sourceFile.statements.find((statement): statement is ts.ExportDeclaration => {
    return ts.isExportDeclaration(statement) && Boolean(statement.moduleSpecifier) && !statement.exportClause;
  });
  if (!exportAll?.moduleSpecifier || !ts.isStringLiteral(exportAll.moduleSpecifier)) return undefined;
  const referencedBase = posix.normalize(posix.join(posix.dirname(entryName), exportAll.moduleSpecifier.text)).replace(/^\.\//, '');
  return [referencedBase, `${referencedBase}.d.ts`, `${referencedBase}/index.d.ts`]
    .map((candidate) => files.get(candidate))
    .find((value): value is string => value !== undefined);
}

function getExportNames(source: string): Array<{ name: string; typeOnly: boolean }> {
  const sourceFile = ts.createSourceFile('remote-module.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = new Map<string, boolean>();
  const addName = (name: string, typeOnly: boolean) => {
    const existing = names.get(name);
    names.set(name, existing === undefined ? typeOnly : existing && typeOnly);
  };
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      addName('default', false);
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        statement.exportClause.elements.forEach((element) => addName(element.name.text, element.isTypeOnly));
      }
      continue;
    }
    if (!ts.canHaveModifiers(statement)) continue;
    const modifiers = ts.getModifiers(statement);
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
      addName('default', ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement));
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        if (ts.isIdentifier(declaration.name)) addName(declaration.name.text, false);
      });
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      addName(statement.name.text, ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement));
    }
  }
  return [...names].map(([name, typeOnly]) => ({ name, typeOnly }));
}

export async function extractArchive(archive: AdmZip, targetDirectory: string): Promise<string[]> {
  const names: string[] = [];
  for (const entry of archive.getEntries()) {
    const relativePath = entry.entryName.replace(/\\/g, '/').replace(/^\.\//, '');
    if (!relativePath || relativePath.startsWith('../') || relativePath.includes('/../')) {
      throw new Error(`Unsafe remote type archive entry: ${entry.entryName}`);
    }
    names.push(relativePath);
    if (entry.isDirectory) continue;
    const filePath = join(targetDirectory, ...relativePath.split('/'));
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, entry.getData());
  }
  return names;
}

export function createGeneratedTypes(
  scope: string,
  archiveDirectory: string,
  archiveEntries: string[],
  importOffset = 0,
): { imports: string[]; properties: string[]; nextImportOffset: number } {
  const files = new Map(archiveEntries.map((entryName) => [entryName, readFileSync(join(archiveDirectory, ...entryName.split('/')), 'utf8')]));
  const imports: string[] = [];
  const properties: string[] = [];
  let importIndex = importOffset;
  for (const entryName of archiveEntries) {
    const wrapper = files.get(entryName);
    if (!wrapper || !isExposeEntry(wrapper)) continue;
    const declaration = getReferencedDeclaration(wrapper, entryName, files) ?? wrapper;
    const exports = getExportNames(declaration);
    if (!exports.length) continue;
    const importName = `RemoteModule${importIndex++}`;
    imports.push(`import type * as ${importName} from './${scope}/${entryName.replace(/\.d\.ts$/, '')}';`);
    const moduleName = `./${entryName.replace(/\.d\.ts$/, '').replace(/^\.\//, '')}`;
    exports.forEach(({ name: exportName, typeOnly }) => {
      const key = exportName === 'default' ? `${scope}${moduleName}` : `${scope}${moduleName}.${exportName}`;
      properties.push(`  ${JSON.stringify(key)}: ${typeOnly ? '' : 'typeof '}${importName}.${exportName};`);
    });
  }
  return { imports, properties, nextImportOffset: importIndex };
}
