import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { RemoteHookContextType } from './remote-hooks-types';

type StateEntry = {
  id: string;
  value: any;
  notify: () => void;
};

type ArgSubscription = {
  id: string;
  args: any[];
  argNotifiers: Set<(args: any[]) => void>;
};

export const RemoteHookContext = createContext<RemoteHookContextType>({
  subscribe: () => ({ id: '', unsubscribe: () => undefined }),
  updateState: () => undefined,
  getState: () => undefined,
  registerHook: () => undefined,
  updateArgs: () => undefined,
  subscribeToArgs: () => () => undefined,
});

// Fake component that executes the remote hook
function HookExecutor({
  id,
  hookFunction,
  updateState,
  initialArgs,
}: {
  id: string;
  hookFunction: (...args: any[]) => any;
  updateState: (id: string, value: any) => void;
  initialArgs: any[];
}) {
  const { subscribeToArgs } = useContext(RemoteHookContext);
  const [args, setArgs] = useState<any[]>(initialArgs);

  // Subscribe to argument changes
  useEffect(() => {
    const unsubscribe = subscribeToArgs(id, setArgs);
    return () => {
      unsubscribe();
    };
  }, [id, subscribeToArgs]);

  // Always call the hook with args (rules of hooks)
  const hookResult = hookFunction(...args);

  // Update state with the result
  useEffect(() => {
    updateState(id, { hookResult });
  }, [hookResult, id, updateState]);

  return null;
}

export const RemoteHookProvider = ({ children }: PropsWithChildren) => {
  const state = useMemo(() => ({}), []) as { [id: string]: StateEntry };

  // React state to track available hooks (for re-rendering)
  const [availableHooks, setAvailableHooks] = useState<{ [id: string]: (...args: any[]) => any }>({});

  // Mutable state for arguments (no re-renders)
  const argSubscriptions = useMemo(() => ({}), []) as { [id: string]: ArgSubscription };

  // Cleanup all subscriptions when provider unmounts
  useEffect(() => {
    return () => {
      // Clear state
      Object.keys(state).forEach((id) => {
        delete state[id];
      });
      // Clear available hooks (this stops rendering HookExecutors)
      setAvailableHooks({});
      // Clear arg subscriptions
      Object.keys(argSubscriptions).forEach((id) => {
        delete argSubscriptions[id];
      });
    };
  }, [state, argSubscriptions]);

  const subscribe = useCallback(
    (notify: () => void) => {
      const id = crypto.randomUUID();
      state[id] = { id, value: 0, notify };

      return {
        id,
        unsubscribe: () => {
          delete state[id];
          // Also remove from availableHooks and hookArgs to stop rendering HookExecutor
          delete argSubscriptions[id];
          setAvailableHooks((prev) => {
            const { [id]: removed, ...rest } = prev;
            return rest;
          });
        },
      };
    },
    [setAvailableHooks],
  );

  const updateState = useCallback((id: string, value: any) => {
    const entry = state[id];
    if (!entry) {
      return;
    }

    // Merge with existing value
    entry.value = { ...entry.value, ...value };
    entry.notify();
  }, []);

  const getState = useCallback((id: string) => {
    return state[id]?.value;
  }, []);

  const registerHook = useCallback(
    (id: string, hookFunction: (...args: any[]) => any) => {
      setAvailableHooks((prev) => ({
        ...prev,
        [id]: hookFunction,
      }));
    },
    [setAvailableHooks],
  );

  const updateArgs = useCallback(
    (id: string, args: any[]) => {
      if (!argSubscriptions[id]) {
        argSubscriptions[id] = { id, args, argNotifiers: new Set() };
      } else {
        argSubscriptions[id].args = args;
      }

      // Notify all arg subscribers for this ID
      argSubscriptions[id].argNotifiers.forEach((callback) => {
        try {
          callback(args);
        } catch (err) {
          console.error('Error in arg subscriber callback:', err);
        }
      });
    },
    [argSubscriptions],
  );

  const subscribeToArgs = useCallback(
    (id: string, callback: (args: any[]) => void) => {
      if (!argSubscriptions[id]) {
        argSubscriptions[id] = { id, args: [], argNotifiers: new Set() };
      }

      argSubscriptions[id].argNotifiers.add(callback);

      // Always call immediately with current args (even if empty)
      callback(argSubscriptions[id].args);

      return () => {
        argSubscriptions[id]?.argNotifiers.delete(callback);
      };
    },
    [argSubscriptions],
  );

  const contextValue = useMemo(
    () => ({ subscribe, updateState, getState, registerHook, updateArgs, subscribeToArgs }),
    [subscribe, updateState, getState, registerHook, updateArgs, subscribeToArgs],
  );

  return (
    <RemoteHookContext.Provider value={contextValue}>
      {/* Render fake components to execute hooks */}
      {Object.keys(availableHooks).map((id) => {
        const hookFunction = availableHooks[id];
        // Only render if we have both the hook function and the state entry
        if (!hookFunction || !state[id]) {
          return null;
        }
        // Get the initial args for this hook
        const initialArgs = argSubscriptions[id]?.args || [];
        return <HookExecutor key={id} id={id} hookFunction={hookFunction} updateState={updateState} initialArgs={initialArgs} />;
      })}
      {children}
    </RemoteHookContext.Provider>
  );
};
