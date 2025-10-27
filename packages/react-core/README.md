# @scalprum/react-core

**React bindings for Scalprum module federation**

The `@scalprum/react-core` package provides React-specific components, hooks, and utilities for building micro-frontend applications with Scalprum. It wraps the framework-agnostic `@scalprum/core` with an idiomatic React API.

## Installation

```bash
npm install @scalprum/react-core @scalprum/core react react-dom
```

## Key Features

- **ScalprumProvider**: Context provider for Scalprum configuration
- **Component Loading**: Declarative components for loading remote modules
- **React Hooks**: Modern hooks API for accessing remote modules
- **Remote Hooks**: Load and execute hooks from federated modules
- **Prefetching Support**: Built-in data prefetching capabilities
- **Error Boundaries**: Automatic error handling with self-repair
- **TypeScript Support**: Full type safety for remote modules

## Quick Start

```tsx
import { ScalprumProvider, ScalprumComponent } from '@scalprum/react-core';

const config = {
  myApp: {
    name: 'myApp',
    manifestLocation: 'http://localhost:3001/plugin-manifest.json'
  }
};

function App() {
  return (
    <ScalprumProvider config={config}>
      <ScalprumComponent
        scope="myApp"
        module="MyComponent"
        fallback={<div>Loading...</div>}
      />
    </ScalprumProvider>
  );
}
```

## Core Components

### ScalprumProvider

The root provider that initializes Scalprum and provides context to all child components.

```tsx
import { ScalprumProvider } from '@scalprum/react-core';

function App() {
  const config = {
    remoteApp: {
      name: 'remoteApp',
      manifestLocation: 'http://localhost:3001/plugin-manifest.json'
    }
  };

  const api = {
    user: { id: '123', name: 'John' },
    theme: 'dark'
  };

  return (
    <ScalprumProvider config={config} api={api}>
      {/* Your app */}
    </ScalprumProvider>
  );
}
```

**Props:**
- `config: AppsConfig` - Configuration for remote modules
- `api?: T` - Shared API context available to all modules
- `pluginSDKOptions?` - Optional plugin SDK configuration

### ScalprumComponent

Declarative component for loading and rendering remote modules.

```tsx
import { ScalprumComponent } from '@scalprum/react-core';

function Dashboard() {
  return (
    <ScalprumComponent
      scope="analytics"
      module="Dashboard"
      fallback={<Skeleton />}
      ErrorComponent={<ErrorBoundary />}
      someProp="value" // Props are passed to remote component
    />
  );
}
```

**Props:**
- `scope: string` - Remote container name
- `module: string` - Module name to load
- `importName?: string` - Specific export (default: 'default')
- `fallback?` - Loading fallback UI
- `ErrorComponent?` - Custom error component
- Additional props are forwarded to the remote component

**Features:**
- Automatic error boundaries
- Self-repair on cache errors
- Suspense integration
- Prefetch support

## React Hooks

### useScalprum

Access the Scalprum context and API.

```tsx
import { useScalprum } from '@scalprum/react-core';

function MyComponent() {
  const { config, api, initialized } = useScalprum();

  if (!initialized) {
    return <div>Initializing...</div>;
  }

  return <div>User: {api.user.name}</div>;
}

// Using optional selector for optimized re-renders
function OptimizedComponent() {
  const api = useScalprum(state => state.api);
  return <div>User: {api.user.name}</div>;
}
```

**Parameters:**
- `selector?: (state: ScalprumState) => T` - Optional selector function to extract specific state

**Returns:**
- `config` - Apps configuration
- `api` - Shared API context
- `initialized` - Whether Scalprum is ready
- `pluginStore` - Plugin store instance

### useModule

Hook for loading remote modules programmatically.

```tsx
import { useModule } from '@scalprum/react-core';

function WidgetContainer() {
  const Widget = useModule<React.ComponentType>('widgets', 'PieChart');

  if (!Widget) {
    return <div>Loading widget...</div>;
  }

  return <Widget data={chartData} />;
}
```

