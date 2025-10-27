import { createSharedStore } from '@scalprum/core';
import { useGetState, useSubscribeStore } from '@scalprum/react-core';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface SharedTodoState {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  lastUpdate: number;
}

export const EVENTS = ['ADD_TODO', 'TOGGLE_TODO', 'DELETE_TODO', 'SET_FILTER', 'CLEAR_COMPLETED'] as const;

export interface UseSharedStoreOptions {
  instanceId?: string;
  enableLogging?: boolean;
}

export interface UseSharedStoreResult {
  // State getters
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  filteredTodos: TodoItem[];
  activeCount: number;
  completedCount: number;
  lastUpdate: number;

  // Actions
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  clearCompleted: () => void;

  // Meta
  instanceId: string;
}

// Create a singleton shared store that persists across all hook instances
const initialState: SharedTodoState = {
  todos: [
    {
      id: 'demo-1',
      text: 'Learn about Scalprum shared stores',
      completed: false,
      createdAt: Date.now() - 300000, // 5 minutes ago
    },
    {
      id: 'demo-2',
      text: 'Test remote hooks with shared state',
      completed: true,
      createdAt: Date.now() - 600000, // 10 minutes ago
    },
  ],
  filter: 'all',
  lastUpdate: Date.now(),
};

// Shared store reducer
const todoReducer = (state: SharedTodoState, event: typeof EVENTS[number], payload?: any): SharedTodoState => {
  const newState = { ...state, lastUpdate: Date.now() };

  switch (event) {
    case 'ADD_TODO':
      return {
        ...newState,
        todos: [
          ...state.todos,
          {
            id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: payload.text,
            completed: false,
            createdAt: Date.now(),
          }
        ],
      };

    case 'TOGGLE_TODO':
      return {
        ...newState,
        todos: state.todos.map(todo =>
          todo.id === payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };

    case 'DELETE_TODO':
      return {
        ...newState,
        todos: state.todos.filter(todo => todo.id !== payload.id),
      };

    case 'SET_FILTER':
      return {
        ...newState,
        filter: payload.filter,
      };

    case 'CLEAR_COMPLETED':
      return {
        ...newState,
        todos: state.todos.filter(todo => !todo.completed),
      };

    default:
      return newState;
  }
};

// Create the shared store (singleton)
let sharedStore: ReturnType<typeof createSharedStore<SharedTodoState, typeof EVENTS>> | null = null;

const getSharedStore = () => {
  if (!sharedStore) {
    sharedStore = createSharedStore({
      initialState,
      events: EVENTS,
      onEventChange: todoReducer,
    });
  }
  return sharedStore;
};

/**
 * Remote hook that provides shared todo store functionality
 * Multiple instances of this hook will share the same state
 */
export const useSharedStoreHook = (options: UseSharedStoreOptions = {}): UseSharedStoreResult => {
  const {
    instanceId = `instance-${Math.random().toString(36).substr(2, 9)}`,
    enableLogging = false,
  } = options;

  const store = getSharedStore();

  // Subscribe to all state changes
  const state = useGetState(store);

  // Subscribe to specific events for performance (examples)
  const todos = useSubscribeStore(store, 'ADD_TODO', (state) => state.todos);
  const filter = useSubscribeStore(store, 'SET_FILTER', (state) => state.filter);

  // Computed values
  const filteredTodos = state.todos.filter(todo => {
    switch (state.filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  const activeCount = state.todos.filter(todo => !todo.completed).length;
  const completedCount = state.todos.filter(todo => todo.completed).length;

  // Actions
  const addTodo = (text: string) => {
    if (enableLogging) {
      console.log(`[${instanceId}] Adding todo:`, text);
    }
    store.updateState('ADD_TODO', { text });
  };

  const toggleTodo = (id: string) => {
    if (enableLogging) {
      console.log(`[${instanceId}] Toggling todo:`, id);
    }
    store.updateState('TOGGLE_TODO', { id });
  };

  const deleteTodo = (id: string) => {
    if (enableLogging) {
      console.log(`[${instanceId}] Deleting todo:`, id);
    }
    store.updateState('DELETE_TODO', { id });
  };

  const setFilter = (filter: 'all' | 'active' | 'completed') => {
    if (enableLogging) {
      console.log(`[${instanceId}] Setting filter:`, filter);
    }
    store.updateState('SET_FILTER', { filter });
  };

  const clearCompleted = () => {
    if (enableLogging) {
      console.log(`[${instanceId}] Clearing completed todos`);
    }
    store.updateState('CLEAR_COMPLETED');
  };

  return {
    // State
    todos: state.todos,
    filter: state.filter,
    filteredTodos,
    activeCount,
    completedCount,
    lastUpdate: state.lastUpdate,

    // Actions
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
    clearCompleted,

    // Meta
    instanceId,
  };
};

export default useSharedStoreHook;