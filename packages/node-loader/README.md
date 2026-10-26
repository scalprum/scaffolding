# @scalprum/node-loader

This package is an Nx scaffold only. It has no loader implementation or public loader exports; `src/index.ts` deliberately exports an empty module until implementation work in FM-116. This package is not published by this change.

The `0.0.1` package version follows the design's planned one-time bootstrap version (C28); it does not imply that a release or publication occurred.

## Runtime and SDK contract

- `@module-federation/enhanced` is a peer dependency because the eventual loader must use the host's runtime instance.
- `@openshift/dynamic-plugin-sdk` is both a peer and a development dependency at `^9.1.0`. This matches the current `@scalprum/core` range and SDK 9.1.0 baseline: the peer makes the host provide the SDK instance, while the development dependency supports this package's build and tests.
- FM-116 implementation should consume SDK exports `PluginLoaderInterface`, `PluginLoadResult`, `PluginLoaderOptions`, and `CodeRef` directly. This scaffold does not create local loader types or re-export a loader API.
- `CodeRef` recognition is instance-sensitive. SDK 9.1.0 creates a module-local `Symbol('CodeRef')`; `applyCodeRefSymbol` marks a function with that symbol and `isCodeRef` checks that same symbol. A second loaded SDK module has a different symbol, so it will not recognize refs marked by the host's SDK instance. Consumers and the eventual loader must use the same SDK module instance associated with `PluginStore`.
- Keep Node runtime dependencies in this package. Do not add Node-only dependencies to `@scalprum/core` or browser-facing package graphs.

Pinned SDK 9.1.0 implementation references (commit `6c929e47b9af3a9ab5bc5e5ce4dff8e3a23fa239`):

- [`CodeRef` marker and recognition](https://github.com/openshift/dynamic-plugin-sdk/blob/6c929e47b9af3a9ab5bc5e5ce4dff8e3a23fa239/packages/lib-core/src/runtime/coderefs.ts)
- [Public SDK exports](https://github.com/openshift/dynamic-plugin-sdk/blob/6c929e47b9af3a9ab5bc5e5ce4dff8e3a23fa239/packages/lib-core/src/index.ts)

## Workspace targets

```bash
npm exec nx run @scalprum/node-loader:build
npm exec nx run @scalprum/node-loader:test
npm exec nx run @scalprum/node-loader:lint
npm exec nx run @scalprum/node-loader:typecheck
```

The tests cover SDK marker identity and validate the built CommonJS/ESM package artifact. No loader behavior is implemented here.
