# useRemoteHook

The `useRemoteHook` is a React hook that allows you to load and use hooks from remote federated modules. It provides a seamless way to consume hooks that are dynamically loaded from other applications or microfrontends.

## Import

```tsx
import { useRemoteHook } from '@scalprum/react-core';
```

## Basic Usage

⚠️ **Critical:** When `args` contains objects or arrays, use `useMemo` to prevent infinite re-renders due to shallow equality checks.

```tsx
import { useRemoteHook } from '@scalprum/react-core';
import { useMemo } from 'react';

interface CounterResult {
  count: number;
  increment: () => void;
  decrement: () => void;
}

function MyComponent() {
  // ✅ Correct: Use useMemo when args contain objects/arrays
  const args = useMemo(() => [{ initialValue: 0, step: 1 }], []);

  const { hookResult, loading, error } = useRemoteHook<CounterResult>({
    scope: 'my-app',
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

## API Reference

### Parameters

The hook accepts a configuration object with the following properties:

#### `scope` (required)
- **Type:** `string`
- **Description:** The federated module scope name

#### `module` (required)
- **Type:** `string`
- **Description:** The module path within the scope

#### `importName` (optional)
- **Type:** `string`
- **Description:** Named export to import. If not provided, uses the default export

#### `args` (optional)
- **Type:** `any[]`
- **Default:** `[]`
- **Description:** Arguments to pass to the remote hook
- **⚠️ Important:** If the array contains objects or arrays, it must be memoized to prevent infinite re-renders

### Return Value

Returns a `UseRemoteHookResult<T>` object with:

#### `id`
- **Type:** `string`
- **Description:** Unique identifier for this hook instance

#### `loading`
- **Type:** `boolean`
- **Description:** Whether the hook is currently loading

#### `error`
- **Type:** `Error | null`
- **Description:** Any error that occurred during loading or execution

#### `hookResult`
- **Type:** `T | undefined`
- **Description:** The result returned by the remote hook

## Examples

### Basic Counter Hook

```tsx
import { useMemo } from 'react';

// Remote hook (in federated module)
export const useCounter = (options = {}) => {
  const { initialValue = 0, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  return {
    count,
    increment: () => setCount(c => c + step),
    decrement: () => setCount(c => c - step),
    reset: () => setCount(initialValue)
  };
};

// Consumer (in host application)
function CounterComponent() {
  // ✅ Correct: Memoized args
  const counterArgs = useMemo(() => [{ initialValue: 5, step: 2 }], []);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'counter-app',
    module: './useCounter',
    args: counterArgs
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Count: {hookResult.count}</h2>
      <button onClick={hookResult.increment}>+2</button>
      <button onClick={hookResult.decrement}>-2</button>
      <button onClick={hookResult.reset}>Reset</button>
    </div>
  );
}
```

### API Data Hook

```tsx
import { useMemo } from 'react';

// Remote hook
export const useApiData = (config) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(config.url);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config.url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Consumer
function DataComponent() {
  // ✅ Correct: Memoized args
  const apiArgs = useMemo(() => [{ url: '/api/users' }], []);

  const { hookResult, loading: hookLoading, error: hookError } = useRemoteHook({
    scope: 'api-app',
    module: './useApiData',
    args: apiArgs
  });

  if (hookLoading) return <div>Loading hook...</div>;
  if (hookError) return <div>Hook error: {hookError.message}</div>;

  return (
    <div>
      {hookResult?.loading && <div>Loading data...</div>}
      {hookResult?.error && <div>Data error: {hookResult.error}</div>}
      {hookResult?.data && (
        <div>
          <pre>{JSON.stringify(hookResult.data, null, 2)}</pre>
          <button onClick={hookResult.refetch}>Refresh</button>
        </div>
      )}
    </div>
  );
}
```

## Dynamic Arguments

When arguments need to change dynamically, include the changing values in the `useMemo` dependency array:

```tsx
function DynamicArgsComponent() {
  const [step, setStep] = useState(1);

  // ✅ Correct: Include step in dependencies
  const counterArgs = useMemo(() => [{ initialValue: 0, step }], [step]);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'counter-app',
    module: './useCounter',
    args: counterArgs
  });

  return (
    <div>
      <input
        type="number"
        value={step}
        onChange={(e) => setStep(Number(e.target.value))}
      />
      <p>Count: {hookResult?.count}</p>
      <button onClick={hookResult?.increment}>+{step}</button>
    </div>
  );
}
```

## Common Pitfalls and Solutions

### ❌ Infinite Re-renders with Objects/Arrays (WRONG)

```tsx
function BadExample() {
  // ❌ This will cause infinite re-renders! Object is recreated on every render
  const { hookResult } = useRemoteHook({
    scope: 'my-app',
    module: './useCounter',
    args: [{ initialValue: 0, step: 1 }] // New object on every render!
  });

  return <div>{hookResult?.count}</div>;
}
```

### ✅ Correct Approaches

```tsx
// ✅ Option 1: Memoized args for objects/arrays
function GoodExample1() {
  const args = useMemo(() => [{ initialValue: 0, step: 1 }], []);

  const { hookResult } = useRemoteHook({
    scope: 'my-app',
    module: './useCounter',
    args
  });

  return <div>{hookResult?.count}</div>;
}