**Parameters:**
- `scope: string` - Remote container name
- `module: string` - Module name
- `defaultState?` - Initial state while loading
- `importName?: string` - Export name (default: 'default')

**Returns:** The loaded module or `defaultState`

### useLoadModule

Advanced hook for loading modules with more control.

```tsx
import { useLoadModule } from '@scalprum/react-core';

function DataDisplay() {
  const [DataTable, error] = useLoadModule({
    scope: 'tables',
    module: 'DataGrid'
  }, undefined);

  if (error) return <Error message={error.message} />;
  if (!DataTable) return <Spinner />;

  return <DataTable.default data={data} />;
}
```

### usePrefetch

Hook for prefetching data from remote modules.

```tsx
import { usePrefetch } from '@scalprum/react-core';

function DataComponent() {
  const { ready, data, error } = usePrefetch();

  if (!ready) return <div>Loading data...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## Remote Hooks

Scalprum supports loading and executing React hooks from federated modules, enabling advanced micro-frontend patterns.

### RemoteHookProvider

The `RemoteHookProvider` is automatically included in `ScalprumProvider` - no additional setup required.

```tsx
<ScalprumProvider config={config}>
  {/* Remote hooks work automatically */}
  <MyComponentUsingRemoteHooks />
</ScalprumProvider>
```

### useRemoteHook

Load and execute hooks from remote federated modules.

```tsx
import { useRemoteHook } from '@scalprum/react-core';
import { useMemo } from 'react';

interface CounterResult {
  count: number;
  increment: () => void;
  decrement: () => void;
}

function MyComponent() {
  // IMPORTANT: Use useMemo when args contain objects/arrays
  const args = useMemo(() => [{ initialValue: 0, step: 1 }], []);

  const { hookResult, loading, error } = useRemoteHook<CounterResult>({
    scope: 'counter-app',
    module: './useCounter',
    args
  });

  if (loading) return <div>Loading hook...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Count: {hookResult?.count}</p>
      <button onClick={hookResult?.increment}>+</button>
      <button onClick={hookResult?.decrement}>-</button>
    </div>
  );
}
```

**Parameters:**
- `scope: string` - Federated module scope
- `module: string` - Module path
- `importName?: string` - Named export (optional)
- `args?: any[]` - Arguments to pass (must be memoized if containing objects/arrays)

**Returns:**
- `id: string` - Unique hook instance ID
- `loading: boolean` - Loading state
- `error: Error | null` - Error if any
- `hookResult?: T` - Hook execution result

**Critical:** When `args` contains objects or arrays, always use `useMemo` to prevent infinite re-renders.

### useRemoteHookManager

Manage multiple remote hooks dynamically.

```tsx
import { useRemoteHookManager } from '@scalprum/react-core';
import { useMemo } from 'react';

function DynamicHooksComponent() {
  const manager = useRemoteHookManager();

  const addCounter = () => {
    const handle = manager.addHook({
      scope: 'counter-app',
      module: './useCounter',
      args: [{ initialValue: 0, step: 1 }]
    });

    // Update args later
    handle.updateArgs([{ initialValue: 10, step: 2 }]);

    // Remove when done
    // handle.remove();
  };

  const results = manager.hookResults;

  return (
    <div>
      <button onClick={addCounter}>Add Counter Hook</button>
      <div>Active hooks: {results.length}</div>
      {results.map(({ id, hookResult, loading, error }) => (
        <div key={id}>
          {loading && <span>Loading...</span>}
          {error && <span>Error: {error.message}</span>}
          {hookResult && <span>Count: {hookResult.count}</span>}
        </div>
      ))}
    </div>
  );
}
```

**Methods:**
- `addHook(config)` - Add a new remote hook, returns handle
- `cleanup()` - Remove all hooks (called automatically on unmount)
- `hookResults` - Results from all tracked hooks

**Handle Methods:**
- `remove()` - Remove this specific hook
- `updateArgs(args)` - Update hook arguments

For detailed remote hooks documentation, see:
- [useRemoteHook Guide](./docs/use-remote-hook.md)
- [useRemoteHookManager Guide](./docs/use-remote-hook-manager.md)
- [RemoteHookProvider Reference](./docs/remote-hook-provider.md)
- [Remote Hook Types](./docs/remote-hook-types.md)

## Complete Example

```tsx
import {
  ScalprumProvider,
  ScalprumComponent,
  useScalprum,
  useModule,
  useRemoteHook
} from '@scalprum/react-core';
import { useMemo } from 'react';

