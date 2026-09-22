# Remote Hook Types

This document provides comprehensive TypeScript interfaces and types for the remote hooks functionality in Scalprum.

For known remotes, generated declaration archives are the default source of hook argument and result types. The explicit interfaces below describe library result containers or fallback patterns for remotes without declaration archives.

> **Related Documentation:**
>
> - [useRemoteHook](./use-remote-hook.md) - Using remote hooks
> - [useRemoteHookManager](./use-remote-hook-manager.md) - Managing multiple hooks
> - [RemoteHookProvider](./remote-hook-provider.md) - Context provider

## Quick Navigation

- [Hook Configuration](#hook-configuration) - `HookConfig`
- [Hook Results](#hook-results) - `UseRemoteHookResult<T>`
- [Hook Handles](#hook-handles) - `HookHandle`, `RemoteHookHandle<T>`
- [Hook Manager](#hook-manager) - `RemoteHookManager`
- [Common Patterns](#common-type-patterns) - Examples and usage

## Import

```tsx
import type { HookConfig, UseRemoteHookResult, RemoteHookHandle, HookHandle, RemoteHookManager, RemoteHookContextType } from '@scalprum/react-core';
```

## Hook Configuration

### HookConfig

Configuration object for defining a remote hook.

```tsx
interface HookConfig {
  scope: string;
  module: string;
  importName?: string;
  args?: any[];
}
```

**Properties:**

- `scope`: The federated module scope name
- `module`: The module path within the scope (e.g., './useCounter')
- `importName`: Optional named export to import (uses default export if not specified)
- `args`: Optional arguments to pass to the remote hook

**Example:**

```tsx
const config: HookConfig = {
  scope: 'counter-app',
  module: './useCounter',
  importName: 'useAdvancedCounter', // optional
  args: [{ initialValue: 0, step: 1 }], // optional
};
```

## Hook Results

### UseRemoteHookResult<T>

Result object returned by `useRemoteHook` and included in `hookResults` arrays.

```tsx
interface UseRemoteHookResult<T> {
  id: string;
  loading: boolean;
  error: Error | null;
  hookResult?: T;
}
```

**Properties:**

- `id`: Unique identifier for the hook instance
- `loading`: Whether the hook is currently loading
- `error`: Any error that occurred during loading or execution
- `hookResult`: The result returned by the remote hook (generic type T)

**Example:**

```tsx
interface CounterResult {
  count: number;
  increment: () => void;
}

const result: UseRemoteHookResult<CounterResult> = {
  id: 'hook-123',
  loading: false,
  error: null,
  hookResult: {
    count: 5,
    increment: () => {},
  },
};
```

## Hook Handles

### HookHandle

Basic handle returned by `RemoteHookManager.addHook()` for controlling individual hooks.

```tsx
interface HookHandle {
  remove(): void;
  updateArgs(args: any[]): void;
}
```

**Methods:**

- `remove()`: Remove this specific hook from the manager
- `updateArgs(args: any[])`: Update the arguments passed to this hook

### RemoteHookHandle<T>

Extended handle with additional properties (used internally).

```tsx
interface RemoteHookHandle<T = any> {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hookResult?: T;
  readonly id: string;

  updateArgs(args: any[]): void;
  remove(): void;
  subscribe(callback: (result: UseRemoteHookResult<T>) => void): () => void;
}
```

**Properties:**

- `loading`: Current loading state
- `error`: Current error state
- `hookResult`: Current hook result
- `id`: Unique identifier

**Methods:**

- `updateArgs(args: any[])`: Update hook arguments
- `remove()`: Remove the hook
- `subscribe(callback)`: Subscribe to hook state changes (returns unsubscribe function)

## Hook Manager

### RemoteHookManager

Interface for the hook manager returned by `useRemoteHookManager()`.

```tsx
interface RemoteHookManager {
  addHook(config: HookConfig): HookHandle;
  cleanup(): void;
  hookResults: UseRemoteHookResult<any>[];
}
```

**Methods:**

- `addHook(config)`: Add a new remote hook and return a handle
- `cleanup()`: Remove all managed hooks and clean up resources
- `hookResults`: An array of all current hook results

**Example:**

```tsx
function useHookManager() {
  const manager: RemoteHookManager = useRemoteHookManager();

  const addCounter = () => {
    const handle: HookHandle = manager.addHook({
      scope: 'counter-app',
      module: './useCounter',
    });

    return handle;
  };

  return { addCounter, hookResults: manager.hookResults, cleanup: manager.cleanup };
}
```

## Context Types

### RemoteHookContextType

Internal context interface used by the RemoteHookProvider.

```tsx
interface RemoteHookContextType {
  subscribe: (notify: () => void) => { id: string; unsubscribe: () => void };
  updateState: (id: string, value: any) => void;
  getState: (id: string) => any;
  registerHook: (id: string, hookFunction: (...args: any[]) => any) => void;
  updateArgs: (id: string, args: any[]) => void;
  subscribeToArgs: (id: string, callback: (args: any[]) => void) => () => void;
}
```

> **Note:** This is an internal interface. You typically won't use this directly unless you're extending the remote hooks system.

## Common Type Patterns

### Generated Hook Types

For known remote scopes and modules, generated declarations provide hook result and argument types automatically:

```tsx
function TypedCounterComponent() {
  const args = useMemo(() => [{ initialValue: 0, step: 1 }], []);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'counter-app',
    module: './useCounter',
    args,
  });

  // TypeScript knows generated shape of hookResult
  return (
    <div>
      <p>Count: {hookResult?.count}</p>
      <button onClick={hookResult?.increment}>+</button>
    </div>
  );
}
```

Use local result interfaces or explicit generics only for remotes that do not publish declaration archives or for intentionally generic runtime values.

### Generic Hook Manager Usage

Use a local result interface only when the remote does not publish declarations or when a manager intentionally combines unknown runtime hooks.

```tsx
interface ApiHookResult {
  data: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function TypedHookManager() {
  const manager = useRemoteHookManager();

  const addApiHook = (): HookHandle => {
    return manager.addHook({
      scope: 'api-app',
      module: './useApiData',
      args: [{ url: '/api/users' }],
    });
  };

  const apiResults = useMemo(() => {
    return manager.hookResults.filter((result) => result.hookResult && 'data' in result.hookResult) as UseRemoteHookResult<ApiHookResult>[];
  }, [manager.hookResults]);

  return { addApiHook, apiResults };
}
```

### Error Type Guards

```tsx
function isHookError(result: UseRemoteHookResult<any>): result is UseRemoteHookResult<any> & { error: Error } {
  return result.error !== null;
}

function isHookLoaded<T>(result: UseRemoteHookResult<T>): result is UseRemoteHookResult<T> & { hookResult: T } {
  return !result.loading && result.error === null && result.hookResult !== undefined;
}

// Usage
function SafeHookConsumer() {
  const { hookResult, loading, error } = useRemoteHook({
    scope: 'counter-app',
    module: './useCounter',
  });

  const result = { hookResult, loading, error };

  if (isHookError(result)) {
    return <div>Error: {result.error.message}</div>;
  }

  if (isHookLoaded(result)) {
    // TypeScript knows generated hookResult type and that it is defined.
    return <div>Count: {result.hookResult.count}</div>;
  }

  return <div>Loading...</div>;
}
```

## Utility Types

### Hook Factory Types

```tsx
type HookFactory<TArgs extends any[] = any[], TResult = any> = (...args: TArgs) => TResult;

type RemoteHookConfig<TArgs extends any[] = any[]> = {
  scope: string;
  module: string;
  importName?: string;
  args?: TArgs;
};

// Usage
function createTypedRemoteHook<TArgs extends any[], TResult>(config: RemoteHookConfig<TArgs>): UseRemoteHookResult<TResult> {
  return useRemoteHook<TResult>(config);
}
```

### Hook Collection Types

```tsx
type HookCollection = {
  [key: string]: UseRemoteHookResult<unknown>;
};

type HookRegistry<T extends Record<string, any>> = {
  [K in keyof T]: UseRemoteHookResult<T[K]>;
};

// Use explicit contracts when these remotes do not publish declaration archives.
interface CounterHookResult {
  count: number;
  increment: () => void;
  decrement: () => void;
}

interface ApiHookResult {
  data: { message: string } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface TimerHookResult {
  timeLeft: number;
  isRunning: boolean;
  isComplete: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

interface MyHooks {
  counter: CounterHookResult;
  api: ApiHookResult;
  timer: TimerHookResult;
}

function useTypedHookRegistry(): HookRegistry<MyHooks> {
  const manager = useRemoteHookManager();
  const results = manager.hookResults;

  // Implementation would map results to the typed registry
  return {} as HookRegistry<MyHooks>;
}
```

## See Also

- [useRemoteHook](./use-remote-hook.md) - Hook for single remote hook usage
- [useRemoteHookManager](./use-remote-hook-manager.md) - Managing multiple remote hooks
- [RemoteHookProvider](./remote-hook-provider.md) - Context provider for remote hooks
