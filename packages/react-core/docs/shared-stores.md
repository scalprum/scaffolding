# Shared Stores in Scalprum

**Event-driven state management for micro-frontend applications**

Shared stores enable synchronized state management across multiple micro-frontend modules using an event-driven architecture. When combined with remote hooks and module federation, shared stores allow different micro-frontends to share and synchronize state in real-time.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Usage Patterns](#usage-patterns)
- [Best Practices](#best-practices)
- [Advanced Topics](#advanced-topics)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

### What Are Shared Stores?

Shared stores are event-driven state containers that enable multiple components or micro-frontends to share the same state instance. They are designed specifically for micro-frontend architectures where state needs to be synchronized across module boundaries.

**Key Features:**

- Event-driven updates via named events (e.g., 'ADD_TODO', 'UPDATE_USER')
- Subscription system for all events or specific events
- Singleton pattern for automatic state sharing across instances
- Real-time synchronization across micro-frontends
- Full TypeScript support with generic types
- Framework-agnostic core (`@scalprum/core`)

### When to Use Shared Stores

**IMPORTANT: Shared stores are NOT intended to replace global state management tools or Context API in your applications.**

**Use shared stores for:**

- Cross-module communication in micro-frontends
- Small, isolated state (notifications, user preferences, feature flags)
- Lightweight coordination between remote modules

**Use dedicated global state management solutions for:**

- Main application state with complex, interconnected logic
- Large state trees with many update functions
- Advanced features (middleware, time-travel debugging, dev tools)

**Use simple alternatives when:**

- Props or events suffice for parent-child communication
- useState/useReducer work for component-local state
- React Context API meets needs within a single application

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                      Host Application           │
│  ┌───────────────────────────────────────────┐  │
│  │            ScalprumProvider (Host)        │  │
│  │                                           │  │
│  │  ┌──────────────┐      ┌──────────────┐   │  │
│  │  │ Component A  │      │ Component B  │   │  │
│  │  │              │      │              │   │  │
│  │  │ useRemoteHook│      │ useRemoteHook│   │  │
│  │  │      ↓       │      │      ↓       │   │  │
│  │  │  useGetState │      │useSubscribe  │   │  │
│  │  └──────┬───────┘      └──────┬───────┘   │  │
│  │         │                     │           │  │
│  │         └──────────┬──────────┘           │  │
│  │                    ↓                      │  │
│  │         ┌──────────────────────┐          │  │
│  │         │  Shared Store        │          │  │
│  │         │  (Singleton)         │          │  │
│  │         └──────────────────────┘          │  │
│  │                    ↑                      │  │
│  └────────────────────┼──────────────────────┘  │
│                       │                         │
│  ┌────────────────────┼──────────────────────┐  │
│  │    Remote Module   │  (via useRemoteHook) │  │
│  │                    ↓                      │  │
│  │  ┌──────────────────────────┐             │  │
│  │  │  useSharedStoreHook      │             │  │
│  │  └──────────────────────────┘             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Core Concepts

### Event-Driven Architecture

State changes are triggered by events with optional payloads:

```typescript
const EVENTS = ['ADD_TODO', 'TOGGLE_TODO'] as const;
store.updateState('ADD_TODO', { text: 'Buy groceries' });
```

### Subscription Model

1. **Subscribe to All Events** (`useGetState`): Re-renders on any state change
2. **Subscribe to Specific Events** (`useSubscribeStore`): Re-renders only on specific events

### Singleton Pattern

Ensure all instances share the same state:

```typescript
let sharedStore: ReturnType<typeof createSharedStore<State, Events>> | null = null;

const getSharedStore = () => {
  if (!sharedStore) {
    sharedStore = createSharedStore(config);
  }
  return sharedStore;
};
```

## Getting Started

### Installation

```bash
npm install @scalprum/core @scalprum/react-core react react-dom
```

### Basic Example

**Step 1: Create the Shared Store (in remote module)**

```typescript
// federation-cdn-mock/src/modules/useCounterStore.ts
import { createSharedStore } from '@scalprum/core';
import { useGetState } from '@scalprum/react-core';

interface CounterState {
  count: number;
}

const EVENTS = ['INCREMENT', 'DECREMENT'] as const;

let store: ReturnType<typeof createSharedStore<CounterState, typeof EVENTS>> | null = null;

const getStore = () => {
  if (!store) {
    store = createSharedStore({
      initialState: { count: 0 },
      events: EVENTS,
      onEventChange: (state, event) => {
        switch (event) {
          case 'INCREMENT':
            return { count: state.count + 1 };
          case 'DECREMENT':
            return { count: state.count - 1 };
          default:
            return state;
        }
      },
    });
  }
  return store;
};

export const useCounterStore = () => {
  const store = getStore();
  const state = useGetState(store);

  return {
    count: state.count,
    increment: () => store.updateState('INCREMENT'),
    decrement: () => store.updateState('DECREMENT'),
  };
};
```

**Step 2: Configure Module Federation**

```javascript
// webpack.config.js (remote)
new ModuleFederationPlugin({
  name: 'counterModule',
  exposes: {
    './useCounterStore': './src/modules/useCounterStore.ts',
  },
  shared: {
    '@scalprum/core': { singleton: true },
    '@scalprum/react-core': { singleton: true },
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
})
```

**Step 3: Use in Host Application**

```tsx
// examples/test-app/src/components/Counter.tsx
import { useRemoteHook } from '@scalprum/react-core';

function Counter() {
  const { hookResult, loading, error } = useRemoteHook({
    scope: 'counterModule',
    module: './useCounterStore',
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Count: {hookResult?.count}</h2>
      <button onClick={hookResult?.increment}>+</button>
      <button onClick={hookResult?.decrement}>-</button>
    </div>
  );
}

// Multiple instances share the same state!
function App() {
  return (
    <div>
      <Counter /> {/* Instance 1 */}
      <Counter /> {/* Instance 2 - shares state */}
    </div>
  );
}
```

## API Reference

### @scalprum/core

#### createSharedStore

Creates a new shared store instance.

```typescript
function createSharedStore<S, E extends readonly string[]>(
  config: SharedStoreConfig<S, E>
): SharedStore<S, E>
```

**Parameters:**

- `initialState: S` - Initial state (required)
- `events: E` - Array of event names (required, must be readonly)
- `onEventChange: (prevState: S, event: E[number], payload?: any) => S` - Event handler (required)

**Returns:** Store instance with methods:

- `getState(): S` - Returns current state
- `updateState(event: E[number], payload?: any): void` - Dispatches event
- `subscribe(event: E[number], callback: () => void): () => void` - Subscribes to specific event
- `subscribeAll(callback: () => void): () => void` - Subscribes to all events

**Validation:** Throws errors if initialState is undefined, events are missing/empty, event names aren't strings, or reserved `'*'` is used.

**File Location:** `/Users/martin/scalprum/scaffolding/packages/core/src/createSharedStore.ts`

### @scalprum/react-core

#### useGetState

Subscribes to all state changes.

```typescript
function useGetState<S>(store: ReturnType<typeof createSharedStore<S, []>>): S
```

Returns current state (immutable copy). Component re-renders on any state update.

**When to Use:**
- Need access to entire state
- Simplicity preferred over optimization

**File Location:** `/Users/martin/scalprum/scaffolding/packages/react-core/src/useGetState.ts`

#### useSubscribeStore

Subscribes to specific events with selector function.

```typescript
function useSubscribeStore<S, E extends readonly string[], T>(
  store: ReturnType<typeof createSharedStore<S, E>>,
  event: E[number],
  selector: (state: S) => T
): T
```

Component re-renders only when specified event fires.

**When to Use:**
- Component only cares about specific state changes
- Performance optimization important
- Large state objects

**File Location:** `/Users/martin/scalprum/scaffolding/packages/react-core/src/useSubscribeStore.ts`

## Usage Patterns

### Todo List Store

Real-world example from codebase:

```typescript
import { createSharedStore } from '@scalprum/core';
import { useGetState } from '@scalprum/react-core';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
}

const EVENTS = ['ADD_TODO', 'TOGGLE_TODO', 'DELETE_TODO', 'SET_FILTER'] as const;

let store: ReturnType<typeof createSharedStore<TodoState, typeof EVENTS>> | null = null;

const getStore = () => {
  if (!store) {
    store = createSharedStore({
      initialState: { todos: [], filter: 'all' },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case 'ADD_TODO':
            return {
              ...state,
              todos: [...state.todos, {
                id: `todo-${Date.now()}`,
                text: payload.text,
                completed: false,
              }],
            };
          case 'TOGGLE_TODO':
            return {
              ...state,
              todos: state.todos.map(t =>
                t.id === payload.id ? { ...t, completed: !t.completed } : t
              ),
            };
          case 'DELETE_TODO':
            return {
              ...state,
              todos: state.todos.filter(t => t.id !== payload.id),
            };
          case 'SET_FILTER':
            return { ...state, filter: payload.filter };
          default:
            return state;
        }
      },
    });
  }
  return store;
};

export const useTodoStore = () => {
  const store = getStore();
  const state = useGetState(store);

  const filteredTodos = state.todos.filter(todo => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });

  return {
    todos: state.todos,
    filteredTodos,
    filter: state.filter,
    addTodo: (text: string) => store.updateState('ADD_TODO', { text }),
    toggleTodo: (id: string) => store.updateState('TOGGLE_TODO', { id }),
    deleteTodo: (id: string) => store.updateState('DELETE_TODO', { id }),
    setFilter: (filter: typeof state.filter) =>
      store.updateState('SET_FILTER', { filter }),
  };
};
```

**File Location:** `/Users/martin/scalprum/scaffolding/federation-cdn-mock/src/modules/useSharedStoreHook.tsx`

### Performance-Optimized Subscriptions

```typescript
// Only re-renders when todos added/removed
function TodoCount() {
  const todos = useSubscribeStore(getStore(), 'ADD_TODO', s => s.todos);
  return <div>Total: {todos.length}</div>;
}

// Only re-renders when filter changes
function FilterIndicator() {
  const filter = useSubscribeStore(getStore(), 'SET_FILTER', s => s.filter);
  return <div>Showing: {filter}</div>;
}
```

### Remote Hook Integration

```tsx
// In host app
import { useRemoteHook } from '@scalprum/react-core';
import { useMemo } from 'react';

function SharedTodoList() {
  // IMPORTANT: Memoize args to prevent infinite re-renders
  const args = useMemo(() => [{ instanceId: 'test' }], []);

  const { hookResult, loading } = useRemoteHook({
    scope: 'sdk-plugin',
    module: './useSharedStoreHook',
    args,
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {hookResult?.todos.map(todo => (
        <li key={todo.id}>
          {todo.text}
          <button onClick={() => hookResult?.toggleTodo(todo.id)}>Toggle</button>
        </li>
      ))}
    </div>
  );
}
```

**File Locations:**
- Remote: `/Users/martin/scalprum/scaffolding/federation-cdn-mock/src/modules/useSharedStoreHook.tsx`
- Host: `/Users/martin/scalprum/scaffolding/examples/test-app/src/routes/SharedStore.tsx`

### Async Operations

```typescript
interface DataState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
}

const EVENTS = ['FETCH_START', 'FETCH_SUCCESS', 'FETCH_ERROR'] as const;

export const useDataStore = () => {
  const store = getStore();
  const state = useGetState(store);

  const fetchData = async () => {
    store.updateState('FETCH_START');
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      store.updateState('FETCH_SUCCESS', { data });
    } catch (error) {
      store.updateState('FETCH_ERROR', { error: error.message });
    }
  };

  return { ...state, fetchData };
};
```

## Best Practices

### 1. Keep Stores Small and Focused

**DO:** Use for specific, isolated state

```typescript
// GOOD: Focused notification store
interface NotificationState {
  message: string | null;
  type: 'info' | 'warning' | 'error';
}
```

**DON'T:** Replace main application state

```typescript
// BAD: Use global state management instead
interface AppState {
  user: User;
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  // ... many more
}
```

### 2. Always Use Singleton Pattern

```typescript
// GOOD
let store: ReturnType<typeof createSharedStore<State, Events>> | null = null;
const getStore = () => {
  if (!store) store = createSharedStore(config);
  return store;
};

// BAD: Creates new instance each time
const getStore = () => createSharedStore(config);
```

### 3. Use Descriptive Event Names

```typescript
// GOOD
const EVENTS = ['USER_LOGGED_IN', 'PROFILE_UPDATED'] as const;

// BAD
const EVENTS = ['UPDATE', 'CHANGE'] as const;
```

### 4. Keep Event Handlers Pure

```typescript
// GOOD: Pure function
const handleEvents = (state, event, payload) => {
  switch (event) {
    case 'ADD':
      return { ...state, items: [...state.items, payload.item] };
  }
};

// BAD: Mutates state, has side effects
const handleEvents = (state, event, payload) => {
  state.items.push(payload.item); // MUTATION!
  fetch('/api/items', { method: 'POST' }); // SIDE EFFECT!
  return state;
};
```

### 5. Handle Side Effects Outside Event Handlers

```typescript
export const useUserStore = () => {
  const store = getStore();
  const state = useGetState(store);

  const login = async (credentials: Credentials) => {
    store.updateState('LOGIN_START');
    try {
      const user = await api.login(credentials); // Side effect here
      store.updateState('LOGIN_SUCCESS', { user });
    } catch (error) {
      store.updateState('LOGIN_ERROR', { error: error.message });
    }
  };

  return { ...state, login };
};
```

### 6. Memoize Remote Hook Arguments

```typescript
// GOOD
const args = useMemo(() => [{ userId }], [userId]);
const { hookResult } = useRemoteHook({ scope: 'module', module: './store', args });

// BAD: Infinite loop
const { hookResult } = useRemoteHook({
  scope: 'module',
  module: './store',
  args: [{ userId }], // New object every render!
});
```

### 7. Choose the Right Subscription Method

| Scenario | Use useGetState | Use useSubscribeStore |
|----------|----------------|----------------------|
| Small state | Yes | Optional |
| Large state | No | Yes |
| Need entire state | Yes | No |
| Need one property | Optional | Yes |
| Frequent updates | No | Yes |

### 8. Avoid Reserved Event Names

```typescript
// BAD: Will throw error
const EVENTS = ['ADD', '*'] as const;

// GOOD
const EVENTS = ['ADD', 'UPDATE_ALL'] as const;
```

## Advanced Topics

### TypeScript Best Practices

```typescript
// Type-safe events with 'as const'
const EVENTS = ['ADD', 'REMOVE'] as const;
type EventType = typeof EVENTS[number]; // 'ADD' | 'REMOVE'

// Payload type safety
interface EventPayloads {
  ADD: { text: string };
  REMOVE: { id: string };
}

const reducer = (
  state: State,
  event: keyof EventPayloads,
  payload?: EventPayloads[typeof event]
): State => {
  // TypeScript knows payload types!
};
```

### Module Federation Setup

Both host and remote must share packages as singletons:

```javascript
// webpack.config.js
shared: {
  '@scalprum/core': { singleton: true },
  '@scalprum/react-core': { singleton: true },
  react: { singleton: true },
  'react-dom': { singleton: true },
}
```

### State Persistence

```typescript
const STORAGE_KEY = 'my-store';

const loadState = <S>(fallback: S): S => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    return serialized ? JSON.parse(serialized) : fallback;
  } catch {
    return fallback;
  }
};

const saveState = <S>(state: S) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

const getStore = () => {
  if (!store) {
    store = createSharedStore({
      initialState: loadState({ count: 0 }),
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        const newState = handleEvents(state, event, payload);
        saveState(newState);
        return newState;
      },
    });
  }
  return store;
};
```

### Debugging

```typescript
const createLoggingStore = <S, E extends readonly string[]>(
  config: SharedStoreConfig<S, E>,
  name: string
) => {
  const original = config.onEventChange;
  return createSharedStore({
    ...config,
    onEventChange: (prevState, event, payload) => {
      console.group(`[${name}] ${event}`);
      console.log('Previous:', prevState);
      console.log('Payload:', payload);
      const newState = original(prevState, event, payload);
      console.log('New:', newState);
      console.groupEnd();
      return newState;
    },
  });
};
```

## Testing

### Testing Components

```typescript
import { render } from '@testing-library/react';

jest.mock('@scalprum/react-core', () => ({
  useRemoteHook: jest.fn(() => ({
    hookResult: {
      todos: [],
      addTodo: jest.fn(),
    },
    loading: false,
    error: null,
  })),
}));

describe('MyComponent', () => {
  it('renders with mocked store', () => {
    const { getByText } = render(<MyComponent />);
    // assertions
  });
});
```

### Testing Store Logic

```typescript
import { createSharedStore } from '@scalprum/core';

describe('Todo Store', () => {
  it('adds todo', () => {
    const store = createSharedStore({
      initialState: { todos: [] },
      events: ['ADD'] as const,
      onEventChange: (state, event, payload) => {
        if (event === 'ADD') {
          return { todos: [...state.todos, payload.todo] };
        }
        return state;
      },
    });

    store.updateState('ADD', { todo: { id: '1', text: 'Test' } });
    expect(store.getState().todos).toHaveLength(1);
  });
});
```

## Troubleshooting

### State Not Syncing Across Instances

**Causes:**
- Multiple store instances (not using singleton)
- Different versions of @scalprum/core
- Module federation misconfiguration

**Solutions:**

```typescript
// Verify singleton
const store1 = getStore();
const store2 = getStore();
console.log(store1 === store2); // Should be true

// Check webpack config
shared: {
  '@scalprum/core': { singleton: true, strictVersion: true },
}
```

### Infinite Re-renders with useRemoteHook

**Cause:** Arguments not memoized

**Solution:**

```typescript
// BAD
const { hookResult } = useRemoteHook({
  args: [{ id: 'test' }], // New object every render
});

// GOOD
const args = useMemo(() => [{ id: 'test' }], []);
const { hookResult } = useRemoteHook({ args });
```

### TypeScript Event Errors

```typescript
// Use 'as const' for literal types
const EVENTS = ['ADD', 'REMOVE'] as const;

// Type-safe payloads
interface EventPayloads {
  ADD: { text: string };
  REMOVE: { id: string };
}
```

### State Mutations Not Triggering Updates

```typescript
// BAD: Mutates
const handler = (state, event) => {
  state.items.push(item); // MUTATION!
  return state;
};

// GOOD: Returns new object
const handler = (state, event) => ({
  ...state,
  items: [...state.items, item]
});
```

### Performance Issues

```typescript
// Use useSubscribeStore for specific events
const count = useSubscribeStore(store, 'ADD', s => s.items.length);

// Optimize selectors to return minimal data
const activeCount = useSubscribeStore(
  store,
  'TOGGLE',
  s => s.items.filter(i => i.active).length
);
```

### Module Not Found

**Check:**
1. Module exposed in webpack config
2. Import path matches exposes key
3. Plugin manifest configured correctly

```javascript
// webpack.config.js
exposes: {
  './useStore': './src/hooks/useStore.ts',
},

// Usage
useRemoteHook({
  scope: 'myModule',
  module: './useStore', // Must match
})
```

### Debugging Checklist

- [ ] Singleton pattern used correctly
- [ ] Packages marked as singletons in webpack
- [ ] Compatible versions across micro-frontends
- [ ] Event handler returns new state (no mutations)
- [ ] Event names don't include reserved `'*'`
- [ ] useRemoteHook args memoized
- [ ] Module exposed in webpack config
- [ ] Store instance same across calls

## Summary

Shared stores provide event-driven state management specifically for micro-frontend architectures. They enable synchronized state across module federation boundaries.

**Key Takeaways:**

1. Use for cross-module coordination, not main app state
2. Keep stores small and focused (5-7 properties max)
3. Use singleton pattern for shared instances
4. Define clear, descriptive event names
5. Keep event handlers pure
6. Choose `useGetState` (simple) vs `useSubscribeStore` (optimized)
7. Always memoize remote hook arguments
8. Leverage TypeScript for type safety
9. Configure module federation with singleton dependencies

**The Right Tool for the Right Job:**

- **Shared Stores:** Cross-micro-frontend synchronization
- **Global State Management:** Main app state, complex logic
- **Context API:** State within single component tree
- **Props/Events:** Simple parent-child communication

### Example Files

- Core: `/Users/martin/scalprum/scaffolding/packages/core/src/createSharedStore.ts`
- Hooks: `/Users/martin/scalprum/scaffolding/packages/react-core/src/useGetState.ts`, `useSubscribeStore.ts`
- Remote Example: `/Users/martin/scalprum/scaffolding/federation-cdn-mock/src/modules/useSharedStoreHook.tsx`
- Host Usage: `/Users/martin/scalprum/scaffolding/examples/test-app/src/routes/SharedStore.tsx`
- E2E Tests: `/Users/martin/scalprum/scaffolding/examples/test-app-e2e/src/e2e/test-app/shared-store.cy.ts`

### Resources

- [Remote Hooks Overview](./use-remote-hook.md)
- [@scalprum/core README](../../core/README.md)
- [GitHub Issues](https://github.com/scalprum/scaffolding/issues)
- [Discussions](https://github.com/scalprum/scaffolding/discussions)
