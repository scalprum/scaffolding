import { mkdir, writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { dirname, join, posix } from 'path';
import * as ts from 'typescript';
import type AdmZip from 'adm-zip';

export function getExposeEntryName(entryName: string): string | undefined {
  const normalized = entryName.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.endsWith('.d.ts') && !normalized.includes('/node_modules/') ? normalized : undefined;
}

function getReferencedEntry(moduleSpecifier: string, entryName: string, files: Map<string, string>): string | undefined {
  const referencedBase = posix.normalize(posix.join(posix.dirname(entryName), moduleSpecifier)).replace(/^\.\//, '');
  const withoutRuntimeExtension = referencedBase.replace(/\.(?:[cm]?js|jsx|tsx?)$/, '');
  return [
    referencedBase,
    `${referencedBase}.d.ts`,
    `${referencedBase}/index.d.ts`,
    withoutRuntimeExtension,
    `${withoutRuntimeExtension}.d.ts`,
    `${withoutRuntimeExtension}/index.d.ts`,
  ].find((candidate) => files.has(candidate));
}

function getReferencedEntries(source: string, entryName: string, files: Map<string, string>): string[] {
  const sourceFile = ts.createSourceFile('remote-entry.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const referencedEntries = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.exportClause ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const referencedEntry = getReferencedEntry(statement.moduleSpecifier.text, entryName, files);
    if (referencedEntry) referencedEntries.add(referencedEntry);
  }
  return [...referencedEntries];
}

function isExposeEntry(source: string): boolean {
  const sourceFile = ts.createSourceFile('remote-entry.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sourceFile.statements.some(
    (statement) => ts.isExportDeclaration(statement) && Boolean(statement.moduleSpecifier) && !statement.exportClause,
  );
}

function getExportNames(entryName: string, files: Map<string, string>, seenEntries = new Set<string>()): Array<{ name: string; typeOnly: boolean }> {
  const source = files.get(entryName);
  if (!source || seenEntries.has(entryName)) return [];
  seenEntries.add(entryName);

  const sourceFile = ts.createSourceFile('remote-module.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = new Map<string, boolean>();
  const localNames = new Map<string, boolean>();
  const addName = (name: string, typeOnly: boolean) => {
    const existing = names.get(name);
    names.set(name, existing === undefined ? typeOnly : existing && typeOnly);
  };
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        if (ts.isIdentifier(declaration.name)) localNames.set(declaration.name.text, false);
      });
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      localNames.set(statement.name.text, ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement));
    }
  }
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      addName('default', false);
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      const referencedEntry =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? getReferencedEntry(statement.moduleSpecifier.text, entryName, files)
          : undefined;
      if (!statement.exportClause && referencedEntry) {
        getExportNames(referencedEntry, files, new Set(seenEntries))
          .filter(({ name }) => name !== 'default')
          .forEach(({ name, typeOnly }) => addName(name, typeOnly));
      } else if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        const referencedNames = referencedEntry
          ? new Map(getExportNames(referencedEntry, files, new Set(seenEntries)).map(({ name, typeOnly }) => [name, typeOnly]))
          : localNames;
        statement.exportClause.elements.forEach((element) => {
          const referencedName = element.propertyName?.text ?? element.name.text;
          addName(element.name.text, statement.isTypeOnly || element.isTypeOnly || referencedNames.get(referencedName) === true);
        });
      } else if (statement.exportClause && ts.isNamespaceExport(statement.exportClause)) {
        addName(statement.exportClause.name.text, statement.isTypeOnly);
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
      addName(statement.name.text, localNames.get(statement.name.text) ?? false);
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
  const candidateEntries = archiveEntries.filter((entryName) => {
    const source = files.get(entryName);
    return source !== undefined && isExposeEntry(source);
  });
  const candidateSet = new Set(candidateEntries);
  const referencedCandidates = new Set(
    candidateEntries.flatMap((entryName) =>
      getReferencedEntries(files.get(entryName) ?? '', entryName, files).filter((referencedEntry) => candidateSet.has(referencedEntry)),
    ),
  );
  const exposedEntries = candidateEntries.filter((entryName) => !referencedCandidates.has(entryName));
  const imports: string[] = [];
  const properties: string[] = [];
  let importIndex = importOffset;
  for (const entryName of exposedEntries.length ? exposedEntries : candidateEntries) {
    const exports = getExportNames(entryName, files);
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