// Configuration
const config = {
  dashboard: {
    name: 'dashboard',
    manifestLocation: 'http://localhost:3001/plugin-manifest.json'
  },
  widgets: {
    name: 'widgets',
    manifestLocation: 'http://localhost:3002/plugin-manifest.json'
  }
};

const api = {
  user: { id: '123', name: 'John Doe' },
  permissions: ['read', 'write']
};

// Using declarative component
function DashboardView() {
  return (
    <ScalprumComponent
      scope="dashboard"
      module="MainDashboard"
      fallback={<div>Loading dashboard...</div>}
    />
  );
}

// Using hooks
function WidgetPanel() {
  const { api } = useScalprum();
  const ChartWidget = useModule('widgets', 'ChartComponent');

  if (!ChartWidget) {
    return <div>Loading widget...</div>;
  }

  return <ChartWidget user={api.user} />;
}

// Using remote hooks
function RemoteHookExample() {
  const args = useMemo(() => [{ userId: '123' }], []);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'dashboard',
    module: './useUserData',
    args
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Welcome, {hookResult?.name}!</div>;
}

// Main App
function App() {
  return (
    <ScalprumProvider config={config} api={api}>
      <div>
        <DashboardView />
        <WidgetPanel />
        <RemoteHookExample />
      </div>
    </ScalprumProvider>
  );
}
```

## Error Handling

ScalprumComponent includes automatic error boundaries with self-repair:

```tsx
import { ScalprumComponent } from '@scalprum/react-core';

function CustomError({ error, errorInfo }) {
  return (
    <div>
      <h2>Failed to load component</h2>
      <p>{error?.message}</p>
      <details>{errorInfo?.componentStack}</details>
    </div>
  );
}

function App() {
  return (
    <ScalprumComponent
      scope="myApp"
      module="MyComponent"
      ErrorComponent={<CustomError />}
    />
  );
}
```

**Self-Repair Feature:** If a component fails to load, ScalprumComponent automatically retries once with cache disabled.

## TypeScript Support

Full type safety for remote modules and hooks:

```tsx
import { ScalprumProvider, useModule, useRemoteHook } from '@scalprum/react-core';

interface WidgetProps {
  title: string;
  data: number[];
}

interface UserHookResult {
  user: { id: string; name: string };
  loading: boolean;
}

function TypedExample() {
  // Typed remote component
  const Widget = useModule<React.ComponentType<WidgetProps>>('widgets', 'Chart');

  // Typed remote hook
  const { hookResult } = useRemoteHook<UserHookResult>({
    scope: 'auth',
    module: './useCurrentUser'
  });

  if (!Widget || !hookResult) return null;

  return <Widget title="Sales" data={[1, 2, 3]} />;
}
```

## Build Tool Compatibility

This package works with:

- **Webpack 5** with Module Federation plugin
- **Rspack** with Module Federation support
- **Module Federation Runtime** for any bundler

## Prefetching

Components can export a `prefetch` function to load data before rendering:

```tsx
// In remote module
export const prefetch = (api) => {
  return fetch(`/api/data?user=${api.user.id}`).then(r => r.json());
};

export default function MyComponent({ data }) {
  // Component receives prefetched data
  return <div>{data.value}</div>;
}
```

```tsx
// In host app
import { usePrefetch } from '@scalprum/react-core';

