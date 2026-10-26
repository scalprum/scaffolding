# @scalprum/node-loader

> **Draft / incomplete:** SDK interface contract is implemented, but remote readiness has not been proven. See [Readiness blocker](#readiness-blocker). This package is not published by this change.

Node adapter for the SDK 9.1 `PluginLoaderInterface`.

## Host integration

Create the loader and provide it through the planned Scalprum initializer. That host injection point depends on FM-112 and is not in this package change.

```ts
import { createNodePluginLoader } from '@scalprum/node-loader';

const loader = createNodePluginLoader({
  fetchImpl: fetch,
  transformPluginManifest: (manifest) => manifest,
});

// Planned FM-112 integration:
// initialize({ appsConfig, loader });
```

The host must choose `manifestLocation ?? pluginManifest` before invoking the SDK. A configured URL that fails must not fall back to the embedded manifest. SDK acquisition calls `loadPluginManifest` for URL manifests; embedded manifests go directly to `loadPlugin` and are not accepted by `loadPluginManifest`.

The adapter uses the already initialized `@module-federation/enhanced` singleton from `getInstance()`. It does not create another host or call a remote's `init`. Its `PluginEntryModule.init` is a no-op compatibility hook because sharing belongs in the Rspack host. Passing SDK `sharedScope` throws exactly `not implemented yet; configure sharing in Rspack`.

## Supported SDK behavior

- `fetchImpl`, `transformPluginManifest<T>`, and `canLoadPlugin(manifest, reload)` are honored.
- URL manifest loading uses `fetchImpl(url, { cache: 'no-cache' })` and basic remote-manifest validation. Transform results are cached by original object identity; transform receives an SDK-cloned manifest, leaving the caller's object unchanged.
- Local manifests load without a federation runtime. Remote `custom` registration is supported; `callback` registration is rejected with an SDK failure result.
- Remote entry is selected from the transformed `loadScripts` by its declared `remoteEntry` filename. Its exact URL, prefix, and query are retained; registration type is `commonjs-module`. No first-script selection or base-URL derivation.
- SDK encoded refs retain SDK 9.1 syntax: `{ $codeRef: 'command' }` selects the default export and `{ $codeRef: 'command.named' }` selects `named`. SDK `parseEncodedCodeRef`, `isEncodedCodeRef`, `applyCodeRefSymbol`, and `CodeRef` preserve parsing and marker identity. References stay lazy; the SDK entry module maps `command`/`./command` to enhanced request `pluginName/command`.
- `canReloadScript`, `entryCallbackSettings`, `customDependencyResolutions`, `isDependencyResolvable`, and `getPluginEntryModule` are rejected rather than silently ignored. Plugin dependency resolution is also unsupported and returns an SDK failure result.

## Readiness blocker

`registerRemotes` registers a remote description; it does not prove that the producer entry or its container can load. The exposed `PluginEntryModule.get` calls host `loadRemote` only when an SDK CodeRef is later invoked. Therefore an unreachable remote entry/expose can currently fail after `loadPlugin` has returned `{ success: true }`; this draft cannot report that failure as `PluginLoadResult.success: false` at load time. No manual `remote.init`, script injection, share-scope setup, `require` shim, or chunk executor is added to hide this gap. An acceptance run against an initialized enhanced host is required to determine a supported readiness check before claiming full completion.

The intended runtime is a Node process hosting an Rspack-bundled federation host and producer. This adapter makes no promise of unbundled native-Node execution of browser-oriented plugins. Keep React/Ink/Fleet build dependencies out of its production graph.

## Verification

Unit tests cover SDK result shapes, remote/local manifest paths, generic transform caching, CodeRef decoding and laziness, entry module mapping, host absence, option rejection, and registration coalescing. They were authored but **not run** in the current environment because workspace dependency installation failed. Package artifact checks were also not run. The isolated HTTP CJS producer/host scenario, exposed-module requests, and React-hook checks in development/production remain outstanding; do not treat mocks as acceptance evidence.

```bash
npm exec nx show projects
npm exec nx show project @scalprum/node-loader
npm exec nx run @scalprum/node-loader:build
npm exec nx run @scalprum/node-loader:test
npm exec nx run @scalprum/node-loader:lint
npm exec nx run @scalprum/node-loader:typecheck
```

The SDK and enhanced runtime remain host-provided peers. The SDK peer range matches `@scalprum/core`; `CodeRef` markers are module-instance-specific, so host and adapter must resolve the same SDK instance.
