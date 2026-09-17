# @scalprum/remote-types

**Build-time remote Module Federation types for Scalprum applications**

`@scalprum/remote-types` connects Module Federation declaration archives with Scalprum's runtime `scope`, `module`, and `importName` APIs. It generates TypeScript module augmentation before host compilation, so remote component props, hook arguments, and hook results are available in editors and type checking.

## Installation

```bash
npm install @scalprum/remote-types
```

Install alongside your bundler:

```bash
npm install -D webpack @module-federation/enhanced
# or
npm install -D @rspack/core @module-federation/enhanced
```

## How It Works

Remote builds publish Module Federation declaration archives. A registry maps each unique Scalprum scope to its archive:

```json
{
  "inventory": {
    "remoteTypesLocation": "inventory-mf-types.zip"
  },
  "billing": {
    "remoteTypesLocation": "https://cdn.example.test/billing-mf-types.zip"
  }
}
```

Consumer plugin downloads every configured scope, extracts declarations into the configured output directory, and writes `generated.d.ts` with keys such as:

```ts
'inventory./ProductCard';
'inventory./useProducts';
'inventory./SDKComponent.PluginSDKComponent';
```

Scope names are unique registry keys. Multiple remote plugins are supported in one host build.

Use multiple registry or plugin manifest sources when platform metadata is split across services:

```ts
new ScalprumRemoteTypesPlugin({
  modulesConfigLocations: [
    { scope: 'inventory', location: 'https://inventory.example.test/fed-modules.json' },
    { scope: 'billing', location: 'https://billing.example.test/plugin-manifest.json' },
  ],
  outputDirectory: '.scalprum/remote-types',
});
```

Each `modulesConfigLocations` entry requires explicit `scope`. Registry payloads can contain one or many scopes, but the declared scope selects the intended entry. Plugin manifest `name` must match declared scope. Duplicate scopes fail the build. A single remote still uses one array entry.

## Producer Setup

### Direct Module Federation

`@module-federation/enhanced` owns declaration generation. Configure a unique `typesFolder` per remote:

```js
const { ModuleFederationPlugin } = require('@module-federation/enhanced');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'inventory',
      exposes: {
        './ProductCard': './src/ProductCard.tsx',
        './useProducts': './src/useProducts.ts',
      },
      dts: {
        generateTypes: {
          typesFolder: 'inventory-mf-types',
        },
      },
    }),
  ],
};
```

This emits `inventory-mf-types.zip` and the corresponding API declaration beside the federation output.

### DynamicRemotePlugin

OpenShift `DynamicRemotePlugin` does not currently expose Module Federation `dts` settings through `moduleFederationSettings`. Override its federation plugin and inject `typesFolder`:

```js
class InventoryModuleFederationPlugin extends ModuleFederationPlugin {
  constructor(options) {
    super({
      ...options,
      dts: {
        generateTypes: {
          typesFolder: 'inventory-mf-types',
        },
      },
    });
  }
}

new DynamicRemotePlugin({
  pluginMetadata: {
    name: 'inventory',
    version: '1.0.0',
    exposedModules,
  },
  moduleFederationSettings: {
    pluginOverride: {
      ModuleFederationPlugin: InventoryModuleFederationPlugin,
      ContainerPlugin,
    },
  },
});
```

`ScalprumRemoteTypesProducerPlugin` can publish registry metadata after the archive is available. Import it from package root or bundler entry:

```js
const { ScalprumRemoteTypesProducerPlugin } = require('@scalprum/remote-types/webpack');
```

Usage:

```js
new ScalprumRemoteTypesProducerPlugin({
  scope: 'inventory',
  outputDirectory: './dist',
  archiveFilename: 'inventory-mf-types.zip',
  sourceArchiveFilename: 'inventory-mf-types.zip',
});
```

When DynamicRemotePlugin cannot produce an archive, producer plugin can generate an MF-compatible archive from configured `exposes` as fallback:

```js
new ScalprumRemoteTypesProducerPlugin({
  scope: 'inventory',
  exposes,
  sourceRoot: './src',
  outputDirectory: './dist',
  archiveFilename: 'inventory-mf-types.zip',
});
```

Producer failures fail compilation. Archives are written through a temporary file and renamed atomically.

## Consumer Setup

Configure remote types in every host build that consumes typed remotes. After this plugin runs, generated declarations are the default source for `getModule`, `ScalprumComponent`, `useModule`, `useLoadModule`, and `useRemoteHook`; consumers should not duplicate remote result or props interfaces.

### Webpack

