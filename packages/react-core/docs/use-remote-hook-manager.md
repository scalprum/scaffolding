# useRemoteHookManager

The `useRemoteHookManager` hook provides a way to dynamically manage multiple remote hooks. Unlike `useRemoteHook` which manages a single hook, the manager allows you to add, remove, and control multiple remote hooks at runtime.

## Quick Reference

```tsx
import { useRemoteHookManager } from '@scalprum/react-core';
import { useEffect } from 'react';

// For managing multiple remote hooks dynamically
const manager = useRemoteHookManager();

// Add hooks dynamically
const handle = manager.addHook({
  scope: 'remote-app',
  module: './useMyHook',
  args: [{ config: 'value' }]
});

// Update hook arguments
handle.updateArgs([{ config: 'newValue' }]);

// Remove specific hook
handle.remove();

// Get all hook results
const results = manager.hookResults;

// Clean up all hooks (do this on unmount)
useEffect(() => () => manager.cleanup(), [manager.cleanup]);
```

**When to use:** Managing multiple remote hooks dynamically, adding/removing hooks at runtime, or building plugin systems.

**When NOT to use:** For a single static hook - use [useRemoteHook](./use-remote-hook.md) instead for automatic re-renders.

## Import

```tsx
import { useRemoteHookManager } from '@scalprum/react-core';
```

## Basic Usage

```tsx
import { useRemoteHookManager } from '@scalprum/react-core';
import { useEffect } from 'react';

function HookManagerComponent() {
  const { addHook, cleanup, hookResults } = useRemoteHookManager();

  const addCounterHook = () => {
    const handle = addHook({
      scope: 'counter-app',
      module: './useCounter',
      args: [{ initialValue: 0, step: 1 }]
    });

    // Store handle if you need to remove or update this specific hook later
    console.log('Added hook with handle:', handle);
  };

  const getAllResults = () => {
    console.log('All hook results:', hookResults);
  };

  const cleanupAll = () => {
    cleanup();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div>
      <button onClick={addCounterHook}>Add Counter Hook</button>
      <button onClick={getAllResults}>Get All Results</button>
      <button onClick={cleanupAll}>Cleanup All</button>
    </div>
  );
}
```

## API Reference

### useRemoteHookManager()

Returns a `RemoteHookManager` object with the following methods:

#### `addHook(config: HookConfig): HookHandle`

Adds a new remote hook and returns a handle to control it.

**Parameters:**
- `config`: Configuration object for the remote hook

**HookConfig Properties:**
- `scope` (required): The federated module scope name
- `module` (required): The module path within the scope
- `importName` (optional): Named export to import
- `args` (optional): Arguments to pass to the hook (same memoization rules apply as `useRemoteHook`)

**Returns:** `HookHandle` object with:
- `remove()`: Remove this specific hook
- `updateArgs(args: any[])`: Update arguments for this hook

#### `hookResults: UseRemoteHookResult<any>[]`

An array of all current hook results.

**Returns:** Array of `UseRemoteHookResult` objects with:
- `id`: Unique hook identifier
- `loading`: Whether the hook is loading
- `error`: Any error that occurred
- `hookResult`: The result from the remote hook

#### `cleanup(): void`

Removes all managed hooks and cleans up resources.

## Examples

### Managing Multiple Hook Types