function DataComponent() {
  const { ready, data, error } = usePrefetch();

  if (!ready) return <div>Loading...</div>;

  return <div>{data.value}</div>;
}
```

## Advanced Configuration

### Plugin SDK Options

```tsx
<ScalprumProvider
  config={config}
  pluginSDKOptions={{
    pluginStoreFeatureFlags: {
      disableStaticPlugins: false
    },
    pluginLoaderOptions: {
      transformPluginManifest: (manifest) => ({
        ...manifest,
        loadScripts: manifest.loadScripts.map(s => `${manifest.baseURL}${s}`)
      })
    }
  }}
>
  {/* Your app */}
</ScalprumProvider>
```

### Custom Manifest Processing

```tsx
<ScalprumComponent
  scope="myApp"
  module="MyComponent"
  processor={(manifest) => manifest.assets.js}
/>
```

## API Reference

### Exports

```tsx
// Components
export { ScalprumProvider } from './scalprum-provider';
export { ScalprumComponent } from './scalprum-component';

// Hooks
export { useScalprum } from './use-scalprum';
export { useModule } from './use-module';
export { useLoadModule } from './use-load-module';
export { usePrefetch } from './use-prefetch';

// Remote Hooks
export { useRemoteHook } from './use-remote-hook';
export { useRemoteHookManager } from './use-remote-hook-manager';
export { RemoteHookProvider } from './remote-hook-provider';

// Context
export { ScalprumContext } from './scalprum-context';
export { PrefetchContext } from './prefetch-context';

// Types
export * from './remote-hooks-types';
```

## Related Packages

- [`@scalprum/core`](../core) - Framework-agnostic core library
- [`@scalprum/build-utils`](../build-utils) - Build tools and NX executors
- [`@scalprum/react-test-utils`](../react-test-utils) - Testing utilities for React components

## Shared Stores

Scalprum provides powerful event-driven state management for micro-frontends through shared stores. This allows multiple micro-frontend modules to share and synchronize state in real-time.

### Quick Example

```tsx
import { createSharedStore } from '@scalprum/core';
import { useGetState } from '@scalprum/react-core';

// Create a shared store (in a remote module)
const EVENTS = ['ADD_TODO', 'TOGGLE_TODO'] as const;

let todoStore = null;
const getTodoStore = () => {
  if (!todoStore) {
    todoStore = createSharedStore({
      initialState: { todos: [] },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case 'ADD_TODO':
            return { todos: [...state.todos, payload.todo] };
          case 'TOGGLE_TODO':
            return {
              todos: state.todos.map(t =>
                t.id === payload.id ? { ...t, completed: !t.completed } : t
              ),
            };
          default:
            return state;
        }
      },
    });
  }
  return todoStore;
};

// Use in React components
export const useTodoStore = () => {
  const store = getTodoStore();
  const state = useGetState(store);

  return {
    todos: state.todos,
    addTodo: (todo) => store.updateState('ADD_TODO', { todo }),
    toggleTodo: (id) => store.updateState('TOGGLE_TODO', { id }),
  };
};
```

### Key Features

- **Event-Driven Updates**: State changes triggered by named events
- **Real-Time Synchronization**: Changes propagate across all microfrontends instantly
- **Performance Optimized**: `useSubscribeStore` for selective subscriptions
- **Type-Safe**: Full TypeScript support with generic types
- **Singleton Pattern**: Automatic state sharing across module boundaries

### Complete Documentation

For comprehensive documentation including:
- API reference for `createSharedStore`, `useGetState`, `useSubscribeStore`
- Advanced patterns (async operations, performance optimization, persistence)
- Module federation setup and configuration
- TypeScript best practices
- Testing strategies
- Migration guides from Redux/Context
- Troubleshooting common issues

See the **[Complete Shared Stores Guide](./docs/shared-stores.md)**

## Documentation

- [Getting Started Guide](./docs/getting-started.md)
- **[Shared Stores Guide](./docs/shared-stores.md)** - Event-driven state management for microfrontends
- [useRemoteHook Documentation](./docs/use-remote-hook.md)
- [useRemoteHookManager Documentation](./docs/use-remote-hook-manager.md)
- [RemoteHookProvider Reference](./docs/remote-hook-provider.md)
- [Remote Hook Types](./docs/remote-hook-types.md)

## License

Apache-2.0