// ✅ Option 2: Primitive values work without memoization
function GoodExample2() {
  const { hookResult } = useRemoteHook({
    scope: 'my-app',
    module: './useSimpleCounter',
    args: [0, 1] // Primitive values - no memoization needed
  });

  return <div>{hookResult?.count}</div>;
}

// ✅ Option 3: No args
function GoodExample3() {
  const { hookResult } = useRemoteHook({
    scope: 'my-app',
    module: './useStaticCounter'
    // No args needed
  });

  return <div>{hookResult?.count}</div>;
}
```

### Complex Dynamic Arguments

```tsx
function ComplexArgsExample() {
  const [userId, setUserId] = useState('123');
  const [includeMetadata, setIncludeMetadata] = useState(false);

  // ✅ Memoize with all dynamic dependencies
  const apiArgs = useMemo(() => [{
    userId,
    options: {
      includeMetadata,
      timeout: 5000
    }
  }], [userId, includeMetadata]);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'user-app',
    module: './useUserData',
    args: apiArgs
  });

  return (
    <div>
      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={includeMetadata}
          onChange={(e) => setIncludeMetadata(e.target.checked)}
        />
        Include metadata
      </label>
      {/* Rest of component */}
    </div>
  );
}
```

## Error Handling

```tsx
function ErrorHandlingExample() {
  const args = useMemo(() => [{ shouldFail: Math.random() > 0.5 }], []);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'may-fail-app',
    module: './unreliableHook',
    args
  });

  if (loading) {
    return <div>Loading remote hook...</div>;
  }

  if (error) {
    return (
      <div>
        <h3>Failed to load remote hook</h3>
        <p>Error: {error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>Hook loaded successfully!</p>
      {/* Use hookResult */}
    </div>
  );
}
```

## TypeScript Support

```tsx
interface CounterHookResult {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

interface CounterHookArgs {
  initialValue?: number;
  step?: number;
}

function TypedCounterComponent() {
  const args = useMemo((): CounterHookArgs[] => [
    { initialValue: 10, step: 5 }
  ], []);

  const { hookResult, loading, error } = useRemoteHook<CounterHookResult>({
    scope: 'counter-app',
    module: './useCounter',
    args
  });

  // TypeScript knows hookResult is CounterHookResult | undefined
  return (
    <div>
      <p>Count: {hookResult?.count}</p>
      <button onClick={hookResult?.increment}>+5</button>
    </div>
  );
}
```

## Performance Considerations

### Critical: Argument Memoization
- **Use `useMemo` for `args` when they contain objects or arrays** - This prevents infinite re-renders
- Arguments are compared using shallow equality between renders
- **Primitive values** (strings, numbers, booleans) in args arrays don't need memoization
- **Objects and arrays** in args arrays must be memoized or they'll cause infinite re-renders
- Include all dynamic values in the `useMemo` dependency array

### Other Considerations
- Remote hooks should follow standard React hooks rules and dependency patterns
- Hook execution is asynchronous due to module loading
- Always handle loading and error states

## Best Practices

1. **Memoize non-primitive args**: Use `useMemo(() => [args], [dependencies])` when args contain objects/arrays
2. **Primitive values are safe**: `args: [1, 'hello', true]` doesn't need memoization
3. **Minimal dependencies**: Only include values that actually affect the hook behavior
4. **Static configuration**: For static configurations, use empty dependency array `[]`
5. **Complex objects**: For complex nested objects, ensure all changing values are in dependencies

## Limitations

- Remote hooks must follow React's rules of hooks
- Arguments are passed as an array and spread into the hook function
- Hook execution is asynchronous due to module loading
- No direct communication between hook instances (use external state management if needed)
- **Arguments containing objects/arrays must be properly memoized to prevent infinite re-renders**

## See Also

- [RemoteHookProvider](./remote-hook-provider.md) - Context provider for remote hooks
- [useRemoteHookManager](./use-remote-hook-manager.md) - Managing multiple remote hooks
- [Remote Hook Types](./remote-hook-types.md) - TypeScript interfaces and types