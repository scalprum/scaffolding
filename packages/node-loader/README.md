# @scalprum/node-loader

> **Draft:** Focused isolated regression and strict TypeScript checks pass. A real bundled CJS host/producer acceptance run remains outstanding. This package is not published by this change.

Node adapter for the SDK 9.1 `PluginLoaderInterface`.

## Host integration

Create the loader and provide it through Scalprum's initializer:

```ts
import { initialize } from '@scalprum/core';
import { createNodePluginLoader } from '@scalprum/node-loader';

const loader = createNodePluginLoader({
  fetchImpl: fetch,
  transformPluginManifest: (manifest) => manifest,
});

initialize({ appsConfig, loader });
```

The host must choose `manifestLocation ?? pluginManifest` before invoking the SDK. A configured URL that fails must not fall back to the embedded manifest. SDK acquisition calls `loadPluginManifest` for URL manifests; embedded manifests go directly to `loadPlugin` and are not accepted by `loadPluginManifest`.

The adapter uses the already initialized `@module-federation/enhanced` singleton from `getInstance()`; it does not create another host. Its SDK `PluginEntryModule.init` is a no-op compatibility hook. Passing SDK `sharedScope` throws exactly `not implemented yet; configure sharing in Rspack`.

## Supported SDK behavior

- `fetchImpl`, `transformPluginManifest<T>`, and `canLoadPlugin(manifest, reload)` are honored.
- URL manifest loading uses `fetchImpl(url, { cache: 'no-cache' })` and basic remote-manifest validation. Transform results are cached by original object identity; transform receives an SDK-cloned manifest, leaving the caller's object unchanged.
- Local manifests load without a federation runtime. Remote `custom` registration is supported; `callback` registration is rejected with an SDK failure result.
- Remote entry is selected from the transformed `loadScripts` by its declared `remoteEntry` filename. Its exact URL, prefix, and query are retained; registration type is `commonjs-module`. No first-script selection or base-URL derivation.
- SDK encoded refs retain SDK 9.1 syntax: `{ $codeRef: 'command' }` selects the default export and `{ $codeRef: 'command.named' }` selects `named`. SDK `parseEncodedCodeRef`, `isEncodedCodeRef`, `applyCodeRefSymbol`, and `CodeRef` preserve parsing and marker identity. References stay lazy; the SDK entry module maps `command`/`./command` to enhanced request `pluginName/command`. A nullish result from `loadRemote` rejects the module request rather than returning a factory that yields no module.
- `canReloadScript`, `entryCallbackSettings`, `customDependencyResolutions`, `isDependencyResolvable`, and `getPluginEntryModule` are rejected rather than silently ignored. Plugin dependency resolution is also unsupported and returns an SDK failure result.

## Enhanced runtime readiness

For the pinned `@module-federation/enhanced` 2.9.0 runtime, readiness uses the initialized host's Enhanced-owned API: register the unchanged manifest remote entry, call `remoteHandler.getRemoteModuleAndOptions({ id: manifest.name })`, then await the returned module's `init(id, remoteSnapshot)`. `Module.init` owns remote-entry acquisition, host share-scope/container initialization, and initialization caching. The adapter does not call the returned container's `init`, wire sharing itself, create another host, or request an exposed module during `loadPlugin`.

Pinned 2.9.0 source evidence: [`runtime-core/src/core.ts`](https://github.com/module-federation/core/blob/v2.9.0/packages/runtime-core/src/core.ts) exposes `remoteHandler`, `loadRemote`, and `preloadRemote`; [`runtime-core/src/remote/index.ts`](https://github.com/module-federation/core/blob/v2.9.0/packages/runtime-core/src/remote/index.ts) implements `getRemoteModuleAndOptions` and routes `loadRemote` through `module.get`; [`runtime-core/src/module/index.ts`](https://github.com/module-federation/core/blob/v2.9.0/packages/runtime-core/src/module/index.ts) implements `Module.init` and `Module.get`. `loadRemote(id, { loadFactory: false })` is unsuitable for readiness: `Module.get` still calls `remoteEntryExports.get(expose)`, making readiness depend on a producer expose. `preloadRemote` preloads assets but does not initialize the container. The adapter feature-detects the required Enhanced members and returns an actionable SDK failure result when the initialized host lacks them. The package peer range alone does not guarantee this runtime surface in every compatible host build.

Readiness operations coalesce per initialized runtime, remote name, and exact entry URL, including across loader instances. Registration, Enhanced remote acquisition, and Enhanced module initialization must all complete before `loadPlugin` reports success. Failures evict the readiness promise so later calls can retry. SDK CodeRefs remain lazy; only later CodeRef/module requests load exposed modules.

The intended runtime is a Node process hosting an Rspack-bundled federation host and producer. This adapter makes no promise of unbundled native-Node execution of browser-oriented plugins. Keep React/Ink/Fleet build dependencies out of its production graph.

## Verification

Unit tests cover SDK result shapes, remote/local manifest paths, generic transform caching, CodeRef decoding and laziness, exact remote-entry registration, readiness acquisition/initialization, repeated and cross-loader coalescing, failure/retry behavior, nullish module results, frozen-manifest immutability, host absence, and option rejection. Isolated verification on Node 24.21.0 passed 11 Jest 29.7 tests using TypeScript 5.8.3 transpilation, SDK 9.1.0, and Enhanced 2.9.0. Strict semantic checking of `index.ts` and `index.test.ts` also passed with TypeScript 5.8.3 and isolated Jest/Node types. These isolated checks are not Nx workspace target runs, package artifact checks, or real Enhanced-host integration. The HTTP CJS producer/host scenario, exposed-module requests, and React-hook checks in development/production remain outstanding; mock tests are not runtime acceptance evidence.

```bash
npm exec nx show projects
npm exec nx show project @scalprum/node-loader
npm exec nx run @scalprum/node-loader:build
npm exec nx run @scalprum/node-loader:test
npm exec nx run @scalprum/node-loader:lint
npm exec nx run @scalprum/node-loader:typecheck
```

The SDK and enhanced runtime remain host-provided peers. The SDK peer range matches `@scalprum/core`; `CodeRef` markers are module-instance-specific, so host and adapter must resolve the same SDK instance.
