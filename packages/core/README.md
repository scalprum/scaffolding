# @scalprum/core

**Framework-agnostic core for micro-frontend module federation**

The `@scalprum/core` package provides the foundational module federation capabilities for Scalprum. It's a framework-agnostic library that handles dynamic module loading, caching, and manifest processing - making it compatible with any JavaScript framework, not just React.

## Installation

```bash
npm install @scalprum/core
```

## Key Features

- **Framework Agnostic**: Works with any JavaScript framework or vanilla JS
- **Dynamic Module Loading**: Load remote modules at runtime with caching
- **Manifest Processing**: Support for both plugin manifests and custom formats
- **Shared Scope Management**: Integration with webpack's module federation shared scopes
- **Shared Stores**: Event-driven state management for micro-frontends
- **Built-in Caching**: Intelligent module caching with configurable timeout
- **Error Handling**: Robust error handling for network and module loading failures

## Basic Usage

```typescript
import { initialize, getModule, AppsConfig } from '@scalprum/core';

// Configure your remote modules
const config: AppsConfig = {
  myRemoteApp: {
    name: 'myRemoteApp',
    manifestLocation: 'http://localhost:3001/plugin-manifest.json'
  }
};

// Initialize Scalprum
const scalprum = initialize({
  appsConfig: config,
  api: { /* shared context */ }
});

// Load a module dynamically
const MyComponent = await getModule('myRemoteApp', 'MyComponent');
```

## API Reference

### Core Functions

#### `initialize(options)`

Initializes the Scalprum instance with configuration.

**Parameters:**
- `appsConfig: AppsConfig` - Configuration for remote modules
- `api?: any` - Shared API context available to all modules
- `options?: Partial<ScalprumOptions>` - Optional configuration
- `pluginStoreFeatureFlags?: FeatureFlags` - Feature flags for plugin store
- `pluginLoaderOptions?: PluginLoaderOptions` - Options for plugin loader
- `pluginStoreOptions?: PluginStoreOptions` - Options for plugin store

**Returns:** `Scalprum` instance

#### `getModule<T>(scope, module, importName?)`

Loads a module from a remote container.

**Parameters:**
- `scope: string` - The remote container name
- `module: string` - The module name to load
- `importName?: string` - Specific export name (defaults to 'default')

**Returns:** `Promise<T>` - The loaded module

#### `getScalprum()`

Gets the current Scalprum instance.

**Returns:** `Scalprum` instance

**Throws:** Error if Scalprum hasn't been initialized

### Configuration Types

#### `AppsConfig`

```typescript
interface AppsConfig<T = {}> {
  [key: string]: AppMetadata<T>;
}

type AppMetadata<T = {}> = T & {
  name: string;
  appId?: string;
  elementId?: string;
  rootLocation?: string;
  scriptLocation?: string;
  manifestLocation?: string;
  pluginManifest?: PluginManifest;
};
```

#### `ScalprumOptions`

```typescript
interface ScalprumOptions {
  cacheTimeout: number;        // Cache timeout in seconds (default: 120)
  enableScopeWarning: boolean; // Enable duplicate package warnings
}
```

## Advanced Usage

### Preloading Modules

```typescript
import { preloadModule } from '@scalprum/core';

// Preload a module without importing it
await preloadModule('myRemoteApp', 'MyComponent');

// With custom manifest processor
await preloadModule('myRemoteApp', 'MyComponent', (manifest) => manifest.assets.js);

// Later, get the cached module instantly
const MyComponent = await getModule('myRemoteApp', 'MyComponent');
```

### Custom Manifest Processing

```typescript
const processor = (manifest: any) => {
  // Extract entry scripts from custom manifest format
  return manifest.assets.js;
};

await processManifest(
  'http://localhost:3001/custom-manifest.json',
  'myScope',
  'MyModule',
  processor
);
```

### Module Caching

```typescript
import { getCachedModule } from '@scalprum/core';

// Check if module is cached
const { cachedModule, prefetchPromise } = getCachedModule('myScope', 'MyModule');

if (cachedModule) {
  // Module is cached and ready
  const component = cachedModule.default;
}
```

## Shared Scope Integration

Scalprum integrates with webpack's module federation shared scopes:

```typescript
import { initSharedScope, getSharedScope } from '@scalprum/core';

// Initialize shared scope
await initSharedScope();

// Get shared scope object
const sharedScope = getSharedScope(true); // true enables duplicate warnings
```

## Error Handling

```typescript
try {
  const module = await getModule('myScope', 'NonExistentModule');
} catch (error) {
  if (error.message.includes('Module not initialized')) {
    // Module wasn't found in the remote container
    console.error('Module not available:', error);
  } else if (error.message.includes('Manifest location not found')) {
    // Scope configuration is missing manifestLocation
    console.error('Configuration error:', error);
  }
}
```

## Build Tool Compatibility

This package is compatible with:

- **Webpack 5** with Module Federation
- **Rspack** with Module Federation support
- **Module Federation Runtime** for any bundler

## Shared Stores

The `createSharedStore` function enables event-driven state management across microfrontends. See the comprehensive [Shared Stores Guide](../react-core/docs/shared-stores.md) for detailed documentation.

**Quick Example:**

```typescript
import { createSharedStore } from '@scalprum/core';

const EVENTS = ['UPDATE_USER', 'LOGOUT'] as const;

const store = createSharedStore({
  initialState: { user: null, isAuthenticated: false },
  events: EVENTS,
  onEventChange: (state, event, payload) => {
    switch (event) {
      case 'UPDATE_USER':
        return { ...state, user: payload.user, isAuthenticated: true };
      case 'LOGOUT':
        return { user: null, isAuthenticated: false };
      default:
        return state;
    }
  },
});

// Update state
store.updateState('UPDATE_USER', { user: { id: '123', name: 'John' } });

// Subscribe to changes
const unsubscribe = store.subscribeAll(() => {
  console.log('State changed:', store.getState());
});
```

For React integration, use with `useGetState` and `useSubscribeStore` from `@scalprum/react-core`. See [Shared Stores Documentation](../react-core/docs/shared-stores.md) for complete guide.

## Related Packages

- [`@scalprum/react-core`](../react-core) - React bindings and components
- [`@scalprum/build-utils`](../build-utils) - Build tools and NX executors
- [`@scalprum/react-test-utils`](../react-test-utils) - Testing utilities