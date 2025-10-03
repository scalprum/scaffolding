# Scalprum Remote Hooks Documentation

Remote Hooks is a powerful feature in Scalprum that allows you to load and execute React hooks from federated modules dynamically. This enables true micro-frontend architecture where not only components but also custom hooks can be shared across applications.

## Overview

Remote Hooks provide a way to:
- **Load hooks from federated modules** - Execute hooks from other applications
- **Dynamic hook management** - Add, remove, and control multiple hooks at runtime
- **Seamless integration** - Works with existing React patterns and TypeScript
- **Isolated execution** - Each hook runs in its own isolated environment
- **Argument updates** - Update hook arguments dynamically without remounting

## Quick Start

```tsx
import { useRemoteHook } from '@scalprum/react-core';
import { useMemo } from 'react';

function MyComponent() {
  // ⚠️ Use useMemo when args contain objects/arrays
  const args = useMemo(() => [{ initialValue: 0, step: 1 }], []);

  const { hookResult, loading, error } = useRemoteHook({
    scope: 'counter-app',
    module: './useCounter',
    args
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Count: {hookResult?.count}</p>
      <button onClick={hookResult?.increment}>+</button>
    </div>
  );
}
```

## Documentation

### Core Components

- **[RemoteHookProvider](./remote-hook-provider.md)** - Context provider that enables remote hook functionality
- **[useRemoteHook](./use-remote-hook.md)** - Hook for loading and using individual remote hooks
- **[useRemoteHookManager](./use-remote-hook-manager.md)** - Hook for managing multiple remote hooks dynamically
- **[Remote Hook Types](./remote-hook-types.md)** - TypeScript interfaces and type definitions

### Getting Started

1. **Setup**: The `RemoteHookProvider` is automatically included when using `ScalprumProvider`
2. **Basic Usage**: Use `useRemoteHook` for single hooks or `useRemoteHookManager` for multiple hooks
3. **Argument Handling**: Remember to memoize arguments containing objects or arrays
4. **Error Handling**: Always handle loading and error states

## Architecture

```
┌─────────────────────────────────────┐
│           ScalprumProvider          │
│  ┌─────────────────────────────────┐│
│  │        RemoteHookProvider       ││
│  │  ┌─────────────────────────────┐││
│  │  │      Your Components        │││
│  │  │  - useRemoteHook            │││
│  │  │  - useRemoteHookManager     │││
│  │  └─────────────────────────────┘││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        Federated Modules            │
│  - ./useCounter                     │
│  - ./useApiData                     │
│  - ./useTimer                       │
└─────────────────────────────────────┘
```

## Key Features

### 🔄 Dynamic Loading
Load hooks from remote modules on-demand, enabling modular architecture.

### 🎯 Isolated Execution
Each remote hook runs in its own isolated environment, preventing conflicts.

### ⚡ Argument Updates
Update hook arguments dynamically without remounting components.

### 🛡️ Type Safety
Full TypeScript support with generic types for hook results.

### 🧹 Automatic Cleanup
Proper resource management and memory leak prevention.

### 📊 Multiple Hook Management
Manage multiple remote hooks dynamically with the hook manager.

## Common Use Cases

### 🔌 Plugin Systems
```tsx
// Load different plugin hooks based on user configuration
const { hookResult } = useRemoteHook({
  scope: pluginConfig.scope,
  module: pluginConfig.hookModule,
  args: [pluginConfig.settings]
});
```

### 📊 Dashboard Widgets
```tsx
// Each widget can use a different remote hook
function Widget({ widgetConfig }) {
  const { hookResult, loading } = useRemoteHook({
    scope: widgetConfig.app,
    module: widgetConfig.dataHook,
    args: [widgetConfig.params]
  });

  return loading ? <Spinner /> : <WidgetDisplay data={hookResult} />;
}
```

### 🔄 A/B Testing
```tsx
// Load different hook implementations for testing
const hookModule = isTestVariantA ? './useFeatureA' : './useFeatureB';

const { hookResult } = useRemoteHook({
  scope: 'feature-app',
  module: hookModule,
  args: [userConfig]
});
```

### 🎛️ Dynamic Feature Loading
```tsx
// Users can enable/disable features that load different hooks
function FeatureManager() {
  const manager = useRemoteHookManager();

  const enableFeature = (featureName) => {
    manager.addHook({
      scope: 'features-app',
      module: `./use${featureName}Hook`,
      args: [{ enabled: true }]
    });
  };

  return (
    <div>
      <button onClick={() => enableFeature('Analytics')}>
        Enable Analytics
      </button>
      <button onClick={() => enableFeature('Notifications')}>
        Enable Notifications
      </button>
    </div>
  );
}
```

## Performance Tips

### ⚠️ Critical: Argument Memoization
```tsx
// ❌ Wrong - causes infinite re-renders
const { hookResult } = useRemoteHook({
  scope: 'app',
  module: './hook',
  args: [{ config: 'value' }] // New object every render!
});

// ✅ Correct - memoized arguments
const args = useMemo(() => [{ config: 'value' }], []);
const { hookResult } = useRemoteHook({
  scope: 'app',
  module: './hook',
  args
});

// ✅ Also correct - primitive values don't need memoization
const { hookResult } = useRemoteHook({
  scope: 'app',
  module: './hook',
  args: [1, 'hello', true] // Primitives are safe
});
```

### 🎯 Efficient Hook Management
- Use `useRemoteHook` for static single hooks
- Use `useRemoteHookManager` for dynamic multi-hook scenarios
- Always clean up hooks when components unmount
- Handle loading and error states appropriately

## Migration Guide

If you're upgrading from a previous version or migrating from other solutions:

1. **Wrap your app** with `ScalprumProvider` (includes `RemoteHookProvider`)
2. **Replace static imports** with `useRemoteHook` calls
3. **Add loading/error handling** for the asynchronous nature of remote hooks
4. **Memoize complex arguments** to prevent infinite re-renders
5. **Update TypeScript types** to use the provided interfaces

## Examples Repository

For complete working examples, see the test applications in this repository:
- `examples/test-app/src/routes/RemoteHooks.tsx` - Basic remote hook usage
- `examples/test-app/src/routes/RemoteHookManager.tsx` - Hook manager examples
- `federation-cdn-mock/src/modules/` - Example remote hook implementations

## Community and Support

- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join the community discussions for help and best practices
- **Contributing**: See the contributing guide for development setup

## See Also

- [Scalprum Core Documentation](../README.md) - Main Scalprum documentation
- [Module Federation Guide](https://webpack.js.org/concepts/module-federation/) - Understanding federated modules
- [React Hooks Documentation](https://react.dev/reference/react) - React hooks fundamentals