```ts
import { ScalprumRemoteTypesPlugin } from '@scalprum/remote-types/webpack';

export default {
  plugins: [
    new ScalprumRemoteTypesPlugin({
      modulesConfigLocations: [{ scope: 'inventory', location: 'https://cdn.example.test/fed-modules.json' }],
      outputDirectory: '.scalprum/remote-types',
    }),
  ],
};
```

### Rspack

```ts
import { ScalprumRemoteTypesPlugin } from '@scalprum/remote-types/rspack';

export default {
  plugins: [
    new ScalprumRemoteTypesPlugin({
      modulesConfigLocations: [{ scope: 'inventory', location: './fed-modules.json' }],
      outputDirectory: '.scalprum/remote-types',
    }),
  ],
};
```

Both entries expose the same plugin implementation. Bundler-specific entries keep configuration imports explicit.

## Registry Sources

`modulesConfigLocations` sources support:

- HTTP and HTTPS URLs.
- Absolute filesystem paths.
- `file://` URLs.
- Relative paths resolved from a local registry file.

Each source may be an aggregate scope registry or a plugin manifest. For explicit multi-source entries, manifest `name` must match `scope`. Archive metadata is read from `remoteTypesLocation`, supported custom properties, or `metaData.types.zip`; otherwise `remoteTypesFilename` is used.

Remote archive locations may also be absolute URLs or paths relative to registry URL/path.

## Generated Output

Default output directory:

```text
node_modules/@scalprum/remote-types
```

Application-specific output is recommended:

```text
.scalprum/remote-types/
  generated.d.ts
  inventory/
    ProductCard.d.ts
    src/ProductCard.d.ts
  billing/
    Invoice.d.ts
```

Add generated output to `tsconfig.json` when it is outside normal source globs:

```json
{
  "include": ["src/**/*", ".scalprum/remote-types/**/*.d.ts"]
}
```

## Typed APIs

`@scalprum/core` owns shared remote type utilities. React bindings consume the same map.

### Core `getModule`

```ts
import { getModule } from '@scalprum/core';

const Component = await getModule('inventory', './ProductCard');
Component({ productId: 'p-123' });

const namedComponent = await getModule('inventory', './SDKComponent', 'PluginSDKComponent');
namedComponent({ name: 'inventory' });
```

Known keys receive generated types. Unknown or disabled remote types fall back to generic values so runtime loading remains usable.

### `ScalprumComponent`

```tsx
import { ScalprumComponent } from '@scalprum/react-core';

<ScalprumComponent scope="inventory" module="./ProductCard" productId="p-123" />;
```

Props are inferred from the selected default or named export.

### `useRemoteHook`

```tsx
import { useRemoteHook } from '@scalprum/react-core';

const result = useRemoteHook({
  scope: 'inventory',
  module: './useProducts',
  args: [{ query: 'laptop' }],
});

result.hookResult?.items;
```

Hook arguments and result types come from the generated declaration map.

### `useModule` and `useLoadModule`

Both programmatic React loaders use the same remote map:

```tsx
const Component = useModule('inventory', './SDKComponent', undefined, 'PluginSDKComponent');
Component?.({ name: 'inventory' });

const [RemoteComponent, error] = useLoadModule({
  scope: 'inventory',
  module: './ProductCard',
});
```

### `useRemoteHookManager`

For known literal scope/module/import combinations, manager `addHook` validates the argument tuple against generated declarations. Unknown runtime combinations retain generic fallback types. Manager result type remains generic because one manager can track multiple remote hooks.

## Disable Remote Types

Set `enabled: false` when remote type loading is unavailable or intentionally disabled:

```ts
new ScalprumRemoteTypesPlugin({
  enabled: false,
  modulesConfigLocations: [{ scope: 'inventory', location: './fed-modules.json' }],
  outputDirectory: '.scalprum/remote-types',
});
```

The plugin removes generated declarations and tracked scope directories. Scalprum APIs use generic fallback types instead of failing type checking because remote metadata is unavailable.

Enabled mode treats registry and archive failures as build errors. This prevents stale declarations from silently masking remote API changes.

## Testing

Package tests use Vitest and cover registry loading, producer and consumer behavior, declaration generation and type checking, default output discovery, and published ESM/CommonJS entry points. Run the package tests and test-source typecheck with:

```bash
npx nx test @scalprum/remote-types
npx tsc -p packages/remote-types/tsconfig.spec.json --noEmit
```

## Package Exports

```text
@scalprum/remote-types          Shared types and plugins
@scalprum/remote-types/webpack  Webpack plugin entry
@scalprum/remote-types/rspack   Rspack plugin entry
```
