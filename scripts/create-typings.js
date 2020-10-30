/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fse = require('fs-extra');
const glob = require('glob');

const packagePath = process.cwd();
const buildPath = path.join(packagePath, './dist');
const srcPath = path.join(packagePath, './dist/cjs');

async function generateIndexTypes(from, to) {
  const files = glob.sync('**/*.d.ts', { cwd: from });
  const content = `${files.map(
    (file) => `export * from './cjs/${file.split('.').shift()}';
`
  )}`.replace(/,/g, '');
  return Promise.all([fse.writeFile(path.resolve(to, 'index.d.ts'), content)]);
}

async function copy() {
  try {
    await generateIndexTypes(srcPath, buildPath);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

copy();
