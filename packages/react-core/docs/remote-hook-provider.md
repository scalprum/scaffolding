# RemoteHookProvider

The `RemoteHookProvider` is a React context provider that enables remote hook functionality across your application. It must be wrapped around any components that use `useRemoteHook` or `useRemoteHookManager`.

## Quick Reference

```tsx
import { ScalprumProvider } from '@scalprum/react-core';

// RemoteHookProvider is automatically included in ScalprumProvider
function App() {
  return (
    <ScalprumProvider config={scalprumConfig}>
      {/* Remote hooks work automatically here */}
      <YourComponents />
    </ScalprumProvider>
  );
}
```

**Key points:**
- Automatically included in `ScalprumProvider` - no setup needed
- Can be used standalone for advanced use cases
- Provides isolated execution environments for each remote hook
- Manages hook state, lifecycle, and argument updates

## Overview

The RemoteHookProvider manages the execution of remote hooks by:
- Creating isolated execution environments for each remote hook
- Managing hook state and lifecycle
- Providing argument updates and subscription mechanisms
- Handling cleanup when hooks are removed

## Setup

The RemoteHookProvider is automatically included when you use ScalprumProvider, so no additional setup is required in most cases.

```tsx
import { ScalprumProvider } from '@scalprum/react-core';

function App() {
  return (
    <ScalprumProvider config={scalprumConfig}>
      {/* Your app components can now use remote hooks */}
      <YourApp />
    </ScalprumProvider>
  );
}
```

## Manual Setup

If you need to use RemoteHookProvider somewhere deeper within the the tree (to allow access of hooks to some additional context):

```tsx
import { RemoteHookProvider } from '@scalprum/react-core';

function App() {
  return (
    <RemoteHookProvider>
      {/* Components using remote hooks */}
      <YourApp />
    </RemoteHookProvider>
  );
}
```

## How It Works

### Hook Execution

The provider uses a unique approach to execute remote hooks:

1. **Fake Components**: Remote hooks are executed within hidden "fake" components that follow React's rules of hooks
2. **State Management**: Each hook gets a unique ID and isolated state management
3. **Argument Updates**: Hook arguments can be updated dynamically without remounting the component
4. **Subscription Model**: Components subscribe to hook state changes for reactive updates

### Internal Architecture

```tsx
// Internal hook executor component
function HookExecutor({ id, hookFunction, initialArgs }) {
  const [args, setArgs] = useState(initialArgs);

  // Subscribe to argument changes
  useEffect(() => {
    const unsubscribe = subscribeToArgs(id, setArgs);
    return unsubscribe;
  }, [id]);

  // Execute the hook with current args
  const hookResult = hookFunction(...args);

  // Update the provider state
  useEffect(() => {
    updateState(id, { hookResult });
  }, [hookResult]);

  return null; // Hidden component
}
```

## Context API

The RemoteHookProvider exposes the following context methods:

### `subscribe(notify: () => void)`

Subscribe to state changes for a hook.

**Parameters:**
- `notify`: Callback function to trigger re-renders

**Returns:**
- Object with `id` and `unsubscribe` function

### `updateState(id: string, value: any)`

Update the state for a specific hook.

**Parameters:**
- `id`: Unique hook identifier
- `value`: State updates to merge

### `getState(id: string)`

Get the current state for a specific hook.

**Parameters:**
- `id`: Unique hook identifier

**Returns:**
- Current hook state object

### `registerHook(id: string, hookFunction: (...args: any[]) => any)`

Register a remote hook function for execution.

**Parameters:**
- `id`: Unique hook identifier
- `hookFunction`: The loaded remote hook function

### `updateArgs(id: string, args: any[])`

Update arguments for a specific hook.

**Parameters:**
- `id`: Unique hook identifier
- `args`: New arguments array

### `subscribeToArgs(id: string, callback: (args: any[]) => void)`

Subscribe to argument changes for a specific hook.

**Parameters:**
- `id`: Unique hook identifier
- `callback`: Function called when arguments change

**Returns:**
- Unsubscribe function

## Error Handling

The provider includes error handling for:
- Hook execution errors
- Argument update failures
- Subscription callback errors

Errors are logged to the console and propagated to the consuming components through the error state.

## Performance Considerations

- **Isolated Execution**: Each hook runs in its own component to prevent interference
- **Efficient Updates**: Only components subscribed to specific hooks re-render on changes
- **Memory Management**: Automatic cleanup prevents memory leaks when hooks are removed
- **Shallow Comparison**: Argument changes use shallow comparison to optimize updates

## Cleanup

The provider automatically handles cleanup when:
- The provider unmounts
- Individual hooks are removed
- Components using hooks unmount

This prevents memory leaks and ensures proper resource management.

## See Also

- [useRemoteHook](./use-remote-hook.md) - Hook for loading and using individual remote hooks
- [useRemoteHookManager](./use-remote-hook-manager.md) - Hook for managing multiple remote hooks dynamically
- [Remote Hook Types](./remote-hook-types.md) - TypeScript interfaces and types