```tsx
import { useRemoteHookManager } from '@scalprum/react-core';
import { useState, useEffect } from 'react';

function MultiHookManager() {
  const manager = useRemoteHookManager();
  const [hooks, setHooks] = useState([]);

  const addCounterHook = () => {
    const handle = manager.addHook({
      scope: 'counter-app',
      module: './useCounter',
      args: [{ initialValue: Math.floor(Math.random() * 10), step: 1 }]
    });

    setHooks(prev => [...prev, { type: 'counter', handle }]);
  };

  const addApiHook = () => {
    const handle = manager.addHook({
      scope: 'api-app',
      module: './useApiData',
      args: [{ url: '/api/data', timeout: 5000 }]
    });

    setHooks(prev => [...prev, { type: 'api', handle }]);
  };

  const addTimerHook = () => {
    const handle = manager.addHook({
      scope: 'timer-app',
      module: './useTimer',
      args: [{ duration: 30, autoStart: true }]
    });

    setHooks(prev => [...prev, { type: 'timer', handle }]);
  };

  const removeHook = (index) => {
    const hook = hooks[index];
    hook.handle.remove();
    setHooks(prev => prev.filter((_, i) => i !== index));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => manager.cleanup();
  }, [manager.cleanup]);

  const { hookResults } = manager;

  return (
    <div>
      <div>
        <button onClick={addCounterHook}>Add Counter</button>
        <button onClick={addApiHook}>Add API Hook</button>
        <button onClick={addTimerHook}>Add Timer</button>
        <button onClick={() => manager.cleanup()}>Clear All</button>
      </div>

      <div>
        <h3>Active Hooks: {hooks.length}</h3>
        {hookResults.map((result, index) => (
          <div key={result.id}>
            <p>Hook {index + 1}: {hooks[index]?.type}</p>
            <p>Loading: {result.loading ? 'Yes' : 'No'}</p>
            <p>Error: {result.error ? result.error.message : 'None'}</p>
            <button onClick={() => removeHook(index)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Dynamic Hook Arguments

```tsx
function DynamicArgsManager() {
  const manager = useRemoteHookManager();
  const [handles, setHandles] = useState([]);

  const addConfigurableCounter = () => {
    const handle = manager.addHook({
      scope: 'counter-app',
      module: './useCounter',
      args: [{ initialValue: 0, step: 1 }]
    });

    setHandles(prev => [...prev, handle]);
  };

  const updateCounterStep = (handleIndex, newStep) => {
    const handle = handles[handleIndex];
    if (handle) {
      // Update the args for this specific hook
      handle.updateArgs([{ initialValue: 0, step: newStep }]);
    }
  };

  const removeHandle = (index) => {
    const handle = handles[index];
    handle.remove();
    setHandles(prev => prev.filter((_, i) => i !== index));
  };

  const { hookResults } = manager;

  return (
    <div>
      <button onClick={addConfigurableCounter}>Add Counter</button>

      {hookResults.map((result, index) => (
        <div key={result.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px' }}>
          <h4>Counter {index + 1}</h4>

          {result.loading && <p>Loading...</p>}
          {result.error && <p>Error: {result.error.message}</p>}

          {result.hookResult && (
            <div>
              <p>Count: {result.hookResult.count}</p>
              <button onClick={result.hookResult.increment}>+</button>
              <button onClick={result.hookResult.decrement}>-</button>
              <button onClick={result.hookResult.reset}>Reset</button>
            </div>
          )}

          <div>
            <label>
              Step size:
              <input
                type="number"
                onChange={(e) => updateCounterStep(index, Number(e.target.value))}
                defaultValue={1}
              />
            </label>
          </div>

          <button onClick={() => removeHandle(index)}>Remove This Hook</button>
        </div>
      ))}
    </div>
  );
}
```

### Hook Results Processing

```tsx
function HookResultsProcessor() {
  const manager = useRemoteHookManager();
  const [processedData, setProcessedData] = useState({});

  useEffect(() => {
    // Process hook results whenever they change
    const results = manager.hookResults;

    const processed = results.reduce((acc, result, index) => {
      if (!result.loading && !result.error && result.hookResult) {
        acc[result.id] = {
          index,
          type: determineHookType(result.hookResult),
          data: result.hookResult,
          timestamp: Date.now()
        };
      }
      return acc;
    }, {});

    setProcessedData(processed);
  }, [manager.hookResults]); // Re-run when results change

  const determineHookType = (hookResult) => {
    if (typeof hookResult.count === 'number') return 'counter';
    if (hookResult.data !== undefined) return 'api';
    if (typeof hookResult.timeLeft === 'number') return 'timer';
    return 'unknown';
  };

  const addRandomHook = () => {
    const hookTypes = [
      { scope: 'counter-app', module: './useCounter', args: [{ initialValue: 0 }] },
      { scope: 'api-app', module: './useApiData', args: [{ url: '/api/random' }] },
      { scope: 'timer-app', module: './useTimer', args: [{ duration: 10 }] }
    ];

    const randomHook = hookTypes[Math.floor(Math.random() * hookTypes.length)];
    manager.addHook(randomHook);
  };

  return (
    <div>
      <button onClick={addRandomHook}>Add Random Hook</button>
      <button onClick={() => manager.cleanup()}>Clear All</button>

      <h3>Processed Hook Data</h3>
      {Object.entries(processedData).map(([id, data]) => (
        <div key={id}>
          <h4>{data.type} hook (Index: {data.index})</h4>
          <pre>{JSON.stringify(data.data, null, 2)}</pre>
          <small>Last updated: {new Date(data.timestamp).toLocaleTimeString()}</small>
        </div>
      ))}
    </div>
  );
}
```

## Argument Memoization

The same memoization rules apply to `useRemoteHookManager` as to `useRemoteHook`:

```tsx
function MemoizedArgsExample() {
  const manager = useRemoteHookManager();
  const [userId, setUserId] = useState('123');

  const addUserHook = () => {
    // ✅ If args contain objects, they should be memoized at creation time
    const args = [{ userId, includeProfile: true }];

    const handle = manager.addHook({
      scope: 'user-app',
      module: './useUserData',
      args // This is fine since it's created once when the hook is added
    });

    // Later updates use updateArgs
    setTimeout(() => {
      handle.updateArgs([{ userId: 'new-user', includeProfile: false }]);
    }, 2000);
  };

  return (
    <div>
      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <button onClick={addUserHook}>Add User Hook</button>
    </div>
  );
}
```

## Performance Considerations

- **Manager Stability**: The manager object is stable across re-renders
- **Memory Management**: Always call `cleanup()` or individual `remove()` methods to prevent memory leaks
- **Argument Updates**: Use `handle.updateArgs()` to update arguments instead of removing and re-adding hooks

## Comparison with useRemoteHook

| Feature | useRemoteHook | useRemoteHookManager |
|---------|---------------|----------------------|
| Hook Count | Single hook | Multiple hooks |
| Configuration | At hook creation | Dynamic add/remove |
| State Management | Automatic re-renders | Manual result fetching |
| Use Case | Static remote hook usage | Dynamic hook management |
| Cleanup | Automatic on unmount | Manual cleanup required |

## Use Cases

### When to Use useRemoteHookManager

- **Dynamic UIs**: When users can add/remove functionality dynamically
- **Plugin Systems**: Loading different plugin hooks based on user selection
- **A/B Testing**: Conditionally loading different hook implementations
- **Bulk Operations**: Managing multiple similar hooks (e.g., multiple API calls)
- **Dashboard Widgets**: Where each widget uses a different remote hook

### When to Use useRemoteHook

- **Static Components**: When you know exactly which hook you need
- **Simple Use Cases**: Single hook per component
- **Automatic Re-rendering**: When you want automatic updates on hook result changes

## Error Handling

```tsx
function ErrorHandlingManager() {
  const { hookResults } = useRemoteHookManager();

  const errors = hookResults
    .filter(result => result.error)
    .map(result => ({ id: result.id, error: result.error.message }));

  return (
    <div>
      {errors.length > 0 && (
        <div>
          <h3>Errors:</h3>
          {errors.map((error, index) => (
            <div key={index} style={{ color: 'red' }}>
              Hook {error.id}: {error.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## See Also

- [useRemoteHook](./use-remote-hook.md) - Hook for single remote hook usage
- [RemoteHookProvider](./remote-hook-provider.md) - Context provider for remote hooks
- [Remote Hook Types](./remote-hook-types.md) - TypeScript interfaces and types