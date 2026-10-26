import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

test('a custom loader resolves modules in Node without browser or webpack globals', () => {
  const script = `
    const assert = require('node:assert/strict');
    const { initialize, getModule } = require(process.argv[1]);
    const forbiddenGlobals = [
      'window', 'document', 'self', '__webpack_share_scopes__', '__webpack_init_sharing__',
      '__load_plugin_entry__', 'fixture',
    ];
    const assertNoRegistrationGlobals = () => {
      for (const name of forbiddenGlobals) {
        assert.equal(Object.hasOwn(globalThis, name), false, name + ' should be absent');
      }
    };

    (async () => {
      assertNoRegistrationGlobals();
      const manifest = {
        name: 'fixture',
        version: '1.0.0',
        registrationMethod: 'custom',
        baseURL: 'https://example.com/',
        loadScripts: [],
        extensions: [],
      };
      const manifestLocation = 'data:application/json,' + encodeURIComponent(JSON.stringify(manifest));
      let loads = 0;
      const loader = {
        async loadPluginManifest() { return manifest; },
        transformPluginManifest(value) { return value; },
        async loadPlugin() {
          loads += 1;
          return {
            success: true,
            loadedExtensions: [],
            entryModule: {
              async init() {},
              async get(moduleName) {
                assert.equal(moduleName, './widget');
                return () => ({ default: 'fixture default', named: 'fixture named' });
              },
            },
          };
        },
      };

      initialize({ appsConfig: { fixture: { name: 'fixture', manifestLocation } }, loader });
      assert.equal(await getModule('fixture', './widget'), 'fixture default');
      assert.equal(await getModule('fixture', './widget', 'named'), 'fixture named');
      assert.equal(loads, 1);
      assertNoRegistrationGlobals();
      process.stdout.write('fixture loaded');
    })().catch((error) => { console.error(error); process.exitCode = 1; });
  `;

  const output = execFileSync(
    process.execPath,
    ['-r', require.resolve('ts-node/register/transpile-only'), '-e', script, resolve(__dirname, 'scalprum.ts')],
    {
      cwd: resolve(__dirname, '../../..'),
      env: {
        ...process.env,
        TS_NODE_PROJECT: resolve(__dirname, '../tsconfig.spec.json'),
        TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs' }),
      },
      encoding: 'utf8',
    },
  );

  expect(output).toContain('fixture loaded');
});
