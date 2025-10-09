import { getModule } from '@scalprum/core';
import { useContext, useMemo, useReducer, useEffect, useRef, useCallback } from 'react';
import { RemoteHookContext } from './remote-hook-provider';
import { HookConfig, UseRemoteHookResult, HookHandle, RemoteHookManager } from './remote-hooks-types';

// Note: Removed helper functions and inlined logic to avoid stale closure issues

// Hook that returns a manager object
export function useRemoteHookManager<R = unknown>(): RemoteHookManager<R> {
  const context = useContext(RemoteHookContext);
  const { subscribe, updateState, getState, registerHook, updateArgs } = context;
  const [update, forceUpdate] = useReducer((x) => x + 1, 0);
  const subscriptions = useRef<Array<{ id: string; unsubscribe: () => void }>>([]);

  const addHook = useCallback((config: HookConfig): HookHandle => {
    // Follow useRemoteHook pattern: immediate subscription
    const { id, unsubscribe } = subscribe(forceUpdate);

    // Track mounted state for this specific hook
    let isMounted = true;

    // Set initial loading state immediately
    updateState(id, { loading: true, error: null });
    updateArgs(id, config.args || []);

    // Load hook asynchronously (like useRemoteHook)
    const loadHook = async () => {
      try {
        const hookFunction = await getModule(config.scope, config.module, config.importName);

        // Only update if both hook and manager are still mounted
        if (isMounted) {
          updateState(id, { loading: false, error: null });
          updateArgs(id, config.args || []); // Set args before registering hook
          registerHook(id, hookFunction);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading hook:', error);
          updateState(id, { loading: false, error });
        }
      }
    };

    loadHook();

    // Store subscription for cleanup
    const subscription = { id, unsubscribe };
    subscriptions.current.push(subscription);

    // Return handle with fresh closures
    return {
      remove() {
        isMounted = false; // Mark as unmounted like useRemoteHook
        unsubscribe();
        // Remove from tracking array
        const index = subscriptions.current.indexOf(subscription);
        if (index !== -1) {
          subscriptions.current.splice(index, 1);
        }
      },

      updateArgs(args: any[]) {
        console.log('Updating args for hook ID:', id, args, { isMounted });
        if (isMounted) {
          updateArgs(id, args);
        }
      },
    };
  }, []);

  const cleanup = useCallback(() => {
    // Clean up all subscriptions
    subscriptions.current.forEach(({ unsubscribe }) => {
      unsubscribe();
    });
    subscriptions.current.length = 0;
    forceUpdate();
  }, []);

  const hookResults = useMemo(() => {
    const results = subscriptions.current.map(({ id }) => {
      const state = getState(id) || { loading: true, error: null };
      return {
        id,
        loading: state.loading,
        error: state.error,
        hookResult: state.hookResult,
      } as UseRemoteHookResult<R>;
    });
    return results;
  }, [update]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    addHook,
    cleanup,
    hookResults,
  };
}
